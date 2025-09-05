/**
 * Automated Quality Assurance System for WebLLM - Phase 3 Implementation
 * Comprehensive testing, validation, and quality monitoring
 */

export interface QualityMetric {
  name: string;
  value: number;
  threshold: number;
  status: 'pass' | 'warning' | 'fail';
  description: string;
}

export interface QualityAssessment {
  overallScore: number;
  overallStatus: 'excellent' | 'good' | 'needs_improvement' | 'poor';
  metrics: QualityMetric[];
  recommendations: string[];
  timestamp: Date;
  testResults: TestResult[];
}

export interface TestResult {
  testName: string;
  passed: boolean;
  score: number;
  duration: number;
  details: string;
  category: 'accuracy' | 'performance' | 'reliability' | 'consistency';
}

export interface QualityTestSuite {
  accuracyTests: AccuracyTest[];
  performanceTests: PerformanceTest[];
  reliabilityTests: ReliabilityTest[];
  consistencyTests: ConsistencyTest[];
}

interface AccuracyTest {
  name: string;
  input: string;
  expectedOutput: any;
  platform: string;
  weight: number;
}

interface PerformanceTest {
  name: string;
  scenario: string;
  maxDuration: number;
  weight: number;
}

interface ReliabilityTest {
  name: string;
  iterations: number;
  acceptableFailureRate: number;
  weight: number;
}

interface ConsistencyTest {
  name: string;
  iterations: number;
  maxVariance: number;
  weight: number;
}

/**
 * Comprehensive quality assurance system for WebLLM
 */
export class WebLLMQualityAssurance {
  private static instance: WebLLMQualityAssurance;
  
  private testSuites: Record<string, QualityTestSuite> = {};
  private assessmentHistory: QualityAssessment[] = [];
  
  // Quality thresholds
  private readonly qualityThresholds = {
    excellent: 0.95,
    good: 0.85,
    acceptable: 0.75,
    poor: 0.60
  };

  private constructor() {
    this.initializeTestSuites();
  }

  public static getInstance(): WebLLMQualityAssurance {
    if (!WebLLMQualityAssurance.instance) {
      WebLLMQualityAssurance.instance = new WebLLMQualityAssurance();
    }
    return WebLLMQualityAssurance.instance;
  }

  /**
   * Run comprehensive quality assessment
   */
  async runQualityAssessment(
    serviceManager: any, // WebLLMServiceManager
    platform = 'all'
  ): Promise<QualityAssessment> {
    console.log(`🔍 Running WebLLM Quality Assessment for ${platform}...`);
    
    const startTime = performance.now();
    const testResults: TestResult[] = [];
    
    try {
      // Run accuracy tests
      const accuracyResults = await this.runAccuracyTests(serviceManager, platform);
      testResults.push(...accuracyResults);
      
      // Run performance tests
      const performanceResults = await this.runPerformanceTests(serviceManager, platform);
      testResults.push(...performanceResults);
      
      // Run reliability tests
      const reliabilityResults = await this.runReliabilityTests(serviceManager, platform);
      testResults.push(...reliabilityResults);
      
      // Run consistency tests
      const consistencyResults = await this.runConsistencyTests(serviceManager, platform);
      testResults.push(...consistencyResults);
      
      // Calculate quality metrics
      const metrics = this.calculateQualityMetrics(testResults);
      
      // Generate overall assessment
      const assessment = this.generateQualityAssessment(metrics, testResults, startTime);
      
      // Store assessment history
      this.assessmentHistory.push(assessment);
      if (this.assessmentHistory.length > 50) {
        this.assessmentHistory = this.assessmentHistory.slice(-50);
      }
      
      console.log(`✅ Quality Assessment Complete: ${assessment.overallStatus} (${Math.round(assessment.overallScore * 100)}%)`, {
        duration: Math.round(performance.now() - startTime) + 'ms',
        testsRun: testResults.length,
        passed: testResults.filter(t => t.passed).length
      });
      
      return assessment;
      
    } catch (error) {
      console.error('❌ Quality Assessment Failed:', error);
      throw error;
    }
  }

