/**
 * PDF → WebLLM Integration Service
 * Routes PDF-extracted content through WebLLM validation pipeline
 * Implements Phase 3.1 of PDF Functionality Roadmap
 */
import { JobFieldValidator, ValidationInput, AgentOutput } from '@/agents/validator';
import { PDFJobData } from './PDFParsingService';

export interface PDFWebLLMInput {
  pdfJobData: PDFJobData;
  sourceUrl?: string;
  rawTextContent: string;
}

export interface PDFWebLLMResult {
  validatedJobData: {
    title: string;
    company: string;
    location?: string;
    description: string;
    confidence: {
      title: number;
      company: number;
      location: number;
      description: number;
      overall: number;
    };
  };
  webllmValidation: AgentOutput;
  enhancedMetadata: {
    extractionMethod: 'pdf_webllm_integration';
    webllmConfidence: number;
    validationTime: number;
    thoughtProcess: string[];
    legitimacyIndicators: string[];
    riskFactors: string[];
  };
}

export class PDFWebLLMIntegration {
  private validator: JobFieldValidator;

  constructor() {
    this.validator = new JobFieldValidator();
  }

  /**
   * Process PDF-extracted job data through WebLLM validation pipeline
   */
  async validatePDFJobData(input: PDFWebLLMInput): Promise<PDFWebLLMResult> {
    const startTime = Date.now();
    
    try {
      console.log('🤖 Starting PDF → WebLLM validation process...');
      
      // Check if WebLLM is available and working
      const isWebLLMAvailable = await this.checkWebLLMAvailability();
      
      if (!isWebLLMAvailable) {
        console.warn('⚠️ WebLLM not available, using enhanced PDF-only processing');
        return this.createEnhancedPDFOnlyResult(input, Date.now() - startTime);
      }
      
      // 1. Convert PDF data to WebLLM validation format
      const validationInput = this.createPDFValidationInput(input);
      
      console.log('📄 PDF validation input created:', {
        url: validationInput.url,
        hasHtmlSnippet: !!validationInput.htmlSnippet,
        parserOutputKeys: Object.keys(validationInput.parserOutput)
      });

      // 2. Run WebLLM validation with timeout
      const webllmValidation = await Promise.race([
        this.validator.validateWithWebLLM(validationInput),
        this.createTimeoutPromise(15000) // 15 second timeout
      ]);
      
      console.log('✅ WebLLM validation completed:', {
        validated: webllmValidation.validated,
        hasAnalysis: !!webllmValidation.analysis,
        fieldsCount: Object.keys(webllmValidation.fields).length
      });

      // 3. Merge PDF extraction results with WebLLM validation
      const validatedJobData = this.mergeValidationResults(input.pdfJobData, webllmValidation);
      
      // 4. Create enhanced metadata
      const enhancedMetadata = this.createEnhancedMetadata(
        webllmValidation,
        Date.now() - startTime
      );

      console.log('🎯 PDF → WebLLM integration completed successfully');

      return {
        validatedJobData,
        webllmValidation,
        enhancedMetadata
      };

    } catch (error) {
      console.error('❌ PDF → WebLLM validation failed:', error);
      
      // Intelligent fallback based on error type
      if (this.isWebLLMInitializationError(error)) {
        console.log('🔄 WebLLM initialization failed, using enhanced PDF-only processing');
        return this.createEnhancedPDFOnlyResult(input, Date.now() - startTime);
      }
      
      // Generic fallback for other errors
      return this.createFallbackResult(input, Date.now() - startTime, error);
    }
  }

  /**
   * Convert PDF job data to WebLLM validation input format
   */
  private createPDFValidationInput(input: PDFWebLLMInput): ValidationInput {
    // Create a structured HTML snippet from PDF content for WebLLM processing
    const htmlSnippet = this.createStructuredHTMLFromPDF(input);
    
    return {
      url: input.sourceUrl || `pdf://${input.pdfJobData.parsingMetadata.fileName}`,
      htmlSnippet,
      parserOutput: {
        title: input.pdfJobData.title,
        company: input.pdfJobData.company,
        location: input.pdfJobData.location,
        description: input.pdfJobData.description
      }
    };
  }

  /**
   * Create structured HTML content from PDF data for WebLLM processing
   */
  private createStructuredHTMLFromPDF(input: PDFWebLLMInput): string {
    const { pdfJobData, rawTextContent } = input;
    
    // Create semantic HTML structure that WebLLM can understand
    return `
<div class="pdf-job-posting" data-source="pdf-extraction">
  <div class="job-header">
    <h1 class="job-title">${pdfJobData.title}</h1>
    <div class="company-name">${pdfJobData.company}</div>
    ${pdfJobData.location ? `<div class="job-location">${pdfJobData.location}</div>` : ''}
    ${pdfJobData.sourceUrl ? `<div class="original-url">${pdfJobData.sourceUrl}</div>` : ''}
  </div>
  
  <div class="job-description">
    <p>${pdfJobData.description}</p>
  </div>
  
  <div class="pdf-metadata">
    <div class="extraction-confidence">Overall: ${Math.round(pdfJobData.confidence.overall * 100)}%</div>
    <div class="pages-processed">${pdfJobData.parsingMetadata.pdfPages} pages</div>
    <div class="text-length">${pdfJobData.parsingMetadata.textLength} characters</div>
  </div>
  
  <!-- Raw PDF text for additional context -->
  <div class="raw-pdf-content" style="display: none;">
    ${rawTextContent.substring(0, 2000)}...
  </div>
</div>`.trim();
  }

