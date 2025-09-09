/**
 * Enhanced PDF Parsing Service with Robust Validation
 * Integrates with DataIntegrityValidator to prevent fake data generation
 */

import { PDFParsingService, PDFJobData, PDFParsingOptions } from './PDFParsingService';
import { DataIntegrityValidator, ValidationResult, DataQualityStatus, JobDataToValidate } from '../validation/DataIntegrityValidator';
import { WebLLMParsingService } from '../WebLLMParsingService';

export interface EnhancedPDFJobData extends PDFJobData {
  validationResult: ValidationResult;
  isAnalyzable: boolean;
  requiredActions: string[];
  fallbackOptions: FallbackOption[];
}

export interface FallbackOption {
  type: 'manual_input' | 'retry_upload' | 'url_input' | 'skip_field';
  field?: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  userMessage: string;
}

export interface EnhancedParsingOptions extends PDFParsingOptions {
  skipValidation?: boolean;
  allowPartialData?: boolean;
  fallbackStrategies?: {
    enableManualInput: boolean;
    enableURLRecovery: boolean;
    enableRetry: boolean;
  };
}

export class EnhancedPDFParsingService {
  private static instance: EnhancedPDFParsingService;
  private pdfParsingService: PDFParsingService;
  private dataValidator: DataIntegrityValidator;
  private webllmService: WebLLMParsingService;

  static getInstance(): EnhancedPDFParsingService {
    if (!EnhancedPDFParsingService.instance) {
      EnhancedPDFParsingService.instance = new EnhancedPDFParsingService();
    }
    return EnhancedPDFParsingService.instance;
  }

  constructor() {
    this.pdfParsingService = PDFParsingService.getInstance();
    this.dataValidator = new DataIntegrityValidator();
    this.webllmService = new WebLLMParsingService();
  }

  /**
   * Main parsing entry point with comprehensive validation
   * Returns enhanced result with validation status and fallback options
   */
  async extractJobData(file: File, options: EnhancedParsingOptions = {}): Promise<EnhancedPDFJobData> {
    const startTime = Date.now();
    
    console.log(`🚀 Enhanced PDF parsing started for: ${file.name}`);
    
    try {
      // Phase 1: Basic PDF parsing
      options.onProgress?.('Starting PDF text extraction', 5);
      const basicPDFData = await this.performBasicPDFParsing(file, options);
      
      // Phase 2: Data integrity validation
      options.onProgress?.('Validating extracted data quality', 70);
      const validationResult = await this.validateExtractedData(basicPDFData, file.name);
      
      // Phase 3: Enhanced parsing if validation passes
      let enhancedData = basicPDFData;
      if (validationResult.isValid && validationResult.qualityScore > 0.7) {
        options.onProgress?.('Enhancing data with WebLLM validation', 85);
        enhancedData = await this.enhanceWithWebLLM(basicPDFData, options);
      }
      
      // Phase 4: Generate fallback options and user guidance
      options.onProgress?.('Generating user guidance and fallback options', 95);
      const fallbackOptions = this.generateFallbackOptions(validationResult, enhancedData);
      const requiredActions = this.generateRequiredActions(validationResult);
      
      const finalResult: EnhancedPDFJobData = {
        ...enhancedData,
        validationResult,
        isAnalyzable: this.determineAnalyzability(validationResult, options),
        requiredActions,
        fallbackOptions
      };
      
      options.onProgress?.('PDF parsing completed', 100);
      
      // Log comprehensive result
      this.logParsingResult(finalResult, file.name, Date.now() - startTime);
      
      // CRITICAL: Fail-fast if data is not analyzable and we're not allowing partial data
      if (!finalResult.isAnalyzable && !options.allowPartialData) {
        throw new EnhancedPDFParsingError(
          'PDF parsing produced non-analyzable data',
          finalResult,
          'VALIDATION_FAILED'
        );
      }
      
      return finalResult;
      
    } catch (error) {
      console.error('🚨 Enhanced PDF parsing failed:', error);
      
      // If it's already an EnhancedPDFParsingError, re-throw it
      if (error instanceof EnhancedPDFParsingError) {
        throw error;
      }
      
      // Create error response with fallback options
      const errorData = this.createErrorFallbackData(file, error, Date.now() - startTime);
      
      // CRITICAL: Always throw error for non-analyzable data unless explicitly allowing partial data
      if (!options.allowPartialData) {
        throw new EnhancedPDFParsingError(
          error instanceof Error ? error.message : 'Unknown parsing error',
          errorData,
          'PARSING_FAILED'
        );
      }
      
      return errorData;
    }
  }

  /**
   * Phase 1: Perform basic PDF parsing using existing service
   */
  private async performBasicPDFParsing(file: File, options: EnhancedParsingOptions): Promise<PDFJobData> {
    try {
      return await this.pdfParsingService.extractJobData(file, {
        includeRawText: true,
        onProgress: (stage, progress) => {
          // Map progress from 5-65% range for basic parsing
          const mappedProgress = 5 + (progress * 0.60);
          options.onProgress?.(stage, mappedProgress);
        },
        extractionOptions: options.extractionOptions
      });
    } catch (error) {
      console.error('❌ Basic PDF parsing failed:', error);
      throw error;
    }
  }

