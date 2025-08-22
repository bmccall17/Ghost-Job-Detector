/**
 * Enhanced Error Handling Utilities for WebLLM Parsing
 * Provides categorized error handling and user-friendly messages
 */

export enum ErrorCategory {
  NETWORK = 'network',
  PARSING = 'parsing',
  VALIDATION = 'validation',
  RATE_LIMIT = 'rate_limit',
  SECURITY = 'security',
  TIMEOUT = 'timeout',
  WEBLLM = 'webllm',
  DATABASE = 'database',
  UNKNOWN = 'unknown'
}

export interface CategorizedError {
  category: ErrorCategory;
  originalError: Error;
  userMessage: string;
  technicalMessage: string;
  retryable: boolean;
  suggestedAction: string;
  metadata?: Record<string, any>;
}

export class ParsingErrorHandler {
  /**
   * Categorize and enhance error information
   */
  public static categorizeError(error: unknown, context?: string): CategorizedError {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const message = errorObj.message.toLowerCase();

    // Network-related errors
    if (message.includes('fetch') || message.includes('network') || message.includes('connection') || 
        message.includes('timeout') || message.includes('refused') || message.includes('unreachable')) {
      return {
        category: ErrorCategory.NETWORK,
        originalError: errorObj,
        userMessage: 'Unable to access the job posting. The website might be temporarily unavailable.',
        technicalMessage: `Network error: ${errorObj.message}`,
        retryable: true,
        suggestedAction: 'Please try again later or use manual entry.',
        metadata: { context }
      };
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('abort')) {
      return {
        category: ErrorCategory.TIMEOUT,
        originalError: errorObj,
        userMessage: 'The job posting took too long to load.',
        technicalMessage: `Timeout error: ${errorObj.message}`,
        retryable: true,
        suggestedAction: 'Please try again with manual entry for faster results.',
        metadata: { context }
      };
    }

    // Rate limiting errors
    if (message.includes('rate limit') || message.includes('too many requests') || message.includes('429')) {
      return {
        category: ErrorCategory.RATE_LIMIT,
        originalError: errorObj,
        userMessage: 'Too many requests. Please wait a moment before trying again.',
        technicalMessage: `Rate limit exceeded: ${errorObj.message}`,
        retryable: true,
        suggestedAction: 'Wait a few minutes and try again, or use manual entry.',
        metadata: { context }
      };
    }

    // Security/validation errors
    if (message.includes('malicious') || message.includes('invalid url') || message.includes('security') ||
        message.includes('suspicious') || message.includes('blocked')) {
      return {
        category: ErrorCategory.SECURITY,
        originalError: errorObj,
        userMessage: 'The provided URL could not be processed for security reasons.',
        technicalMessage: `Security validation failed: ${errorObj.message}`,
        retryable: false,
        suggestedAction: 'Please verify the URL and try again, or use manual entry.',
        metadata: { context }
      };
    }

    // WebLLM specific errors
    if (message.includes('webllm') || message.includes('model') || message.includes('inference') ||
        message.includes('llm') || context === 'webllm') {
      return {
        category: ErrorCategory.WEBLLM,
        originalError: errorObj,
        userMessage: 'The AI parsing service is temporarily unavailable.',
        technicalMessage: `WebLLM error: ${errorObj.message}`,
        retryable: true,
        suggestedAction: 'Please try manual entry or wait a moment and try again.',
        metadata: { context }
      };
    }

    // Parsing/extraction errors
    if (message.includes('parse') || message.includes('extract') || message.includes('invalid format') ||
        message.includes('corrupted') || context === 'parsing') {
      return {
        category: ErrorCategory.PARSING,
        originalError: errorObj,
        userMessage: 'Unable to extract job information from this page.',
        technicalMessage: `Parsing error: ${errorObj.message}`,
        retryable: false,
        suggestedAction: 'Please use manual entry to input the job details.',
        metadata: { context }
      };
    }

    // Database errors
    if (message.includes('database') || message.includes('prisma') || message.includes('sql') ||
        message.includes('connection') && message.includes('db')) {
      return {
        category: ErrorCategory.DATABASE,
        originalError: errorObj,
        userMessage: 'A temporary system error occurred. Your data is safe.',
        technicalMessage: `Database error: ${errorObj.message}`,
        retryable: true,
        suggestedAction: 'Please try again in a moment.',
        metadata: { context }
      };
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid input') || message.includes('required')) {
      return {
        category: ErrorCategory.VALIDATION,
        originalError: errorObj,
        userMessage: 'The provided information is not valid.',
        technicalMessage: `Validation error: ${errorObj.message}`,
        retryable: false,
        suggestedAction: 'Please check your input and try again.',
        metadata: { context }
      };
    }

    // Default/unknown errors
    return {
      category: ErrorCategory.UNKNOWN,
      originalError: errorObj,
      userMessage: 'An unexpected error occurred. Please try manual entry.',
      technicalMessage: `Unknown error: ${errorObj.message}`,
      retryable: true,
      suggestedAction: 'Try manual entry or contact support if the problem persists.',
      metadata: { context }
    };
  }