  /**
   * Run accuracy tests against known good examples
   */
  private async runAccuracyTests(
    serviceManager: any,
    platform: string
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const testSuites = platform === 'all' 
      ? Object.values(this.testSuites)
      : [this.testSuites[platform] || this.testSuites.generic];
    
    for (const suite of testSuites) {
      for (const test of suite.accuracyTests.slice(0, 3)) { // Limit to 3 tests per suite
        const startTime = performance.now();
        
        try {
          const result = await serviceManager.parseJobData(test.input, {
            platform: test.platform,
            url: `https://test.${test.platform}.com/job`,
            contentLength: test.input.length
          });
          
          const accuracy = this.compareResults(result, test.expectedOutput);
          const duration = performance.now() - startTime;
          
          results.push({
            testName: `Accuracy: ${test.name}`,
            passed: accuracy >= 0.8,
            score: accuracy,
            duration,
            details: `Expected accuracy ≥0.8, got ${accuracy.toFixed(2)}`,
            category: 'accuracy'
          });
          
        } catch (error) {
          results.push({
            testName: `Accuracy: ${test.name}`,
            passed: false,
            score: 0,
            duration: performance.now() - startTime,
            details: `Test failed with error: ${error}`,
            category: 'accuracy'
          });
        }
      }
    }
    
    return results;
  }

  /**
   * Run performance tests for response time and throughput
   */
  private async runPerformanceTests(
    serviceManager: any,
    platform: string
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const sampleContent = this.getSampleContent(platform);
    
    // Response time test
    const responseTimeTest = async () => {
      const startTime = performance.now();
      
      try {
        await serviceManager.parseJobData(sampleContent, {
          platform: platform === 'all' ? 'generic' : platform,
          url: 'https://test.example.com/job',
          contentLength: sampleContent.length
        });
        
        const duration = performance.now() - startTime;
        const acceptable = duration <= 5000; // 5 second threshold
        
        return {
          testName: 'Performance: Response Time',
          passed: acceptable,
          score: Math.max(0, 1 - (duration / 10000)), // Score based on 10s max
          duration,
          details: `Response time: ${Math.round(duration)}ms (threshold: 5000ms)`,
          category: 'performance' as const
        };
        
      } catch (error) {
        return {
          testName: 'Performance: Response Time',
          passed: false,
          score: 0,
          duration: performance.now() - startTime,
          details: `Performance test failed: ${error}`,
          category: 'performance' as const
        };
      }
    };
    
    results.push(await responseTimeTest());
    
    return results;
  }

  /**
   * Run reliability tests for consistent operation
   */
  private async runReliabilityTests(
    serviceManager: any,
    platform: string
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const sampleContent = this.getSampleContent(platform);
    const iterations = 3; // Limited for efficiency
    
    const startTime = performance.now();
    let successCount = 0;
    const errors: string[] = [];
    
    for (let i = 0; i < iterations; i++) {
      try {
        await serviceManager.parseJobData(sampleContent, {
          platform: platform === 'all' ? 'generic' : platform,
          url: `https://test.example.com/job-${i}`,
          contentLength: sampleContent.length
        });
        successCount++;
      } catch (error) {
        errors.push(String(error));
      }
    }
    
    const successRate = successCount / iterations;
    const duration = performance.now() - startTime;
    
    results.push({
      testName: 'Reliability: Success Rate',
      passed: successRate >= 0.8, // 80% success rate threshold
      score: successRate,
      duration,
      details: `${successCount}/${iterations} successful (${Math.round(successRate * 100)}%)`,
      category: 'reliability'
    });
    
    return results;
  }

  /**
   * Run consistency tests for output stability
   */
  private async runConsistencyTests(
    serviceManager: any,
    platform: string
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const sampleContent = this.getSampleContent(platform);
    const iterations = 2; // Limited for efficiency
    
    const startTime = performance.now();
    const outputs: any[] = [];
    
    for (let i = 0; i < iterations; i++) {
      try {
        const result = await serviceManager.parseJobData(sampleContent, {
          platform: platform === 'all' ? 'generic' : platform,
          url: 'https://test.example.com/consistency-test',
          contentLength: sampleContent.length
        });
        outputs.push(result);
      } catch (error) {
        // Ignore errors for consistency test
      }
    }
    
    let consistency = 0;
    if (outputs.length >= 2) {
      consistency = this.calculateConsistency(outputs);
    }
    
    const duration = performance.now() - startTime;
    
    results.push({
      testName: 'Consistency: Output Stability',
      passed: consistency >= 0.8, // 80% consistency threshold
      score: consistency,
      duration,
      details: `Consistency score: ${consistency.toFixed(2)} across ${outputs.length} runs`,
      category: 'consistency'
    });
    
    return results;
  }

