/**
 * URL Validation System Test Script
 * Tests the enhanced validation system against various URL types
 */

import { URLValidationService } from './lib/services/validation/URLValidationService.js';

const validator = new URLValidationService();

// Test cases organized by expected outcome
const testCases = [
    {
        category: 'Company Homepages (Should be BLOCKED)',
        urls: [
            'https://www.paymentworks.com/',  // The problematic URL from screenshot
            'https://microsoft.com/',
            'https://google.com/about',
            'https://company.com/contact',
            'https://example.com/'
        ],
        expectedResult: 'BLOCKED'
    },
    {
        category: 'General Career Pages (Should be BLOCKED)',
        urls: [
            'https://microsoft.com/careers/',
            'https://google.com/jobs',
            'https://linkedin.com/jobs',
            'https://indeed.com/',
            'https://company.com/careers'
        ],
        expectedResult: 'BLOCKED'
    },
    {
        category: 'Legitimate Job Postings (Should be ALLOWED)',
        urls: [
            'https://www.linkedin.com/jobs/view/1234567890',
            'https://www.indeed.com/viewjob?jk=abc123def456',
            'https://boards.greenhouse.io/company/jobs/1234567',
            'https://company.myworkdayjobs.com/en-US/careers/job/123456/Software-Engineer',
            'https://jobs.lever.co/company/12345678-1234-1234-1234-123456789012'
        ],
        expectedResult: 'ALLOWED'
    },
    {
        category: 'Edge Cases',
        urls: [
            'https://linkedin.com/jobs/collections/recommended',  // LinkedIn collections - should be allowed
            'https://monster.com/jobs/search',  // Job search page - might be blocked
            'https://ziprecruiter.com/jobs/software-engineer-123456'  // Specific job - should be allowed
        ],
        expectedResult: 'VARIES'
    }
];

async function runValidationTests() {
    console.log('🧪 Starting URL Validation System Tests\n');
    console.log('=' .repeat(80));
    
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    const results = [];

    for (const testGroup of testCases) {
        console.log(`\n📊 ${testGroup.category}`);
        console.log('-'.repeat(testGroup.category.length + 4));
        
        for (const url of testGroup.urls) {
            totalTests++;
            console.log(`\n🔍 Testing: ${url}`);
            
            try {
                const validationResult = await validator.validateURL(url);
                const isBlocked = !validationResult.isValid;
                const hasBlockingErrors = validationResult.errors.some(e => e.severity === 'blocking');
                
                let status = 'UNKNOWN';
                let testPassed = false;
                
                if (isBlocked && hasBlockingErrors) {
                    status = 'BLOCKED';
                    const blockingError = validationResult.errors.find(e => e.severity === 'blocking');
                    console.log(`   ❌ BLOCKED: ${blockingError.code} - ${blockingError.message}`);
                    console.log(`   💡 Suggestion: ${blockingError.suggestion}`);
                    
                    testPassed = (testGroup.expectedResult === 'BLOCKED');
                } else {
                    status = 'ALLOWED';
                    console.log(`   ✅ ALLOWED: Confidence ${(validationResult.confidence * 100).toFixed(1)}%`);
                    if (validationResult.warnings.length > 0) {
                        console.log(`   ⚠️  Warnings: ${validationResult.warnings.length} issues detected`);
                    }
                    
                    testPassed = (testGroup.expectedResult === 'ALLOWED');
                }
                
                // Handle edge cases
                if (testGroup.expectedResult === 'VARIES') {
                    testPassed = true; // Edge cases are informational
                }
                
                if (testPassed) {
                    passedTests++;
                    console.log(`   ✅ TEST PASSED`);
                } else {
                    failedTests++;
                    console.log(`   ❌ TEST FAILED - Expected ${testGroup.expectedResult}, got ${status}`);
                }
                
                results.push({
                    url,
                    category: testGroup.category,
                    expected: testGroup.expectedResult,
                    actual: status,
                    passed: testPassed,
                    confidence: validationResult.confidence,
                    errors: validationResult.errors.length,
                    warnings: validationResult.warnings.length,
                    processingTime: validationResult.metadata.processingTimeMs
                });
                
            } catch (error) {
                failedTests++;
                console.log(`   💥 ERROR: ${error.message}`);
                
                results.push({
                    url,
                    category: testGroup.category,
                    expected: testGroup.expectedResult,
                    actual: 'ERROR',
                    passed: false,
                    error: error.message
                });
            }
            
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} (${(passedTests/totalTests*100).toFixed(1)}%)`);
    console.log(`Failed: ${failedTests} (${(failedTests/totalTests*100).toFixed(1)}%)`);
    
    // Key validation check
    const paymentworksResult = results.find(r => r.url.includes('paymentworks.com'));
    if (paymentworksResult) {
        console.log('\n🎯 KEY VALIDATION CHECK:');
        console.log(`PaymentWorks URL: ${paymentworksResult.actual} (Expected: BLOCKED)`);
        if (paymentworksResult.actual === 'BLOCKED') {
            console.log('✅ SUCCESS: Company homepage correctly blocked!');
        } else {
            console.log('❌ FAILURE: Company homepage should be blocked!');
        }
    }
    
    // Performance summary
    const avgProcessingTime = results
        .filter(r => r.processingTime)
        .reduce((sum, r) => sum + r.processingTime, 0) / results.filter(r => r.processingTime).length;
    
    console.log(`\n⚡ Average processing time: ${avgProcessingTime?.toFixed(0) || 'N/A'}ms`);
    
    // Category breakdown
    console.log('\n📈 RESULTS BY CATEGORY:');
    for (const testGroup of testCases) {
        const categoryResults = results.filter(r => r.category === testGroup.category);
        const categoryPassed = categoryResults.filter(r => r.passed).length;
        console.log(`${testGroup.category}: ${categoryPassed}/${categoryResults.length} passed`);
    }
    
    return {
        totalTests,
        passedTests,
        failedTests,
        results,
        success: failedTests === 0
    };
}

// Run the tests
runValidationTests()
    .then((summary) => {
        if (summary.success) {
            console.log('\n🎉 ALL TESTS PASSED! URL validation system is working correctly.');
        } else {
            console.log('\n⚠️  Some tests failed. Review the results above.');
        }
        process.exit(summary.success ? 0 : 1);
    })
    .catch((error) => {
        console.error('\n💥 Test execution failed:', error);
        process.exit(1);
    });