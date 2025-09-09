/**
 * Data Integrity Validator - Bulletproof validation to prevent database pollution
 * Critical component that ensures only legitimate job data is analyzed and stored
 */

export interface ValidationResult {
  isValid: boolean;
  qualityScore: number; // 0.00-1.00
  confidence: number; // 0.00-1.00
  errors: ValidationError[];
  warnings: ValidationWarning[];
  dataQualityStatus: DataQualityStatus;
  metadata: ValidationMetadata;
}

export interface ValidationError {
  code: ValidationErrorCode;
  field: string;
  message: string;
  severity: 'blocking' | 'degraded' | 'warning';
  userMessage: string;
  suggestion: string;
  isRetryable: boolean;
}

export interface ValidationWarning {
  code: string;
  field: string;
  message: string;
  impact: 'high' | 'medium' | 'low';
  userMessage: string;
}

export interface ValidationMetadata {
  validatedAt: string;
  processingTimeMs: number;
  validationMethod: string;
  placeholderDetected: string[];
  contentAnalysis: {
    titleLength: number;
    companyLength: number;
    descriptionLength: number;
    hasKeywords: boolean;
  };
}

export enum DataQualityStatus {
  VALID = 'VALID',
  SUSPECT = 'SUSPECT',
  PLACEHOLDER = 'PLACEHOLDER',
  FAILED_PARSING = 'FAILED_PARSING',
  MANUAL_REVIEW = 'MANUAL_REVIEW'
}

export enum ValidationErrorCode {
  // Critical blocking errors
  PLACEHOLDER_TITLE = 'PLACEHOLDER_TITLE',
  PLACEHOLDER_COMPANY = 'PLACEHOLDER_COMPANY',
  EMPTY_REQUIRED_FIELDS = 'EMPTY_REQUIRED_FIELDS',
  PARSING_FAILURE = 'PARSING_FAILURE',
  
  // Quality issues
  LOW_QUALITY_DATA = 'LOW_QUALITY_DATA',
  SUSPICIOUS_CONTENT = 'SUSPICIOUS_CONTENT',
  INCOMPLETE_EXTRACTION = 'INCOMPLETE_EXTRACTION',
  
  // System errors
  VALIDATION_TIMEOUT = 'VALIDATION_TIMEOUT',
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

export interface JobDataToValidate {
  title: string;
  company: string;
  description?: string;
  location?: string;
  sourceUrl?: string;
  extractionMethod: string;
  confidence?: number;
  parsingMetadata?: any;
}

export class DataIntegrityValidator {
  private readonly PLACEHOLDER_PATTERNS = {
    // Known placeholder title patterns
    TITLE_PLACEHOLDERS: [
      'PDF Parsing Failed',
      'Position from PDF', 
      'Unknown Position',
      'Job Title Not Found',
      'Failed to Extract Title',
      'Error Extracting Title',
      'No Title Found',
      'Title Unavailable'
    ],
    
    // Known placeholder company patterns
    COMPANY_PLACEHOLDERS: [
      'Unknown Company',
      'Company Not Found',
      'Failed to Extract Company',
      'Error Extracting Company',
      'No Company Found',
      'Company Unavailable',
      'PDF Company Error'
    ],
    
    // Generic error patterns
    ERROR_PATTERNS: [
      /error\s+extracting/i,
      /failed\s+to\s+parse/i,
      /could\s+not\s+find/i,
      /extraction\s+failed/i,
      /parsing\s+error/i,
      /unavailable/i,
      /not\s+found/i
    ]
  };

  private readonly QUALITY_THRESHOLDS = {
    MIN_TITLE_LENGTH: 3,
    MIN_COMPANY_LENGTH: 2,
    MIN_DESCRIPTION_LENGTH: 50,
    MIN_CONFIDENCE: 0.70,
    MIN_QUALITY_SCORE: 0.60,
    SUSPICIOUS_KEYWORDS: [
      'test', 'demo', 'example', 'sample', 'placeholder'
    ]
  };

  /**
   * Main validation entry point - comprehensive data integrity check
   * Returns detailed validation result with quality assessment
   */
  public async validateJobData(data: JobDataToValidate): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    console.log(`🛡️ Starting data integrity validation for: ${data.sourceUrl || 'Unknown source'}`);
    