  /**
   * Phase 2: Validate extracted data using DataIntegrityValidator
   */
  private async validateExtractedData(pdfData: PDFJobData, _fileName: string): Promise<ValidationResult> {
    const jobDataToValidate: JobDataToValidate = {
      title: pdfData.title,
      company: pdfData.company,
      description: pdfData.description,
      location: pdfData.location,
      sourceUrl: pdfData.sourceUrl,
      extractionMethod: pdfData.parsingMetadata.parsingMethod,
      confidence: pdfData.confidence.overall,
      parsingMetadata: pdfData.parsingMetadata
    };

    return await this.dataValidator.validateJobData(jobDataToValidate);
  }

  /**
   * Phase 3: Enhance with WebLLM if basic validation passes
   */
  private async enhanceWithWebLLM(pdfData: PDFJobData, _options: EnhancedParsingOptions): Promise<PDFJobData> {
    try {
      console.log('🤖 Attempting WebLLM enhancement...');
      
      // Only enhance if we have sufficient content and source URL
      if (pdfData.rawTextContent && pdfData.rawTextContent.length > 100 && pdfData.sourceUrl) {
        // Use existing WebLLM validation method with the source URL
        const webllmValidation = await this.webllmService.validateContent({
          title: pdfData.title || null,
          company: pdfData.company || null,
          location: pdfData.location || null,
          description: pdfData.description || null,
          salary: null,
          jobType: null,
          postedAt: pdfData.postedAt?.toISOString() || null,
          jobId: null,
          contactDetails: null,
          originalSource: pdfData.sourceUrl || ''
        });
        
        if (webllmValidation && webllmValidation.confidence > pdfData.confidence.overall) {
          console.log('✅ WebLLM validation successful, confidence improved');
          // Update confidence but keep original data structure
          return {
            ...pdfData,
            confidence: {
              ...pdfData.confidence,
              overall: webllmValidation.confidence
            }
          };
        }
      }
      
      console.log('⚠️ WebLLM enhancement skipped or not beneficial, using original data');
      return pdfData;
      
    } catch (error) {
      console.warn('⚠️ WebLLM enhancement failed, using original data:', error);
      return pdfData;
    }
  }

