/**
 * Unified Input Validator - Orchestrates Three-Tier Validation System
 * Coordinates URL validation, content classification, and parsing validation
 */

import { 
  UnifiedValidationResult,
  ValidationConfig,
  ValidationError,
  ValidationErrorCode,
  DEFAULT_VALIDATION_CONFIG
} from './InputValidationTypes';
import { URLValidationService } from './URLValidationService';
import { ContentClassificationService } from './ContentClassificationService';
import { WebLLMParsingService } from '../WebLLMParsingService';

export class UnifiedInputValidator {
  private config: ValidationConfig;
  private urlValidator: URLValidationService;
  private contentClassifier: ContentClassificationService;
  private parsingService: WebLLMParsingService;
  private circuitBreaker: Map<string, { failures: number; lastFailure: number; isOpen: boolean }> = new Map();

  constructor(config: ValidationConfig = DEFAULT_VALIDATION_CONFIG) {
    this.config = config;
    this.urlValidator = new URLValidationService(config);
    this.contentClassifier = new ContentClassificationService(config);
    this.parsingService = new WebLLMParsingService();
  }

  /**
   * Main validation entry point - orchestrates all three tiers
   */
  public async validateInput(url: string): Promise<UnifiedValidationResult> {
    const startTime = Date.now();
    let highestTier: 1 | 2 | 3 = 1;
    const allErrors: ValidationError[] = [];
    const allWarnings: any[] = [];

    console.log(`🚀 Starting unified validation for: ${url}`);

    try {
      // Check circuit breaker
      if (this.isCircuitOpen(url)) {
        return this.createCircuitBreakerResult(url, startTime);
      }

      // Tier 1: URL Validation
      console.log(`⚡ Tier 1: URL validation starting...`);
      const urlResult = await this.urlValidator.validateURL(url);
      allErrors.push(...urlResult.errors);
      allWarnings.push(...urlResult.warnings);

      // Check if we should proceed to Tier 2
      if (!this.shouldProceedToTier2(urlResult)) {
        return this.createUnifiedResult(
          url, 1, startTime, urlResult, undefined, undefined,
          allErrors, allWarnings, urlResult.isValid
        );
      }

      // Tier 2: Content Classification
      highestTier = 2;
      console.log(`⚡ Tier 2: Content classification starting...`);
      const contentResult = await this.contentClassifier.classifyContent(url, urlResult.data!);
      allErrors.push(...contentResult.errors);
      allWarnings.push(...contentResult.warnings);

      // Check if we should proceed to Tier 3
      if (!this.shouldProceedToTier3(contentResult)) {
        return this.createUnifiedResult(
          url, 2, startTime, urlResult, contentResult, undefined,
          allErrors, allWarnings, contentResult.isValid
        );
      }

      // Tier 3: Parsing Validation (if enabled)
      if (this.config.enabledTiers.includes(3)) {
        highestTier = 3;
        console.log(`⚡ Tier 3: Parsing validation starting...`);
        const parsingResult = await this.performParsingValidation(url);
        
        // Convert parsing result to our validation format
        const parsingValidation = this.convertParsingResult(parsingResult);
        allErrors.push(...parsingValidation.errors);
        allWarnings.push(...parsingValidation.warnings);

        const finalResult = this.createUnifiedResult(
          url, 3, startTime, urlResult, contentResult, parsingValidation,
          allErrors, allWarnings, parsingValidation.isValid
        );

        // Update circuit breaker on success/failure
        this.updateCircuitBreaker(url, finalResult.isValid);
        return finalResult;
      }

      // If Tier 3 is disabled, return Tier 2 result
      const finalResult = this.createUnifiedResult(
        url, 2, startTime, urlResult, contentResult, undefined,
        allErrors, allWarnings, contentResult.isValid
      );

      this.updateCircuitBreaker(url, finalResult.isValid);
      return finalResult;

    } catch (error) {
      console.error(`❌ Unified validation failed for ${url}:`, error);
      
      const systemError: ValidationError = {
        code: ValidationErrorCode.SYSTEM_ERROR,
        message: `Validation system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'blocking',
        category: 'system',
        userMessage: 'Unable to validate input due to a system error.',
        suggestion: 'Please try again in a few moments.',
        retryable: true
      };

      allErrors.push(systemError);
      this.updateCircuitBreaker(url, false);

      return this.createUnifiedResult(
        url, highestTier, startTime, undefined, undefined, undefined,
        allErrors, allWarnings, false
      );
    }
  }

  /**
   * Validate with retry logic
   */
  public async validateInputWithRetry(url: string): Promise<UnifiedValidationResult> {
    let lastResult: UnifiedValidationResult;
    let attempt = 0;

    do {
      attempt++;
      console.log(`🔄 Validation attempt ${attempt}/${this.config.retryPolicy.maxRetries + 1} for ${url}`);
      
      lastResult = await this.validateInput(url);
      
      if (lastResult.isValid || !this.shouldRetry(lastResult, attempt)) {
        break;
      }

      // Wait before retry
      if (attempt <= this.config.retryPolicy.maxRetries) {
        const delay = this.config.retryPolicy.backoffMs * Math.pow(2, attempt - 1);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

    } while (attempt <= this.config.retryPolicy.maxRetries);

    if (attempt > 1) {
      console.log(`🔄 Validation completed after ${attempt} attempts`);
    }

    return lastResult;
  }

  /**
   * Batch validation for multiple URLs
   */
  public async validateBatch(urls: string[]): Promise<UnifiedValidationResult[]> {
    console.log(`📦 Starting batch validation for ${urls.length} URLs`);
    
    // Process in parallel with concurrency limit
    const concurrencyLimit = 3;
    const results: UnifiedValidationResult[] = [];
    
    for (let i = 0; i < urls.length; i += concurrencyLimit) {
      const batch = urls.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.all(
        batch.map(url => this.validateInputWithRetry(url))
      );
      results.push(...batchResults);
    }

    console.log(`✅ Batch validation completed: ${results.filter(r => r.isValid).length}/${results.length} valid`);
    return results;
  }

  /**
   * Decision logic for proceeding to next tier
   */
  private shouldProceedToTier2(urlResult: any): boolean {
    return urlResult.isValid && 
           urlResult.data?.isAccessible && 
           !urlResult.data?.requiresAuth &&
           this.config.enabledTiers.includes(2);
  }

  private shouldProceedToTier3(contentResult: any): boolean {
    return contentResult.isValid &&
           contentResult.data?.contentType === 'job_posting' &&
           contentResult.confidence >= this.config.thresholds.minContentConfidence &&
           this.config.enabledTiers.includes(3);
  }

  /**
   * Perform parsing validation using existing WebLLM service
   */
  private async performParsingValidation(url: string): Promise<any> {
    try {
      const parsingResult = await this.parsingService.extractJob(url);
      return parsingResult;
    } catch (error) {
      console.error('Parsing validation failed:', error);
      throw error;
    }
  }

  /**
   * Convert parsing result to validation format
   */
  private convertParsingResult(parsingResult: any): any {
    const errors: ValidationError[] = [];
    const warnings: any[] = [];

    if (!parsingResult.success) {
      errors.push({
        code: ValidationErrorCode.PARSING_FAILED,
        message: parsingResult.errorMessage || 'Parsing failed',
        severity: 'blocking',
        category: 'parsing',
        userMessage: 'Unable to extract job information from this page.',
        suggestion: 'Verify this is a direct link to a complete job posting.',
        retryable: true
      });
    }

    // Check parsing quality
    if (parsingResult.success && parsingResult.confidence < this.config.thresholds.minParsingQuality) {
      errors.push({
        code: ValidationErrorCode.PARSING_LOW_QUALITY,
        message: `Low parsing quality: ${parsingResult.confidence}`,
        severity: 'degraded',
        category: 'parsing',
        userMessage: 'Job information extraction quality is low.',
        suggestion: 'Some job details may be missing or inaccurate.',
        retryable: false
      });
    }

    // Check for missing critical fields
    if (parsingResult.success) {
      const data = parsingResult.data;
      if (!data.title || data.title.length < 3) {
        errors.push({
          code: ValidationErrorCode.PARSING_TITLE_MISSING,
          message: 'Job title not found or too short',
          severity: 'degraded',
          category: 'parsing',
          userMessage: 'Could not identify a clear job title.',
          suggestion: 'Verify this page contains a job posting with a clear title.',
          retryable: false
        });
      }

      if (!data.company || data.company.length < 2) {
        warnings.push({
          code: 'PARSING_COMPANY_UNCLEAR',
          message: 'Company information unclear or missing',
          impact: 'medium',
          userMessage: 'Company information may not be clearly identifiable.'
        });
      }
    }

    return {
      isValid: parsingResult.success && errors.filter(e => e.severity === 'blocking').length === 0,
      confidence: parsingResult.confidence || 0,
      data: parsingResult.data,
      errors,
      warnings,
      metadata: {
        tier: 3,
        processingTimeMs: parsingResult.processingTimeMs || 0,
        validatedAt: new Date().toISOString(),
        validationMethod: parsingResult.extractionMethod || 'webllm',
        source: 'WebLLMParsingService'
      }
    };
  }

  /**
   * Circuit breaker implementation
   */
  private isCircuitOpen(url: string): boolean {
    const domain = new URL(url).hostname;
    const circuit = this.circuitBreaker.get(domain);
    
    if (!circuit) return false;
    
    const now = Date.now();
    const timeSinceLastFailure = now - circuit.lastFailure;
    const cooldownPeriod = 60000; // 1 minute
    
    if (circuit.isOpen && timeSinceLastFailure > cooldownPeriod) {
      // Try to close circuit
      circuit.isOpen = false;
      circuit.failures = 0;
    }
    
    return circuit.isOpen;
  }

  private updateCircuitBreaker(url: string, success: boolean): void {
    const domain = new URL(url).hostname;
    const circuit = this.circuitBreaker.get(domain) || { failures: 0, lastFailure: 0, isOpen: false };
    
    if (success) {
      circuit.failures = 0;
      circuit.isOpen = false;
    } else {
      circuit.failures++;
      circuit.lastFailure = Date.now();
      if (circuit.failures >= 5) { // Open after 5 failures
        circuit.isOpen = true;
      }
    }
    
    this.circuitBreaker.set(domain, circuit);
  }

  /**
   * Retry decision logic
   */
  private shouldRetry(result: UnifiedValidationResult, attempt: number): boolean {
    if (attempt > this.config.retryPolicy.maxRetries) return false;
    
    const retryableErrors = result.errors.filter(error => 
      this.config.retryPolicy.retryableErrors.includes(error.code as ValidationErrorCode) &&
      error.retryable
    );
    
    return retryableErrors.length > 0;
  }

  /**
   * Result creation helpers
   */
  private createUnifiedResult(
    _url: string,
    tier: 1 | 2 | 3,
    startTime: number,
    urlValidation?: any,
    contentValidation?: any,
    parsingValidation?: any,
    allErrors: ValidationError[] = [],
    allWarnings: any[] = [],
    isValid: boolean = false
  ): UnifiedValidationResult {
    
    const blockingErrors = allErrors.filter(e => e.severity === 'blocking');
    const finalValidity = isValid && blockingErrors.length === 0;
    
    // Calculate overall confidence
    let overallConfidence = 0;
    if (urlValidation) overallConfidence += (urlValidation.confidence || 0) * 0.2;
    if (contentValidation) overallConfidence += (contentValidation.confidence || 0) * 0.4;
    if (parsingValidation) overallConfidence += (parsingValidation.confidence || 0) * 0.4;
    else if (contentValidation) overallConfidence += (contentValidation.confidence || 0) * 0.4;
    
    // Generate user guidance
    const userGuidance = this.generateUserGuidance(allErrors, allWarnings, tier, finalValidity);

    const processingTimeMs = Date.now() - startTime;
    console.log(`✅ Unified validation completed in ${processingTimeMs}ms - Tier ${tier}, Valid: ${finalValidity}, Confidence: ${(overallConfidence * 100).toFixed(1)}%`);

    return {
      isValid: finalValidity,
      overallConfidence,
      validationTier: tier,
      urlValidation: urlValidation || this.createEmptyValidationResult(1),
      contentValidation: contentValidation,
      parsingValidation: parsingValidation,
      finalData: parsingValidation?.data,
      processingTimeMs,
      canRetry: this.shouldRetry({ errors: allErrors } as any, 0),
      errors: allErrors,
      warnings: allWarnings,
      userGuidance
    };
  }

  private generateUserGuidance(
    errors: ValidationError[], 
    warnings: any[], 
    tier: number, 
    isValid: boolean
  ): UnifiedValidationResult['userGuidance'] {
    
    if (isValid) {
      return {
        primaryMessage: `✅ Job posting validated successfully (Tier ${tier})`,
        actionRequired: 'None - you can proceed with analysis',
        suggestions: warnings.length > 0 ? ['Some minor issues detected - review warnings below'] : [],
        canProceedManually: true
      };
    }

    const blockingErrors = errors.filter(e => e.severity === 'blocking');
    const primaryError = blockingErrors[0] || errors[0];

    if (!primaryError) {
      return {
        primaryMessage: '⚠️ Validation completed with warnings',
        actionRequired: 'Review warnings and proceed with caution',
        suggestions: ['Check the identified issues before proceeding'],
        canProceedManually: true
      };
    }

    const suggestions = [...new Set([
      primaryError.suggestion,
      ...errors.slice(0, 3).map(e => e.suggestion).filter(s => s && s !== primaryError.suggestion)
    ])].filter(Boolean) as string[];

    return {
      primaryMessage: primaryError.userMessage,
      actionRequired: blockingErrors.length > 0 ? 'Fix blocking issues to proceed' : 'Address issues or proceed manually',
      suggestions,
      canProceedManually: this.config.fallbackStrategies.manualOverride && blockingErrors.length === 0
    };
  }

  private createCircuitBreakerResult(url: string, startTime: number): UnifiedValidationResult {
    const error: ValidationError = {
      code: ValidationErrorCode.RATE_LIMITED,
      message: 'Circuit breaker is open for this domain',
      severity: 'blocking',
      category: 'system',
      userMessage: 'This website is temporarily unavailable for validation due to repeated failures.',
      suggestion: 'Try again in a few minutes, or contact support if this persists.',
      retryable: true
    };

    return this.createUnifiedResult(url, 1, startTime, undefined, undefined, undefined, [error], [], false);
  }

  private createEmptyValidationResult(tier: 1 | 2 | 3): any {
    return {
      isValid: false,
      confidence: 0,
      errors: [],
      warnings: [],
      metadata: {
        tier,
        processingTimeMs: 0,
        validatedAt: new Date().toISOString(),
        validationMethod: 'skipped',
        source: 'UnifiedInputValidator'
      }
    };
  }

  /**
   * Configuration and health methods
   */
  public updateConfig(newConfig: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.urlValidator = new URLValidationService(this.config);
    this.contentClassifier = new ContentClassificationService(this.config);
  }

  public getHealthStatus(): {
    isHealthy: boolean;
    services: { name: string; status: string }[];
    circuitBreakerStats: { domain: string; failures: number; isOpen: boolean }[];
  } {
    const circuitBreakerStats = Array.from(this.circuitBreaker.entries()).map(([domain, stats]) => ({
      domain,
      failures: stats.failures,
      isOpen: stats.isOpen
    }));

    return {
      isHealthy: true,
      services: [
        { name: 'URLValidationService', status: 'active' },
        { name: 'ContentClassificationService', status: 'active' },
        { name: 'WebLLMParsingService', status: 'active' }
      ],
      circuitBreakerStats
    };
  }

  public clearCircuitBreakers(): void {
    this.circuitBreaker.clear();
    console.log('🔄 All circuit breakers have been reset');
  }
}