  /**
   * Calculate quality metrics from test results
   */
  private calculateQualityMetrics(testResults: TestResult[]): QualityMetric[] {
    const metrics: QualityMetric[] = [];
    
    // Overall success rate
    const totalTests = testResults.length;
    const passedTests = testResults.filter(t => t.passed).length;
    const successRate = totalTests > 0 ? passedTests / totalTests : 0;
    
    metrics.push({
      name: 'Overall Success Rate',
      value: successRate,
      threshold: 0.85,
      status: successRate >= 0.85 ? 'pass' : successRate >= 0.7 ? 'warning' : 'fail',
      description: `${passedTests}/${totalTests} tests passed`
    });
    
    // Category-specific metrics
    const categories = ['accuracy', 'performance', 'reliability', 'consistency'];
    
    categories.forEach(category => {
      const categoryTests = testResults.filter(t => t.category === category);
      if (categoryTests.length > 0) {
        const avgScore = categoryTests.reduce((sum, t) => sum + t.score, 0) / categoryTests.length;
        const avgDuration = categoryTests.reduce((sum, t) => sum + t.duration, 0) / categoryTests.length;
        
        metrics.push({
          name: `${category.charAt(0).toUpperCase() + category.slice(1)} Score`,
          value: avgScore,
          threshold: 0.8,
          status: avgScore >= 0.8 ? 'pass' : avgScore >= 0.6 ? 'warning' : 'fail',
          description: `Average score across ${categoryTests.length} ${category} tests (${Math.round(avgDuration)}ms avg)`
        });
      }
    });
    
    return metrics;
  }

  /**
   * Generate comprehensive quality assessment
   */
  private generateQualityAssessment(
    metrics: QualityMetric[],
    testResults: TestResult[],
    _startTime: number
  ): QualityAssessment {
    // Calculate overall score (weighted average)
    const overallScore = metrics.reduce((sum, metric) => {
      const weight = metric.name === 'Overall Success Rate' ? 0.4 : 0.15;
      return sum + (metric.value * weight);
    }, 0);
    
    // Determine overall status
    let overallStatus: QualityAssessment['overallStatus'] = 'poor';
    if (overallScore >= this.qualityThresholds.excellent) overallStatus = 'excellent';
    else if (overallScore >= this.qualityThresholds.good) overallStatus = 'good';
    else if (overallScore >= this.qualityThresholds.acceptable) overallStatus = 'needs_improvement';
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics, testResults, overallStatus);
    
