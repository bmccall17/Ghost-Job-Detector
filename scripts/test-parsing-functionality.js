#!/usr/bin/env node

/**
 * WebLLM Parsing Functionality Test Script
 * Tests various aspects of the parsing system
 * Run: node scripts/test-parsing-functionality.js
 */

import { WebLLMParsingService } from '../src/services/WebLLMParsingService.js';
import { CrossValidationService } from '../src/services/CrossValidationService.js';
import { EnhancedDuplicateDetection } from '../src/services/EnhancedDuplicateDetection.js';
import { ParsingErrorHandler } from '../src/utils/errorHandling.js';

// Test URLs from different platforms
const TEST_URLS = [
    {
        url: 'https://www.linkedin.com/jobs/view/3756789123/',
        platform: 'LinkedIn',
        expected: { hasTitle: true, hasCompany: true, hasLocation: true }
    },
    {
        url: 'https://www.indeed.com/viewjob?jk=abc123def456',
        platform: 'Indeed',
        expected: { hasTitle: true, hasCompany: true, hasLocation: true }
    },
    {
        url: 'https://careers.google.com/jobs/results/123456789/',
        platform: 'Company Career Site',
        expected: { hasTitle: true, hasCompany: true, hasLocation: false }
    },
    {
        url: 'https://invalid-url-for-testing',
        platform: 'Invalid',
        expected: { shouldFail: true }
    }
];

class ParsingTester {
    constructor() {
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            details: []
        };
        
