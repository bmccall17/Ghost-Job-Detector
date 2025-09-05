/**
 * WebLLM-Powered Job Parsing Service
 * Implements automated URL scraping and intelligent job data extraction
 * Enhanced with optimized prompts and reliability improvements
 */
import { WebLLMManager } from '@/lib/webllm';
import { WebLLMServiceManager } from '@/lib/webllm-service-manager';
import { 
  generateJobParsingPrompt, 
  generateContextAwarePrompt,
  createJobParsingMessages,
  JobParsingContext 
} from '@/lib/webllm-prompts';
import DOMPurify from 'isomorphic-dompurify';

// Type definitions for extracted job data
export interface ExtractedJobData {
  title: string | null;
  company: string | null;
  location: string | null;
  description: string | null;
  salary: string | null;
  jobType: string | null;
  postedAt: string | null;
  jobId: string | null;
  contactDetails: string | null;
  originalSource: string;
}

export interface ParsingResult {
  success: boolean;
  data: ExtractedJobData;
  confidence: number;
  processingTimeMs: number;
  validationSources?: string[];
  errorMessage?: string;
  extractionMethod: 'webllm' | 'fallback' | 'manual';
}

export interface ContentExtractionResult {
  htmlContent: string;
  textContent: string;
  metadata: {
    title?: string;
    description?: string;
    ogTitle?: string;
    ogDescription?: string;
    domain: string;
    platform: string;
  };
}

export class WebLLMParsingService {
  private webllmManager: WebLLMManager;
  private serviceManager: WebLLMServiceManager;
  private rateLimitDelay = 1000; // 1 second between requests to same domain  
  private lastRequestTimes: Map<string, number> = new Map();
  private parsingAttempts: Map<string, Array<{error: string; extractedData?: any}>> = new Map();

  constructor() {
    this.webllmManager = WebLLMManager.getInstance();
    this.serviceManager = WebLLMServiceManager.getInstance();
  }

