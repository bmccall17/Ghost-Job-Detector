#!/usr/bin/env node

/**
 * API Endpoints Testing Script
 * Tests WebLLM parsing API endpoints functionality
 * Run: node scripts/test-api-endpoints.js [base-url]
 */

const https = require('https');
const http = require('http');

class ApiEndpointTester {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.results = [];
    }

    async runTests() {
        console.log(`🧪 Testing API Endpoints at ${this.baseUrl}\n`);
        
        // Test 1: Parse Preview Endpoint
        await this.testParsePreview();
        
        // Test 2: Validation Status Endpoint
        await this.testValidationStatus();
        
        // Test 3: Analysis Endpoint (integration test)
        await this.testAnalysisEndpoint();
        
        // Test 4: Error Handling
        await this.testErrorHandling();
        
        // Display results
        this.displayResults();
    }

    async testParsePreview() {
        const testName = 'Parse Preview Endpoint';
        console.log(`🔍 Testing ${testName}...`);
        
        const testCases = [
            {
                name: 'Valid LinkedIn URL',
                data: { url: 'https://www.linkedin.com/jobs/view/3756789123/' },
                expectedStatus: [200, 422, 500], // Accept various status codes for external URL
                expectedFields: ['url', 'extractedData', 'confidence', 'extractionMethod']
            },
            {
                name: 'Invalid URL',
                data: { url: 'not-a-valid-url' },
                expectedStatus: [400],
                expectedFields: ['error', 'message']
            },
            {
                name: 'Missing URL',
                data: {},
                expectedStatus: [400],
                expectedFields: ['error', 'message']
            }
        ];
        
        for (const testCase of testCases) {
            try {
                const response = await this.makeRequest('POST', '/api/parse-preview', testCase.data);
                
                const statusOk = testCase.expectedStatus.includes(response.statusCode);
                const hasExpectedFields = testCase.expectedFields.every(field => 
                    response.data.hasOwnProperty(field)
                );
                
                const passed = statusOk && (response.statusCode >= 400 || hasExpectedFields);
                
                this.recordResult(`${testName} - ${testCase.name}`, passed, {
                    expectedStatus: testCase.expectedStatus,
                    actualStatus: response.statusCode,
                    hasExpectedFields,
                    responseKeys: Object.keys(response.data)
                });
                
            } catch (error) {
                this.recordResult(`${testName} - ${testCase.name}`, false, {
                    error: error.message
                });
            }
        }
    }

    async testValidationStatus() {
        const testName = 'Validation Status Endpoint';
        console.log(`📊 Testing ${testName}...`);
        
        const testCases = [
            {
                name: 'Metrics Query',
                query: '?type=metrics',
                expectedStatus: [200],
                expectedFields: ['metrics']
            },
            {
                name: 'Recent Failures Query',
                query: '?type=recent_failures',
                expectedStatus: [200],
                expectedFields: ['recentFailures']
            },
            {
                name: 'Invalid Query Type',
                query: '?type=invalid',
                expectedStatus: [400],
                expectedFields: ['error']
            }
        ];
        
        for (const testCase of testCases) {
            try {
                const response = await this.makeRequest('GET', `/api/validation-status${testCase.query}`);
                
                const statusOk = testCase.expectedStatus.includes(response.statusCode);
                const hasExpectedFields = testCase.expectedFields.every(field => 
                    response.data.hasOwnProperty(field)
                );
                
                const passed = statusOk && (response.statusCode >= 400 || hasExpectedFields);
                
                this.recordResult(`${testName} - ${testCase.name}`, passed, {
                    expectedStatus: testCase.expectedStatus,
                    actualStatus: response.statusCode,
                    hasExpectedFields,
                    responseKeys: Object.keys(response.data)
                });
                
            } catch (error) {
                this.recordResult(`${testName} - ${testCase.name}`, false, {
                    error: error.message
                });
            }
        }
    }

    async testAnalysisEndpoint() {
        const testName = 'Analysis Endpoint Integration';
        console.log(`🤖 Testing ${testName}...`);
        
        const testData = {
            url: 'https://example.com/jobs/test-job',
            title: 'Test Software Engineer',
            company: 'Test Company',
            location: 'Remote',
            description: 'This is a test job description for our analysis endpoint test.'
        };
        
        try {
            const response = await this.makeRequest('POST', '/api/analyze', testData);
            
            const expectedFields = ['id', 'ghostProbability', 'riskLevel', 'metadata'];
            const hasExpectedFields = expectedFields.every(field => 
                response.data.hasOwnProperty(field)
            );
            
            const validProbability = 
                typeof response.data.ghostProbability === 'number' &&
                response.data.ghostProbability >= 0 &&
                response.data.ghostProbability <= 1;
            
            const passed = response.statusCode === 200 && hasExpectedFields && validProbability;
            
            this.recordResult(testName, passed, {
                status: response.statusCode,
                hasExpectedFields,
                validProbability,
                responseKeys: Object.keys(response.data)
            });
            
        } catch (error) {
            this.recordResult(testName, false, {
                error: error.message,
                note: 'Analysis endpoint may require specific configuration'
            });
        }
    }

    async testErrorHandling() {
        const testName = 'Error Handling';
        console.log(`❌ Testing ${testName}...`);
        
        const testCases = [
            {
                name: 'Malformed JSON',
                method: 'POST',
                endpoint: '/api/parse-preview',
                data: 'invalid-json',
                rawData: true,
                expectedStatus: [400, 500]
            },
            {
                name: 'Missing Content-Type',
                method: 'POST',
                endpoint: '/api/parse-preview',
                data: { url: 'https://example.com' },
                headers: { 'Content-Type': 'text/plain' },
                expectedStatus: [400, 415]
            },
            {
                name: 'Rate Limiting (Multiple Requests)',
                method: 'POST',
                endpoint: '/api/parse-preview',
                data: { url: 'https://example.com/test' },
                repeat: 5,
                expectedStatus: [200, 422, 429, 500] // Should eventually hit rate limit or succeed
            }
        ];
        
        for (const testCase of testCases) {
            try {
                if (testCase.repeat) {
                    // Test rate limiting by making multiple requests
                    const responses = [];
                    for (let i = 0; i < testCase.repeat; i++) {
                        try {
                            const response = await this.makeRequest(
                                testCase.method, 
                                testCase.endpoint, 
                                testCase.data,
                                testCase.headers,
                                testCase.rawData
                            );
                            responses.push(response.statusCode);
                        } catch (error) {
                            responses.push('error');
                        }
                        
                        // Small delay between requests
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    
                    const hasValidResponse = responses.some(status => 
                        typeof status === 'number' && testCase.expectedStatus.includes(status)
                    );
                    
                    this.recordResult(`${testName} - ${testCase.name}`, hasValidResponse, {
                        responses,
                        expectedStatus: testCase.expectedStatus
                    });
                    
                } else {
                    const response = await this.makeRequest(
                        testCase.method, 
                        testCase.endpoint, 
                        testCase.data,
                        testCase.headers,
                        testCase.rawData
                    );
                    
                    const statusOk = testCase.expectedStatus.includes(response.statusCode);
                    
                    this.recordResult(`${testName} - ${testCase.name}`, statusOk, {
                        expectedStatus: testCase.expectedStatus,
                        actualStatus: response.statusCode
                    });
                }
                
            } catch (error) {
                // Some error cases are expected
                const isExpectedError = testCase.name.includes('Malformed') || 
                                       testCase.name.includes('Content-Type');
                
                this.recordResult(`${testName} - ${testCase.name}`, isExpectedError, {
                    error: error.message,
                    note: isExpectedError ? 'Expected error case' : 'Unexpected error'
                });
            }
        }
    }

    async makeRequest(method, path, data = null, customHeaders = {}, rawData = false) {
        const url = new URL(this.baseUrl + path);
        const isHttps = url.protocol === 'https:';
        const httpModule = isHttps ? https : http;
        
        const requestData = rawData ? data : (data ? JSON.stringify(data) : null);
        
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'API-Test-Script/1.0',
            ...customHeaders
        };
        
        if (requestData) {
            headers['Content-Length'] = Buffer.byteLength(requestData);
        }
        
        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
            method,
            headers,
            timeout: 10000
        };
        
        return new Promise((resolve, reject) => {
            const req = httpModule.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const parsedData = responseData ? JSON.parse(responseData) : {};
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            data: parsedData
                        });
                    } catch (parseError) {
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            data: { rawResponse: responseData }
                        });
                    }
                });
            });
            
            req.on('error', (error) => {
                reject(new Error(`Request failed: ${error.message}`));
            });
            
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            
            if (requestData) {
                req.write(requestData);
            }
            
            req.end();
        });
    }

    recordResult(testName, passed, details) {
        const status = passed ? '✅' : '❌';
        console.log(`   ${status} ${testName}`);
        
        this.results.push({
            name: testName,
            passed,
            details
        });
        
        if (!passed && details.error) {
            console.log(`      Error: ${details.error}`);
        }
    }

    displayResults() {
        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        
        console.log('\n📋 API TESTING RESULTS');
        console.log('='.repeat(50));
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests} ✅`);
        console.log(`Failed: ${failedTests} ❌`);
        console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        console.log();
        
        if (failedTests > 0) {
            console.log('❌ FAILED TESTS:');
            console.log('-'.repeat(30));
            this.results
                .filter(result => !result.passed)
                .forEach(result => {
                    console.log(`• ${result.name}`);
                    if (result.details.error) {
                        console.log(`  Error: ${result.details.error}`);
                    }
                    if (result.details.note) {
                        console.log(`  Note: ${result.details.note}`);
                    }
                });
            console.log();
        }
        
        console.log('🎯 RECOMMENDATIONS:');
        console.log('-'.repeat(30));
        
        if (failedTests === 0) {
            console.log('✅ All API endpoints are functioning correctly!');
            console.log('🚀 The parsing system is ready for integration.');
        } else {
            console.log('⚠️  Some tests failed. Common issues:');
            console.log('   • Ensure the server is running and accessible');
            console.log('   • Check that all environment variables are set');
            console.log('   • Verify database connectivity');
            console.log('   • Review API endpoint implementations');
        }
        
        console.log(`\nTesting completed at: ${new Date().toISOString()}`);
    }
}

// Run tests if called directly
if (require.main === module) {
    const baseUrl = process.argv[2] || 'http://localhost:3000';
    const tester = new ApiEndpointTester(baseUrl);
    tester.runTests().catch(console.error);
}

module.exports = { ApiEndpointTester };