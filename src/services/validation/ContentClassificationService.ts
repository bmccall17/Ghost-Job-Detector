/**
 * Content Classification Service - Tier 2 Validation
 * Classifies content to determine if it's a valid job posting vs other content types
 */

import { 
  ContentValidationResult, 
  ContentClassification, 
  ValidationError, 
  ValidationErrorCode, 
  ValidationConfig,
  DEFAULT_VALIDATION_CONFIG,
  URLAnalysis
} from './InputValidationTypes';
import DOMPurify from 'isomorphic-dompurify';

export class ContentClassificationService {
  private config: ValidationConfig;
  private jobKeywords: Set<string>;
  private nonJobKeywords: Set<string>;
  private companyKeywords: Set<string>;

  constructor(config: ValidationConfig = DEFAULT_VALIDATION_CONFIG) {
    this.config = config;
    this.initializeKeywords();
  }

  /**
   * Classify content to determine if it's a job posting
   */
  public async classifyContent(url: string, urlAnalysis: URLAnalysis): Promise<ContentValidationResult> {
    const startTime = Date.now();

    try {
      console.log(`🔍 Tier 2: Classifying content for ${url}`);

      // Fetch content for analysis
      const contentData = await this.fetchContentForAnalysis(url);
      
      if (!contentData) {
        return this.createErrorResult(url, [{
          code: ValidationErrorCode.CONTENT_INSUFFICIENT_DATA,
          message: 'Unable to fetch content for classification',
          severity: 'blocking',
          category: 'content',
          userMessage: 'Unable to analyze the page content.',
          suggestion: 'Verify the URL is accessible and try again.',
          retryable: true
        }], startTime);
      }

      // Perform content classification
      const classification = await this.performContentClassification(contentData, urlAnalysis);
      
      // Validate classification meets thresholds
      const validationErrors = this.validateClassificationThresholds(classification);
      
      const isValid = validationErrors.length === 0 && 
                     classification.contentType === 'job_posting' &&
                     classification.confidence >= this.config.thresholds.minContentConfidence &&
                     classification.jobRelevanceScore >= this.config.thresholds.minJobRelevanceScore;

      const result: ContentValidationResult = {
        isValid,
        confidence: classification.confidence,
        data: classification,
        errors: validationErrors,
        warnings: this.generateClassificationWarnings(classification),
        metadata: {
          tier: 2,
          processingTimeMs: Date.now() - startTime,
          validatedAt: new Date().toISOString(),
          validationMethod: 'ml_classification',
          source: 'ContentClassificationService'
        }
      };

      console.log(`✅ Tier 2: Content classification completed - Type: ${classification.contentType}, Confidence: ${(classification.confidence * 100).toFixed(1)}%`);
      return result;

    } catch (error) {
      console.error(`❌ Tier 2: Content classification failed for ${url}:`, error);
      
      return this.createErrorResult(url, [{
        code: ValidationErrorCode.SYSTEM_ERROR,
        message: `Content classification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'blocking',
        category: 'system',
        userMessage: 'Unable to classify content due to a system error.',
        suggestion: 'Please try again in a few moments.',
        retryable: true
      }], startTime);
    }
  }

  /**
   * Fetch and prepare content for analysis
   */
  private async fetchContentForAnalysis(url: string): Promise<{
    html: string;
    text: string;
    title: string;
    meta: { [key: string]: string };
  } | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeouts.contentClassification);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GhostJobDetector/2.0; +https://ghostjobdetector.com/bot)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const html = await response.text();
      const sanitizedHtml = DOMPurify.sanitize(html);
      
      // Parse HTML for structured analysis
      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitizedHtml, 'text/html');
      
      // Extract text content
      const scripts = doc.querySelectorAll('script, style, nav, header, footer');
      scripts.forEach(el => el.remove());
      const textContent = doc.body?.textContent || doc.documentElement?.textContent || '';
      
      // Extract metadata
      const title = doc.title || '';
      const meta: { [key: string]: string } = {};
      doc.querySelectorAll('meta').forEach(metaTag => {
        const name = metaTag.getAttribute('name') || metaTag.getAttribute('property') || '';
        const content = metaTag.getAttribute('content') || '';
        if (name && content) {
          meta[name] = content;
        }
      });

      return {
        html: sanitizedHtml,
        text: textContent.trim(),
        title,
        meta
      };

    } catch (error) {
      console.error('Failed to fetch content:', error);
      return null;
    }
  }

  /**
   * Perform ML-based content classification
   */
  private async performContentClassification(
    contentData: { html: string; text: string; title: string; meta: { [key: string]: string } }, 
    urlAnalysis: URLAnalysis
  ): Promise<ContentClassification> {
    
    // Analyze textual features
    const textFeatures = this.analyzeTextualFeatures(contentData.text, contentData.title);
    
    // Analyze structural features
    const structuralFeatures = this.analyzeStructuralFeatures(contentData.html);
    
    // Analyze metadata features
    const metadataFeatures = this.analyzeMetadataFeatures(contentData.meta);
    
    // Combine features for classification
    const classification = this.combineFeatures(textFeatures, structuralFeatures, metadataFeatures, urlAnalysis);
    
    return classification;
  }

  /**
   * Analyze textual content features
   */
  private analyzeTextualFeatures(text: string, title: string): Partial<ContentClassification> {
    const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    const wordCount = words.length;
    
    // Job keyword analysis
    const jobKeywordMatches = words.filter(word => this.jobKeywords.has(word)).length;
    const jobKeywordRatio = jobKeywordMatches / Math.max(words.length, 1);
    
    // Non-job keyword analysis (blog, news, etc.)
    const nonJobKeywordMatches = words.filter(word => this.nonJobKeywords.has(word)).length;
    const nonJobKeywordRatio = nonJobKeywordMatches / Math.max(words.length, 1);
    
    // Company indicator analysis
    const companyKeywordMatches = words.filter(word => this.companyKeywords.has(word)).length;
    
    // Job-specific pattern detection
    const hasJobTitle = this.detectJobTitle(title, text);
    const hasRequirements = this.detectRequirements(text);
    const hasBenefits = this.detectBenefits(text);
    const hasApplicationInfo = this.detectApplicationInfo(text);
    const hasSalaryInfo = this.detectSalaryInfo(text);
    
    // Language detection (basic)
    const language = this.detectLanguage(text);
    
    // Determine content type based on patterns
    let contentType: ContentClassification['contentType'] = 'other';
    let confidence = 0.5;
    
    if (jobKeywordRatio > 0.02 && hasJobTitle && (hasRequirements || hasApplicationInfo)) {
      contentType = 'job_posting';
      confidence = Math.min(0.95, 0.6 + (jobKeywordRatio * 10) + (hasRequirements ? 0.15 : 0) + (hasApplicationInfo ? 0.1 : 0));
    } else if (jobKeywordRatio > 0.01 && (title.toLowerCase().includes('career') || title.toLowerCase().includes('job'))) {
      contentType = 'career_page';
      confidence = 0.7;
    } else if (nonJobKeywordRatio > 0.02) {
      if (text.includes('blog') || text.includes('article') || text.includes('posted')) {
        contentType = 'blog_post';
      } else if (text.includes('news') || text.includes('press')) {
        contentType = 'news_article';
      }
      confidence = 0.8;
    } else if (companyKeywordMatches > 5) {
      contentType = 'company_page';
      confidence = 0.7;
    }
    
    // Error page detection
    if (text.toLowerCase().includes('page not found') || 
        text.toLowerCase().includes('404') ||
        text.toLowerCase().includes('error') && wordCount < 100) {
      contentType = 'error_page';
      confidence = 0.9;
    }

    return {
      contentType,
      confidence,
      jobRelevanceScore: jobKeywordRatio * 5, // Scale to 0-1 range
      hasJobTitle,
      hasJobDescription: wordCount > 100 && jobKeywordRatio > 0.01,
      hasApplicationInfo,
      hasRequirements,
      hasSalaryInfo,
      language,
      wordCount,
      structuralFeatures: {
        hasJobKeywords: jobKeywordRatio > 0.01,
        hasContactInfo: this.detectContactInfo(text),
        hasApplicationInstructions: hasApplicationInfo,
        hasBenefitsSection: hasBenefits,
        hasQualificationsSection: hasRequirements
      }
    };
  }

  /**
   * Analyze HTML structural features
   */
  private analyzeStructuralFeatures(html: string): Partial<ContentClassification> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Look for job-specific HTML structures
    const jobStructures = [
      'job-description', 'job-details', 'job-requirements', 'job-benefits',
      'apply-button', 'application-form', 'salary-range', 'job-location',
      'job-type', 'employment-type', 'experience-level'
    ];
    
    let structuralScore = 0;
    jobStructures.forEach(structure => {
      if (html.toLowerCase().includes(structure)) {
        structuralScore += 0.1;
      }
    });

    // Check for forms (application forms)
    const forms = doc.querySelectorAll('form');
    const hasApplicationForm = Array.from(forms).some(form => 
      form.innerHTML.toLowerCase().includes('apply') || 
      form.innerHTML.toLowerCase().includes('resume')
    );

    return {
      structuralFeatures: {
        hasJobKeywords: structuralScore > 0.2,
        hasApplicationInstructions: hasApplicationForm,
        hasContactInfo: html.toLowerCase().includes('contact') || html.toLowerCase().includes('email'),
        hasBenefitsSection: html.toLowerCase().includes('benefit'),
        hasQualificationsSection: html.toLowerCase().includes('qualification') || html.toLowerCase().includes('requirement')
      }
    };
  }

  /**
   * Analyze metadata features
   */
  private analyzeMetadataFeatures(meta: { [key: string]: string }): Partial<ContentClassification> {
    const description = meta['description'] || meta['og:description'] || '';
    const title = meta['og:title'] || meta['title'] || '';
    
    // Check for job-related metadata
    const hasJobMetadata = 
      description.toLowerCase().includes('job') ||
      description.toLowerCase().includes('career') ||
      description.toLowerCase().includes('position') ||
      title.toLowerCase().includes('job') ||
      title.toLowerCase().includes('hiring');

    // Extract dates from metadata
    const publishedDate = meta['article:published_time'] || meta['datePublished'] || '';
    const modifiedDate = meta['article:modified_time'] || meta['dateModified'] || '';
    
    const isExpired = this.checkIfExpired(publishedDate, modifiedDate);
    
    return {
      hasCompanyInfo: description.toLowerCase().includes('company') || title.toLowerCase().includes('company'),
      isExpired,
      postedDate: publishedDate || undefined,
      expirationDate: this.calculateExpirationDate(publishedDate)
    };
  }

  /**
   * Combine all features for final classification
   */
  private combineFeatures(
    textFeatures: Partial<ContentClassification>,
    structuralFeatures: Partial<ContentClassification>,
    metadataFeatures: Partial<ContentClassification>,
    urlAnalysis: URLAnalysis
  ): ContentClassification {
    
    // Start with textual classification as base
    const baseClassification = textFeatures as ContentClassification;
    
    // Adjust confidence based on URL indicators
    if (urlAnalysis.hasJobIndicators && baseClassification.contentType === 'job_posting') {
      baseClassification.confidence = Math.min(0.95, baseClassification.confidence + 0.1);
    }
    
    // Adjust confidence based on platform
    if (['linkedin', 'indeed', 'workday', 'greenhouse'].includes(urlAnalysis.platform) && 
        baseClassification.contentType === 'job_posting') {
      baseClassification.confidence = Math.min(0.95, baseClassification.confidence + 0.05);
    }
    
    // Merge structural features
    baseClassification.structuralFeatures = {
      ...baseClassification.structuralFeatures,
      ...structuralFeatures.structuralFeatures
    };
    
    // Apply metadata insights
    if (metadataFeatures.isExpired) {
      baseClassification.isExpired = true;
      baseClassification.confidence *= 0.8; // Reduce confidence for expired content
    }
    
    if (metadataFeatures.hasCompanyInfo) {
      baseClassification.hasCompanyInfo = true;
    }
    
    if (metadataFeatures.postedDate) {
      baseClassification.postedDate = metadataFeatures.postedDate;
    }
    
    if (metadataFeatures.expirationDate) {
      baseClassification.expirationDate = metadataFeatures.expirationDate;
    }
    
    // Calculate final quality score
    baseClassification.qualityScore = this.calculateQualityScore(baseClassification);
    
    // Ensure all required fields are set
    return this.ensureCompleteClassification(baseClassification);
  }

  /**
   * Calculate overall content quality score
   */
  private calculateQualityScore(classification: ContentClassification): number {
    let score = 0.5; // Base score
    
    // Content completeness
    if (classification.hasJobTitle) score += 0.15;
    if (classification.hasCompanyInfo) score += 0.1;
    if (classification.hasJobDescription) score += 0.1;
    if (classification.hasRequirements) score += 0.1;
    if (classification.hasApplicationInfo) score += 0.05;
    
    // Word count quality
    if (classification.wordCount > 300) score += 0.1;
    else if (classification.wordCount < 50) score -= 0.2;
    
    // Job relevance
    score += Math.min(0.2, classification.jobRelevanceScore);
    
    // Penalty for expired content
    if (classification.isExpired) score -= 0.3;
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Initialize keyword sets for classification
   */
  private initializeKeywords(): void {
    this.jobKeywords = new Set([
      'job', 'position', 'role', 'career', 'employment', 'hire', 'hiring', 'apply', 'application',
      'candidate', 'resume', 'cv', 'experience', 'skills', 'qualifications', 'requirements',
      'responsibilities', 'duties', 'benefits', 'salary', 'compensation', 'wage', 'pay',
      'full-time', 'part-time', 'contract', 'permanent', 'temporary', 'remote', 'onsite',
      'manager', 'director', 'analyst', 'specialist', 'coordinator', 'assistant', 'lead',
      'senior', 'junior', 'entry-level', 'intern', 'internship', 'graduate', 'trainee'
    ]);
    
    this.nonJobKeywords = new Set([
      'blog', 'article', 'news', 'press', 'release', 'story', 'post', 'update', 'announcement',
      'guide', 'tutorial', 'tips', 'advice', 'review', 'opinion', 'comment', 'discussion',
      'product', 'service', 'feature', 'launch', 'pricing', 'plan', 'subscription'
    ]);
    
    this.companyKeywords = new Set([
      'company', 'corporation', 'business', 'enterprise', 'organization', 'firm', 'agency',
      'about', 'mission', 'vision', 'values', 'culture', 'team', 'leadership', 'history',
      'founded', 'established', 'headquarters', 'offices', 'locations', 'contact', 'address'
    ]);
  }

  /**
   * Helper detection methods
   */
  private detectJobTitle(title: string, text: string): boolean {
    const jobTitlePatterns = [
      /\b(software|web|mobile|frontend|backend|full.stack|data|devops|site reliability|security|qa|quality assurance)\s+(engineer|developer|analyst|architect|lead|manager|director)\b/i,
      /\b(product|project|program|engineering|marketing|sales|hr|human resources|finance|operations|business)\s+(manager|director|lead|analyst|coordinator|specialist|assistant)\b/i,
      /\b(senior|junior|staff|principal|lead|head of|chief|vp|vice president)\s+/i
    ];
    
    const titleText = (title + ' ' + text.substring(0, 500)).toLowerCase();
    return jobTitlePatterns.some(pattern => pattern.test(titleText));
  }

  private detectRequirements(text: string): boolean {
    const requirementKeywords = ['requirements', 'qualifications', 'skills', 'experience', 'education', 'degree', 'certification'];
    const lowerText = text.toLowerCase();
    return requirementKeywords.some(keyword => lowerText.includes(keyword));
  }

  private detectBenefits(text: string): boolean {
    const benefitKeywords = ['benefits', 'health insurance', 'dental', 'vision', '401k', 'pto', 'vacation', 'flexible', 'remote work'];
    const lowerText = text.toLowerCase();
    return benefitKeywords.some(keyword => lowerText.includes(keyword));
  }

  private detectApplicationInfo(text: string): boolean {
    const applicationKeywords = ['apply', 'application', 'resume', 'cv', 'cover letter', 'submit', 'send to', 'contact', 'email'];
    const lowerText = text.toLowerCase();
    return applicationKeywords.some(keyword => lowerText.includes(keyword));
  }

  private detectSalaryInfo(text: string): boolean {
    const salaryPatterns = [/\$[\d,]+/g, /\d+k\s*(?:per\s*year|annually|\/year)/gi, /salary|compensation|wage|pay/i];
    return salaryPatterns.some(pattern => pattern.test(text));
  }

  private detectContactInfo(text: string): boolean {
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phonePattern = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    return emailPattern.test(text) || phonePattern.test(text);
  }

  private detectLanguage(text: string): string {
    // Basic language detection - can be enhanced with proper library
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'about'];
    const words = text.toLowerCase().split(/\s+/);
    const englishWordCount = words.filter(word => englishWords.includes(word)).length;
    const englishRatio = englishWordCount / Math.max(words.length, 1);
    
    return englishRatio > 0.1 ? 'en' : 'unknown';
  }

  private checkIfExpired(publishedDate: string, modifiedDate: string): boolean {
    const dateToCheck = modifiedDate || publishedDate;
    if (!dateToCheck) return false;
    
    try {
      const date = new Date(dateToCheck);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return date < threeMonthsAgo;
    } catch {
      return false;
    }
  }

  private calculateExpirationDate(publishedDate: string): string | undefined {
    if (!publishedDate) return undefined;
    
    try {
      const posted = new Date(publishedDate);
      const expiration = new Date(posted);
      expiration.setMonth(expiration.getMonth() + 3); // Assume 3 month expiration
      return expiration.toISOString();
    } catch {
      return undefined;
    }
  }

  private validateClassificationThresholds(classification: ContentClassification): ValidationError[] {
    const errors: ValidationError[] = [];

    if (classification.contentType !== 'job_posting') {
      errors.push({
        code: ValidationErrorCode.CONTENT_NOT_JOB_POSTING,
        message: `Content classified as ${classification.contentType} instead of job posting`,
        severity: 'blocking',
        category: 'content',
        userMessage: `This appears to be a ${classification.contentType.replace('_', ' ')} rather than a job posting.`,
        suggestion: 'Please provide a direct link to a job posting rather than a general page.',
        retryable: false
      });
    }

    if (classification.isExpired) {
      errors.push({
        code: ValidationErrorCode.CONTENT_EXPIRED_POSTING,
        message: 'Job posting appears to be expired',
        severity: 'degraded',
        category: 'content',
        userMessage: 'This job posting may have expired.',
        suggestion: 'Check if this is still an active job opening before applying.',
        retryable: false
      });
    }

    if (classification.wordCount < 50) {
      errors.push({
        code: ValidationErrorCode.CONTENT_TOO_SHORT,
        message: `Content too short: ${classification.wordCount} words`,
        severity: 'degraded',
        category: 'content',
        userMessage: 'This page has very little content.',
        suggestion: 'Ensure the URL points to a complete job posting.',
        retryable: false
      });
    }

    if (classification.confidence < this.config.thresholds.minContentConfidence) {
      errors.push({
        code: ValidationErrorCode.CONTENT_INSUFFICIENT_DATA,
        message: `Low classification confidence: ${classification.confidence.toFixed(2)}`,
        severity: 'degraded',
        category: 'content',
        userMessage: 'Unable to confidently identify this as a job posting.',
        suggestion: 'Verify this is a direct link to a job posting.',
        retryable: false
      });
    }

    return errors;
  }

  private generateClassificationWarnings(classification: ContentClassification): any[] {
    const warnings: any[] = [];

    if (!classification.hasJobTitle) {
      warnings.push({
        code: 'CONTENT_NO_CLEAR_TITLE',
        message: 'No clear job title identified',
        impact: 'medium',
        userMessage: 'The job title may not be clearly identifiable.'
      });
    }

    if (!classification.hasCompanyInfo) {
      warnings.push({
        code: 'CONTENT_NO_COMPANY_INFO',
        message: 'No company information identified',
        impact: 'medium',
        userMessage: 'Company information may not be clearly identifiable.'
      });
    }

    if (classification.language !== 'en') {
      warnings.push({
        code: 'CONTENT_LANGUAGE_UNKNOWN',
        message: `Content language appears to be ${classification.language}`,
        impact: 'low',
        userMessage: 'This content may not be in English.'
      });
    }

    return warnings;
  }

  private ensureCompleteClassification(classification: Partial<ContentClassification>): ContentClassification {
    return {
      contentType: classification.contentType || 'other',
      confidence: classification.confidence || 0,
      jobRelevanceScore: classification.jobRelevanceScore || 0,
      hasJobTitle: classification.hasJobTitle || false,
      hasCompanyInfo: classification.hasCompanyInfo || false,
      hasJobDescription: classification.hasJobDescription || false,
      hasApplicationInfo: classification.hasApplicationInfo || false,
      hasRequirements: classification.hasRequirements || false,
      hasSalaryInfo: classification.hasSalaryInfo || false,
      isExpired: classification.isExpired || false,
      expirationDate: classification.expirationDate,
      postedDate: classification.postedDate,
      language: classification.language || 'unknown',
      wordCount: classification.wordCount || 0,
      structuralFeatures: classification.structuralFeatures || {
        hasJobKeywords: false,
        hasContactInfo: false,
        hasApplicationInstructions: false,
        hasBenefitsSection: false,
        hasQualificationsSection: false
      },
      qualityScore: classification.qualityScore || 0
    };
  }

  private createErrorResult(url: string, errors: ValidationError[], startTime: number): ContentValidationResult {
    return {
      isValid: false,
      confidence: 0,
      errors,
      warnings: [],
      metadata: {
        tier: 2,
        processingTimeMs: Date.now() - startTime,
        validatedAt: new Date().toISOString(),
        validationMethod: 'error',
        source: 'ContentClassificationService'
      }
    };
  }
}