    try {
      // Phase 1: Critical Placeholder Detection
      const placeholderCheck = this.detectPlaceholders(data);
      errors.push(...placeholderCheck.errors);
      warnings.push(...placeholderCheck.warnings);
      
      // Phase 2: Field Quality Validation
      const qualityCheck = this.validateFieldQuality(data);
      errors.push(...qualityCheck.errors);
      warnings.push(...qualityCheck.warnings);
      
      // Phase 3: Content Authenticity Analysis
      const authenticityCheck = this.analyzeContentAuthenticity(data);
      errors.push(...authenticityCheck.errors);
      warnings.push(...authenticityCheck.warnings);
      
      // Phase 4: Cross-Validation Confidence Check
      const confidenceCheck = this.validateConfidenceMetrics(data);
      errors.push(...confidenceCheck.errors);
      warnings.push(...confidenceCheck.warnings);
      
      // Calculate overall quality score and status
      const qualityScore = this.calculateQualityScore(data, errors, warnings);
      const dataQualityStatus = this.determineDataQualityStatus(errors, warnings, qualityScore);
      const isValid = this.determineValidity(errors, dataQualityStatus);
      
      const processingTimeMs = Date.now() - startTime;
      
      const result: ValidationResult = {
        isValid,
        qualityScore,
        confidence: data.confidence || 0,
        errors,
        warnings,
        dataQualityStatus,
        metadata: {
          validatedAt: new Date().toISOString(),
          processingTimeMs,
          validationMethod: 'DataIntegrityValidator',
          placeholderDetected: placeholderCheck.detectedPlaceholders,
          contentAnalysis: {
            titleLength: data.title?.length || 0,
            companyLength: data.company?.length || 0,
            descriptionLength: data.description?.length || 0,
            hasKeywords: this.containsJobKeywords(data.description || '')
          }
        }
      };
      
      this.logValidationResult(result, data);
      return result;
      
    } catch (error) {
      console.error('❌ Data integrity validation failed:', error);
      
      const systemError: ValidationError = {
        code: ValidationErrorCode.SYSTEM_ERROR,
        field: 'system',
        message: `Validation system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'blocking',
        userMessage: 'Unable to validate job data due to a system error.',
        suggestion: 'Please try again in a few moments.',
        isRetryable: true
      };
      
      return {
        isValid: false,
        qualityScore: 0,
        confidence: 0,
        errors: [systemError],
        warnings: [],
        dataQualityStatus: DataQualityStatus.FAILED_PARSING,
        metadata: {
          validatedAt: new Date().toISOString(),
          processingTimeMs: Date.now() - startTime,
          validationMethod: 'DataIntegrityValidator',
          placeholderDetected: [],
          contentAnalysis: {
            titleLength: 0,
            companyLength: 0,
            descriptionLength: 0,
            hasKeywords: false
          }
        }
      };
    }
  }

  /**
   * Phase 1: Detect placeholder and error content that indicates parsing failure
   */
  private detectPlaceholders(data: JobDataToValidate): { 
    errors: ValidationError[], 
    warnings: ValidationWarning[],
    detectedPlaceholders: string[]
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const detectedPlaceholders: string[] = [];
    
    // Check title for placeholders
    if (this.isPlaceholderText(data.title, 'title')) {
      detectedPlaceholders.push(`title: ${data.title}`);
      errors.push({
        code: ValidationErrorCode.PLACEHOLDER_TITLE,
        field: 'title',
        message: `Placeholder title detected: "${data.title}"`,
        severity: 'blocking',
        userMessage: 'Job title extraction failed. The title appears to be a placeholder.',
        suggestion: 'Try uploading a different PDF or manually enter the job title.',
        isRetryable: true
      });
    }
    
    // Check company for placeholders
    if (this.isPlaceholderText(data.company, 'company')) {
      detectedPlaceholders.push(`company: ${data.company}`);
      errors.push({
        code: ValidationErrorCode.PLACEHOLDER_COMPANY,
        field: 'company',
        message: `Placeholder company detected: "${data.company}"`,
        severity: 'blocking',
        userMessage: 'Company name extraction failed. The company appears to be a placeholder.',
        suggestion: 'Try uploading a different PDF or manually enter the company name.',
        isRetryable: true
      });
    }
    
    // Check for generic error patterns in any field
    const allText = [data.title, data.company, data.description].join(' ').toLowerCase();
    for (const pattern of this.PLACEHOLDER_PATTERNS.ERROR_PATTERNS) {
      if (pattern.test(allText)) {
        detectedPlaceholders.push(`error_pattern: ${pattern.source}`);
        warnings.push({
          code: 'GENERIC_ERROR_PATTERN',
          field: 'content',
          message: 'Generic error pattern detected in content',
          impact: 'medium',
          userMessage: 'Some content may contain extraction errors.'
        });
      }
    }
    
    return { errors, warnings, detectedPlaceholders };
  }

  /**
   * Phase 2: Validate field quality and completeness
   */
  private validateFieldQuality(data: JobDataToValidate): { errors: ValidationError[], warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Title quality check
    if (!data.title || data.title.trim().length < this.QUALITY_THRESHOLDS.MIN_TITLE_LENGTH) {
      errors.push({
        code: ValidationErrorCode.EMPTY_REQUIRED_FIELDS,
        field: 'title',
        message: 'Job title is missing or too short',
        severity: 'blocking',
        userMessage: 'Could not identify a clear job title.',
        suggestion: 'Verify this document contains a job posting with a clear title.',
        isRetryable: false
      });
    }
    
    // Company quality check
    if (!data.company || data.company.trim().length < this.QUALITY_THRESHOLDS.MIN_COMPANY_LENGTH) {
      errors.push({
        code: ValidationErrorCode.EMPTY_REQUIRED_FIELDS,
        field: 'company',
        message: 'Company name is missing or too short',
        severity: 'blocking',
        userMessage: 'Could not identify a clear company name.',
        suggestion: 'Verify this document contains a job posting with a clear company name.',
        isRetryable: false
      });
    }
    
    // Description quality check
    if (!data.description || data.description.trim().length < this.QUALITY_THRESHOLDS.MIN_DESCRIPTION_LENGTH) {
      warnings.push({
        code: 'DESCRIPTION_TOO_SHORT',
        field: 'description',
        message: 'Job description is missing or very short',
        impact: 'medium',
        userMessage: 'Job description appears incomplete - this may affect analysis accuracy.'
      });
    }
    
    return { errors, warnings };
  }

  /**
   * Phase 3: Analyze content authenticity and detect suspicious patterns
   */
  private analyzeContentAuthenticity(data: JobDataToValidate): { errors: ValidationError[], warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Check for suspicious test/demo content
    const suspiciousContent = this.detectSuspiciousContent(data);
    if (suspiciousContent.isSuspicious) {
      warnings.push({
        code: 'SUSPICIOUS_CONTENT',
        field: 'content',
        message: `Suspicious content detected: ${suspiciousContent.reasons.join(', ')}`,
        impact: 'high',
        userMessage: 'This appears to be test or demo content rather than a real job posting.'
      });
    }
    
    // Verify content has job-related keywords
    if (!this.containsJobKeywords(data.description || '')) {
      warnings.push({
        code: 'MISSING_JOB_KEYWORDS',
        field: 'description',
        message: 'Content lacks typical job posting keywords',
        impact: 'medium',
        userMessage: 'Content may not be a standard job posting.'
      });
    }
    
    return { errors, warnings };
  }

  /**
   * Phase 4: Validate confidence metrics and parsing metadata
   */
  private validateConfidenceMetrics(data: JobDataToValidate): { errors: ValidationError[], warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Check minimum confidence threshold
    if (data.confidence !== undefined && data.confidence < this.QUALITY_THRESHOLDS.MIN_CONFIDENCE) {
      errors.push({
        code: ValidationErrorCode.LOW_QUALITY_DATA,
        field: 'confidence',
        message: `Confidence score too low: ${data.confidence}`,
        severity: 'degraded',
        userMessage: 'Data extraction quality is below acceptable threshold.',
        suggestion: 'Try a different PDF or manually verify the information.',
        isRetryable: true
      });
    }
    
    // Check extraction method reliability
    if (data.extractionMethod === 'fallback' || data.extractionMethod === 'filename') {
      warnings.push({
        code: 'FALLBACK_EXTRACTION',
        field: 'extractionMethod',
        message: `Using fallback extraction method: ${data.extractionMethod}`,
        impact: 'high',
        userMessage: 'Data was extracted using a fallback method - accuracy may be reduced.'
      });
    }
    
    return { errors, warnings };
  }

  /**
   * Helper: Check if text matches known placeholder patterns
   */
  private isPlaceholderText(text: string, type: 'title' | 'company'): boolean {
    if (!text) return true;
    
    const cleanText = text.trim();
    const placeholders = type === 'title' 
      ? this.PLACEHOLDER_PATTERNS.TITLE_PLACEHOLDERS
      : this.PLACEHOLDER_PATTERNS.COMPANY_PLACEHOLDERS;
    
    // Exact match check
    if (placeholders.includes(cleanText)) {
      return true;
    }
    
    // Pattern-based check
    const lowerText = cleanText.toLowerCase();
    return this.PLACEHOLDER_PATTERNS.ERROR_PATTERNS.some(pattern => pattern.test(lowerText));
  }

  /**
   * Helper: Detect suspicious or test content
   */
  private detectSuspiciousContent(data: JobDataToValidate): { isSuspicious: boolean, reasons: string[] } {
    const reasons: string[] = [];
    const allText = [data.title, data.company, data.description].join(' ').toLowerCase();
    
    // Check for test/demo keywords
    for (const keyword of this.QUALITY_THRESHOLDS.SUSPICIOUS_KEYWORDS) {
      if (allText.includes(keyword)) {
        reasons.push(`Contains "${keyword}"`);
      }
    }
    
    // Check for very generic content
    if (data.title && data.title.length < 10) {
      reasons.push('Title too generic');
    }
    
    if (data.company && data.company.length < 5) {
      reasons.push('Company name too generic');
    }
    
    return {
      isSuspicious: reasons.length > 0,
      reasons
    };
  }

  /**
   * Helper: Check if content contains job-related keywords
   */
  private containsJobKeywords(text: string): boolean {
    if (!text || text.length < 20) return false;
    
    const jobKeywords = [
      'responsibilities', 'requirements', 'qualifications', 'experience',
      'skills', 'benefits', 'salary', 'apply', 'position', 'role',
      'candidate', 'team', 'company', 'work', 'job', 'career'
    ];
    
    const lowerText = text.toLowerCase();
    return jobKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Calculate overall quality score based on multiple factors
   */
  private calculateQualityScore(
    data: JobDataToValidate, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): number {
    let score = 1.0;
    
    // Deduct for errors
    const blockingErrors = errors.filter(e => e.severity === 'blocking');
    const degradedErrors = errors.filter(e => e.severity === 'degraded');
    
    score -= blockingErrors.length * 0.4;  // -40% per blocking error
    score -= degradedErrors.length * 0.2;  // -20% per degraded error
    score -= warnings.length * 0.1;        // -10% per warning
    
    // Bonus for good content
    if (data.description && data.description.length > 200) score += 0.1;
    if (data.confidence && data.confidence > 0.8) score += 0.1;
    if (data.location) score += 0.05;
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Determine data quality status based on validation results
   */
  private determineDataQualityStatus(
    errors: ValidationError[], 
    warnings: ValidationWarning[], 
    qualityScore: number
  ): DataQualityStatus {
    const placeholderErrors = errors.filter(e => 
      e.code === ValidationErrorCode.PLACEHOLDER_TITLE || 
      e.code === ValidationErrorCode.PLACEHOLDER_COMPANY
    );
    
    if (placeholderErrors.length > 0) {
      return DataQualityStatus.PLACEHOLDER;
    }
    
    const blockingErrors = errors.filter(e => e.severity === 'blocking');
    if (blockingErrors.length > 0) {
      return DataQualityStatus.FAILED_PARSING;
    }
    
    if (qualityScore < this.QUALITY_THRESHOLDS.MIN_QUALITY_SCORE) {
      return DataQualityStatus.SUSPECT;
    }
    
    if (warnings.filter(w => w.impact === 'high').length > 0) {
      return DataQualityStatus.MANUAL_REVIEW;
    }
    
    return DataQualityStatus.VALID;
  }

  /**
   * Determine if data is valid for analysis
   */
  private determineValidity(errors: ValidationError[], dataQualityStatus: DataQualityStatus): boolean {
    // Never allow analysis of placeholder or failed parsing data
    if (dataQualityStatus === DataQualityStatus.PLACEHOLDER || 
        dataQualityStatus === DataQualityStatus.FAILED_PARSING) {
      return false;
    }
    
    // Block on any blocking errors
    const blockingErrors = errors.filter(e => e.severity === 'blocking');
    if (blockingErrors.length > 0) {
      return false;
    }
    
    return true;
  }

  /**
   * Log validation results for debugging and monitoring
   */
  private logValidationResult(result: ValidationResult, data: JobDataToValidate): void {
    const status = result.isValid ? '✅' : '❌';
    const quality = (result.qualityScore * 100).toFixed(1);
    
    console.log(`${status} Data integrity validation completed:`, {
      isValid: result.isValid,
      qualityScore: `${quality}%`,
      confidence: (result.confidence * 100).toFixed(1) + '%',
      status: result.dataQualityStatus,
      errors: result.errors.length,
      warnings: result.warnings.length,
      processingTime: `${result.metadata.processingTimeMs}ms`,
      source: data.sourceUrl || 'Unknown'
    });
    
    if (!result.isValid) {
      console.warn('🚨 BLOCKING VALIDATION FAILURE - Analysis will NOT proceed:', {
        blockingErrors: result.errors.filter(e => e.severity === 'blocking').map(e => e.message),
        placeholders: result.metadata.placeholderDetected
      });
    }
  }
}