  /**
   * Merge PDF extraction results with WebLLM validation
   */
  private mergeValidationResults(
    pdfData: PDFJobData, 
    webllmValidation: AgentOutput
  ): PDFWebLLMResult['validatedJobData'] {
    
    // Use WebLLM validated fields where available, fallback to PDF extraction
    const validatedTitle = webllmValidation.fields.title?.value || pdfData.title;
    const validatedCompany = webllmValidation.fields.company?.value || pdfData.company;
    const validatedLocation = webllmValidation.fields.location?.value || pdfData.location;
    
    // Calculate enhanced confidence scores
    const titleConfidence = this.calculateEnhancedConfidence(
      pdfData.confidence.title,
      webllmValidation.fields.title?.conf
    );
    
    const companyConfidence = this.calculateEnhancedConfidence(
      pdfData.confidence.company,
      webllmValidation.fields.company?.conf
    );
    
    const locationConfidence = this.calculateEnhancedConfidence(
      0.5, // Default location confidence since PDFJobData doesn't track location confidence
      webllmValidation.fields.location?.conf
    );

    const descriptionConfidence = pdfData.confidence.description; // PDF extraction only for now
    
    const overallConfidence = (
      titleConfidence * 0.3 +
      companyConfidence * 0.3 +
      locationConfidence * 0.2 +
      descriptionConfidence * 0.2
    );

    return {
      title: validatedTitle,
      company: validatedCompany,
      location: validatedLocation,
      description: pdfData.description, // Keep PDF-extracted description
      confidence: {
        title: titleConfidence,
        company: companyConfidence,
        location: locationConfidence,
        description: descriptionConfidence,
        overall: overallConfidence
      }
    };
  }

  /**
   * Calculate enhanced confidence by combining PDF extraction + WebLLM validation
   */
  private calculateEnhancedConfidence(
    pdfConfidence: number, 
    webllmConfidence?: number
  ): number {
    if (!webllmConfidence) return pdfConfidence;
    
    // Weighted average: PDF extraction (40%) + WebLLM validation (60%)
    // WebLLM gets higher weight as it's more sophisticated
    return (pdfConfidence * 0.4) + (webllmConfidence * 0.6);
  }

  /**
   * Create enhanced metadata from WebLLM validation results
   */
  private createEnhancedMetadata(
    webllmValidation: AgentOutput,
    validationTime: number
  ): PDFWebLLMResult['enhancedMetadata'] {
    const analysis = webllmValidation.analysis;
    
    return {
      extractionMethod: 'pdf_webllm_integration',
      webllmConfidence: analysis?.confidenceBreakdown.overallConfidence || 0.5,
      validationTime,
      thoughtProcess: analysis?.thoughtProcess || [],
      legitimacyIndicators: analysis?.legitimacyIndicators || [],
      riskFactors: analysis?.riskFactors || []
    };
  }