    return {
      overallScore,
      overallStatus,
      metrics,
      recommendations,
      timestamp: new Date(),
      testResults
    };
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    metrics: QualityMetric[],
    testResults: TestResult[],
    overallStatus: string
  ): string[] {
    const recommendations: string[] = [];
    
    // Overall status recommendations
    if (overallStatus === 'poor') {
      recommendations.push('Immediate attention required - multiple quality issues detected');
    } else if (overallStatus === 'needs_improvement') {
      recommendations.push('Consider optimization to improve overall quality scores');
    }
    
    // Metric-specific recommendations
    const failedMetrics = metrics.filter(m => m.status === 'fail');
    failedMetrics.forEach(metric => {
      if (metric.name.includes('Accuracy')) {
        recommendations.push('Review and update few-shot learning examples');
        recommendations.push('Verify platform-specific prompt configurations');
      } else if (metric.name.includes('Performance')) {
        recommendations.push('Consider implementing more aggressive caching');
        recommendations.push('Review model selection and response token limits');
      } else if (metric.name.includes('Reliability')) {
        recommendations.push('Investigate error patterns and improve error handling');
        recommendations.push('Consider circuit breaker threshold adjustments');
      } else if (metric.name.includes('Consistency')) {
        recommendations.push('Review prompt temperature settings for stability');
        recommendations.push('Implement output post-processing normalization');
      }
    });
    
    // Test-specific recommendations
    const failedTests = testResults.filter(t => !t.passed);
    if (failedTests.length > testResults.length * 0.3) {
      recommendations.push('High failure rate - consider comprehensive system review');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('System performing well - maintain current configuration');
    }
    
    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Initialize test suites for different platforms
   */
  private initializeTestSuites(): void {
    // LinkedIn test suite
    this.testSuites.linkedin = {
      accuracyTests: [
        {
          name: 'LinkedIn Standard Job',
          input: `<h1 class="jobs-unified-top-card__job-title">Senior Software Engineer</h1>
<a class="jobs-unified-top-card__company-name">TechCorp</a>
<span class="jobs-unified-top-card__subtitle-primary">San Francisco, CA</span>`,
          expectedOutput: {
            title: 'Senior Software Engineer',
            company: 'TechCorp',
            location: 'San Francisco, CA',
            remote: false
          },
          platform: 'linkedin',
          weight: 1.0
        }
      ],
      performanceTests: [],
      reliabilityTests: [],
      consistencyTests: []
    };

    // Generic test suite
    this.testSuites.generic = {
      accuracyTests: [
        {
          name: 'Generic Job Board',
          input: `<h1>Product Manager</h1>
<div class="company">StartupXYZ</div>
<span class="location">New York, NY</span>`,
          expectedOutput: {
            title: 'Product Manager',
            company: 'StartupXYZ',
            location: 'New York, NY',
            remote: false
          },
          platform: 'generic',
          weight: 1.0
        }
      ],
      performanceTests: [],
      reliabilityTests: [],
      consistencyTests: []
    };
  }

  /**
   * Get sample content for testing
   */
  private getSampleContent(platform: string): string {
    const sampleContent: Record<string, string> = {
      linkedin: `<h1 class="jobs-unified-top-card__job-title">Test Engineer</h1>
<a class="jobs-unified-top-card__company-name">Test Company</a>
<span class="jobs-unified-top-card__subtitle-primary">Remote</span>`,
      generic: `<h1>Test Engineer</h1>
<div class="company">Test Company</div>
<span class="location">Remote</span>`
    };
    
    return sampleContent[platform] || sampleContent.generic;
  }

  /**
   * Compare extraction results for accuracy scoring
   */
  private compareResults(actual: any, expected: any): number {
    let score = 0;
    let totalFields = 0;
    
    const fieldsToCompare = ['title', 'company', 'location', 'remote'];
    
    fieldsToCompare.forEach(field => {
      totalFields++;
      if (expected[field] && actual[field]) {
        if (typeof expected[field] === 'string') {
          const similarity = this.calculateStringSimilarity(
            String(actual[field]).toLowerCase(),
            String(expected[field]).toLowerCase()
          );
          score += similarity;
        } else if (typeof expected[field] === 'boolean') {
          score += actual[field] === expected[field] ? 1 : 0;
        }
      } else if (!expected[field] && !actual[field]) {
        score += 1; // Both null/undefined is correct
      }
    });
    
    return totalFields > 0 ? score / totalFields : 0;
  }

  /**
   * Calculate string similarity (simple version)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;
    
    // Simple word overlap calculation
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    const overlap = words1.filter(word => words2.includes(word));
    
    return overlap.length / Math.max(words1.length, words2.length);
  }

  /**
   * Calculate consistency across multiple outputs
   */
  private calculateConsistency(outputs: any[]): number {
    if (outputs.length < 2) return 0;
    
    const fields = ['title', 'company', 'location', 'remote'];
    let totalConsistency = 0;
    let totalFields = 0;
    
    fields.forEach(field => {
      const values = outputs.map(output => output[field]);
      const uniqueValues = [...new Set(values)];
      
      // Consistency = 1 - (unique values / total values)
      const consistency = 1 - ((uniqueValues.length - 1) / Math.max(values.length - 1, 1));
      
      totalConsistency += consistency;
      totalFields++;
    });
    
    return totalFields > 0 ? totalConsistency / totalFields : 0;
  }

  /**
   * Get recent quality assessments
   */
  getAssessmentHistory(limit = 10): QualityAssessment[] {
    return this.assessmentHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get current quality status
   */
  getCurrentQualityStatus(): {
    status: string;
    score: number;
    lastAssessment?: Date;
    trendDirection: 'improving' | 'declining' | 'stable';
  } {
    if (this.assessmentHistory.length === 0) {
      return {
        status: 'unknown',
        score: 0,
        trendDirection: 'stable'
      };
    }
    
    const latest = this.assessmentHistory[this.assessmentHistory.length - 1];
    
    // Calculate trend
    let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
    if (this.assessmentHistory.length >= 2) {
      const previous = this.assessmentHistory[this.assessmentHistory.length - 2];
      const scoreDiff = latest.overallScore - previous.overallScore;
      
      if (Math.abs(scoreDiff) > 0.05) {
        trendDirection = scoreDiff > 0 ? 'improving' : 'declining';
      }
    }
    
    return {
      status: latest.overallStatus,
      score: latest.overallScore,
      lastAssessment: latest.timestamp,
      trendDirection
    };
  }
}