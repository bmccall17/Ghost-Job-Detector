const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

/**
 * WebLLM Health Metrics API
 * Provides real-time performance and health monitoring for WebLLM parsing system
 * 
 * GET /api/webllm-health?range=24h
 * 
 * Query Parameters:
 * - range: Time range for metrics (1h, 6h, 24h, 7d, 30d)
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const timeRange = req.query.range || '24h'
    const startTime = getStartTime(timeRange)
    
    console.log(`📊 Fetching WebLLM health metrics for range: ${timeRange}`)
    
    const metrics = await calculateWebLLMMetrics(startTime)
    
    res.status(200).json(metrics)
  } catch (error) {
    console.error('❌ WebLLM health metrics error:', error)
    res.status(500).json({ 
      error: 'Failed to fetch health metrics',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

/**
 * Calculate comprehensive WebLLM metrics for the specified time range
 */
async function calculateWebLLMMetrics(startTime) {
  const [
    totalAttempts,
    successfulAttempts,
    avgProcessingTime,
    errorBreakdown,
    recentErrors,
    platformStats
  ] = await Promise.all([
    // Total WebLLM attempts
    prisma.parsingAttempt.count({
      where: { 
        extractionMethod: 'webllm',
        attemptedAt: { gte: startTime }
      }
    }),
    
    // Successful attempts  
    prisma.parsingAttempt.count({
      where: { 
        extractionMethod: 'webllm',
        successStatus: true,
        attemptedAt: { gte: startTime }
      }
    }),
    
    // Average processing time
    prisma.parsingAttempt.aggregate({
      where: { 
        extractionMethod: 'webllm',
        attemptedAt: { gte: startTime },
        processingTimeMs: { not: null }
      },
      _avg: { processingTimeMs: true }
    }),
    
    // Error categorization
    prisma.parsingAttempt.groupBy({
      by: ['errorMessage'],
      where: { 
        extractionMethod: 'webllm',
        successStatus: false,
        attemptedAt: { gte: startTime },
        errorMessage: { not: null }
      },
      _count: true
    }),
    
    // Recent errors (last 10)
    prisma.parsingAttempt.findMany({
      where: { 
        extractionMethod: 'webllm',
        successStatus: false,
        attemptedAt: { gte: startTime },
        errorMessage: { not: null }
      },
      select: {
        attemptedAt: true,
        errorMessage: true,
        sourceUrl: true
      },
      orderBy: { attemptedAt: 'desc' },
      take: 10
    }),
    
    // Platform-based statistics
    prisma.parsingAttempt.groupBy({
      by: ['sourceUrl'],
      where: { 
        extractionMethod: 'webllm',
        attemptedAt: { gte: startTime }
      },
      _count: true,
      _avg: { processingTimeMs: true }
    })
  ])

  // Process error breakdown and categorize
  const categorizedErrors = categorizeErrors(errorBreakdown)
  
  // Calculate success rate
  const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts * 100) : 0
  
  // Determine system health status
  const modelStatus = determineModelStatus(successRate, avgProcessingTime._avg.processingTimeMs)
  
  return {
    totalAttempts,
    successfulAttempts,
    successRate: parseFloat(successRate.toFixed(2)),
    avgProcessingTime: avgProcessingTime._avg.processingTimeMs || 0,
    errorBreakdown: categorizedErrors,
    recentErrors: recentErrors.map(error => ({
      timestamp: error.attemptedAt.toISOString(),
      errorMessage: truncateError(error.errorMessage),
      sourceUrl: truncateUrl(error.sourceUrl)
    })),
    platformStats: processPlatformStats(platformStats),
    webgpuAvailable: true, // This would be detected client-side
    modelStatus,
    timestamp: new Date().toISOString(),
    timeRange: getTimeRangeLabel(startTime)
  }
}

/**
 * Categorize errors into meaningful failure types
 */
function categorizeErrors(errorBreakdown) {
  const categories = {}
  
  errorBreakdown.forEach(error => {
    const category = classifyError(error.errorMessage)
    if (!categories[category]) {
      categories[category] = { failureCategory: category, _count: 0 }
    }
    categories[category]._count += error._count
  })
  
  return Object.values(categories)
}

/**
 * Classify error message into failure category
 */
function classifyError(errorMessage) {
  if (!errorMessage) return 'unknown'
  
  const message = errorMessage.toLowerCase()
  
  if (message.includes('model') && (message.includes('load') || message.includes('init'))) {
    return 'model_load'
  }
  if (message.includes('webgpu') || message.includes('gpu')) {
    return 'webgpu'
  }
  if (message.includes('inference') || message.includes('generate')) {
    return 'inference'
  }
  if (message.includes('parse') || message.includes('json')) {
    return 'parsing'
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'network'
  }
  if (message.includes('timeout')) {
    return 'timeout'
  }
  if (message.includes('memory')) {
    return 'memory'
  }
  
  return 'other'
}

/**
 * Determine overall model health status
 */
function determineModelStatus(successRate, avgTime) {
  if (successRate >= 95 && (!avgTime || avgTime <= 2000)) {
    return 'healthy'
  }
  if (successRate >= 85 && (!avgTime || avgTime <= 5000)) {
    return 'warning'  
  }
  return 'error'
}

/**
 * Process platform statistics
 */
function processPlatformStats(platformStats) {
  return platformStats.slice(0, 10).map(stat => ({
    platform: extractPlatform(stat.sourceUrl),
    attempts: stat._count,
    avgTime: stat._avg.processingTimeMs || 0
  }))
}

/**
 * Extract platform from URL
 */
function extractPlatform(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    
    if (hostname.includes('linkedin.com')) return 'LinkedIn'
    if (hostname.includes('indeed.com')) return 'Indeed'
    if (hostname.includes('glassdoor.com')) return 'Glassdoor'
    if (hostname.includes('greenhouse.io')) return 'Greenhouse'
    if (hostname.includes('lever.co')) return 'Lever'
    if (hostname.includes('workday.com')) return 'Workday'
    
    // Return domain without www
    return hostname.replace('www.', '')
  } catch {
    return 'Unknown'
  }
}

/**
 * Get start time based on range parameter
 */
function getStartTime(range) {
  const now = new Date()
  
  switch (range) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000)
    case '6h':
      return new Date(now.getTime() - 6 * 60 * 60 * 1000)
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000) // Default to 24h
  }
}

/**
 * Get human-readable time range label
 */
function getTimeRangeLabel(startTime) {
  const hoursAgo = Math.round((Date.now() - startTime.getTime()) / (1000 * 60 * 60))
  
  if (hoursAgo < 2) return 'Last hour'
  if (hoursAgo < 8) return `Last ${hoursAgo} hours` 
  if (hoursAgo < 25) return 'Last 24 hours'
  if (hoursAgo < 48) return 'Yesterday'
  
  const daysAgo = Math.round(hoursAgo / 24)
  return `Last ${daysAgo} days`
}

/**
 * Truncate error message for display
 */
function truncateError(errorMessage) {
  if (!errorMessage) return 'Unknown error'
  if (errorMessage.length <= 100) return errorMessage
  return errorMessage.substring(0, 97) + '...'
}

/**
 * Truncate URL for display
 */
function truncateUrl(url) {
  if (!url) return 'Unknown URL'
  if (url.length <= 50) return url
  
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname
    const path = urlObj.pathname
    
    if (path.length > 30) {
      return `${domain}${path.substring(0, 27)}...`
    }
    return `${domain}${path}`
  } catch {
    return url.substring(0, 47) + '...'
  }
}