  /**
   * Main entry point for extracting job data from URL
   */
  public async extractJob(url: string): Promise<ParsingResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Starting job extraction for: ${url}`);
      
      // Validate URL
      if (!this.isValidUrl(url)) {
        throw new Error('Invalid URL format');
      }

      // Check if extraction is enabled
      if (!this.isExtractionEnabled()) {
        return this.createFallbackResult(url, 'Auto-parsing disabled');
      }

      // Rate limiting check
      await this.enforceRateLimit(url);

      // Extract content from URL
      const contentResult = await this.extractContent(url);
      
      // Use centralized WebLLM service for parsing (Phase 2)
      const extractedData = await this.parseWithCentralizedService(url, contentResult);
      
      // Calculate confidence score
      const confidence = this.calculateConfidence(extractedData);
      
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Job extraction completed in ${processingTime}ms with ${Math.round(confidence * 100)}% confidence`);
      
      return {
        success: true,
        data: extractedData,
        confidence,
        processingTimeMs: processingTime,
        extractionMethod: 'webllm',
        validationSources: [`scraped:${new URL(url).hostname}`]
      };

    } catch (error) {
      console.error('❌ Job extraction failed:', error);
      
      const processingTime = Date.now() - startTime;
      
      // Return fallback result for manual entry
      return {
        success: false,
        data: this.createEmptyJobData(url),
        confidence: 0,
        processingTimeMs: processingTime,
        extractionMethod: 'fallback',
        errorMessage: error instanceof Error ? error.message : 'Unknown parsing error'
      };
    }
  }

  /**
   * Validate extracted content against multiple sources
   */
  public async validateContent(extractedData: ExtractedJobData): Promise<{
    isValid: boolean;
    confidence: number;
    validationSources: string[];
    issues: string[];
  }> {
    const issues: string[] = [];
    const validationSources: string[] = ['content_analysis'];
    let confidence = 0.5; // Base confidence

    try {
      // Basic validation checks
      if (!extractedData.title || extractedData.title.trim().length < 3) {
        issues.push('Job title too short or missing');
        confidence -= 0.2;
      }

      if (!extractedData.company || extractedData.company.trim().length < 2) {
        issues.push('Company name too short or missing');
        confidence -= 0.2;
      }

      if (!extractedData.description || extractedData.description.trim().length < 50) {
        issues.push('Job description too short or missing');
        confidence -= 0.15;
      }

      // Check for suspicious patterns
      if (extractedData.title && this.containsSuspiciousPatterns(extractedData.title)) {
        issues.push('Job title contains suspicious patterns');
        confidence -= 0.1;
      }

      // Boost confidence for valid data
      if (extractedData.salary && extractedData.salary.match(/\$[\d,]+/)) {
        confidence += 0.1;
        validationSources.push('salary_format');
      }

      if (extractedData.location && extractedData.location.length > 0) {
        confidence += 0.05;
        validationSources.push('location_present');
      }

      if (extractedData.postedAt && this.isValidDateFormat(extractedData.postedAt)) {
        confidence += 0.05;
        validationSources.push('valid_date_format');
      }

      // Ensure confidence stays within bounds
      confidence = Math.max(0, Math.min(1, confidence));

      return {
        isValid: issues.length === 0 && confidence > 0.3,
        confidence,
        validationSources,
        issues
      };

    } catch (error) {
      console.error('Content validation error:', error);
      return {
        isValid: false,
        confidence: 0,
        validationSources,
        issues: ['Validation process failed']
      };
    }
  }

  /**
   * Calculate confidence score based on extracted fields
   */
  public calculateConfidence(data: ExtractedJobData): number {
    let score = 0;
    let maxScore = 0;

    // Title confidence (30% weight)
    maxScore += 0.3;
    if (data.title && data.title.trim().length > 0) {
      score += 0.3 * this.getFieldConfidence(data.title, 'title');
    }

    // Company confidence (25% weight)
    maxScore += 0.25;
    if (data.company && data.company.trim().length > 0) {
      score += 0.25 * this.getFieldConfidence(data.company, 'company');
    }

    // Description confidence (20% weight)
    maxScore += 0.2;
    if (data.description && data.description.trim().length > 50) {
      score += 0.2 * this.getFieldConfidence(data.description, 'description');
    }

    // Additional fields (25% weight combined)
    const additionalFields = ['location', 'salary', 'jobType', 'postedAt'];
    const fieldWeight = 0.25 / additionalFields.length;
    
    additionalFields.forEach(field => {
      maxScore += fieldWeight;
      const value = data[field as keyof ExtractedJobData];
      if (value && typeof value === 'string' && value.trim().length > 0) {
        score += fieldWeight * this.getFieldConfidence(value, field);
      }
    });

    return Math.min(score / maxScore, 1.0);
  }

  /**
   * Extract HTML content from URL using fetch
   */
  private async extractContent(url: string): Promise<ContentExtractionResult> {
    try {
      // Use a proper User-Agent to avoid blocking
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GhostJobDetector/1.0; +https://ghostjobdetector.com/bot)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        signal: AbortSignal.timeout(8000) // 8 second timeout for fetch
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const htmlContent = await response.text();
      const sanitizedHtml = DOMPurify.sanitize(htmlContent);
      
      // Extract metadata and text content
      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitizedHtml, 'text/html');
      
      // Extract text content (remove scripts, styles)
      const scripts = doc.querySelectorAll('script, style');
      scripts.forEach(el => el.remove());
      const textContent = doc.body?.textContent || doc.documentElement?.textContent || '';

      // Extract metadata
      const metadata = {
        title: doc.title,
        description: doc.querySelector('meta[name="description"]')?.getAttribute('content') || undefined,
        ogTitle: doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || undefined,
        ogDescription: doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || undefined,
        domain: new URL(url).hostname,
        platform: this.detectPlatform(url)
      };

      return {
        htmlContent: sanitizedHtml,
        textContent: textContent.trim(),
        metadata
      };

    } catch (error) {
      console.error(`Failed to extract content from ${url}:`, error);
      throw new Error(`Content extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse job data using centralized WebLLM service with circuit breaker protection
   */
  private async parseWithCentralizedService(url: string, content: ContentExtractionResult): Promise<ExtractedJobData> {
    try {
      // Create parsing context
      const domain = new URL(url).hostname;
      const platform = this.detectPlatform(domain);
      
      const context: JobParsingContext = {
        url,
        domain,
        platform,
        htmlContent: content.htmlContent,
        contentLength: content.textContent.length
      };

      console.log('🎯 Using centralized WebLLM service for parsing', {
        platform,
        domain,
        contentLength: content.textContent.length
      });

      // Use centralized service with circuit breaker protection
      const result = await this.serviceManager.parseJobData(
        this.prepareContentForParsing(content),
        context
      );

      // Convert centralized result to ExtractedJobData format
      return {
        title: result.title,
        company: result.company,
        location: result.location,
        description: content.textContent.substring(0, 500) || null, // Basic description extraction
        salary: null, // TODO: Add salary extraction to centralized service
        jobType: result.remote ? 'Remote' : null,
        postedAt: null, // TODO: Add date extraction
        jobId: null, // TODO: Add job ID extraction
        contactDetails: null, // TODO: Add contact extraction
        originalSource: url
      };

    } catch (error) {
      console.error('Centralized WebLLM service failed, falling back to direct parsing:', error);
      
      // Fallback to direct WebLLM parsing if centralized service fails
      return this.parseWithWebLLM(url, content);
    }
  }

  /**
   * Fallback: Use WebLLM directly for parsing (legacy method)
   */
  private async parseWithWebLLM(url: string, content: ContentExtractionResult): Promise<ExtractedJobData> {
    const urlKey = new URL(url).hostname;
    const maxAttempts = 3;
    let lastError: any;

    try {
      // Initialize WebLLM with optimal model selection
      await this.webllmManager.initWebLLM();

      // Create parsing context
      const domain = new URL(url).hostname;
      const platform = this.detectPlatform(domain);
      
      const context: JobParsingContext = {
        url,
        domain,
        platform,
        htmlContent: content.htmlContent,
        contentLength: content.textContent.length
      };

      // Get previous attempts for this URL
      const previousAttempts = this.parsingAttempts.get(urlKey) || [];

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          console.log(`🤖 WebLLM parsing attempt ${attempt}/${maxAttempts} for ${domain}`);

          // Generate context-aware prompt
          const prompt = attempt === 1 
            ? generateJobParsingPrompt(context)
            : generateContextAwarePrompt(context, previousAttempts);

          // Create optimized messages
          const messages = createJobParsingMessages(prompt, this.prepareContentForParsing(content));

          // Generate parsing result with enhanced retry logic
          const response = await this.webllmManager.generateCompletion(messages, {
            temperature: 0.2, // Slightly higher for better variety
            max_tokens: 1024,  // More tokens for detailed responses
            retries: 2        // Retry inference failures
          });

          console.log('🤖 WebLLM parsing response received', {
            responseLength: response.length,
            attempt
          });

          // Parse and validate the JSON response
          const parsedData = this.parseWebLLMResponse(response, url);
          
          // Validate parsed data quality
          const validation = await this.validateContent(parsedData);
          
          if (validation.confidence > 0.5) {
            console.log(`✅ WebLLM parsing successful on attempt ${attempt}`, {
              confidence: Math.round(validation.confidence * 100) + '%',
              platform,
              fields: Object.keys(parsedData).filter(k => parsedData[k as keyof ExtractedJobData] !== null).length
            });

            // Clear previous attempts on success
            this.parsingAttempts.delete(urlKey);
            return parsedData;
          } else {
            throw new Error(`Low confidence parsing result: ${validation.confidence.toFixed(2)} (${validation.issues.join(', ')})`);
          }

        } catch (error) {
          lastError = error;
          console.warn(`❌ WebLLM parsing attempt ${attempt} failed:`, error);

          // Store attempt for context-aware retries
          if (!this.parsingAttempts.has(urlKey)) {
            this.parsingAttempts.set(urlKey, []);
          }
          this.parsingAttempts.get(urlKey)!.push({
            error: String(error),
            extractedData: undefined
          });

          // Don't retry on final attempt
          if (attempt === maxAttempts) {
            break;
          }

          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`⏳ Retrying WebLLM parsing in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      throw lastError;

    } catch (error) {
      console.error('All WebLLM parsing attempts failed:', error);
      throw new Error(`WebLLM parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect job platform from domain
   */
  private detectPlatform(domain: string): string {
    const lowerDomain = domain.toLowerCase();
    
    if (lowerDomain.includes('linkedin')) return 'linkedin';
    if (lowerDomain.includes('workday')) return 'workday';
    if (lowerDomain.includes('greenhouse')) return 'greenhouse';
    if (lowerDomain.includes('lever')) return 'lever';
    if (lowerDomain.includes('indeed')) return 'indeed';
    if (lowerDomain.includes('glassdoor')) return 'glassdoor';
    if (lowerDomain.includes('monster')) return 'monster';
    
    return 'generic';
  }

  /**
   * Prepare content for optimized parsing
   */
  private prepareContentForParsing(content: ContentExtractionResult): string {
    // Limit content size while preserving important sections
    let htmlContent = content.htmlContent;
    
    // If content is too large, prioritize job-relevant sections
    if (htmlContent.length > 8000) {
      const importantSections = this.extractImportantSections(htmlContent);
      htmlContent = importantSections.join('\n');
      
      // If still too large, truncate intelligently
      if (htmlContent.length > 8000) {
        htmlContent = htmlContent.substring(0, 8000) + '\n[Content truncated for processing]';
      }
    }

    return htmlContent;
  }

  /**
   * Extract important HTML sections for job parsing
   */
  private extractImportantSections(htmlContent: string): string[] {
    const sections: string[] = [];
    
    // Patterns for job-relevant content
    const patterns = [
      /<h[1-3][^>]*>.*?<\/h[1-3]>/gi,  // Headers
      /<div[^>]*class="[^"]*job[^"]*"[^>]*>.*?<\/div>/gi, // Job-related divs
      /<section[^>]*>.*?<\/section>/gi, // Sections
      /<article[^>]*>.*?<\/article>/gi, // Articles
      /<main[^>]*>.*?<\/main>/gi,      // Main content
    ];

    patterns.forEach(pattern => {
      const matches = htmlContent.match(pattern) || [];
      sections.push(...matches.slice(0, 3)); // Limit matches per pattern
    });

    return sections.length > 0 ? sections : [htmlContent.substring(0, 4000)];
  }


  /**
   * Parse WebLLM response into structured job data
   */
  private parseWebLLMResponse(response: string, url: string): ExtractedJobData {
    try {
      // Clean response (remove any markdown formatting)
      let cleanResponse = response.trim();
      cleanResponse = cleanResponse.replace(/```json\s*|\s*```/g, '');
      cleanResponse = cleanResponse.replace(/```\s*|\s*```/g, '');

      const parsed = JSON.parse(cleanResponse);

      // Validate and clean the parsed data
      return {
        title: this.sanitizeText(parsed.title),
        company: this.sanitizeText(parsed.company),
        location: this.sanitizeText(parsed.location),
        description: this.sanitizeText(parsed.description),
        salary: this.sanitizeText(parsed.salary),
        jobType: this.sanitizeText(parsed.jobType),
        postedAt: this.sanitizeText(parsed.postedAt),
        jobId: this.sanitizeText(parsed.jobId),
        contactDetails: this.sanitizeText(parsed.contactDetails),
        originalSource: url
      };

    } catch (error) {
      console.error('Failed to parse WebLLM response:', error);
      console.log('Raw response:', response);
      
      // Return fallback data
      return this.createEmptyJobData(url);
    }
  }

  /**
   * Utility methods
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  // Static feature flag methods
  public static isEnabled(): boolean {
    return process.env.ENABLE_AUTO_PARSING !== 'false';
  }

  public static isCrossValidationEnabled(): boolean {
    return process.env.ENABLE_CROSS_VALIDATION !== 'false';
  }

  public static isDuplicateDetectionEnabled(): boolean {
    return process.env.ENABLE_DUPLICATE_DETECTION !== 'false';
  }

  private isExtractionEnabled(): boolean {
    return WebLLMParsingService.isEnabled();
  }

  private async enforceRateLimit(url: string): Promise<void> {
    const domain = new URL(url).hostname;
    const lastRequest = this.lastRequestTimes.get(domain);
    
    if (lastRequest) {
      const timeSinceLastRequest = Date.now() - lastRequest;
      if (timeSinceLastRequest < this.rateLimitDelay) {
        const waitTime = this.rateLimitDelay - timeSinceLastRequest;
        console.log(`⏰ Rate limiting: waiting ${waitTime}ms for ${domain}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.lastRequestTimes.set(domain, Date.now());
  }


  private getFieldConfidence(value: string, fieldType: string): number {
    if (!value || value.trim().length === 0) return 0;

    switch (fieldType) {
      case 'title':
        return value.length > 5 && !this.containsSuspiciousPatterns(value) ? 0.9 : 0.6;
      case 'company':
        return value.length > 2 && !value.includes('N/A') ? 0.9 : 0.5;
      case 'description':
        return value.length > 100 ? 0.9 : value.length > 50 ? 0.7 : 0.4;
      case 'location':
        return value.length > 2 ? 0.8 : 0.3;
      case 'salary':
        return value.match(/\$[\d,]+/) ? 0.9 : 0.5;
      case 'postedAt':
        return this.isValidDateFormat(value) ? 0.9 : 0.3;
      default:
        return 0.7;
    }
  }

  private containsSuspiciousPatterns(text: string): boolean {
    const suspicious = [
      'urgent', 'immediate', 'asap', 'make money fast',
      'no experience', 'work from home guaranteed'
    ];
    const lowerText = text.toLowerCase();
    return suspicious.some(pattern => lowerText.includes(pattern));
  }

  private isValidDateFormat(dateStr: string): boolean {
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && dateStr.length > 8;
  }

  private sanitizeText(text: any): string | null {
    if (text === null || text === undefined || text === 'null') return null;
    if (typeof text !== 'string') return null;
    const cleaned = text.trim();
    return cleaned.length > 0 ? cleaned : null;
  }

  private createEmptyJobData(url: string): ExtractedJobData {
    return {
      title: null,
      company: null,
      location: null,
      description: null,
      salary: null,
      jobType: null,
      postedAt: null,
      jobId: null,
      contactDetails: null,
      originalSource: url
    };
  }

  private createFallbackResult(url: string, reason: string): ParsingResult {
    return {
      success: false,
      data: this.createEmptyJobData(url),
      confidence: 0,
      processingTimeMs: 0,
      extractionMethod: 'fallback',
      errorMessage: reason
    };
  }
}

// Factory function for easy usage
export async function extractJobFromUrl(url: string): Promise<ParsingResult> {
  const service = new WebLLMParsingService();
  return service.extractJob(url);
}

// Validation utility
export async function validateExtractedContent(data: ExtractedJobData) {
  const service = new WebLLMParsingService();
  return service.validateContent(data);
}