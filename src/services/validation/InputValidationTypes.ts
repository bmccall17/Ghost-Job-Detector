/**
 * Input Validation Types - Three-Tier Validation System
 * Comprehensive validation for job posting inputs to prevent invalid content processing
 */

export interface ValidationResult<T = any> {
  isValid: boolean;
  confidence: number;
  data?: T;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: ValidationMetadata;
}

export interface ValidationError {
  code: string;
  message: string;
  severity: 'blocking' | 'degraded' | 'warning';
  category: 'url' | 'content' | 'parsing' | 'system';
  userMessage: string;
  suggestion?: string;
  retryable: boolean;
}

export interface ValidationWarning {
  code: string;
  message: string;
  impact: 'low' | 'medium' | 'high';
  userMessage: string;
}

export interface ValidationMetadata {
  tier: 1 | 2 | 3;
  processingTimeMs: number;
  validatedAt: string;
  validationMethod: string;
  source: string;
}

// Tier 1: URL Validation
export interface URLValidationResult extends ValidationResult<URLAnalysis> {
  data?: URLAnalysis;
}

export interface URLAnalysis {
  url: string;
  normalizedUrl: string;
  domain: string;
  platform: string;
  isAccessible: boolean;
  responseTime: number;
  httpStatus: number;
  contentType: string;
  finalUrl: string; // After redirects
  requiresAuth: boolean;
  isExpired: boolean;
  lastModified?: string;
  hasJobIndicators: boolean;
}

// Tier 2: Content Classification
export interface ContentValidationResult extends ValidationResult<ContentClassification> {
  data?: ContentClassification;
}

export interface ContentClassification {
  contentType: 'job_posting' | 'career_page' | 'company_page' | 'error_page' | 'blog_post' | 'news_article' | 'other';
  confidence: number;
  jobRelevanceScore: number; // 0.0-1.0
  hasJobTitle: boolean;
  hasCompanyInfo: boolean;
  hasJobDescription: boolean;
  hasApplicationInfo: boolean;
  hasRequirements: boolean;
  hasSalaryInfo: boolean;
  isExpired: boolean;
  expirationDate?: string;
  postedDate?: string;
  language: string;
  wordCount: number;
  structuralFeatures: {
    hasJobKeywords: boolean;
    hasContactInfo: boolean;
    hasApplicationInstructions: boolean;
    hasBenefitsSection: boolean;
    hasQualificationsSection: boolean;
  };
  qualityScore: number; // 0.0-1.0
}

// Tier 3: Parsing Validation
export interface ParsingValidationResult extends ValidationResult<ParsedJobData> {
  data?: ParsedJobData;
}

export interface ParsedJobData {
  title: string | null;
  company: string | null;
  location: string | null;
  description: string | null;
  requirements: string | null;
  benefits: string | null;
  salary: string | null;
  jobType: string | null;
  applicationUrl: string | null;
  postedAt: string | null;
  expiresAt: string | null;
  contactInfo: string | null;
  isRemote: boolean;
  experienceLevel: string | null;
  department: string | null;
  industry: string | null;
  qualityMetrics: {
    titleQuality: number;
    companyQuality: number;
    descriptionQuality: number;
    completeness: number;
    overall: number;
  };
}

// Unified Validation Result
export interface UnifiedValidationResult {
  isValid: boolean;
  overallConfidence: number;
  validationTier: 1 | 2 | 3; // Highest tier reached
  urlValidation: URLValidationResult;
  contentValidation?: ContentValidationResult;
  parsingValidation?: ParsingValidationResult;
  finalData?: ParsedJobData;
  processingTimeMs: number;
  canRetry: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  userGuidance: {
    primaryMessage: string;
    actionRequired: string;
    suggestions: string[];
    canProceedManually: boolean;
  };
}

// Error Categories
export enum ValidationErrorCode {
  // URL Tier Errors
  URL_INVALID_FORMAT = 'URL_INVALID_FORMAT',
  URL_NOT_ACCESSIBLE = 'URL_NOT_ACCESSIBLE', 
  URL_REQUIRES_AUTH = 'URL_REQUIRES_AUTH',
  URL_EXPIRED = 'URL_EXPIRED',
  URL_NOT_FOUND = 'URL_NOT_FOUND',
  URL_SERVER_ERROR = 'URL_SERVER_ERROR',
  URL_TIMEOUT = 'URL_TIMEOUT',
  URL_REDIRECT_LOOP = 'URL_REDIRECT_LOOP',
  
  // Content Tier Errors  
  CONTENT_NOT_JOB_POSTING = 'CONTENT_NOT_JOB_POSTING',
  CONTENT_EXPIRED_POSTING = 'CONTENT_EXPIRED_POSTING',
  CONTENT_INSUFFICIENT_DATA = 'CONTENT_INSUFFICIENT_DATA',
  CONTENT_LANGUAGE_NOT_SUPPORTED = 'CONTENT_LANGUAGE_NOT_SUPPORTED',
  CONTENT_TOO_SHORT = 'CONTENT_TOO_SHORT',
  CONTENT_CORRUPTED = 'CONTENT_CORRUPTED',
  CONTENT_PAYWALL = 'CONTENT_PAYWALL',
  
  // Parsing Tier Errors
  PARSING_FAILED = 'PARSING_FAILED',
  PARSING_LOW_QUALITY = 'PARSING_LOW_QUALITY',
  PARSING_INCOMPLETE = 'PARSING_INCOMPLETE',
  PARSING_TITLE_MISSING = 'PARSING_TITLE_MISSING',
  PARSING_COMPANY_MISSING = 'PARSING_COMPANY_MISSING',
  PARSING_DESCRIPTION_POOR = 'PARSING_DESCRIPTION_POOR',
  
  // System Errors
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  WEBLLM_UNAVAILABLE = 'WEBLLM_UNAVAILABLE',
  RATE_LIMITED = 'RATE_LIMITED',
  VALIDATION_TIMEOUT = 'VALIDATION_TIMEOUT'
}

// Validation Configuration
export interface ValidationConfig {
  enabledTiers: Array<1 | 2 | 3>;
  timeouts: {
    urlValidation: number;
    contentClassification: number;
    parsingValidation: number;
    total: number;
  };
  thresholds: {
    minContentConfidence: number;
    minParsingQuality: number;
    minJobRelevanceScore: number;
  };
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
    retryableErrors: ValidationErrorCode[];
  };
  fallbackStrategies: {
    allowPartialResults: boolean;
    gracefulDegradation: boolean;
    manualOverride: boolean;
  };
}

// Default configuration
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  enabledTiers: [1, 2, 3],
  timeouts: {
    urlValidation: 8000,
    contentClassification: 10000, 
    parsingValidation: 15000,
    total: 30000
  },
  thresholds: {
    minContentConfidence: 0.7,
    minParsingQuality: 0.6,
    minJobRelevanceScore: 0.8
  },
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 1000,
    retryableErrors: [
      ValidationErrorCode.URL_TIMEOUT,
      ValidationErrorCode.URL_SERVER_ERROR,
      ValidationErrorCode.SYSTEM_ERROR,
      ValidationErrorCode.RATE_LIMITED
    ]
  },
  fallbackStrategies: {
    allowPartialResults: true,
    gracefulDegradation: true,
    manualOverride: true
  }
};