  /**
   * Generate fallback options based on validation results
   */
  private generateFallbackOptions(validationResult: ValidationResult, pdfData: PDFJobData): FallbackOption[] {
    const options: FallbackOption[] = [];
    
    // Check for placeholder title
    const titleErrors = validationResult.errors.filter(e => e.field === 'title');
    if (titleErrors.length > 0) {
      options.push({
        type: 'manual_input',
        field: 'title',
        description: 'Manually enter the job title',
        priority: 'high',
        userMessage: 'Job title could not be extracted. Please enter the job title manually.'
      });
    }
    
    // Check for placeholder company
    const companyErrors = validationResult.errors.filter(e => e.field === 'company');
    if (companyErrors.length > 0) {
      options.push({
        type: 'manual_input',
        field: 'company',
        description: 'Manually enter the company name',
        priority: 'high',
        userMessage: 'Company name could not be extracted. Please enter the company name manually.'
      });
    }
    
    // Check for missing URL
    if (!pdfData.sourceUrl || pdfData.sourceUrl === '') {
      options.push({
        type: 'url_input',
        description: 'Provide the original job posting URL',
        priority: 'medium',
        userMessage: 'No URL found in PDF. Providing the original job posting URL will improve analysis accuracy.'
      });
    }
    
    // Check for low quality data
    if (validationResult.qualityScore < 0.6) {
      options.push({
        type: 'retry_upload',
        description: 'Try uploading a different PDF version',
        priority: 'medium',
        userMessage: 'Data quality is low. Try uploading a clearer PDF or a different format.'
      });
    }
    
    // Option to skip problematic fields
    if (validationResult.warnings.length > 0) {
      options.push({
        type: 'skip_field',
        description: 'Continue analysis with available data',
        priority: 'low',
        userMessage: 'Some information may be missing, but analysis can continue with available data.'
      });
    }
    
    return options.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate required actions for user
   */
  private generateRequiredActions(validationResult: ValidationResult): string[] {
    const actions: string[] = [];
    
    const blockingErrors = validationResult.errors.filter(e => e.severity === 'blocking');
    
    if (blockingErrors.length === 0 && validationResult.isValid) {
      actions.push('✅ No action required - proceed with analysis');
      return actions;
    }
    
    for (const error of blockingErrors) {
      actions.push(`❌ ${error.userMessage}`);
      if (error.suggestion) {
        actions.push(`💡 Suggestion: ${error.suggestion}`);
      }
    }
    
    const highImpactWarnings = validationResult.warnings.filter(w => w.impact === 'high');
    for (const warning of highImpactWarnings) {
      actions.push(`⚠️ ${warning.userMessage}`);
    }
    
    return actions;
  }

  /**
   * Determine if data is analyzable based on validation results and options
   */
  private determineAnalyzability(validationResult: ValidationResult, options: EnhancedParsingOptions): boolean {
    // Skip validation if explicitly requested
    if (options.skipValidation) {
      return true;
    }
    
    // Allow partial data if explicitly requested
    if (options.allowPartialData) {
      // Even with partial data, don't allow obvious placeholders
      return validationResult.dataQualityStatus !== DataQualityStatus.PLACEHOLDER;
    }
    
    // Standard validation - only allow valid data
    return validationResult.isValid && validationResult.dataQualityStatus === DataQualityStatus.VALID;
  }

  /**
   * Create error fallback data structure
   */
  private createErrorFallbackData(file: File, error: any, processingTimeMs: number): EnhancedPDFJobData {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      title: 'PARSING_FAILED',
      company: 'EXTRACTION_ERROR',
      description: `PDF parsing failed: ${errorMessage}`,
      confidence: {
        title: 0,
        company: 0,
        description: 0,
        url: 0,
        overall: 0
      },
      parsingMetadata: {
        pdfPages: 0,
        textLength: 0,
        urlsFound: [],
        parsingMethod: 'failed',
        processingTimeMs,
        extractorVersion: '1.0.0',
        fileSize: file.size,
        fileName: file.name
      },
      validationResult: {
        isValid: false,
        qualityScore: 0,
        confidence: 0,
        errors: [{
          code: 'PARSING_FAILURE' as any,
          field: 'system',
          message: errorMessage,
          severity: 'blocking',
          userMessage: 'PDF parsing failed completely.',
          suggestion: 'Try a different PDF or manually enter job information.',
          isRetryable: true
        }],
        warnings: [],
        dataQualityStatus: DataQualityStatus.FAILED_PARSING,
        metadata: {
          validatedAt: new Date().toISOString(),
          processingTimeMs,
          validationMethod: 'EnhancedPDFParsingService',
          placeholderDetected: ['system_error'],
          contentAnalysis: {
            titleLength: 0,
            companyLength: 0,
            descriptionLength: 0,
            hasKeywords: false
          }
        }
      },
      isAnalyzable: false,
      requiredActions: [
        '❌ PDF parsing failed completely',
        '💡 Try uploading a different PDF file',
        '💡 Manually enter job information',
        '💡 Check if PDF is not password protected or corrupted'
      ],
      fallbackOptions: [
        {
          type: 'manual_input',
          description: 'Manually enter all job information',
          priority: 'high',
          userMessage: 'Since automatic parsing failed, please enter job details manually.'
        },
        {
          type: 'retry_upload',
          description: 'Try uploading a different PDF',
          priority: 'high',
          userMessage: 'Try uploading a clearer PDF or different version of the job posting.'
        }
      ]
    };
  }

  /**
   * Comprehensive logging of parsing results
   */
  private logParsingResult(result: EnhancedPDFJobData, fileName: string, processingTimeMs: number): void {
    const status = result.isAnalyzable ? '✅' : '❌';
    const quality = (result.validationResult.qualityScore * 100).toFixed(1);
    
    console.log(`${status} Enhanced PDF parsing completed for ${fileName}:`, {
      isAnalyzable: result.isAnalyzable,
      qualityScore: `${quality}%`,
      dataStatus: result.validationResult.dataQualityStatus,
      confidence: `${(result.confidence.overall * 100).toFixed(1)}%`,
      errors: result.validationResult.errors.length,
      warnings: result.validationResult.warnings.length,
      fallbackOptions: result.fallbackOptions.length,
      processingTime: `${processingTimeMs}ms`
    });
    
    if (!result.isAnalyzable) {
      console.warn('🚨 PDF is NOT analyzable:', {
        blockingErrors: result.validationResult.errors.filter(e => e.severity === 'blocking').map(e => e.message),
        requiredActions: result.requiredActions,
        primaryFallback: result.fallbackOptions[0]?.type
      });
    }
  }

  /**
   * Validate file before processing
   */
  async validateFile(file: File): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check file type
    if (file.type !== 'application/pdf') {
      errors.push('File must be a PDF document');
    }
    
    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push('File size must be less than 50MB');
    }
    
    // Check file size (too small)
    if (file.size < 1024) {
      warnings.push('File seems very small - may not contain meaningful content');
    }
    
    // Check filename
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      warnings.push('File extension should be .pdf');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Custom error class for enhanced PDF parsing failures
 */
export class EnhancedPDFParsingError extends Error {
  public readonly parsingData: EnhancedPDFJobData;
  public readonly errorCode: string;
  
  constructor(message: string, parsingData: EnhancedPDFJobData, errorCode: string) {
    super(message);
    this.name = 'EnhancedPDFParsingError';
    this.parsingData = parsingData;
    this.errorCode = errorCode;
  }
}