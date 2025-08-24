#!/usr/bin/env node

/**
 * Master Test Runner for Algorithm Core v0.1.8 Phases 5 & 6
 * Coordinates comprehensive testing of Company Reputation and Engagement Signal services
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Test configuration
const TEST_CONFIG = {
    timeout: 30000, // 30 seconds per test
    phases: [
        {
            phase: 5,
            name: 'Company Reputation Scoring',
            script: 'test-company-reputation.js',
            description: 'Tests reputation analysis, historical data processing, and adjustment calculations'
        },
        {
            phase: 6,
            name: 'Engagement Signal Integration',
            script: 'test-engagement-signals.js', 
            description: 'Tests application outcome analysis, engagement scoring, and hiring activity detection'
        },
        {
            phase: 'Integration',
            name: 'Complete Algorithm Integration',
            script: 'test-algorithm-v018-complete.js',
            description: 'Tests all 6 phases working together in production-like scenarios'
        }
    ]
};

async function runTestScript(scriptPath, phaseName) {
    console.log(`\n🚀 Running ${phaseName} Tests...`);
    console.log('='.repeat(50));
    
    const startTime = Date.now();
    
    try {
        // Check if script exists
        await fs.access(scriptPath);
        
        // Run the test script
        const { stdout, stderr } = await execAsync(`node "${scriptPath}"`, {
            timeout: TEST_CONFIG.timeout,
            cwd: process.cwd()
        });
        
        const duration = Date.now() - startTime;
        
        if (stdout) {
            console.log(stdout);
        }
        
        if (stderr) {
            console.error('⚠️ Warnings/Errors:', stderr);
        }
        
        console.log(`\n✅ ${phaseName} tests completed in ${duration}ms`);
        return { success: true, duration, output: stdout };
        
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`\n❌ ${phaseName} tests failed after ${duration}ms:`);
        console.error(error.message);
        
        if (error.stdout) {
            console.log('\n📋 Partial Output:');
            console.log(error.stdout);
        }
        
        return { success: false, duration, error: error.message };
    }
}

async function generateTestReport(results) {
    console.log('\n📊 TESTING SUMMARY REPORT');
    console.log('='.repeat(60));
    
    let totalTests = 0;
    let passedTests = 0;
    let totalDuration = 0;
    
    const report = {
        timestamp: new Date().toISOString(),
        algorithmVersion: 'v0.1.8-hybrid-v6-final',
        results: {}
    };
    
    for (const [phaseName, result] of Object.entries(results)) {
        totalTests++;
        totalDuration += result.duration;
        
        if (result.success) {
            passedTests++;
            console.log(`✅ ${phaseName}: PASSED (${result.duration}ms)`);
        } else {
            console.log(`❌ ${phaseName}: FAILED (${result.duration}ms)`);
            console.log(`   Error: ${result.error}`);
        }
        
        report.results[phaseName] = {
            success: result.success,
            duration: result.duration,
            error: result.error || null
        };
    }
    
    const successRate = (passedTests / totalTests) * 100;
    
    console.log('\n📈 Overall Statistics:');
    console.log(`   Tests Run: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${totalTests - passedTests}`);
    console.log(`   Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`   Total Duration: ${totalDuration}ms`);
    console.log(`   Average Duration: ${Math.round(totalDuration / totalTests)}ms`);
    
    report.summary = {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        successRate,
        totalDuration,
        averageDuration: Math.round(totalDuration / totalTests)
    };
    
    // Save report to file
    const reportPath = path.join(process.cwd(), 'temp', 'phase-5-6-test-report.json');
    try {
        await fs.mkdir(path.dirname(reportPath), { recursive: true });
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n💾 Test report saved to: ${reportPath}`);
    } catch (error) {
        console.warn(`⚠️ Could not save test report: ${error.message}`);
    }
    
    return report;
}

async function validateEnvironment() {
    console.log('🔍 Validating Test Environment...');
    console.log('-'.repeat(40));
    
    try {
        // Check Node.js version
        const { stdout: nodeVersion } = await execAsync('node --version');
        console.log(`✅ Node.js: ${nodeVersion.trim()}`);
        
        // Check npm version
        const { stdout: npmVersion } = await execAsync('npm --version');
        console.log(`✅ npm: ${npmVersion.trim()}`);
        
        // Check database connection
        try {
            await execAsync('node -e "import { PrismaClient } from \'@prisma/client\'; const prisma = new PrismaClient(); await prisma.$connect(); console.log(\'Database connected\'); await prisma.$disconnect();"');
            console.log('✅ Database: Connected');
        } catch (dbError) {
            console.log('⚠️ Database: Connection issues detected');
        }
        
        // Check required service files
        const requiredServices = [
            'lib/services/CompanyReputationService.js',
            'lib/services/EngagementSignalService.js'
        ];
        
        for (const service of requiredServices) {
            try {
                await fs.access(service);
                console.log(`✅ Service: ${service}`);
            } catch {
                console.log(`❌ Service: ${service} (MISSING)`);
                throw new Error(`Required service file missing: ${service}`);
            }
        }
        
        console.log('✅ Environment validation completed successfully\n');
        
    } catch (error) {
        console.error('❌ Environment validation failed:', error.message);
        throw error;
    }
}

async function runPhases5and6Tests() {
    console.log('🧪 ALGORITHM CORE v0.1.8 - PHASES 5 & 6 TESTING');
    console.log('🏢 Phase 5: Company Reputation Scoring');
    console.log('📊 Phase 6: Engagement Signal Integration');
    console.log('='.repeat(70));
    
    try {
        // Validate environment
        await validateEnvironment();
        
        // Run all configured tests
        const results = {};
        
        for (const phaseConfig of TEST_CONFIG.phases) {
            const scriptPath = path.join('scripts', phaseConfig.script);
            const phaseName = `Phase ${phaseConfig.phase}: ${phaseConfig.name}`;
            
            console.log(`\n📋 ${phaseName}`);
            console.log(`📝 ${phaseConfig.description}`);
            
            const result = await runTestScript(scriptPath, phaseName);
            results[phaseName] = result;
            
            // Brief pause between tests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Generate comprehensive report
        const report = await generateTestReport(results);
        
        // Final assessment
        if (report.summary.successRate === 100) {
            console.log('\n🎉 ALL TESTS PASSED!');
            console.log('✅ Phases 5 & 6 are ready for production deployment');
            console.log('🚀 Algorithm Core v0.1.8 testing completed successfully');
        } else if (report.summary.successRate >= 80) {
            console.log('\n⚠️ MOSTLY SUCCESSFUL');
            console.log('🔧 Some tests failed but core functionality appears intact');
            console.log('📝 Review failed tests before deployment');
        } else {
            console.log('\n❌ SIGNIFICANT ISSUES DETECTED');
            console.log('🔧 Multiple test failures - investigation required');
            console.log('⛔ Do not deploy until issues are resolved');
        }
        
        return report;
        
    } catch (error) {
        console.error('\n💥 Test execution failed:', error.message);
        process.exit(1);
    }
}

// Progress indicators and user feedback
function displayProgressHeader() {
    console.log('\n📊 Test Progress Indicators:');
    console.log('   🚀 = Test starting');
    console.log('   ✅ = Test passed'); 
    console.log('   ❌ = Test failed');
    console.log('   ⚠️ = Warning/partial failure');
    console.log('   🔧 = Action required');
    console.log('   💾 = Data saved');
    console.log('   📋 = Information');
    console.log('');
}

// Main execution
async function main() {
    displayProgressHeader();
    
    const startTime = Date.now();
    
    try {
        const report = await runPhases5and6Tests();
        const totalTime = Date.now() - startTime;
        
        console.log('\n' + '='.repeat(70));
        console.log(`🏁 TESTING COMPLETED IN ${Math.round(totalTime / 1000)} SECONDS`);
        console.log('='.repeat(70));
        
        // Update todo list based on results
        if (report.summary.successRate === 100) {
            console.log('\n📋 TODO LIST UPDATES:');
            console.log('✅ Phase 5: Deploy and test reputation system → READY');
            console.log('✅ Phase 6: Deploy and test engagement tracking → READY');
            console.log('🚀 Both phases tested and validated for deployment');
        }
        
        process.exit(report.summary.successRate === 100 ? 0 : 1);
        
    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error(`\n💥 Testing failed after ${Math.round(totalTime / 1000)} seconds:`, error.message);
        process.exit(1);
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { runPhases5and6Tests, validateEnvironment, generateTestReport };