  /**
   * Generate API error response with categorized error information
   */
  public static generateErrorResponse(error: unknown, context?: string): {
    error: string;
    message: string;
    category: string;
    retryable: boolean;
    suggestedAction: string;
    technical?: string;
  } {
    const categorizedError = this.categorizeError(error, context);

    return {
      error: categorizedError.category,
      message: categorizedError.userMessage,
      category: categorizedError.category,
      retryable: categorizedError.retryable,
      suggestedAction: categorizedError.suggestedAction,
      technical: process.env.NODE_ENV === 'development' ? categorizedError.technicalMessage : undefined
    };
  }

  /**
   * Log categorized error with appropriate severity
   */
  public static logError(error: unknown, context?: string, metadata?: Record<string, any>): void {
    const categorizedError = this.categorizeError(error, context);
    
    const logData = {
      timestamp: new Date().toISOString(),
      category: categorizedError.category,
      context: context,
      userMessage: categorizedError.userMessage,
      technicalMessage: categorizedError.technicalMessage,
      retryable: categorizedError.retryable,
      metadata: { ...categorizedError.metadata, ...metadata },
      stack: categorizedError.originalError.stack
    };

    // Use different log levels based on error category
    switch (categorizedError.category) {
      case ErrorCategory.SECURITY:
      case ErrorCategory.DATABASE:
        console.error('[CRITICAL]', JSON.stringify(logData));
        break;
      case ErrorCategory.WEBLLM:
      case ErrorCategory.NETWORK:
        console.warn('[WARNING]', JSON.stringify(logData));
        break;
      default:
        console.log('[INFO]', JSON.stringify(logData));
    }
  }

  /**
   * Determine if an error should trigger a retry
   */
  public static shouldRetry(error: unknown, attemptCount: number, maxAttempts: number = 3): boolean {
    if (attemptCount >= maxAttempts) return false;
    
    const categorizedError = this.categorizeError(error);
    return categorizedError.retryable;
  }

  /**
   * Get appropriate HTTP status code for error category
   */
  public static getHttpStatusCode(error: unknown): number {
    const categorizedError = this.categorizeError(error);
    
    switch (categorizedError.category) {
      case ErrorCategory.VALIDATION:
      case ErrorCategory.SECURITY:
        return 400;
      case ErrorCategory.RATE_LIMIT:
        return 429;
      case ErrorCategory.TIMEOUT:
        return 408;
      case ErrorCategory.DATABASE:
      case ErrorCategory.WEBLLM:
      case ErrorCategory.UNKNOWN:
        return 500;
      case ErrorCategory.NETWORK:
      case ErrorCategory.PARSING:
      default:
        return 422; // Unprocessable Entity
    }
  }
}