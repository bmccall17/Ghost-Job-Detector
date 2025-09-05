/**
 * Centralized WebLLM Service Manager - Phase 2 Implementation
 * Provides unified interface for all WebLLM operations with reliability patterns
 */
import { WebLLMManager, validateWebGPUSupport } from '@/lib/webllm';
import { getOptimalModel } from '@/lib/webllm-models';
import { 
  generateJobParsingPrompt, 
  createJobParsingMessages,
  JobParsingContext 
} from '@/lib/webllm-prompts';
import { 
  jobParsingCache,
  generateJobParsingCacheKey,
  generateContentHash,
  CacheMetrics
} from '@/lib/webllm-cache';

// Circuit breaker states
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
}

interface CircuitBreakerMetrics {
  failures: number;
  successes: number;
  lastFailureTime: number;
  state: CircuitState;
}

export interface JobParsingResult {
  title: string | null;
  company: string | null;
  location: string | null;
  remote: boolean;
  confidence: {
    title: number;
    company: number;
    location: number;
    overall: number;
  };
  extractionNotes: string;
  processingTime: number;
  attempt: number;
}

export interface WebLLMHealthStatus {
  isHealthy: boolean;
  circuitState: CircuitState;
  lastError?: string;
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    successRate: number;
  };
  modelInfo?: {
    modelId: string;
    name: string;
    loadTime: number;
  };
  cacheMetrics?: CacheMetrics;
}

/**
 * Centralized WebLLM service with circuit breaker pattern and health monitoring
 */
export class WebLLMServiceManager {
  private static instance: WebLLMServiceManager;
  private manager: WebLLMManager | null = null;
  private isInitializing = false;
  private initializationPromise: Promise<void> | null = null;
  
  // Circuit breaker implementation
  private circuitBreaker: CircuitBreakerMetrics = {
    failures: 0,
    successes: 0,
    lastFailureTime: 0,
    state: 'CLOSED'
  };
  
  private readonly circuitConfig: CircuitBreakerConfig = {
    failureThreshold: 5,    // Open after 5 failures
    successThreshold: 3,    // Close after 3 successes in half-open
    timeout: 60000         // 60 seconds before trying half-open
  };

