#!/usr/bin/env node

/**
 * WebLLM Parsing Health Check Script
 * Performs system health checks for parsing functionality
 * Run: node scripts/health-check-parsing.js
 */

const { PrismaClient } = require('@prisma/client');

class ParsingHealthCheck {
    constructor() {
        this.checks = [];
        this.prisma = new PrismaClient();
    }

    async runHealthCheck() {
        console.log('🏥 WebLLM Parsing System Health Check\n');
        
        // Database connectivity
        await this.checkDatabaseConnection();
        
        // Environment configuration
        await this.checkEnvironmentConfig();
        
        // Feature flags
        await this.checkFeatureFlags();
        
        // Recent parsing performance
        await this.checkRecentPerformance();
        
        // API endpoints
        await this.checkApiEndpoints();
        
        // Display summary
        this.displayHealthSummary();
        
        await this.prisma.$disconnect();
    }

    async checkDatabaseConnection() {
        const checkName = 'Database Connection';
        console.log(`🔌 Checking ${checkName}...`);
        
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            
            // Check if parsing tables exist
            const jobListingsCount = await this.prisma.jobListing.count();
            const parsingAttemptsCount = await this.prisma.parsingAttempt.count();
            
            this.recordCheck(checkName, 'HEALTHY', {
                status: 'Connected',
                jobListings: jobListingsCount,
                parsingAttempts: parsingAttemptsCount
            });
            
        } catch (error) {
            this.recordCheck(checkName, 'CRITICAL', {
                error: error.message,
                recommendation: 'Check database connection and ensure Prisma migrations are run'
            });
        }
    }

    async checkEnvironmentConfig() {
        const checkName = 'Environment Configuration';
        console.log(`⚙️  Checking ${checkName}...`);
        
        const requiredEnvVars = [
            'DATABASE_URL'
        ];
        
        const parsingEnvVars = [
            'ENABLE_AUTO_PARSING',
            'AUTO_PARSING_TIMEOUT_MS',
            'AUTO_PARSING_CONFIDENCE_THRESHOLD',
            'AUTO_PARSING_MAX_ATTEMPTS',
            'AUTO_PARSING_RATE_LIMIT_PER_HOUR',
            'ENABLE_CROSS_VALIDATION',
            'ENABLE_DUPLICATE_DETECTION'
        ];
        
        const issues = [];
        const config = {};
        
        // Check required variables
        requiredEnvVars.forEach(envVar => {
            const value = process.env[envVar];
            config[envVar] = value ? 'Set' : 'Missing';
            if (!value) {
                issues.push(`Missing required environment variable: ${envVar}`);
            }
        });
        
        // Check parsing-specific variables
        parsingEnvVars.forEach(envVar => {
            const value = process.env[envVar];
            config[envVar] = value || 'Using default';
        });
        
        // Validate numeric values
        const numericValidations = [
            { key: 'AUTO_PARSING_TIMEOUT_MS', min: 5000, max: 30000 },
            { key: 'AUTO_PARSING_CONFIDENCE_THRESHOLD', min: 0, max: 1 },
            { key: 'AUTO_PARSING_MAX_ATTEMPTS', min: 1, max: 10 },
            { key: 'AUTO_PARSING_RATE_LIMIT_PER_HOUR', min: 1, max: 1000 }
        ];
        
        numericValidations.forEach(({ key, min, max }) => {
            const value = process.env[key];
            if (value) {
                const numValue = parseFloat(value);
                if (isNaN(numValue) || numValue < min || numValue > max) {
                    issues.push(`${key} should be between ${min} and ${max}, got: ${value}`);
                }
            }
        });
        
        const status = issues.length === 0 ? 'HEALTHY' : 
                      issues.length <= 2 ? 'WARNING' : 'CRITICAL';
        
        this.recordCheck(checkName, status, { config, issues });
    }

    async checkFeatureFlags() {
        const checkName = 'Feature Flags';
        console.log(`🏁 Checking ${checkName}...`);
        
        try {
            const flags = {
                autoParsingEnabled: process.env.ENABLE_AUTO_PARSING !== 'false',
                crossValidationEnabled: process.env.ENABLE_CROSS_VALIDATION !== 'false',
                duplicateDetectionEnabled: process.env.ENABLE_DUPLICATE_DETECTION !== 'false'
            };
            
            const warnings = [];
            
            if (!flags.autoParsingEnabled) {
                warnings.push('Auto-parsing is disabled - manual entry only');
            }
            
            if (flags.autoParsingEnabled && !flags.crossValidationEnabled) {
                warnings.push('Cross-validation is disabled - reduced accuracy');
            }
            
            if (flags.autoParsingEnabled && !flags.duplicateDetectionEnabled) {
                warnings.push('Duplicate detection is disabled - may create duplicates');
            }
            
            const status = warnings.length === 0 ? 'HEALTHY' : 'WARNING';
            
            this.recordCheck(checkName, status, { flags, warnings });
            
        } catch (error) {
            this.recordCheck(checkName, 'CRITICAL', {
                error: error.message,
                recommendation: 'Check feature flag implementation'
            });
        }
    }

    async checkRecentPerformance() {
        const checkName = 'Recent Performance';
        console.log(`📊 Checking ${checkName}...`);
        
        try {
            const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
            
            const recentAttempts = await this.prisma.parsingAttempt.findMany({
                where: {
                    attemptedAt: {
                        gte: sixHoursAgo
                    }
                }
            });
            
            if (recentAttempts.length === 0) {
                this.recordCheck(checkName, 'WARNING', {
                    message: 'No parsing attempts in the last 6 hours',
                    recommendation: 'This might be normal if the system is not actively used'
                });
                return;
            }
            
            const successfulAttempts = recentAttempts.filter(attempt => attempt.success);
            const successRate = (successfulAttempts.length / recentAttempts.length) * 100;
            const avgProcessingTime = recentAttempts.reduce((sum, attempt) => 
                sum + attempt.processingTimeMs, 0) / recentAttempts.length;
            
            let status = 'HEALTHY';
            const issues = [];
            
            if (successRate < 70) {
                status = 'CRITICAL';
                issues.push(`Low success rate: ${successRate.toFixed(1)}%`);
            } else if (successRate < 85) {
                status = 'WARNING';
                issues.push(`Below optimal success rate: ${successRate.toFixed(1)}%`);
            }
            
            if (avgProcessingTime > 15000) {
                status = status === 'HEALTHY' ? 'WARNING' : status;
                issues.push(`High processing time: ${avgProcessingTime.toFixed(0)}ms`);
            }
            
            this.recordCheck(checkName, status, {
                totalAttempts: recentAttempts.length,
                successRate: `${successRate.toFixed(1)}%`,
                avgProcessingTime: `${avgProcessingTime.toFixed(0)}ms`,
                issues
            });
            
        } catch (error) {
            this.recordCheck(checkName, 'WARNING', {
                error: error.message,
                recommendation: 'Unable to analyze recent performance'
            });
        }
    }

    async checkApiEndpoints() {
        const checkName = 'API Endpoints';
        console.log(`🌐 Checking ${checkName}...`);
        
        try {
            // This is a basic check - in a real environment, you might make actual HTTP requests
            const endpoints = [
                '/api/parse-preview',
                '/api/validation-status',
                '/api/analyze'
            ];
            
            // Check if the API files exist
            const fs = require('fs');
            const path = require('path');
            
            const endpointStatus = {};
            let healthyEndpoints = 0;
            
            endpoints.forEach(endpoint => {
                const filePath = path.join(process.cwd(), 'api', endpoint.replace('/api/', '') + '.js');
                const exists = fs.existsSync(filePath);
                endpointStatus[endpoint] = exists ? 'Available' : 'Missing';
                if (exists) healthyEndpoints++;
            });
            
            const status = healthyEndpoints === endpoints.length ? 'HEALTHY' :
                          healthyEndpoints > 0 ? 'WARNING' : 'CRITICAL';
            
            this.recordCheck(checkName, status, {
                endpoints: endpointStatus,
                healthyCount: `${healthyEndpoints}/${endpoints.length}`
            });
            
        } catch (error) {
            this.recordCheck(checkName, 'WARNING', {
                error: error.message,
                recommendation: 'Unable to verify API endpoint availability'
            });
        }
    }

    recordCheck(name, status, details) {
        const statusEmoji = {
            'HEALTHY': '✅',
            'WARNING': '⚠️',
            'CRITICAL': '❌'
        };
        
        console.log(`   ${statusEmoji[status]} ${name}: ${status}`);
        
        this.checks.push({
            name,
            status,
            details,
            timestamp: new Date().toISOString()
        });
        
        if (details.issues && details.issues.length > 0) {
            details.issues.forEach(issue => {
                console.log(`      - ${issue}`);
            });
        }
        
        if (details.warnings && details.warnings.length > 0) {
            details.warnings.forEach(warning => {
                console.log(`      - ${warning}`);
            });
        }
        
        console.log(); // Empty line for readability
    }

    displayHealthSummary() {
        const healthyCount = this.checks.filter(check => check.status === 'HEALTHY').length;
        const warningCount = this.checks.filter(check => check.status === 'WARNING').length;
        const criticalCount = this.checks.filter(check => check.status === 'CRITICAL').length;
        
        console.log('🏥 HEALTH SUMMARY');
        console.log('='.repeat(50));
        console.log(`Total Checks: ${this.checks.length}`);
        console.log(`✅ Healthy: ${healthyCount}`);
        console.log(`⚠️  Warning: ${warningCount}`);
        console.log(`❌ Critical: ${criticalCount}`);
        console.log();
        
        // Overall health status
        let overallStatus;
        if (criticalCount > 0) {
            overallStatus = '❌ CRITICAL - Immediate attention required';
        } else if (warningCount > 0) {
            overallStatus = '⚠️  WARNING - Monitoring recommended';
        } else {
            overallStatus = '✅ HEALTHY - All systems operational';
        }
        
        console.log(`Overall Status: ${overallStatus}`);
        console.log();
        
        // Recommendations
        console.log('💡 RECOMMENDATIONS:');
        console.log('-'.repeat(30));
        
        const criticalChecks = this.checks.filter(check => check.status === 'CRITICAL');
        const warningChecks = this.checks.filter(check => check.status === 'WARNING');
        
        if (criticalChecks.length > 0) {
            console.log('🚨 CRITICAL ISSUES (Fix immediately):');
            criticalChecks.forEach(check => {
                console.log(`   • ${check.name}`);
                if (check.details.recommendation) {
                    console.log(`     Action: ${check.details.recommendation}`);
                }
            });
            console.log();
        }
        
        if (warningChecks.length > 0) {
            console.log('⚠️  WARNINGS (Address when possible):');
            warningChecks.forEach(check => {
                console.log(`   • ${check.name}`);
                if (check.details.recommendation) {
                    console.log(`     Suggestion: ${check.details.recommendation}`);
                }
            });
            console.log();
        }
        
        if (criticalCount === 0 && warningCount === 0) {
            console.log('🎉 All systems are healthy!');
            console.log('💻 Consider running periodic health checks to maintain system health.');
            console.log('📊 Monitor parsing performance regularly with monitor-parsing-performance.js');
        }
        
        console.log();
        console.log(`Health check completed at: ${new Date().toISOString()}`);
    }
}

// Run health check if called directly
if (require.main === module) {
    const healthCheck = new ParsingHealthCheck();
    healthCheck.runHealthCheck().catch(console.error);
}

module.exports = { ParsingHealthCheck };