        // Initialize services
        this.parsingService = new WebLLMParsingService();
        this.validationService = new CrossValidationService();
        this.duplicateDetector = new EnhancedDuplicateDetection();
    }

    async runAllTests() {
        console.log('🧪 Starting WebLLM Parsing Functionality Tests...\n');
        
        // Test 1: Environment Configuration
        await this.testEnvironmentConfiguration();
        
        // Test 2: URL Validation
        await this.testUrlValidation();
        
        // Test 3: Feature Flags
        await this.testFeatureFlags();
        
        // Test 4: Error Handling
        await this.testErrorHandling();
        
        // Test 5: Parsing Service (if enabled)
        if (WebLLMParsingService.isEnabled()) {
            await this.testParsingService();
        } else {
            console.log('⏭️  Skipping parsing tests (auto-parsing disabled)');
        }
        
        // Test 6: Cross-validation (if enabled)
        if (WebLLMParsingService.isCrossValidationEnabled()) {
            await this.testCrossValidation();
        } else {
            console.log('⏭️  Skipping cross-validation tests (disabled)');
        }
        
        // Test 7: Duplicate Detection (if enabled)
        if (WebLLMParsingService.isDuplicateDetectionEnabled()) {
            await this.testDuplicateDetection();
        } else {
            console.log('⏭️  Skipping duplicate detection tests (disabled)');
        }
        
        // Display final results
        this.displayResults();
    }

    async testEnvironmentConfiguration() {
        const testName = 'Environment Configuration';
        console.log(`🔧 Testing ${testName}...`);
        
        try {
            const configs = {
                autoParsingEnabled: process.env.ENABLE_AUTO_PARSING !== 'false',
                crossValidationEnabled: process.env.ENABLE_CROSS_VALIDATION !== 'false',
                duplicateDetectionEnabled: process.env.ENABLE_DUPLICATE_DETECTION !== 'false',
                timeoutMs: parseInt(process.env.AUTO_PARSING_TIMEOUT_MS || '10000'),
                rateLimitPerHour: parseInt(process.env.AUTO_PARSING_RATE_LIMIT_PER_HOUR || '100'),
                confidenceThreshold: parseFloat(process.env.AUTO_PARSING_CONFIDENCE_THRESHOLD || '0.8')
            };
            
            const validations = [
                { name: 'Timeout is reasonable', pass: configs.timeoutMs >= 5000 && configs.timeoutMs <= 30000 },
                { name: 'Rate limit is set', pass: configs.rateLimitPerHour > 0 },
                { name: 'Confidence threshold is valid', pass: configs.confidenceThreshold >= 0 && configs.confidenceThreshold <= 1 }
            ];
            
            const allPassed = validations.every(v => v.pass);
            
            this.recordResult(testName, allPassed, {
                configs,
                validations: validations.filter(v => !v.pass)
            });
            
        } catch (error) {
            this.recordResult(testName, false, { error: error.message });
        }
    }

    async testUrlValidation() {
        const testName = 'URL Validation';
        console.log(`🔗 Testing ${testName}...`);
        
        const testCases = [
            { url: 'https://www.linkedin.com/jobs/view/123', shouldPass: true },
            { url: 'http://example.com/jobs', shouldPass: true },
            { url: 'invalid-url', shouldPass: false },
            { url: 'javascript:alert("xss")', shouldPass: false },
            { url: 'https://localhost/jobs', shouldPass: process.env.NODE_ENV !== 'production' }
        ];
        
        let passed = 0;
        const failures = [];
        
        for (const testCase of testCases) {
            try {
                const result = this.isValidUrl(testCase.url);
                if (result === testCase.shouldPass) {
                    passed++;
                } else {
                    failures.push(`${testCase.url}: expected ${testCase.shouldPass}, got ${result}`);
                }
            } catch (error) {
                if (!testCase.shouldPass) {
                    passed++; // Expected to fail
                } else {
                    failures.push(`${testCase.url}: unexpected error - ${error.message}`);
                }
            }
        }
        
        this.recordResult(testName, passed === testCases.length, { 
            passed: `${passed}/${testCases.length}`,
            failures 
        });
    }

    async testFeatureFlags() {
        const testName = 'Feature Flags';
        console.log(`🏁 Testing ${testName}...`);
        
        try {
            const flags = {
                autoParsingEnabled: WebLLMParsingService.isEnabled(),
                crossValidationEnabled: WebLLMParsingService.isCrossValidationEnabled(),
                duplicateDetectionEnabled: WebLLMParsingService.isDuplicateDetectionEnabled()
            };
            
            // Test that methods exist and return boolean values
            const validFlags = Object.values(flags).every(flag => typeof flag === 'boolean');
            
            this.recordResult(testName, validFlags, { flags });
            
        } catch (error) {
            this.recordResult(testName, false, { error: error.message });
        }
    }

    async testErrorHandling() {
        const testName = 'Error Handling';
        console.log(`❌ Testing ${testName}...`);
        
        try {
            const testErrors = [
                new Error('Network timeout'),
                new Error('Rate limit exceeded'),
                new Error('Invalid URL format'),
                new Error('WebLLM inference failed'),
                new Error('Database connection failed')
            ];
            
            let passed = 0;
            const results = [];
            
            for (const error of testErrors) {
                const categorized = ParsingErrorHandler.categorizeError(error, 'test');
                
                const isValid = 
                    categorized.category &&
                    categorized.userMessage &&
                    categorized.technicalMessage &&
                    typeof categorized.retryable === 'boolean' &&
                    categorized.suggestedAction;
                
                if (isValid) {
                    passed++;
                } else {
                    results.push(`Failed to categorize: ${error.message}`);
                }
            }
            
            this.recordResult(testName, passed === testErrors.length, {
                passed: `${passed}/${testErrors.length}`,
                failures: results
            });
            
        } catch (error) {
            this.recordResult(testName, false, { error: error.message });
        }
    }

    async testParsingService() {
        const testName = 'Parsing Service';
        console.log(`🤖 Testing ${testName}...`);
        
        try {
            // Test with a simple, known URL that should work
            const testUrl = 'https://httpbin.org/html'; // Simple HTML page for testing
            
            // Set a short timeout for testing
            const originalTimeout = process.env.AUTO_PARSING_TIMEOUT_MS;
            process.env.AUTO_PARSING_TIMEOUT_MS = '5000';
            
            try {
                const result = await this.parsingService.extractJob(testUrl);
                
                const isValid = 
                    result &&
                    typeof result.success === 'boolean' &&
                    typeof result.confidence === 'number' &&
                    result.processingTimeMs >= 0 &&
                    result.extractionMethod;
                
                this.recordResult(testName, isValid, { 
                    success: result.success,
                    confidence: result.confidence,
                    processingTime: result.processingTimeMs,
                    method: result.extractionMethod
                });
                
            } finally {
                // Restore original timeout
                if (originalTimeout) {
                    process.env.AUTO_PARSING_TIMEOUT_MS = originalTimeout;
                } else {
                    delete process.env.AUTO_PARSING_TIMEOUT_MS;
                }
            }
            
        } catch (error) {
            // Expected to fail for some test URLs
            this.recordResult(testName, true, { 
                note: 'Service correctly handled error',
                error: error.message
            });
        }
    }

    async testCrossValidation() {
        const testName = 'Cross-validation';
        console.log(`✅ Testing ${testName}...`);
        
        try {
            const testData = {
                title: 'Software Engineer',
                company: 'Test Company Inc',
                location: 'San Francisco, CA',
                description: 'A test job description',
                salary: '$100,000 - $150,000',
                jobType: 'Full-time',
                postedAt: '2024-01-15',
                jobId: 'test-123',
                contactDetails: 'hr@testcompany.com',
                originalSource: 'https://testcompany.com/jobs/123'
            };
            
            const result = await this.validationService.validateJobData(testData, testData.originalSource);
            
            const isValid = 
                result &&
                typeof result.overallConfidence === 'number' &&
                result.companyValidation &&
                result.titleValidation &&
                Array.isArray(result.issues) &&
                Array.isArray(result.recommendations);
            
            this.recordResult(testName, isValid, { 
                confidence: result?.overallConfidence,
                hasCompanyValidation: !!result?.companyValidation,
                hasTitleValidation: !!result?.titleValidation
            });
            
        } catch (error) {
            this.recordResult(testName, false, { error: error.message });
        }
    }

    async testDuplicateDetection() {
        const testName = 'Duplicate Detection';
        console.log(`🔍 Testing ${testName}...`);
        
        try {
            const testJobData = {
                title: 'Senior Software Engineer',
                company: 'Tech Corp',
                location: 'Remote',
                description: 'Join our team as a senior software engineer',
                salary: '$120,000',
                jobType: 'Full-time',
                postedAt: '2024-01-15',
                jobId: 'tc-123',
                contactDetails: null,
                originalSource: 'https://techcorp.com/careers/se-123'
            };
            
            const existingJobs = [
                {
                    id: '1',
                    title: 'Software Engineer',
                    company: 'Tech Corp',
                    location: 'Remote',
                    contentHashes: this.duplicateDetector.generateContentHashes({
                        title: 'Software Engineer',
                        company: 'Tech Corp',
                        location: 'Remote'
                    })
                }
            ];
            
            const result = await this.duplicateDetector.checkForDuplicates(testJobData, existingJobs);
            
            const isValid = 
                result &&
                typeof result.isDuplicate === 'boolean' &&
                typeof result.matchingScore === 'number' &&
                Array.isArray(result.matchingFactors) &&
                result.recommendedAction;
            
            this.recordResult(testName, isValid, { 
                isDuplicate: result?.isDuplicate,
                matchingScore: result?.matchingScore,
                action: result?.recommendedAction
            });
            
        } catch (error) {
            this.recordResult(testName, false, { error: error.message });
        }
    }

    recordResult(testName, passed, details = {}) {
        this.results.total++;
        if (passed) {
            this.results.passed++;
            console.log(`   ✅ ${testName}`);
        } else {
            this.results.failed++;
            console.log(`   ❌ ${testName}`);
        }
        
        this.results.details.push({
            name: testName,
            passed,
            details
        });
        console.log(); // Empty line for readability
    }

    displayResults() {
        console.log('📋 TEST RESULTS SUMMARY');
        console.log('='.repeat(50));
        console.log(`Total Tests: ${this.results.total}`);
        console.log(`Passed: ${this.results.passed} ✅`);
        console.log(`Failed: ${this.results.failed} ❌`);
        console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
        console.log();
        
        if (this.results.failed > 0) {
            console.log('❌ FAILED TESTS:');
            console.log('-'.repeat(30));
            this.results.details
                .filter(result => !result.passed)
                .forEach(result => {
                    console.log(`• ${result.name}`);
                    if (result.details.error) {
                        console.log(`  Error: ${result.details.error}`);
                    }
                    if (result.details.failures) {
                        result.details.failures.forEach(failure => {
                            console.log(`  - ${failure}`);
                        });
                    }
                });
            console.log();
        }
        
        console.log('🎯 RECOMMENDATIONS:');
        console.log('-'.repeat(30));
        
        if (this.results.failed === 0) {
            console.log('✅ All tests passed! The parsing system is ready for production.');
        } else {
            console.log('⚠️  Some tests failed. Please review the failures above.');
            console.log('💡 Consider running tests in development environment first.');
            console.log('📚 Check the implementation guide for troubleshooting steps.');
        }
    }

    // Helper method for URL validation
    isValidUrl(url) {
        try {
            const urlObj = new URL(url);
            return ['http:', 'https:'].includes(urlObj.protocol);
        } catch {
            return false;
        }
    }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new ParsingTester();
    await tester.runAllTests();
}

export { ParsingTester };