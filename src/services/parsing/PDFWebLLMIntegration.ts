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
      
      // 1. Convert PDF data to WebLLM validation format
      const validationInput = this.createPDFValidationInput(input);
      
      console.log('📄 PDF validation input created:', {
        url: validationInput.url,
        hasHtmlSnippet: !!validationInput.htmlSnippet,
        parserOutputKeys: Object.keys(validationInput.parserOutput)
      });

      // 2. Run WebLLM validation
      const webllmValidation = await this.validator.validateWithWebLLM(validationInput);
      
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
      
      // Fallback: Return PDF data with minimal confidence
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
   * Static factory method for easy integration
   */
  static async validatePDFJobData(input: PDFWebLLMInput): Promise<PDFWebLLMResult> {
    const integration = new PDFWebLLMIntegration();
    return integration.validatePDFJobData(input);
  }
}