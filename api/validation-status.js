/**
 * Validation Status API Endpoint
 * Provides real-time validation status for ongoing parsing operations
 * Following Implementation Guide specifications
 */
import { ParsingAttemptsTracker } from '../src/services/ParsingAttemptsTracker.js';
import { securityValidator } from '../lib/security.js';

export default async function handler(req, res) {
    // Security headers
    const securityHeaders = securityValidator.getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
    });
    
    // Allow both GET and POST requests
    if (!['GET', 'POST'].includes(req.method)) {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const tracker = new ParsingAttemptsTracker();
        
        // Handle different query types
        const queryType = req.query.type || req.body?.type || 'metrics';
        
        switch (queryType) {
            case 'metrics':
                return await handleMetricsRequest(req, res, tracker);
                
            case 'recent_failures':
                return await handleRecentFailuresRequest(req, res, tracker);
                
            case 'platform_stats':
                return await handlePlatformStatsRequest(req, res, tracker);
                
            case 'health_check':
                return await handleHealthCheckRequest(req, res, tracker);
                
            default:
                return res.status(400).json({
                    error: 'Invalid query type',
                    message: 'Supported types: metrics, recent_failures, platform_stats, health_check'
                });
        }

    } catch (error) {
        console.error('Validation status error:', error);
        
        return res.status(500).json({
            error: 'Validation status failed',
            message: 'Unable to retrieve validation status',
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Handle parsing metrics request
 */
async function handleMetricsRequest(req, res, tracker) {
    try {
        const days = parseInt(req.query.days || req.body?.days || '7');
        const platform = req.query.platform || req.body?.platform;
        
        // Calculate date range
        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);
        
        const metrics = await tracker.getParsingMetrics(fromDate, toDate, platform);
        
        // Calculate additional derived metrics
        const successRate = metrics.totalAttempts > 0 
            ? (metrics.successfulAttempts / metrics.totalAttempts) * 100 
            : 0;
            
        const failureRate = 100 - successRate;
        
        // Performance classification
        let performanceStatus = 'excellent';
        if (successRate < 95) performanceStatus = 'good';
        if (successRate < 85) performanceStatus = 'fair';
        if (successRate < 70) performanceStatus = 'poor';
        
        return res.status(200).json({
            queryType: 'metrics',
            dateRange: {
                from: fromDate.toISOString(),
                to: toDate.toISOString(),
                days
            },
            platform: platform || 'all',
            metrics: {
                ...metrics,
                successRate: Math.round(successRate * 100) / 100,
                failureRate: Math.round(failureRate * 100) / 100,
                performanceStatus
            },
            status: 'success',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Metrics request failed:', error);
        throw error;
    }
}

/**
 * Handle recent failures request
 */
async function handleRecentFailuresRequest(req, res, tracker) {
    try {
        const limit = parseInt(req.query.limit || req.body?.limit || '25');
        
        const recentFailures = await tracker.getRecentFailures(Math.min(limit, 100));
        
        // Categorize failures by error type
        const errorCategories = {};
        recentFailures.forEach(failure => {
            const errorType = failure.errorMessage ? 
                categorizeError(failure.errorMessage) : 'Unknown';
            
            if (!errorCategories[errorType]) {
                errorCategories[errorType] = [];
            }
            errorCategories[errorType].push(failure);
        });
        
        // Calculate failure trends
        const last24Hours = recentFailures.filter(f => 
            new Date(f.attemptedAt).getTime() > Date.now() - (24 * 60 * 60 * 1000)
        ).length;
        
        const lastHour = recentFailures.filter(f => 
            new Date(f.attemptedAt).getTime() > Date.now() - (60 * 60 * 1000)
        ).length;
        
        return res.status(200).json({
            queryType: 'recent_failures',
            totalFailures: recentFailures.length,
            failures: recentFailures,
            errorCategories: Object.keys(errorCategories).map(type => ({
                type,
                count: errorCategories[type].length,
                percentage: Math.round((errorCategories[type].length / recentFailures.length) * 100)
            })),
            trends: {
                last24Hours,
                lastHour,
                averagePerHour: Math.round(last24Hours / 24)
            },
            status: 'success',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Recent failures request failed:', error);
        throw error;
    }
}

/**
 * Handle platform statistics request
 */
async function handlePlatformStatsRequest(req, res, tracker) {
    try {
        const days = parseInt(req.query.days || req.body?.days || '7');
        
        const platformStats = await tracker.getSuccessRateByPlatform(days);
        
        // Sort by success rate (best performing first)
        platformStats.sort((a, b) => b.successRate - a.successRate);
        
        // Calculate overall statistics
        const totalAttempts = platformStats.reduce((sum, stat) => sum + stat.totalAttempts, 0);
        const totalSuccessful = platformStats.reduce((sum, stat) => sum + stat.successfulAttempts, 0);
        const overallSuccessRate = totalAttempts > 0 ? (totalSuccessful / totalAttempts) * 100 : 0;
        
        // Identify best and worst performing platforms
        const bestPlatform = platformStats[0];
        const worstPlatform = platformStats[platformStats.length - 1];
        
        return res.status(200).json({
            queryType: 'platform_stats',
            dateRange: {
                days,
                from: new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString(),
                to: new Date().toISOString()
            },
            overall: {
                totalAttempts,
                totalSuccessful,
                successRate: Math.round(overallSuccessRate * 100) / 100,
                platformCount: platformStats.length
            },
            platforms: platformStats.map(stat => ({
                ...stat,
                successRate: Math.round(stat.successRate * 10000) / 100 // Round to 2 decimal places
            })),
            insights: {
                bestPerforming: bestPlatform ? {
                    platform: bestPlatform.platform,
                    successRate: Math.round(bestPlatform.successRate * 10000) / 100
                } : null,
                worstPerforming: worstPlatform ? {
                    platform: worstPlatform.platform,
                    successRate: Math.round(worstPlatform.successRate * 10000) / 100
                } : null,
                averageSuccessRate: platformStats.length > 0 
                    ? Math.round((platformStats.reduce((sum, stat) => sum + stat.successRate, 0) / platformStats.length) * 10000) / 100
                    : 0
            },
            status: 'success',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Platform stats request failed:', error);
        throw error;
    }
}

/**
 * Handle health check request
 */
async function handleHealthCheckRequest(req, res, tracker) {
    try {
        // Get recent metrics for health assessment
        const fromDate = new Date(Date.now() - (60 * 60 * 1000)); // Last hour
        const metrics = await tracker.getParsingMetrics(fromDate);
        
        // Determine health status
        let healthStatus = 'healthy';
        const issues = [];
        
        // Check success rate
        const recentSuccessRate = metrics.totalAttempts > 0 
            ? (metrics.successfulAttempts / metrics.totalAttempts) * 100 
            : 100;
            
        if (recentSuccessRate < 50) {
            healthStatus = 'critical';
            issues.push('Very low success rate in the last hour');
        } else if (recentSuccessRate < 80) {
            healthStatus = 'degraded';
            issues.push('Below normal success rate in the last hour');
        }
        
        // Check processing time
        if (metrics.averageProcessingTime > 15000) { // 15 seconds
            if (healthStatus === 'healthy') healthStatus = 'degraded';
            issues.push('High average processing time detected');
        }
        
        // Check for common error patterns
        const criticalErrors = metrics.commonErrors.filter(error => 
            error.error.includes('WebLLM') || 
            error.error.includes('Timeout') ||
            error.count > 10
        );
        
        if (criticalErrors.length > 0) {
            if (healthStatus === 'healthy') healthStatus = 'degraded';
            issues.push(`Critical errors detected: ${criticalErrors.map(e => e.error).join(', ')}`);
        }
        
        // System capabilities check
        const capabilities = {
            webllmEnabled: process.env.ENABLE_AUTO_PARSING !== 'false',
            crossValidation: true, // Always available
            duplicateDetection: true, // Always available
            errorTracking: true, // Always available
            rateLimiting: true // Always available
        };
        
        return res.status(200).json({
            queryType: 'health_check',
            healthStatus,
            lastHourMetrics: {
                totalAttempts: metrics.totalAttempts,
                successRate: Math.round(recentSuccessRate * 100) / 100,
                averageProcessingTime: Math.round(metrics.averageProcessingTime),
                averageConfidence: Math.round(metrics.averageConfidence * 100)
            },
            issues,
            capabilities,
            systemInfo: {
                autoParsingEnabled: process.env.ENABLE_AUTO_PARSING !== 'false',
                environment: process.env.NODE_ENV || 'unknown',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            },
            status: 'success',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Health check failed:', error);
        
        return res.status(200).json({
            queryType: 'health_check',
            healthStatus: 'critical',
            issues: ['Health check system failure'],
            error: error.message,
            status: 'error',
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Categorize error message for analysis
 */
function categorizeError(errorMessage) {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('timeout') || message.includes('time out')) {
        return 'Timeout Error';
    }
    if (message.includes('network') || message.includes('connection')) {
        return 'Network Error';
    }
    if (message.includes('403') || message.includes('blocked')) {
        return 'Access Blocked';
    }
    if (message.includes('404') || message.includes('not found')) {
        return 'Page Not Found';
    }
    if (message.includes('webllm') || message.includes('ai') || message.includes('model')) {
        return 'WebLLM Error';
    }
    if (message.includes('parse') || message.includes('json')) {
        return 'Parsing Error';
    }
    if (message.includes('rate limit')) {
        return 'Rate Limited';
    }
    if (message.includes('invalid') || message.includes('malformed')) {
        return 'Invalid Input';
    }
    
    return 'Unknown Error';
}