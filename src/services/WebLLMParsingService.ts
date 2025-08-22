/**
 * WebLLM-Powered Job Parsing Service
 * Implements automated URL scraping and intelligent job data extraction
 * Following Implementation Guide specifications
 */
import { WebLLMManager } from '@/lib/webllm';
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
  private rateLimitDelay = 1000; // 1 second between requests to same domain  
  private lastRequestTimes: Map<string, number> = new Map();

  constructor() {
    this.webllmManager = WebLLMManager.getInstance();
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
      
      // Use WebLLM to parse job data
      const extractedData = await this.parseWithWebLLM(url, contentResult);
      
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
   * Use WebLLM to parse job information from extracted content
   */
  private async parseWithWebLLM(url: string, content: ContentExtractionResult): Promise<ExtractedJobData> {
    try {
      // Initialize WebLLM
      await this.webllmManager.initWebLLM();

      // Create specialized prompt for job parsing
      const systemPrompt = this.createParsingPrompt();
      const userPrompt = this.createUserPrompt(url, content);

      // Generate parsing result
      const response = await this.webllmManager.generateCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        temperature: 0.1, // Low temperature for consistency
        max_tokens: 800    // Enough tokens for detailed extraction
      });

      console.log('🤖 WebLLM parsing response received');

      // Parse the JSON response
      const parsedData = this.parseWebLLMResponse(response, url);
      
      return parsedData;

    } catch (error) {
      console.error('WebLLM parsing failed:', error);
      throw new Error(`WebLLM parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create system prompt for WebLLM job parsing
   */
  private createParsingPrompt(): string {
    return `You are a professional job posting parser that extracts structured information from web content.

TASK: Extract job posting information from the provided HTML content and metadata.

EXTRACTION RULES:
1. Be precise and extract only information that is clearly present
2. Do not infer or guess information that isn't explicitly stated
3. For dates, use ISO format (YYYY-MM-DD) when possible
4. For salary, extract the full range or amount as displayed
5. For job type, use standard terms: "Full-time", "Part-time", "Contract", "Internship", "Remote"

OUTPUT FORMAT: Return ONLY valid JSON with this exact structure:
{
  "title": "exact job title or null",
  "company": "exact company name or null", 
  "location": "location as stated or null",
  "description": "first 500 chars of description or null",
  "salary": "salary range/amount as stated or null",
  "jobType": "employment type or null",
  "postedAt": "posting date in YYYY-MM-DD format or null",
  "jobId": "job/posting ID if visible or null",
  "contactDetails": "contact info if present or null"
}

IMPORTANT: 
- Return null for any field that cannot be clearly determined
- Ensure all text is properly escaped for JSON
- Do not include any text outside the JSON structure`;
  }

  /**
   * Create user prompt with content data
   */
  private createUserPrompt(url: string, content: ContentExtractionResult): string {
    return JSON.stringify({
      url: url,
      pageTitle: content.metadata.title,
      pageDescription: content.metadata.description,
      platform: content.metadata.platform,
      textContent: content.textContent.slice(0, 4000) // Limit content size
    });
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

  private detectPlatform(url: string): string {
    const hostname = url.toLowerCase();
    if (hostname.includes('linkedin.com')) return 'LinkedIn';
    if (hostname.includes('indeed.com')) return 'Indeed';
    if (hostname.includes('glassdoor.com')) return 'Glassdoor';
    if (hostname.includes('monster.com')) return 'Monster';
    if (hostname.includes('ziprecruiter.com')) return 'ZipRecruiter';
    if (hostname.includes('greenhouse.io')) return 'Greenhouse';
    if (hostname.includes('lever.co')) return 'Lever';
    if (hostname.includes('careers.') || hostname.includes('jobs.')) return 'Company Career Site';
    return 'Other';
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