  /**
   * Create fallback result when WebLLM validation fails
   */
  private createFallbackResult(
    input: PDFWebLLMInput,
    processingTime: number,
    error: any
  ): PDFWebLLMResult {
    console.warn('⚠️ Creating fallback result for PDF WebLLM integration');
    
    return {
      validatedJobData: {
        title: input.pdfJobData.title,
        company: input.pdfJobData.company,
        location: input.pdfJobData.location,
        description: input.pdfJobData.description,
        confidence: {
          title: input.pdfJobData.confidence.title,
          company: input.pdfJobData.confidence.company,
          location: 0.5, // Default for location
          description: input.pdfJobData.confidence.description,
          overall: input.pdfJobData.confidence.overall * 0.7 // Reduce confidence due to failed validation
        }
      },
      webllmValidation: {
        validated: false,
        fields: {},
        notes: `WebLLM validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      enhancedMetadata: {
        extractionMethod: 'pdf_webllm_integration',
        webllmConfidence: 0,
        validationTime: processingTime,
        thoughtProcess: ['WebLLM validation failed, using PDF extraction only'],
        legitimacyIndicators: [],
        riskFactors: ['WebLLM validation unavailable']
      }
    };
  }

  /**
   * Check if WebLLM is available and can be initialized
   */
  private async checkWebLLMAvailability(): Promise<boolean> {
    try {
      // Quick availability check without full initialization
      if (typeof window === 'undefined' || !window.navigator) {
        return false; // Server-side rendering
      }
      
      // Check for WebGPU support (required for WebLLM)
      const nav = window.navigator as any;
      if (!nav.gpu) {
        console.warn('⚠️ WebGPU not supported in this browser');
        return false;
      }
      
      return true; // Basic availability confirmed
    } catch (error) {
      console.warn('⚠️ WebLLM availability check failed:', error);
      return false;
    }
  }

  /**
   * Create a timeout promise for WebLLM validation
   */
  private createTimeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`WebLLM validation timeout after ${ms}ms`)), ms);
    });
  }

  /**
   * Check if error is related to WebLLM initialization
   */
  private isWebLLMInitializationError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message?.toLowerCase() || '';
    
    return (
      errorMessage.includes('cannot find model record') ||
      errorMessage.includes('webllm') ||
      errorMessage.includes('fake worker') ||
      errorMessage.includes('webgpu') ||
      errorMessage.includes('timeout')
    );
  }

  /**
   * Create enhanced PDF-only result when WebLLM is unavailable
   */
  private createEnhancedPDFOnlyResult(
    input: PDFWebLLMInput,
    processingTime: number
  ): PDFWebLLMResult {
    console.log('📄 Creating enhanced PDF-only result with improved confidence');
    
    // Apply enhanced confidence scoring for PDF-only processing
    const enhancedConfidence = this.calculateEnhancedPDFConfidence(input.pdfJobData);
    
    return {
      validatedJobData: {
        title: input.pdfJobData.title,
        company: input.pdfJobData.company,
        location: input.pdfJobData.location,
        description: input.pdfJobData.description,
        confidence: enhancedConfidence
      },
      webllmValidation: {
        validated: false,
        fields: {},
        notes: 'WebLLM validation unavailable, using enhanced PDF-only processing',
      },
      enhancedMetadata: {
        extractionMethod: 'pdf_webllm_integration',
        webllmConfidence: 0,
        validationTime: processingTime,
        thoughtProcess: [
          'WebLLM validation unavailable',
          'Applied enhanced PDF confidence scoring',
          'Used pattern-based quality assessment'
        ],
        legitimacyIndicators: this.generateBasicLegitimacyIndicators(input.pdfJobData),
        riskFactors: this.generateBasicRiskFactors(input.pdfJobData)
      }
    };
  }

  /**
   * Calculate enhanced confidence for PDF-only processing
   */
  private calculateEnhancedPDFConfidence(pdfData: PDFJobData): PDFWebLLMResult['validatedJobData']['confidence'] {
    // Apply more sophisticated confidence calculation for PDF-only mode
    const baseConfidence = pdfData.confidence;
    
    // Boost confidence based on data quality indicators
    let titleBoost = 0;
    let companyBoost = 0;
    let locationBoost = 0;
    
    // Title quality assessment
    if (pdfData.title.length > 10 && pdfData.title.length < 80) titleBoost += 0.1;
    if (pdfData.title.match(/\b(engineer|manager|analyst|director|specialist)\b/i)) titleBoost += 0.1;
    
    // Company quality assessment  
    if (pdfData.company.length > 3 && pdfData.company.length < 50) companyBoost += 0.1;
    if (pdfData.company.match(/\b(inc|llc|ltd|corp|company)\b/i)) companyBoost += 0.1;
    
    // Location quality assessment
    if (pdfData.location) {
      locationBoost += 0.2;
      if (pdfData.location.match(/,\s*[A-Z]{2}\b/)) locationBoost += 0.1; // State format
    }
    
    return {
      title: Math.min(1.0, baseConfidence.title + titleBoost),
      company: Math.min(1.0, baseConfidence.company + companyBoost),
      location: Math.min(1.0, (baseConfidence.url * 0.5) + locationBoost), // Use URL confidence as proxy
      description: baseConfidence.description,
      overall: Math.min(1.0, baseConfidence.overall + (titleBoost + companyBoost + locationBoost) / 3)
    };
  }

  /**
   * Generate basic legitimacy indicators from PDF data
   */
  private generateBasicLegitimacyIndicators(pdfData: PDFJobData): string[] {
    const indicators: string[] = [];
    
    if (pdfData.sourceUrl) {
      indicators.push('Original job posting URL detected in PDF');
    }
    
    if (pdfData.description.length > 200) {
      indicators.push('Detailed job description provided');
    }
    
    if (pdfData.location) {
      indicators.push('Specific job location identified');
    }
    
    if (pdfData.confidence.overall > 0.7) {
      indicators.push('High confidence in data extraction');
    }
    
    return indicators;
  }

  /**
   * Generate basic risk factors from PDF data
   */
  private generateBasicRiskFactors(pdfData: PDFJobData): string[] {
    const riskFactors: string[] = [];
    
    if (!pdfData.sourceUrl) {
      riskFactors.push('No original job posting URL found');
    }
    
    if (pdfData.description.length < 100) {
      riskFactors.push('Very brief job description');
    }
    
    if (pdfData.confidence.overall < 0.5) {
      riskFactors.push('Low confidence in data extraction');
    }
    
    if (pdfData.title.includes('Position from PDF') || pdfData.company.includes('Company from PDF')) {
      riskFactors.push('Generic placeholder values detected');
    }
    
    return riskFactors;
  }

  /**
   * Static factory method for easy integration
   */
  static async validatePDFJobData(input: PDFWebLLMInput): Promise<PDFWebLLMResult> {
    const integration = new PDFWebLLMIntegration();
    return integration.validatePDFJobData(input);
  }
}