  // Performance metrics
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    responseTimes: [] as number[],
    startTime: Date.now()
  };

  private modelInfo: {
    modelId: string;
    name: string;
    loadTime: number;
  } | null = null;

  private constructor() {}

  public static getInstance(): WebLLMServiceManager {
    if (!WebLLMServiceManager.instance) {
      WebLLMServiceManager.instance = new WebLLMServiceManager();
    }
    return WebLLMServiceManager.instance;
  }

  /**
   * Initialize WebLLM service with comprehensive validation
   */
  public async initialize(): Promise<void> {
    if (this.manager) {
      return; // Already initialized
    }

    if (this.isInitializing && this.initializationPromise) {
      return this.initializationPromise;
    }

    this.isInitializing = true;
    this.initializationPromise = this.performInitialization();

    try {
      await this.initializationPromise;
    } finally {
      this.isInitializing = false;
      this.initializationPromise = null;
    }
  }

  private async performInitialization(): Promise<void> {
    const startTime = performance.now();
    
    try {
      console.log('🔧 Initializing centralized WebLLM service...');

      // Step 1: Validate WebGPU support
      const gpuValidation = await validateWebGPUSupport();
      if (!gpuValidation.supported) {
        throw new Error(`WebGPU validation failed: ${gpuValidation.reason}`);
      }

      console.log('✅ WebGPU validation successful', {
        memoryEstimate: gpuValidation.memoryEstimate + 'MB'
      });

      // Step 2: Get optimal model
      const modelId = await getOptimalModel();
      console.log('🎯 Selected optimal model:', modelId);

      // Step 3: Initialize WebLLM manager
      this.manager = WebLLMManager.getInstance();
      await this.manager.initWebLLM(modelId);

      const loadTime = performance.now() - startTime;
      this.modelInfo = {
        modelId,
        name: modelId, // TODO: Get friendly name from model info
        loadTime: Math.round(loadTime)
      };

      console.log('🤖 WebLLM service initialized successfully', {
        model: modelId,
        loadTime: Math.round(loadTime) + 'ms'
      });

      // Reset circuit breaker on successful initialization
      this.resetCircuitBreaker();

    } catch (error) {
      console.error('❌ WebLLM service initialization failed:', error);
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Parse job data with circuit breaker protection and intelligent caching
   */
  public async parseJobData(
    htmlContent: string, 
    context: JobParsingContext
  ): Promise<JobParsingResult> {
    // Check circuit breaker state
    if (!this.canMakeRequest()) {
      throw new Error(`Service unavailable: Circuit breaker is ${this.circuitBreaker.state}`);
    }

    // Generate cache key and content hash
    const cacheKey = generateJobParsingCacheKey(
      context.url || 'unknown',
      htmlContent.length,
      context.platform
    );
    const contentHash = generateContentHash(htmlContent);

    // Check cache first
    const cachedResult = jobParsingCache.get(cacheKey, contentHash);
    if (cachedResult) {
      console.log('🚀 Cache hit for job parsing', {
        url: context.url,
        platform: context.platform
      });
      
      // Return cached result with updated processing time
      return {
        ...cachedResult,
        processingTime: Math.round(performance.now() - performance.now()), // Effectively 0
        attempt: 1
      };
    }

    const startTime = performance.now();
    this.metrics.totalRequests++;

    try {
      // Ensure service is initialized
      await this.initialize();

      if (!this.manager) {
        throw new Error('WebLLM manager not initialized');
      }

      console.log('🧠 Parsing job data with centralized service', {
        platform: context.platform,
        contentLength: htmlContent.length,
        circuitState: this.circuitBreaker.state
      });

      // Generate optimized prompt
      const prompt = generateJobParsingPrompt(context);
      const messages = createJobParsingMessages(prompt, htmlContent);

      // Execute with retry logic built into WebLLM manager
      const response = await this.manager.generateCompletion(messages, {
        temperature: 0.2,
        max_tokens: 1024,
        retries: 2
      });

      // Parse and validate response
      const result = this.parseJobParsingResponse(response, startTime);

      // Record success
      this.recordSuccess(performance.now() - startTime);

      // Cache successful result
      const cacheEntryTTL = this.calculateCacheTTL(result.confidence.overall, context.platform);
      jobParsingCache.set(cacheKey, result, cacheEntryTTL, contentHash);

      console.log('✅ Job parsing completed successfully', {
        confidence: Math.round(result.confidence.overall * 100) + '%',
        processingTime: result.processingTime + 'ms',
        attempt: result.attempt,
        cached: true,
        cacheTTL: Math.round(cacheEntryTTL / (1000 * 60)) + 'min'
      });

      return result;

    } catch (error) {
      const processingTime = performance.now() - startTime;
      this.recordFailure();
      
      console.error('❌ Job parsing failed:', error, {
        processingTime: Math.round(processingTime) + 'ms',
        circuitState: this.circuitBreaker.state
      });

      throw error;
    }
  }

  /**
   * Parse WebLLM response into structured job result
   */
  private parseJobParsingResponse(response: string, startTime: number): JobParsingResult {
    try {
      // Clean response
      let cleaned = response.trim();
      cleaned = cleaned.replace(/```json\s*|\s*```/g, '');
      cleaned = cleaned.replace(/```\s*|\s*```/g, '');
      
      // Find JSON object
      const jsonStart = cleaned.indexOf('{');
      const jsonEnd = cleaned.lastIndexOf('}');
      
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('No valid JSON found in response');
      }
      
      const jsonStr = cleaned.slice(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonStr);

      // Validate and structure result
      const result: JobParsingResult = {
        title: this.sanitizeString(parsed.title),
        company: this.sanitizeString(parsed.company),
        location: this.sanitizeString(parsed.location),
        remote: Boolean(parsed.remote),
        confidence: {
          title: this.validateConfidence(parsed.confidence?.title),
          company: this.validateConfidence(parsed.confidence?.company),
          location: this.validateConfidence(parsed.confidence?.location),
          overall: this.validateConfidence(parsed.confidence?.overall)
        },
        extractionNotes: this.sanitizeString(parsed.extractionNotes) || 'Extracted via centralized WebLLM service',
        processingTime: Math.round(performance.now() - startTime),
        attempt: 1 // TODO: Track actual attempt number
      };

      // Validate minimum confidence
      if (result.confidence.overall < 0.3) {
        throw new Error(`Low confidence result: ${result.confidence.overall.toFixed(2)}`);
      }

      return result;

    } catch (error) {
      throw new Error(`Failed to parse WebLLM response: ${error}`);
    }
  }

  /**
   * Circuit breaker logic
   */
  private canMakeRequest(): boolean {
    const now = Date.now();

    switch (this.circuitBreaker.state) {
      case 'CLOSED':
        return true;
        
      case 'OPEN':
        // Check if timeout period has elapsed
        if (now - this.circuitBreaker.lastFailureTime >= this.circuitConfig.timeout) {
          console.log('🔄 Circuit breaker transitioning to HALF_OPEN');
          this.circuitBreaker.state = 'HALF_OPEN';
          return true;
        }
        return false;
        
      case 'HALF_OPEN':
        return true;
        
      default:
        return false;
    }
  }

  private recordSuccess(responseTime: number): void {
    this.metrics.successfulRequests++;
    this.metrics.responseTimes.push(responseTime);
    
    // Keep only last 100 response times for memory efficiency
    if (this.metrics.responseTimes.length > 100) {
      this.metrics.responseTimes = this.metrics.responseTimes.slice(-100);
    }

    // Circuit breaker logic
    this.circuitBreaker.successes++;
    
    if (this.circuitBreaker.state === 'HALF_OPEN') {
      if (this.circuitBreaker.successes >= this.circuitConfig.successThreshold) {
        console.log('✅ Circuit breaker closing after successful requests');
        this.resetCircuitBreaker();
      }
    }
  }

  private recordFailure(): void {
    this.metrics.failedRequests++;
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    // Open circuit if failure threshold exceeded
    if (this.circuitBreaker.state === 'CLOSED' || this.circuitBreaker.state === 'HALF_OPEN') {
      if (this.circuitBreaker.failures >= this.circuitConfig.failureThreshold) {
        console.warn('⚠️ Circuit breaker opening due to failures', {
          failures: this.circuitBreaker.failures,
          threshold: this.circuitConfig.failureThreshold
        });
        this.circuitBreaker.state = 'OPEN';
      }
    }
  }

  private resetCircuitBreaker(): void {
    this.circuitBreaker = {
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      state: 'CLOSED'
    };
  }

  /**
   * Calculate cache TTL based on confidence and platform
   */
  private calculateCacheTTL(confidence: number, platform?: string): number {
    // Base TTL: 6 hours
    let baseTTL = 6 * 60 * 60 * 1000;
    
    // Higher confidence = longer cache
    if (confidence >= 0.9) {
      baseTTL = 24 * 60 * 60 * 1000; // 24 hours
    } else if (confidence >= 0.8) {
      baseTTL = 12 * 60 * 60 * 1000; // 12 hours
    } else if (confidence < 0.6) {
      baseTTL = 1 * 60 * 60 * 1000; // 1 hour
    }
    
    // Platform-specific adjustments
    if (platform === 'linkedin' || platform === 'workday') {
      baseTTL *= 1.5; // More stable platforms, longer cache
    }
    
    return baseTTL;
  }

  /**
   * Get comprehensive health status including cache metrics
   */
  public getHealthStatus(): WebLLMHealthStatus {
    const avgResponseTime = this.metrics.responseTimes.length > 0
      ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length
      : 0;

    const successRate = this.metrics.totalRequests > 0
      ? this.metrics.successfulRequests / this.metrics.totalRequests
      : 0;

    return {
      isHealthy: this.circuitBreaker.state === 'CLOSED' && successRate >= 0.8,
      circuitState: this.circuitBreaker.state,
      metrics: {
        totalRequests: this.metrics.totalRequests,
        successfulRequests: this.metrics.successfulRequests,
        failedRequests: this.metrics.failedRequests,
        averageResponseTime: Math.round(avgResponseTime),
        successRate: Math.round(successRate * 100) / 100
      },
      modelInfo: this.modelInfo || undefined,
      cacheMetrics: jobParsingCache.getMetrics()
    };
  }

  /**
   * Force circuit breaker reset (for testing/recovery)
   */
  public resetHealth(): void {
    this.resetCircuitBreaker();
    console.log('🔧 WebLLM service health reset');
  }

  /**
   * Utility methods
   */
  private sanitizeString(value: any): string | null {
    if (typeof value !== 'string') return null;
    const sanitized = value.trim();
    return sanitized.length > 0 ? sanitized : null;
  }

  private validateConfidence(value: any): number {
    if (typeof value !== 'number') return 0;
    return Math.max(0, Math.min(1, value));
  }
}