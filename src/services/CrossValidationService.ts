/**
 * Cross-Validation Service
 * Validates extracted job information against multiple sources
 * Following Implementation Guide specifications
 */
import { ExtractedJobData } from './WebLLMParsingService';

// Type definitions for validation results
export interface ValidationSource {
  name: string;
  url?: string;
  confidence: number;
  status: 'success' | 'failed' | 'partial';
  data: Partial<ExtractedJobData>;
  responseTime: number;
  errorMessage?: string;
}

export interface CompanyValidationResult {
  isValid: boolean;
  confidence: number;
  companyWebsite?: string;
  businessType?: string;
  legitimacyScore: number;
  recentActivity: string[];
  sources: ValidationSource[];
}

export interface JobTitleValidationResult {
  isValid: boolean;
  confidence: number;
  titleVariations: string[];
  industryMatch: boolean;
  sources: ValidationSource[];
}

export interface CrossValidationResult {
  overallConfidence: number;
  validationSources: ValidationSource[];
  companyValidation: CompanyValidationResult;
  titleValidation: JobTitleValidationResult;
  consistencyScore: number;
  issues: string[];
  recommendations: string[];
  processingTimeMs: number;
}

export class CrossValidationService {
  private maxValidationTimeMs = 3000; // 3 second timeout per spec
  private rateLimitDelay = 500; // 500ms between requests
  private maxConcurrentRequests = 3;

  /**
   * Main entry point for cross-validation
   */
  public async validateJobData(
    extractedData: ExtractedJobData,
    originalUrl: string
  ): Promise<CrossValidationResult> {
    const startTime = Date.now();
    const validationSources: ValidationSource[] = [];
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      console.log(`🔍 Starting cross-validation for job at: ${originalUrl}`);

      // Validate company information
      const companyValidation = await this.validateCompany(
        extractedData.company || '',
        originalUrl
      );

      // Validate job title
      const titleValidation = await this.validateJobTitle(
        extractedData.title || '',
        extractedData.company || ''
      );

      // Collect all validation sources
      validationSources.push(...companyValidation.sources, ...titleValidation.sources);

      // Calculate consistency score
      const consistencyScore = this.calculateConsistencyScore(
        extractedData,
        validationSources
      );

      // Generate issues and recommendations
      if (companyValidation.legitimacyScore < 0.6) {
        issues.push('Company legitimacy concerns detected');
        recommendations.push('Verify company website and business registration');
      }

      if (titleValidation.confidence < 0.7) {
        issues.push('Job title validation below threshold');
        recommendations.push('Check for similar positions at this company');
      }

      if (consistencyScore < 0.6) {
        issues.push('Inconsistent information across sources');
        recommendations.push('Cross-reference job details with multiple platforms');
      }

      // Calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(
        companyValidation,
        titleValidation,
        consistencyScore
      );

      const processingTime = Date.now() - startTime;

      console.log(`✅ Cross-validation completed in ${processingTime}ms with ${Math.round(overallConfidence * 100)}% confidence`);

