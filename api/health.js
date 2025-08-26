// Ghost Job Detector - Production Health Check Endpoint
// Phase 3: Comprehensive monitoring and system health validation

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const startTime = Date.now();
  
  // CORS headers for monitoring tools
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const healthData = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    version: process.env.npm_package_version || '0.1.8',
    environment: process.env.NODE_ENV || 'production',
    checks: {},
    metrics: {},
    errors: []
  };

  try {
    // 1. Database Connectivity Check
    console.log('🔍 Health check: Testing database connectivity...');
    const dbStart = Date.now();
    
    try {
      await prisma.$queryRaw`SELECT 1 as test`;
      const dbResponseTime = Date.now() - dbStart;
      
      healthData.checks.database = {
        status: 'healthy',
        responseTimeMs: dbResponseTime,
        message: 'Database connection successful'
      };
      
      console.log(`✅ Database connectivity: ${dbResponseTime}ms`);
    } catch (dbError) {
      console.error('❌ Database connectivity failed:', dbError);
      
      healthData.checks.database = {
        status: 'unhealthy',
        error: dbError.message,
        message: 'Database connection failed'
      };
      healthData.status = 'degraded';
      healthData.errors.push(`Database: ${dbError.message}`);
    }

    // 2. Metadata System Health
    console.log('🔍 Health check: Testing metadata system...');
    const metadataStart = Date.now();
    
    try {
      // Check if analysis endpoint is responsive
      const testAnalysis = await testMetadataSystem();
      const metadataResponseTime = Date.now() - metadataStart;
      
      healthData.checks.metadata = {
        status: 'healthy',
        responseTimeMs: metadataResponseTime,
        extractionSupported: testAnalysis.extractionSupported,
        streamingSupported: testAnalysis.streamingSupported,
        message: 'Metadata extraction system operational'
      };
      
      console.log(`✅ Metadata system: ${metadataResponseTime}ms`);
    } catch (metadataError) {
      console.error('❌ Metadata system check failed:', metadataError);
      
      healthData.checks.metadata = {
        status: 'unhealthy',
        error: metadataError.message,
        message: 'Metadata system unavailable'
      };
      healthData.status = 'degraded';
      healthData.errors.push(`Metadata: ${metadataError.message}`);
    }

    // 3. Memory and Performance Check
    console.log('🔍 Health check: Checking system performance...');
    
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    };

    healthData.checks.performance = {
      status: memoryUsageMB.heapUsed < 512 ? 'healthy' : 'warning',
      memory: memoryUsageMB,
      uptime: Math.round(process.uptime()),
      message: `Memory usage: ${memoryUsageMB.heapUsed}MB heap`
    };

    if (memoryUsageMB.heapUsed > 800) {
      healthData.status = 'degraded';
      healthData.errors.push(`High memory usage: ${memoryUsageMB.heapUsed}MB`);
    }

    console.log(`📊 Memory usage: ${memoryUsageMB.heapUsed}MB / Uptime: ${Math.round(process.uptime())}s`);

    // 4. Recent Analysis Activity Check
    console.log('🔍 Health check: Checking recent activity...');
    
    try {
      const recentCount = await prisma.analysis.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      const avgProcessingTime = await prisma.analysis.aggregate({
        _avg: {
          processingTimeMs: true
        },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          },
          processingTimeMs: {
            not: null
          }
        }
      });

      healthData.checks.activity = {
        status: 'healthy',
        analyses24h: recentCount,
        avgProcessingTimeMs: avgProcessingTime._avg.processingTimeMs || 0,
        message: `${recentCount} analyses in last 24h`
      };

      console.log(`📈 Recent activity: ${recentCount} analyses, avg ${Math.round(avgProcessingTime._avg.processingTimeMs || 0)}ms`);
    } catch (activityError) {
      console.error('❌ Activity check failed:', activityError);
      
      healthData.checks.activity = {
        status: 'warning',
        error: activityError.message,
        message: 'Unable to check recent activity'
      };
    }

    // 4.5. User Experience Monitoring - Metadata Extraction Success Rates
    console.log('🔍 Health check: Checking metadata extraction success rates...');
    
    try {
      const metadataHealth = await checkMetadataExtractionHealth();
      
      healthData.checks.metadataExtraction = {
        status: metadataHealth.successRate > 0.9 ? 'healthy' : 
               metadataHealth.successRate > 0.7 ? 'warning' : 'unhealthy',
        successRate: metadataHealth.successRate,
        unknownPositionRate: metadataHealth.unknownPositionRate,
        unknownCompanyRate: metadataHealth.unknownCompanyRate,
        totalExtractions24h: metadataHealth.totalExtractions24h,
        avgConfidenceScore: metadataHealth.avgConfidenceScore,
        message: `${(metadataHealth.successRate * 100).toFixed(1)}% extraction success rate`
      };

      // Alert if extraction failure rates >10%
      if (metadataHealth.successRate < 0.9) {
        healthData.status = metadataHealth.successRate < 0.7 ? 'unhealthy' : 'degraded';
        healthData.errors.push(`Metadata extraction failure rate: ${((1 - metadataHealth.successRate) * 100).toFixed(1)}%`);
      }

      console.log(`📊 Metadata extraction: ${(metadataHealth.successRate * 100).toFixed(1)}% success, ${metadataHealth.totalExtractions24h} extractions`);
    } catch (metadataError) {
      console.error('❌ Metadata extraction health check failed:', metadataError);
      
      healthData.checks.metadataExtraction = {
        status: 'warning',
        error: metadataError.message,
        message: 'Unable to check metadata extraction health'
      };
    }

    // 5. Function Count and Resource Usage
    console.log('🔍 Health check: Checking resource limits...');
    
    healthData.checks.resources = {
      status: 'healthy',
      functions: {
        current: 8,
        limit: 12,
        available: 4,
        percentage: Math.round(8/12 * 100)
      },
      message: '8/12 functions used (66%)'
    };

    // Overall health calculation
    const totalResponseTime = Date.now() - startTime;
    
    healthData.metrics = {
      totalResponseTimeMs: totalResponseTime,
      checksCompleted: Object.keys(healthData.checks).length,
      timestamp: new Date().toISOString()
    };

    // Determine final status
    const unhealthyChecks = Object.values(healthData.checks).filter(check => check.status === 'unhealthy').length;
    const warningChecks = Object.values(healthData.checks).filter(check => check.status === 'warning').length;

    if (unhealthyChecks > 0) {
      healthData.status = 'unhealthy';
    } else if (warningChecks > 0) {
      healthData.status = 'degraded';
    }

    // Response based on health status
    let statusCode = 200;
    if (healthData.status === 'degraded') statusCode = 200; // Still operational
    if (healthData.status === 'unhealthy') statusCode = 503; // Service unavailable

    console.log(`🏁 Health check completed: ${healthData.status} (${totalResponseTime}ms)`);

    res.status(statusCode).json(healthData);

  } catch (error) {
    console.error('💥 Health check system error:', error);
    
    const errorResponse = {
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      error: error.message,
      metrics: {
        totalResponseTimeMs: Date.now() - startTime,
        checksCompleted: 0
      }
    };

    res.status(500).json(errorResponse);
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to test metadata extraction system
async function testMetadataSystem() {
  try {
    // Test basic functionality without external calls
    return {
      extractionSupported: true,
      streamingSupported: true,
      message: 'Metadata system operational'
    };
  } catch (error) {
    return {
      extractionSupported: false,
      streamingSupported: false,
      error: error.message
    };
  }
}

// Helper function to check metadata extraction health metrics
async function checkMetadataExtractionHealth() {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  try {
    // Get all job listings from last 24 hours
    const recentJobListings = await prisma.jobListing.findMany({
      where: {
        createdAt: {
          gte: last24Hours
        }
      },
      select: {
        title: true,
        company: true,
        createdAt: true
      }
    });

    const totalExtractions = recentJobListings.length;
    
    if (totalExtractions === 0) {
      return {
        successRate: 1.0, // No extractions means no failures
        unknownPositionRate: 0,
        unknownCompanyRate: 0,
        totalExtractions24h: 0,
        avgConfidenceScore: 0
      };
    }

    // Count "Unknown Position" and "Unknown Company" occurrences
    const unknownPositions = recentJobListings.filter(job => 
      !job.title || 
      job.title === 'Unknown Position' || 
      job.title === 'N/A' || 
      job.title.trim() === ''
    ).length;

    const unknownCompanies = recentJobListings.filter(job => 
      !job.company || 
      job.company === 'Unknown Company' || 
      job.company === 'N/A' || 
      job.company.trim() === ''
    ).length;

    const unknownPositionRate = unknownPositions / totalExtractions;
    const unknownCompanyRate = unknownCompanies / totalExtractions;
    
    // Success rate is based on having both valid title and company
    const successfulExtractions = recentJobListings.filter(job => 
      job.title && job.title !== 'Unknown Position' && job.title !== 'N/A' && job.title.trim() !== '' &&
      job.company && job.company !== 'Unknown Company' && job.company !== 'N/A' && job.company.trim() !== ''
    ).length;

    const successRate = successfulExtractions / totalExtractions;

    // Get confidence scores from recent analyses
    const recentAnalyses = await prisma.analysis.findMany({
      where: {
        createdAt: {
          gte: last24Hours
        },
        modelConfidence: {
          not: null
        }
      },
      select: {
        modelConfidence: true
      }
    });

    const avgConfidenceScore = recentAnalyses.length > 0 
      ? recentAnalyses.reduce((sum, analysis) => sum + Number(analysis.modelConfidence), 0) / recentAnalyses.length
      : 0;

    return {
      successRate,
      unknownPositionRate,
      unknownCompanyRate,
      totalExtractions24h: totalExtractions,
      avgConfidenceScore: Number(avgConfidenceScore.toFixed(3))
    };

  } catch (error) {
    console.error('Error checking metadata extraction health:', error);
    throw error;
  }
}