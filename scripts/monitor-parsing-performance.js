#!/usr/bin/env node

/**
 * Parsing Performance Monitor
 * Monitors and analyzes WebLLM parsing performance metrics
 * Run: node scripts/monitor-parsing-performance.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeParsingPerformance() {
    console.log('🔍 Analyzing WebLLM Parsing Performance...\n');
    
    try {
        // Get parsing attempts from the last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const recentAttempts = await prisma.parsingAttempt.findMany({
            where: {
                attemptedAt: {
                    gte: oneDayAgo
                }
            },
            orderBy: {
                attemptedAt: 'desc'
            }
        });

        if (recentAttempts.length === 0) {
            console.log('❌ No parsing attempts found in the last 24 hours');
            return;
        }

        // Calculate success rate
        const successfulAttempts = recentAttempts.filter(attempt => attempt.success);
        const successRate = ((successfulAttempts.length / recentAttempts.length) * 100).toFixed(2);

        // Calculate average processing time
        const avgProcessingTime = recentAttempts.reduce((sum, attempt) => sum + attempt.processingTimeMs, 0) / recentAttempts.length;

        // Analyze by platform
        const platformStats = {};
        recentAttempts.forEach(attempt => {
            const platform = attempt.metadata?.platform || 'unknown';
            if (!platformStats[platform]) {
                platformStats[platform] = { total: 0, successful: 0, totalTime: 0 };
            }
            platformStats[platform].total++;
            platformStats[platform].totalTime += attempt.processingTimeMs;
            if (attempt.success) {
                platformStats[platform].successful++;
            }
        });

        // Calculate confidence distribution
        const confidenceBuckets = { high: 0, medium: 0, low: 0 };
        successfulAttempts.forEach(attempt => {
            const confidence = attempt.confidence || 0;
            if (confidence >= 0.8) confidenceBuckets.high++;
            else if (confidence >= 0.5) confidenceBuckets.medium++;
            else confidenceBuckets.low++;
        });

        // Error analysis
        const failedAttempts = recentAttempts.filter(attempt => !attempt.success);
        const errorTypes = {};
        failedAttempts.forEach(attempt => {
            const errorType = attempt.errorMessage?.toLowerCase().includes('timeout') ? 'timeout' :
                             attempt.errorMessage?.toLowerCase().includes('network') ? 'network' :
                             attempt.errorMessage?.toLowerCase().includes('parse') ? 'parsing' :
                             'other';
            errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
        });

        // Display results
        console.log('📊 PARSING PERFORMANCE SUMMARY (Last 24 Hours)');
        console.log('='.repeat(60));
        console.log(`Total Attempts: ${recentAttempts.length}`);
        console.log(`Successful: ${successfulAttempts.length} (${successRate}%)`);
        console.log(`Failed: ${failedAttempts.length} (${(100 - successRate).toFixed(2)}%)`);
        console.log(`Average Processing Time: ${avgProcessingTime.toFixed(0)}ms`);
        console.log();

        console.log('🎯 CONFIDENCE DISTRIBUTION');
        console.log('-'.repeat(40));
        console.log(`High Confidence (80%+): ${confidenceBuckets.high}`);
        console.log(`Medium Confidence (50-79%): ${confidenceBuckets.medium}`);
        console.log(`Low Confidence (<50%): ${confidenceBuckets.low}`);
        console.log();

        console.log('🌐 PLATFORM PERFORMANCE');
        console.log('-'.repeat(40));
        Object.entries(platformStats).forEach(([platform, stats]) => {
            const platformSuccessRate = ((stats.successful / stats.total) * 100).toFixed(1);
            const avgPlatformTime = (stats.totalTime / stats.total).toFixed(0);
            console.log(`${platform}: ${stats.successful}/${stats.total} (${platformSuccessRate}%) - avg ${avgPlatformTime}ms`);
        });
        console.log();

        if (Object.keys(errorTypes).length > 0) {
            console.log('❌ ERROR ANALYSIS');
            console.log('-'.repeat(40));
            Object.entries(errorTypes).forEach(([type, count]) => {
                console.log(`${type}: ${count} occurrences`);
            });
            console.log();
        }

        // Performance recommendations
        console.log('💡 RECOMMENDATIONS');
        console.log('-'.repeat(40));
        
        if (successRate < 80) {
            console.log('⚠️  Success rate is below 80%. Consider:');
            console.log('   - Improving WebLLM prompts');
            console.log('   - Adding more robust error handling');
            console.log('   - Increasing timeout values');
        }
        
        if (avgProcessingTime > 8000) {
            console.log('⚠️  Average processing time is high. Consider:');
            console.log('   - Optimizing WebLLM model size');
            console.log('   - Implementing caching for common patterns');
            console.log('   - Reducing timeout values');
        }
        
        const highFailurePlatforms = Object.entries(platformStats).filter(([, stats]) => 
            (stats.successful / stats.total) < 0.7
        );
        
        if (highFailurePlatforms.length > 0) {
            console.log('⚠️  Low success rate platforms detected:');
            highFailurePlatforms.forEach(([platform]) => {
                console.log(`   - Consider improving ${platform} parsing logic`);
            });
        }

        console.log('\n✅ Analysis complete!');

    } catch (error) {
        console.error('❌ Error analyzing parsing performance:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run analysis if called directly
if (require.main === module) {
    analyzeParsingPerformance();
}

module.exports = { analyzeParsingPerformance };