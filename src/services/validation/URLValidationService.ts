/**
 * URL Validation Service - Tier 1 Validation
 * Validates URL accessibility, checks for job-related indicators, and handles authentication requirements
 */

import { 
  URLValidationResult, 
  URLAnalysis, 
  ValidationError, 
  ValidationErrorCode, 
  ValidationConfig,
  DEFAULT_VALIDATION_CONFIG
} from './InputValidationTypes';

export class URLValidationService {
  private config: ValidationConfig;
  private cache: Map<string, { result: URLValidationResult; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(config: ValidationConfig = DEFAULT_VALIDATION_CONFIG) {
    this.config = config;
  }

  /**
   * Validate URL accessibility and job-related indicators
   */
  public async validateURL(url: string): Promise<URLValidationResult> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = this.getCachedResult(url);
      if (cached) {
        return cached;
      }

      console.log(`🔍 Tier 1: Validating URL accessibility for ${url}`);

      // Basic URL format validation
      const formatValidation = this.validateURLFormat(url);
      if (!formatValidation.isValid) {
        return this.createErrorResult(url, formatValidation.errors, startTime);
      }

      const normalizedUrl = this.normalizeURL(url);
      
      // Perform HTTP validation with timeout
      const httpValidation = await this.validateHTTPAccessibility(normalizedUrl);
      
      if (!httpValidation.isValid) {
        return this.createErrorResult(url, httpValidation.errors, startTime, httpValidation.analysis);
      }

      // Analyze content accessibility and job indicators
      const analysis = httpValidation.analysis!;
      const jobIndicators = this.analyzeJobIndicators(analysis);
      
      const result: URLValidationResult = {
        isValid: true,
        confidence: this.calculateURLConfidence(analysis, jobIndicators),
        data: {
          ...analysis,
          hasJobIndicators: jobIndicators.hasJobIndicators
        },
        errors: [],
        warnings: jobIndicators.warnings,
        metadata: {
          tier: 1,
          processingTimeMs: Date.now() - startTime,
          validatedAt: new Date().toISOString(),
          validationMethod: 'http_analysis',
          source: 'URLValidationService'
        }
      };

      // Cache successful result
      this.cacheResult(url, result);
      
      console.log(`✅ Tier 1: URL validation completed with ${(result.confidence * 100).toFixed(1)}% confidence`);
      return result;

    } catch (error) {
      console.error(`❌ Tier 1: URL validation failed for ${url}:`, error);
      
      return this.createErrorResult(url, [{
        code: ValidationErrorCode.SYSTEM_ERROR,
        message: `URL validation system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'blocking',
        category: 'system',
        userMessage: 'Unable to validate URL due to a system error. Please try again.',
        suggestion: 'Check your internet connection and try again in a few moments.',
        retryable: true
      }], startTime);
    }
  }

  /**
   * Validate basic URL format
   */
  private validateURLFormat(url: string): { isValid: boolean; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    if (!url || typeof url !== 'string') {
      errors.push({
        code: ValidationErrorCode.URL_INVALID_FORMAT,
        message: 'URL is empty or not a string',
        severity: 'blocking',
        category: 'url',
        userMessage: 'Please provide a valid job posting URL.',
        suggestion: 'Enter a complete URL starting with http:// or https://',
        retryable: false
      });
      return { isValid: false, errors };
    }

    try {
      const parsedUrl = new URL(url);
      
      // Check protocol
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        errors.push({
          code: ValidationErrorCode.URL_INVALID_FORMAT,
          message: `Invalid protocol: ${parsedUrl.protocol}`,
          severity: 'blocking',
          category: 'url',
          userMessage: 'Only HTTP and HTTPS URLs are supported.',
          suggestion: 'Make sure your URL starts with http:// or https://',
          retryable: false
        });
      }

      // Check for localhost or internal IPs (security)
      if (parsedUrl.hostname === 'localhost' || 
          parsedUrl.hostname.startsWith('127.') ||
          parsedUrl.hostname.startsWith('192.168.') ||
          parsedUrl.hostname.startsWith('10.') ||
          parsedUrl.hostname.match(/^172\.(1[6-9]|2\d|3[01])\./)) {
        errors.push({
          code: ValidationErrorCode.URL_INVALID_FORMAT,
          message: 'Local or internal URLs are not allowed',
          severity: 'blocking',
          category: 'url',
          userMessage: 'Local or internal network URLs cannot be analyzed.',
          suggestion: 'Please provide a public job posting URL.',
          retryable: false
        });
      }

    } catch (urlError) {
      errors.push({
        code: ValidationErrorCode.URL_INVALID_FORMAT,
        message: `Invalid URL format: ${urlError instanceof Error ? urlError.message : 'Parse error'}`,
        severity: 'blocking',
        category: 'url',
        userMessage: 'The provided URL format is invalid.',
        suggestion: 'Double-check the URL and ensure it\'s complete (e.g., https://company.com/jobs/123)',
        retryable: false
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate HTTP accessibility
   */
  private async validateHTTPAccessibility(url: string): Promise<{ isValid: boolean; errors: ValidationError[]; analysis?: URLAnalysis }> {
    const errors: ValidationError[] = [];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeouts.urlValidation);

      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'HEAD', // Use HEAD first for efficiency
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GhostJobDetector/2.0; +https://ghostjobdetector.com/bot)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'DNT': '1',
          'Upgrade-Insecure-Requests': '1'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      const analysis: URLAnalysis = {
        url,
        normalizedUrl: url,
        domain: new URL(url).hostname,
        platform: this.detectPlatform(url),
        isAccessible: response.ok,
        responseTime,
        httpStatus: response.status,
        contentType: response.headers.get('content-type') || 'unknown',
        finalUrl: response.url,
        requiresAuth: this.detectAuthRequired(response),
        isExpired: this.detectExpiredContent(response),
        lastModified: response.headers.get('last-modified') || undefined,
        hasJobIndicators: false // Will be set by analyzeJobIndicators
      };

      // Handle different HTTP status codes
      if (!response.ok) {
        if (response.status === 404) {
          errors.push({
            code: ValidationErrorCode.URL_NOT_FOUND,
            message: `URL not found (404)`,
            severity: 'blocking',
            category: 'url',
            userMessage: 'The job posting URL was not found.',
            suggestion: 'Check if the job posting has been removed or if the URL is correct.',
            retryable: false
          });
        } else if (response.status === 403) {
          errors.push({
            code: ValidationErrorCode.URL_REQUIRES_AUTH,
            message: `Access forbidden (403)`,
            severity: 'degraded',
            category: 'url',
            userMessage: 'This job posting requires authentication to access.',
            suggestion: 'Try accessing the URL directly in your browser first, then return here.',
            retryable: true
          });
        } else if (response.status >= 500) {
          errors.push({
            code: ValidationErrorCode.URL_SERVER_ERROR,
            message: `Server error (${response.status})`,
            severity: 'degraded',
            category: 'url',
            userMessage: 'The job posting website is experiencing technical difficulties.',
            suggestion: 'Try again in a few minutes, or check if the website is accessible in your browser.',
            retryable: true
          });
        } else {
          errors.push({
            code: ValidationErrorCode.URL_NOT_ACCESSIBLE,
            message: `HTTP error ${response.status}: ${response.statusText}`,
            severity: 'blocking',
            category: 'url',
            userMessage: 'Unable to access the job posting URL.',
            suggestion: 'Verify the URL is correct and try again.',
            retryable: true
          });
        }
      }

      return { isValid: response.ok, errors, analysis };

    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        errors.push({
          code: ValidationErrorCode.URL_TIMEOUT,
          message: `Request timeout after ${this.config.timeouts.urlValidation}ms`,
          severity: 'degraded',
          category: 'url',
          userMessage: 'The job posting URL is taking too long to respond.',
          suggestion: 'Check your internet connection or try a different URL.',
          retryable: true
        });
      } else {
        errors.push({
          code: ValidationErrorCode.URL_NOT_ACCESSIBLE,
          message: `Network error: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
          severity: 'blocking',
          category: 'url',
          userMessage: 'Unable to connect to the job posting website.',
          suggestion: 'Check your internet connection and verify the URL is correct.',
          retryable: true
        });
      }

      return { isValid: false, errors };
    }
  }

  /**
   * Analyze job-related indicators in URL and response
   */
  private analyzeJobIndicators(analysis: URLAnalysis): { hasJobIndicators: boolean; warnings: any[] } {
    const warnings: any[] = [];
    let jobIndicatorScore = 0;

    // URL path analysis
    const urlPath = new URL(analysis.url).pathname.toLowerCase();
    const jobKeywords = ['job', 'career', 'employment', 'position', 'opening', 'vacancy', 'hiring', 'apply', 'roles'];
    const foundKeywords = jobKeywords.filter(keyword => urlPath.includes(keyword));
    
    if (foundKeywords.length > 0) {
      jobIndicatorScore += 0.4;
    } else {
      warnings.push({
        code: 'URL_NO_JOB_KEYWORDS',
        message: 'URL does not contain obvious job-related keywords',
        impact: 'medium',
        userMessage: 'This URL may not be a direct link to a job posting.'
      });
    }

    // Platform detection
    const knownJobPlatforms = ['linkedin', 'indeed', 'glassdoor', 'monster', 'ziprecruiter', 'workday', 'greenhouse', 'lever'];
    const isKnownJobPlatform = knownJobPlatforms.some(platform => analysis.domain.toLowerCase().includes(platform));
    
    if (isKnownJobPlatform) {
      jobIndicatorScore += 0.5;
    } else if (analysis.domain.includes('jobs') || analysis.domain.includes('careers')) {
      jobIndicatorScore += 0.3;
    }

    // Content type analysis
    if (analysis.contentType.includes('text/html')) {
      jobIndicatorScore += 0.1;
    }

    const hasJobIndicators = jobIndicatorScore >= 0.4;

    if (!hasJobIndicators) {
      warnings.push({
        code: 'URL_LOW_JOB_RELEVANCE',
        message: `Low job relevance score: ${jobIndicatorScore.toFixed(2)}`,
        impact: 'high',
        userMessage: 'This URL may not lead to a job posting. Please verify the link.'
      });
    }

    return { hasJobIndicators, warnings };
  }

  /**
   * Calculate overall URL confidence score
   */
  private calculateURLConfidence(analysis: URLAnalysis, jobIndicators: any): number {
    let confidence = 0.5; // Base confidence

    // Accessibility confidence
    if (analysis.isAccessible) confidence += 0.2;
    
    // Response time confidence (faster is better)
    if (analysis.responseTime < 2000) confidence += 0.1;
    else if (analysis.responseTime > 10000) confidence -= 0.1;

    // Job indicators confidence
    if (jobIndicators.hasJobIndicators) confidence += 0.2;
    else confidence -= 0.1;

    // Platform confidence
    if (['linkedin', 'indeed', 'workday', 'greenhouse'].includes(analysis.platform)) {
      confidence += 0.1;
    }

    // Authentication penalty
    if (analysis.requiresAuth) confidence -= 0.1;

    // Expiration penalty
    if (analysis.isExpired) confidence -= 0.3;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Helper methods
   */
  private normalizeURL(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove tracking parameters
      const cleanParams = new URLSearchParams(parsed.search);
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
      trackingParams.forEach(param => cleanParams.delete(param));
      parsed.search = cleanParams.toString();
      return parsed.toString();
    } catch {
      return url;
    }
  }

  private detectPlatform(url: string): string {
    const domain = new URL(url).hostname.toLowerCase();
    
    if (domain.includes('linkedin')) return 'linkedin';
    if (domain.includes('indeed')) return 'indeed';  
    if (domain.includes('workday')) return 'workday';
    if (domain.includes('greenhouse')) return 'greenhouse';
    if (domain.includes('lever')) return 'lever';
    if (domain.includes('glassdoor')) return 'glassdoor';
    if (domain.includes('monster')) return 'monster';
    if (domain.includes('ziprecruiter')) return 'ziprecruiter';
    
    return 'generic';
  }

  private detectAuthRequired(response: Response): boolean {
    const authHeaders = ['www-authenticate', 'x-requires-login'];
    return authHeaders.some(header => response.headers.has(header)) ||
           response.status === 401 || 
           response.url.includes('login') ||
           response.url.includes('auth');
  }

  private detectExpiredContent(response: Response): boolean {
    const lastModified = response.headers.get('last-modified');
    if (lastModified) {
      const modifiedDate = new Date(lastModified);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return modifiedDate < sixMonthsAgo;
    }
    return false;
  }

  private createErrorResult(_url: string, errors: ValidationError[], startTime: number, analysis?: URLAnalysis): URLValidationResult {
    return {
      isValid: false,
      confidence: 0,
      data: analysis,
      errors,
      warnings: [],
      metadata: {
        tier: 1,
        processingTimeMs: Date.now() - startTime,
        validatedAt: new Date().toISOString(),
        validationMethod: 'error',
        source: 'URLValidationService'
      }
    };
  }

  private getCachedResult(url: string): URLValidationResult | null {
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.result;
    }
    if (cached) {
      this.cache.delete(url);
    }
    return null;
  }

  private cacheResult(url: string, result: URLValidationResult): void {
    this.cache.set(url, {
      result,
      timestamp: Date.now()
    });
  }
}