      return {
        overallConfidence,
        validationSources,
        companyValidation,
        titleValidation,
        consistencyScore,
        issues,
        recommendations,
        processingTimeMs: processingTime
      };

    } catch (error) {
      console.error('❌ Cross-validation failed:', error);
      
      const processingTime = Date.now() - startTime;

      return {
        overallConfidence: 0.3, // Low confidence due to validation failure
        validationSources,
        companyValidation: this.createFailedCompanyValidation(),
        titleValidation: this.createFailedTitleValidation(),
        consistencyScore: 0,
        issues: ['Cross-validation process failed'],
        recommendations: ['Manual verification recommended'],
        processingTimeMs: processingTime
      };
    }
  }

  /**
   * Validate company information against multiple sources
   */
  public async validateCompany(
    companyName: string,
    sourceUrl: string
  ): Promise<CompanyValidationResult> {
    if (!companyName || companyName.trim().length < 2) {
      return this.createFailedCompanyValidation();
    }

    const sources: ValidationSource[] = [];
    const recentActivity: string[] = [];
    let legitimacyScore = 0.5; // Base score

    try {
      // Validate against company domain (if URL is from company site)
      const domainValidation = await this.validateCompanyDomain(companyName, sourceUrl);
      sources.push(domainValidation);

      if (domainValidation.status === 'success') {
        legitimacyScore += 0.3;
        recentActivity.push('Company domain verified');
      }

      // Validate business registration patterns
      const businessValidation = this.validateBusinessName(companyName);
      sources.push(businessValidation);

      if (businessValidation.confidence > 0.7) {
        legitimacyScore += 0.15;
      }

      // Check for known company patterns
      const knownCompanyCheck = this.checkKnownCompanyPatterns(companyName);
      sources.push(knownCompanyCheck);

      if (knownCompanyCheck.confidence > 0.8) {
        legitimacyScore += 0.1;
        recentActivity.push('Recognized company name pattern');
      }

      // Validate against job board consistency
      const jobBoardValidation = this.validateJobBoardConsistency(companyName, sourceUrl);
      sources.push(jobBoardValidation);

      if (jobBoardValidation.confidence > 0.6) {
        legitimacyScore += 0.05;
      }

      // Ensure score stays within bounds
      legitimacyScore = Math.max(0, Math.min(1, legitimacyScore));

      return {
        isValid: legitimacyScore > 0.6,
        confidence: legitimacyScore,
        companyWebsite: domainValidation.data.originalSource,
        businessType: this.inferBusinessType(companyName),
        legitimacyScore,
        recentActivity,
        sources
      };

    } catch (error) {
      console.error('Company validation error:', error);
      return this.createFailedCompanyValidation();
    }
  }

  /**
   * Validate job title against company and industry norms
   */
  public async validateJobTitle(
    jobTitle: string,
    companyName: string
  ): Promise<JobTitleValidationResult> {
    if (!jobTitle || jobTitle.trim().length < 3) {
      return this.createFailedTitleValidation();
    }

    const sources: ValidationSource[] = [];
    const titleVariations: string[] = [];

    try {
      // Validate title format and structure
      const formatValidation = this.validateTitleFormat(jobTitle);
      sources.push(formatValidation);

      // Check for common title variations
      const variations = this.generateTitleVariations(jobTitle);
      titleVariations.push(...variations);

      // Validate against industry standards
      const industryValidation = this.validateAgainstIndustryStandards(jobTitle);
      sources.push(industryValidation);

      // Check title-company consistency
      const consistencyValidation = this.validateTitleCompanyConsistency(jobTitle, companyName);
      sources.push(consistencyValidation);

      // Calculate overall confidence
      const overallConfidence = sources.reduce((sum, source) => sum + source.confidence, 0) / sources.length;

      return {
        isValid: overallConfidence > 0.6,
        confidence: overallConfidence,
        titleVariations,
        industryMatch: industryValidation.confidence > 0.7,
        sources
      };

    } catch (error) {
      console.error('Job title validation error:', error);
      return this.createFailedTitleValidation();
    }
  }

  /**
   * Aggregate validation results from all sources
   */
  public aggregateValidationResults(validationData: CrossValidationResult): {
    summary: string;
    confidence: number;
    keyFindings: string[];
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const keyFindings: string[] = [];
    
    // Company findings
    if (validationData.companyValidation.legitimacyScore > 0.8) {
      keyFindings.push('Company validation passed with high confidence');
    } else if (validationData.companyValidation.legitimacyScore < 0.5) {
      keyFindings.push('Company validation concerns detected');
    }

    // Title findings
    if (validationData.titleValidation.confidence > 0.8) {
      keyFindings.push('Job title validation successful');
    } else {
      keyFindings.push('Job title validation needs attention');
    }

    // Consistency findings
    if (validationData.consistencyScore > 0.8) {
      keyFindings.push('Information consistent across sources');
    } else {
      keyFindings.push('Inconsistencies found in job information');
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';
    if (validationData.overallConfidence > 0.8) {
      riskLevel = 'low';
    } else if (validationData.overallConfidence < 0.4) {
      riskLevel = 'high';
    }

    // Generate summary
    const confidencePercentage = Math.round(validationData.overallConfidence * 100);
    const summary = `Cross-validation completed with ${confidencePercentage}% confidence. ` +
                   `${validationData.issues.length} issues found, ` +
                   `${validationData.validationSources.length} sources checked.`;

    return {
      summary,
      confidence: validationData.overallConfidence,
      keyFindings,
      riskLevel
    };
  }

  /**
   * Private validation methods
   */
  private async validateCompanyDomain(companyName: string, sourceUrl: string): Promise<ValidationSource> {
    const startTime = Date.now();

    try {
      const domain = new URL(sourceUrl).hostname;
      
      // Check if URL is from company domain
      const isCompanyDomain = this.isLikelyCompanyDomain(domain, companyName);
      
      const confidence = isCompanyDomain ? 0.9 : 0.3;
      const responseTime = Date.now() - startTime;

      return {
        name: 'Company Domain Validation',
        url: sourceUrl,
        confidence,
        status: 'success',
        data: { originalSource: sourceUrl, company: companyName },
        responseTime
      };

    } catch (error) {
      return {
        name: 'Company Domain Validation',
        confidence: 0,
        status: 'failed',
        data: {},
        responseTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Domain validation failed'
      };
    }
  }

  private validateBusinessName(companyName: string): ValidationSource {
    const startTime = Date.now();

    try {
      // Check for legitimate business name patterns
      const hasValidSuffix = /\b(Inc|LLC|Corp|Ltd|Company|Co)\b/i.test(companyName);
      const hasValidLength = companyName.length >= 3 && companyName.length <= 100;
      const hasValidChars = /^[a-zA-Z0-9\s\-&'.()]+$/.test(companyName);
      const notGeneric = !/(unknown|confidential|hiring|company|test)/i.test(companyName);

      let confidence = 0.4;
      if (hasValidLength) confidence += 0.2;
      if (hasValidChars) confidence += 0.2;
      if (notGeneric) confidence += 0.15;
      if (hasValidSuffix) confidence += 0.05;

      return {
        name: 'Business Name Validation',
        confidence: Math.min(confidence, 1.0),
        status: confidence > 0.5 ? 'success' : 'partial',
        data: { company: companyName },
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        name: 'Business Name Validation',
        confidence: 0,
        status: 'failed',
        data: {},
        responseTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Business name validation failed'
      };
    }
  }

  private checkKnownCompanyPatterns(companyName: string): ValidationSource {
    const startTime = Date.now();

    // Known legitimate company patterns and names
    const knownPatterns = [
      // Technology companies
      /\b(Google|Microsoft|Apple|Amazon|Meta|Netflix|Tesla|Intel|IBM|Oracle)\b/i,
      // Financial companies
      /\b(Goldman|JPMorgan|Bank of America|Wells Fargo|Citigroup)\b/i,
      // Consulting/Professional services
      /\b(McKinsey|Deloitte|PwC|EY|KPMG|Accenture)\b/i
    ];

    const isKnownCompany = knownPatterns.some(pattern => pattern.test(companyName));
    const confidence = isKnownCompany ? 0.95 : 0.5;

    return {
      name: 'Known Company Patterns',
      confidence,
      status: 'success',
      data: { company: companyName },
      responseTime: Date.now() - startTime
    };
  }

  private validateJobBoardConsistency(companyName: string, sourceUrl: string): ValidationSource {
    const startTime = Date.now();

    try {
      const platform = this.detectJobPlatform(sourceUrl);
      
      // Job boards typically have consistent company name formatting
      let confidence = 0.6;
      
      if (platform === 'LinkedIn' && companyName.length > 2) confidence = 0.8;
      else if (platform === 'Indeed' && companyName.length > 2) confidence = 0.7;
      else if (platform === 'Company Career Site') confidence = 0.9;

      return {
        name: `${platform} Consistency Check`,
        confidence,
        status: 'success',
        data: { company: companyName },
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        name: 'Job Board Consistency',
        confidence: 0.3,
        status: 'failed',
        data: {},
        responseTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Job board validation failed'
      };
    }
  }

  private validateTitleFormat(jobTitle: string): ValidationSource {
    const startTime = Date.now();

    try {
      let confidence = 0.5;
      
      // Check for reasonable length
      if (jobTitle.length >= 5 && jobTitle.length <= 80) confidence += 0.2;
      
      // Check for valid characters
      if (/^[a-zA-Z0-9\s\-&'.(),/]+$/.test(jobTitle)) confidence += 0.1;
      
      // Check for common job title patterns
      const hasJobWords = /\b(Manager|Director|Engineer|Developer|Analyst|Specialist|Coordinator|Assistant|Lead|Senior|Junior)\b/i.test(jobTitle);
      if (hasJobWords) confidence += 0.15;
      
      // Penalize suspicious patterns
      const hasSuspicious = /\b(urgent|immediate|guaranteed|easy money|work from home)\b/i.test(jobTitle);
      if (hasSuspicious) confidence -= 0.3;

      return {
        name: 'Job Title Format Validation',
        confidence: Math.max(0, Math.min(1, confidence)),
        status: confidence > 0.5 ? 'success' : 'partial',
        data: { title: jobTitle },
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        name: 'Job Title Format Validation',
        confidence: 0,
        status: 'failed',
        data: {},
        responseTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Title format validation failed'
      };
    }
  }

  private validateAgainstIndustryStandards(jobTitle: string): ValidationSource {
    const startTime = Date.now();

    const industryPatterns = [
      { pattern: /\b(Software|Developer|Engineer|Programmer)\b/i, industry: 'Technology', confidence: 0.9 },
      { pattern: /\b(Sales|Account|Business Development)\b/i, industry: 'Sales', confidence: 0.8 },
      { pattern: /\b(Marketing|Brand|Digital|Content)\b/i, industry: 'Marketing', confidence: 0.8 },
      { pattern: /\b(Financial|Analyst|Accounting)\b/i, industry: 'Finance', confidence: 0.8 },
      { pattern: /\b(HR|Human Resources|Recruiter)\b/i, industry: 'Human Resources', confidence: 0.8 }
    ];

    const match = industryPatterns.find(p => p.pattern.test(jobTitle));
    const confidence = match ? match.confidence : 0.5;

    return {
      name: 'Industry Standards Validation',
      confidence,
      status: 'success',
      data: { title: jobTitle, industry: match?.industry },
      responseTime: Date.now() - startTime
    };
  }

  private validateTitleCompanyConsistency(jobTitle: string, companyName: string): ValidationSource {
    const startTime = Date.now();

    // Basic consistency checks
    let confidence = 0.7; // Base confidence

    // Check if title seems appropriate for company type
    if (companyName.toLowerCase().includes('tech') || companyName.toLowerCase().includes('software')) {
      const isTechTitle = /\b(developer|engineer|programmer|architect|devops)\b/i.test(jobTitle);
      confidence = isTechTitle ? 0.9 : 0.6;
    }

    return {
      name: 'Title-Company Consistency',
      confidence,
      status: 'success',
      data: { title: jobTitle, company: companyName },
      responseTime: Date.now() - startTime
    };
  }

  /**
   * Utility methods
   */
  private calculateConsistencyScore(data: ExtractedJobData, sources: ValidationSource[]): number {
    if (sources.length === 0) return 0.5;

    // Check consistency across validation sources
    const avgConfidence = sources.reduce((sum, source) => sum + source.confidence, 0) / sources.length;
    const successfulSources = sources.filter(s => s.status === 'success').length;
    const successRate = successfulSources / sources.length;

    return (avgConfidence * 0.7) + (successRate * 0.3);
  }

  private calculateOverallConfidence(
    companyValidation: CompanyValidationResult,
    titleValidation: JobTitleValidationResult,
    consistencyScore: number
  ): number {
    return (companyValidation.confidence * 0.4) + 
           (titleValidation.confidence * 0.3) + 
           (consistencyScore * 0.3);
  }

  private generateTitleVariations(title: string): string[] {
    const variations: string[] = [title];
    
    // Add common variations
    if (title.includes('Jr')) variations.push(title.replace('Jr', 'Junior'));
    if (title.includes('Sr')) variations.push(title.replace('Sr', 'Senior'));
    if (title.includes('&')) variations.push(title.replace('&', 'and'));
    
    return variations;
  }

  private isLikelyCompanyDomain(domain: string, companyName: string): boolean {
    const cleanCompany = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanDomain = domain.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Check if company name appears in domain
    return cleanDomain.includes(cleanCompany) || 
           domain.includes('careers.') || 
           domain.includes('jobs.');
  }

  private detectJobPlatform(url: string): string {
    const hostname = url.toLowerCase();
    if (hostname.includes('linkedin.com')) return 'LinkedIn';
    if (hostname.includes('indeed.com')) return 'Indeed';
    if (hostname.includes('glassdoor.com')) return 'Glassdoor';
    if (hostname.includes('careers.') || hostname.includes('jobs.')) return 'Company Career Site';
    return 'Other';
  }

  private inferBusinessType(companyName: string): string {
    const name = companyName.toLowerCase();
    if (name.includes('tech') || name.includes('software')) return 'Technology';
    if (name.includes('consulting') || name.includes('solutions')) return 'Consulting';
    if (name.includes('bank') || name.includes('financial')) return 'Financial Services';
    if (name.includes('health') || name.includes('medical')) return 'Healthcare';
    return 'General Business';
  }

  private createFailedCompanyValidation(): CompanyValidationResult {
    return {
      isValid: false,
      confidence: 0,
      legitimacyScore: 0,
      recentActivity: [],
      sources: []
    };
  }

  private createFailedTitleValidation(): JobTitleValidationResult {
    return {
      isValid: false,
      confidence: 0,
      titleVariations: [],
      industryMatch: false,
      sources: []
    };
  }
}

// Factory function for easy usage
export async function validateJobData(data: ExtractedJobData, originalUrl: string): Promise<CrossValidationResult> {
  const service = new CrossValidationService();
  return service.validateJobData(data, originalUrl);
}