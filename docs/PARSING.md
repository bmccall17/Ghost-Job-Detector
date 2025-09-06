# Ghost Job Detector - Parsing System v0.3.1

## Overview

The Ghost Job Detector Parsing System represents a sophisticated multi-platform job data extraction engine powered by AI intelligence, real-time learning, and advanced pattern recognition. This document details the complete parsing architecture implemented in v0.3.1.

## Parsing System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            PARSING SYSTEM CORE                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │ URL Analysis &  │    │ Content         │    │ Platform        │             │
│  │ Platform        │◄──►│ Extraction      │◄──►│ Intelligence    │             │
│  │ Detection       │    │ Engine          │    │ System          │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
│           │                       │                       │                    │
│           ▼                       ▼                       ▼                    │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │ Multi-Strategy  │    │ AI-Powered      │    │ Quality         │             │
│  │ Parser          │    │ Validation &    │    │ Assurance &     │             │
│  │ Selection       │    │ Enhancement     │    │ Learning        │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        PLATFORM-SPECIFIC PARSERS                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ LinkedIn     │  │ Workday      │  │ Greenhouse   │  │ Generic      │        │
│  │ Parser       │  │ Parser       │  │ Parser       │  │ Fallback     │        │
│  │              │  │              │  │              │  │ Parser       │        │
│  │ • DOM        │  │ • Data       │  │ • JSON-LD    │  │ • Schema.org │        │
│  │ • Selectors  │  │ • Automation │  │ • Meta Tags  │  │ • Semantic   │        │
│  │ • Anti-bot   │  │ • IDs        │  │ • API-style  │  │ • HTML       │        │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ Indeed       │  │ AngelList    │  │ Lever        │  │ PDF Parser   │        │
│  │ Parser       │  │ Parser       │  │ Parser       │  │              │        │
│  │              │  │              │  │              │  │ • PDF.js     │        │
│  │ • Dynamic    │  │ • Startup    │  │ • URL-based  │  │ • Text       │        │
│  │ • Content    │  │ • Specific   │  │ • Company    │  │ • Extraction │        │
│  │ • SEO Meta   │  │ • Patterns   │  │ • Patterns   │  │ • WebLLM     │        │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            WEBLLM INTELLIGENCE LAYER                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Browser-based AI Processing with Context-Aware Parsing                       │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    WEBLLM PARSING INTELLIGENCE                              │ │
│  │                                                                             │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │ │
│  │  │ Few-Shot     │  │ Platform     │  │ Context      │                      │ │
│  │  │ Learning     │  │ Specialized  │  │ Understanding│                      │ │
│  │  │ Prompts      │  │ Knowledge    │  │ & Reasoning  │                      │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                      │ │
│  │                                                                             │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │ │
│  │  │ Confidence   │  │ Error        │  │ Real-time    │                      │ │
│  │  │ Scoring      │  │ Recovery     │  │ Learning     │                      │ │
│  │  │ System       │  │ & Retry      │  │ Integration  │                      │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                      │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Core Parsing Components

### 1. URL Analysis & Platform Detection

**Intelligent Platform Recognition:**
```typescript
interface PlatformDetection {
  platform: string;              // Detected platform (linkedin, workday, etc.)
  confidence: number;             // Detection confidence (0.0-1.0)
  parserStrategy: string;         // Optimal parsing strategy
  fallbackStrategies: string[];  // Backup strategies if primary fails
}

function detectPlatformFromURL(url: string): PlatformDetection {
  const urlPatterns: Record<string, RegExp> = {
    linkedin: /linkedin\.com\/jobs\/view\/\d+/,
    workday: /myworkdayjobs\.com|\.myworkdayjobs\.com/,
    greenhouse: /greenhouse\.io|boards\.greenhouse\.io/,
    lever: /lever\.co|jobs\.lever\.co/,
    indeed: /indeed\.com\/viewjob/,
    angellist: /angel\.co|wellfound\.com/,
    bamboohr: /bamboohr\.com/,
    smartrecruiters: /smartrecruiters\.com/,
    icims: /icims\.com/
  };
  
  for (const [platform, pattern] of Object.entries(urlPatterns)) {
    if (pattern.test(url)) {
      return {
        platform,
        confidence: 0.95,
        parserStrategy: `${platform}_optimized`,
        fallbackStrategies: ['generic_semantic', 'webllm_extraction']
      };
    }
  }
  
  // Domain-based detection for company career pages
  const domain = extractDomain(url);
  const companyPatterns = detectCompanyCareerPatterns(url);
  
  return {
    platform: 'generic',
    confidence: 0.7,
    parserStrategy: 'multi_strategy',
    fallbackStrategies: ['schema_org', 'meta_tags', 'webllm_extraction']
  };
}
```

**URL Intelligence Extraction:**
```typescript
interface URLIntelligence {
  company: string | null;         // Company name from URL
  jobTitle: string | null;        // Job title from URL structure
  location: string | null;        // Location from URL parameters
  jobId: string | null;           // Unique job identifier
  additionalContext: Record<string, any>; // Platform-specific metadata
}

function extractURLIntelligence(url: string, platform: string): URLIntelligence {
  const urlParsers = {
    linkedin: (url: string) => ({
      company: null,              // LinkedIn doesn't expose company in URL
      jobTitle: null,             // Title not in URL structure
      location: null,             // Location not in URL
      jobId: url.match(/\/jobs\/view\/(\d+)/)?.[1] || null,
      additionalContext: { platform: 'linkedin', requiresDOMParsing: true }
    }),
    
    workday: (url: string) => {
      const companyMatch = url.match(/([^\.]+)\.myworkdayjobs\.com/);
      const jobIdMatch = url.match(/job\/([^\/]+)/);
      return {
        company: companyMatch?.[1]?.replace(/[-_]/g, ' ') || null,
        jobTitle: null,           // Workday uses job IDs, not titles in URL
        location: null,
        jobId: jobIdMatch?.[1] || null,
        additionalContext: { 
          platform: 'workday', 
          companySlug: companyMatch?.[1],
          requiresDataAutomationIds: true 
        }
      };
    },
    
    lever: (url: string) => {
      const pathParts = url.split('/');
      const companyIndex = pathParts.findIndex(part => part === 'jobs.lever.co') + 1;
      const company = pathParts[companyIndex] || null;
      const titleSlug = pathParts[pathParts.length - 1];
      
      return {
        company: company?.replace(/[-_]/g, ' ') || null,
        jobTitle: titleSlug ? convertSlugToTitle(titleSlug) : null,
        location: null,
        jobId: titleSlug || null,
        additionalContext: { 
          platform: 'lever', 
          titleSlug,
          companySlug: company 
        }
      };
    }
  };
  
  const parser = urlParsers[platform as keyof typeof urlParsers];
  return parser ? parser(url) : createGenericURLIntelligence(url);
}
```

### 2. Platform-Specific Parsers

**LinkedIn Parsing Strategy:**
```typescript
interface LinkedInParsingConfig {
  selectors: {
    title: string[];              // Priority-ordered title selectors
    company: string[];            // Company name selectors
    location: string[];           // Location selectors
    description: string[];        // Job description selectors
    salary: string[];             // Salary information selectors
  };
  
  antiDetectionMeasures: {
    delayBetweenSelections: number; // Delay to avoid bot detection
    randomizeSelectionOrder: boolean; // Randomize selector attempts
    respectRateLimit: boolean;    // Respect LinkedIn's rate limiting
  };
}

class LinkedInParser implements PlatformParser {
  private config: LinkedInParsingConfig = {
    selectors: {
      title: [
        'h1.jobs-unified-top-card__job-title',
        '[data-test="job-title"]',
        '.job-details-jobs-unified-top-card__job-title',
        'h1.topcard__title'
      ],
      company: [
        'a.jobs-unified-top-card__company-name',
        '[data-test="job-company-name"]', 
        '.job-details-jobs-unified-top-card__company-name',
        '.topcard__org-name-link'
      ],
      location: [
        '.jobs-unified-top-card__bullet',
        '[data-test="job-location"]',
        '.job-details-jobs-unified-top-card__primary-description-container .topcard__flavor--bullet',
        '.topcard__flavor'
      ],
      description: [
        '.jobs-description__content .jobs-box__html-content',
        '[data-test="job-description"]',
        '.job-details-jobs-unified-top-card__job-description',
        '.jobs-description-content__text'
      ]
    },
    antiDetectionMeasures: {
      delayBetweenSelections: 100,
      randomizeSelectionOrder: true,
      respectRateLimit: true
    }
  };

  async parse(htmlContent: string, urlContext: URLIntelligence): Promise<ParseResult> {
    const startTime = performance.now();
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Extract using priority selectors with anti-detection measures
      const title = await this.extractWithPriority(doc, this.config.selectors.title);
      const company = await this.extractWithPriority(doc, this.config.selectors.company);
      const location = await this.extractWithPriority(doc, this.config.selectors.location);
      const description = await this.extractWithPriority(doc, this.config.selectors.description);
      
      return {
        title: this.cleanText(title),
        company: this.cleanText(company),
        location: this.cleanText(location),
        remote: this.detectRemote(location, description),
        confidence: this.calculateConfidence({ title, company, location, description }),
        extractionMethod: 'linkedin_dom',
        processingTime: Math.round(performance.now() - startTime),
        platform: 'linkedin'
      };
      
    } catch (error) {
      return this.createErrorResult(error, startTime);
    }
  }

  private async extractWithPriority(doc: Document, selectors: string[]): Promise<string | null> {
    // Randomize selector order for anti-detection if configured
    const orderedSelectors = this.config.antiDetectionMeasures.randomizeSelectionOrder
      ? this.shuffleArray([...selectors])
      : selectors;
      
    for (const selector of orderedSelectors) {
      try {
        const element = doc.querySelector(selector);
        if (element?.textContent?.trim()) {
          // Add delay for anti-detection
          if (this.config.antiDetectionMeasures.delayBetweenSelections > 0) {
            await this.delay(this.config.antiDetectionMeasures.delayBetweenSelections);
          }
          return element.textContent.trim();
        }
      } catch (error) {
        console.warn(`LinkedIn selector failed: ${selector}`, error);
        continue;
      }
    }
    return null;
  }
}
```

**Workday Parsing Strategy:**
```typescript
interface WorkdayParsingConfig {
  dataAutomationSelectors: {
    title: string[];              // data-automation-id based selectors
    company: string[];            // Company identification patterns
    location: string[];           // Location parsing strategies
    description: string[];        // Description extraction patterns
  };
  
  sessionHandling: {
    respectSessionLimits: boolean; // Respect Workday session management
    handleDynamicContent: boolean; // Handle dynamic content loading
    parseMultiLocation: boolean;   // Handle multi-location job postings
  };
}

class WorkdayParser implements PlatformParser {
  private config: WorkdayParsingConfig = {
    dataAutomationSelectors: {
      title: [
        '[data-automation-id="jobPostingHeader"]',
        '[data-automation-id="job-title"]',
        '.css-1id4k1 h3',
        'h1[data-automation-id]'
      ],
      company: [
        '[data-automation-id="company-name"]',
        '.css-k008qs',
        '[data-automation-id="companyName"]'
      ],
      location: [
        '[data-automation-id="locations"]',
        '[data-automation-id="jobLocation"]', 
        '.css-129m7dg',
        '[data-automation-id="job-location"]'
      ],
      description: [
        '[data-automation-id="jobPostingDescription"]',
        '[data-automation-id="job-description"]',
        '.css-1t5f0fr [data-automation-id]'
      ]
    },
    sessionHandling: {
      respectSessionLimits: true,
      handleDynamicContent: true,
      parseMultiLocation: true
    }
  };

  async parse(htmlContent: string, urlContext: URLIntelligence): Promise<ParseResult> {
    const startTime = performance.now();
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Workday-specific extraction with data-automation-id priority
      let title = await this.extractWithDataAutomation(doc, this.config.dataAutomationSelectors.title);
      let company = await this.extractWithDataAutomation(doc, this.config.dataAutomationSelectors.company);
      let location = await this.extractWithDataAutomation(doc, this.config.dataAutomationSelectors.location);
      let description = await this.extractWithDataAutomation(doc, this.config.dataAutomationSelectors.description);
      
      // Fallback to URL intelligence if DOM extraction fails
      if (!company && urlContext.company) {
        company = urlContext.company;
      }
      
      // Handle multi-location parsing
      if (this.config.sessionHandling.parseMultiLocation) {
        location = this.parseMultipleLocations(location);
      }
      
      return {
        title: this.cleanText(title),
        company: this.cleanText(company),
        location: this.cleanText(location),
        remote: this.detectRemote(location, description),
        confidence: this.calculateConfidence({ title, company, location, description }),
        extractionMethod: 'workday_automation_ids',
        processingTime: Math.round(performance.now() - startTime),
        platform: 'workday',
        additionalMetadata: {
          companySlug: urlContext.additionalContext?.companySlug,
          jobId: urlContext.jobId,
          multiLocation: this.isMultiLocation(location)
        }
      };
      
    } catch (error) {
      return this.createErrorResult(error, startTime);
    }
  }

  private async extractWithDataAutomation(doc: Document, selectors: string[]): Promise<string | null> {
    for (const selector of selectors) {
      try {
        const element = doc.querySelector(selector);
        if (element?.textContent?.trim()) {
          return element.textContent.trim();
        }
      } catch (error) {
        console.warn(`Workday automation selector failed: ${selector}`, error);
        continue;
      }
    }
    return null;
  }
}
```

### 3. WebLLM-Powered Intelligent Parsing

**AI-Enhanced Extraction System:**
```typescript
interface WebLLMParsingConfig {
  prompts: {
    extraction: string;           // Primary extraction prompt
    validation: string;           // Validation prompt  
    enhancement: string;          // Enhancement prompt for incomplete data
    confidence: string;           // Confidence assessment prompt
  };
  
  modelSettings: {
    temperature: number;          // Model creativity (low for consistency)
    maxTokens: number;           // Maximum response length
    retryAttempts: number;       // Number of retry attempts
    fallbackStrategy: string;    // Strategy when WebLLM fails
  };
}

class WebLLMParser implements PlatformParser {
  private webLLMManager: WebLLMServiceManager;
  private config: WebLLMParsingConfig;

  constructor() {
    this.webLLMManager = WebLLMServiceManager.getInstance();
    this.config = {
      prompts: {
        extraction: this.buildExtractionPrompt(),
        validation: this.buildValidationPrompt(),
        enhancement: this.buildEnhancementPrompt(),
        confidence: this.buildConfidencePrompt()
      },
      modelSettings: {
        temperature: 0.2,         // Low temperature for consistent extraction
        maxTokens: 1024,
        retryAttempts: 3,
        fallbackStrategy: 'generic_parsing'
      }
    };
  }

  async parse(htmlContent: string, urlContext: URLIntelligence): Promise<ParseResult> {
    const startTime = performance.now();
    
    try {
      // Prepare HTML content for AI analysis
      const optimizedContent = this.optimizeContentForAI(htmlContent);
      
      // Generate platform-specific few-shot prompt
      const context: JobParsingContext = {
        url: urlContext.additionalContext?.originalUrl,
        platform: urlContext.platform,
        contentLength: optimizedContent.length
      };
      
      // Use centralized WebLLM service manager
      const parsingResult = await this.webLLMManager.parseJobData(optimizedContent, context);
      
      return {
        title: parsingResult.title,
        company: parsingResult.company,
        location: parsingResult.location,
        remote: parsingResult.remote,
        confidence: parsingResult.confidence,
        extractionMethod: 'webllm_ai',
        processingTime: parsingResult.processingTime,
        platform: context.platform || 'generic',
        aiEnhanced: true,
        extractionNotes: parsingResult.extractionNotes
      };
      
    } catch (error) {
      console.error('WebLLM parsing failed:', error);
      return this.createErrorResult(error, startTime);
    }
  }

  private optimizeContentForAI(htmlContent: string): string {
    // Remove unnecessary elements for AI processing
    let optimized = htmlContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')   // Remove styles
      .replace(/<!--[\s\S]*?-->/g, '')                                    // Remove comments
      .replace(/\s+/g, ' ')                                               // Normalize whitespace
      .trim();
      
    // Limit content size for model processing (40KB optimal)
    const maxLength = 40 * 1024; // 40KB
    if (optimized.length > maxLength) {
      optimized = this.extractImportantSections(optimized, maxLength);
    }
    
    return optimized;
  }

  private buildExtractionPrompt(): string {
    return `You are a professional job posting parser. Extract the following information from the HTML content:

EXTRACTION REQUIREMENTS:
1. Job Title: The specific role being offered
2. Company Name: The hiring organization (not recruiters)
3. Location: Job location, including remote indicators
4. Job Description: Key responsibilities and requirements

OUTPUT FORMAT (JSON only):
{
  "title": "extracted job title",
  "company": "company name", 
  "location": "job location",
  "remote": boolean,
  "confidence": {
    "title": 0.0-1.0,
    "company": 0.0-1.0, 
    "location": 0.0-1.0,
    "overall": 0.0-1.0
  },
  "extractionNotes": "brief explanation of extraction process"
}

IMPORTANT: Return only valid JSON. No additional text.`;
  }
}
```

### 4. Multi-Strategy Parser Selection

**Dynamic Parser Selection Engine:**
```typescript
interface ParserSelectionStrategy {
  primaryParser: string;          // Primary parsing strategy
  fallbackParsers: string[];     // Ordered fallback strategies
  confidence: number;             // Selection confidence
  reasoning: string;              // Selection reasoning
}

class ParserRegistry {
  private parsers: Map<string, PlatformParser> = new Map();
  private selectionHistory: Map<string, ParserPerformance> = new Map();

  constructor() {
    // Register all available parsers
    this.registerParser('linkedin_optimized', new LinkedInParser());
    this.registerParser('workday_automation', new WorkdayParser());
    this.registerParser('greenhouse_json', new GreenhouseParser());
    this.registerParser('lever_url', new LeverParser());
    this.registerParser('generic_semantic', new GenericSemanticParser());
    this.registerParser('webllm_ai', new WebLLMParser());
  }

  async selectOptimalParser(
    url: string, 
    htmlContent: string,
    platformHint?: string
  ): Promise<ParserSelectionStrategy> {
    
    // Platform detection and initial strategy
    const platformDetection = detectPlatformFromURL(url);
    const contentAnalysis = analyzeContentStructure(htmlContent);
    
    // Historical performance consideration
    const historicalPerformance = this.getHistoricalPerformance(platformDetection.platform);
    
    // AI-based parser recommendation
    const aiRecommendation = await this.getAIParserRecommendation(
      url, 
      htmlContent, 
      platformDetection
    );
    
    // Combine factors for optimal selection
    const strategy = this.calculateOptimalStrategy({
      platformDetection,
      contentAnalysis,
      historicalPerformance,
      aiRecommendation
    });
    
    return strategy;
  }

  async parseWithStrategy(
    strategy: ParserSelectionStrategy,
    htmlContent: string,
    urlContext: URLIntelligence
  ): Promise<ParseResult> {
    
    let lastError: Error | null = null;
    
    // Try primary parser
    try {
      const primaryParser = this.parsers.get(strategy.primaryParser);
      if (primaryParser) {
        const result = await primaryParser.parse(htmlContent, urlContext);
        
        // Validate result quality
        if (this.isHighQualityResult(result)) {
          this.recordParserSuccess(strategy.primaryParser, result);
          return result;
        }
      }
    } catch (error) {
      lastError = error as Error;
      this.recordParserFailure(strategy.primaryParser, error as Error);
    }
    
    // Try fallback parsers in order
    for (const fallbackParser of strategy.fallbackParsers) {
      try {
        const parser = this.parsers.get(fallbackParser);
        if (parser) {
          const result = await parser.parse(htmlContent, urlContext);
          
          if (this.isAcceptableResult(result)) {
            this.recordParserSuccess(fallbackParser, result);
            result.extractionMethod = `${fallbackParser}_fallback`;
            return result;
          }
        }
      } catch (error) {
        lastError = error as Error;
        this.recordParserFailure(fallbackParser, error as Error);
      }
    }
    
    // All parsers failed - return error result
    throw new Error(`All parsing strategies failed. Last error: ${lastError?.message}`);
  }
}
```

### 5. Quality Assurance & Validation

**Multi-Level Validation System:**
```typescript
interface ParseValidation {
  dataCompleteness: number;       // How complete is the extracted data
  dataAccuracy: number;           // How accurate is the extracted data  
  consistencyScore: number;       // Internal consistency of data
  confidenceAlignment: number;    // Confidence vs actual quality alignment
  overallQuality: number;         // Overall result quality score
}

class ParseQualityValidator {
  async validateParseResult(
    result: ParseResult,
    originalContent: string,
    urlContext: URLIntelligence
  ): Promise<ParseValidation> {
    
    const validation = {
      dataCompleteness: this.assessDataCompleteness(result),
      dataAccuracy: await this.assessDataAccuracy(result, originalContent, urlContext),
      consistencyScore: this.assessDataConsistency(result),
      confidenceAlignment: this.assessConfidenceAlignment(result),
      overallQuality: 0
    };
    
    // Calculate overall quality score
    validation.overallQuality = this.calculateOverallQuality(validation);
    
    return validation;
  }

  private assessDataCompleteness(result: ParseResult): number {
    const requiredFields = ['title', 'company'];
    const optionalFields = ['location', 'remote'];
    
    let score = 0;
    let totalWeight = 0;
    
    // Required fields (70% weight)
    for (const field of requiredFields) {
      const fieldValue = result[field as keyof ParseResult];
      const weight = 0.35; // 70% / 2 fields
      totalWeight += weight;
      
      if (fieldValue && typeof fieldValue === 'string' && fieldValue.trim().length > 0) {
        score += weight;
      }
    }
    
    // Optional fields (30% weight)
    for (const field of optionalFields) {
      const fieldValue = result[field as keyof ParseResult];
      const weight = 0.15; // 30% / 2 fields
      totalWeight += weight;
      
      if (fieldValue !== null && fieldValue !== undefined) {
        score += weight;
      }
    }
    
    return totalWeight > 0 ? score / totalWeight : 0;
  }

  private async assessDataAccuracy(
    result: ParseResult, 
    originalContent: string,
    urlContext: URLIntelligence
  ): Promise<number> {
    
    let accuracyScore = 0;
    let validations = 0;
    
    // Title accuracy validation
    if (result.title) {
      const titleAccuracy = this.validateTitleAccuracy(result.title, originalContent);
      accuracyScore += titleAccuracy;
      validations++;
    }
    
    // Company accuracy validation
    if (result.company) {
      const companyAccuracy = await this.validateCompanyAccuracy(
        result.company, 
        originalContent, 
        urlContext
      );
      accuracyScore += companyAccuracy;
      validations++;
    }
    
    // Location accuracy validation
    if (result.location) {
      const locationAccuracy = this.validateLocationAccuracy(result.location, originalContent);
      accuracyScore += locationAccuracy;
      validations++;
    }
    
    return validations > 0 ? accuracyScore / validations : 0;
  }

  private validateTitleAccuracy(title: string, content: string): number {
    // Look for title in HTML content with various patterns
    const titlePatterns = [
      new RegExp(this.escapeRegex(title), 'i'),
      new RegExp(this.escapeRegex(title.toLowerCase()), 'i'),
      new RegExp(title.split(/\s+/).map(this.escapeRegex).join('\\s+'), 'i')
    ];
    
    for (const pattern of titlePatterns) {
      if (pattern.test(content)) {
        return 1.0; // Perfect match found
      }
    }
    
    // Partial matching for complex titles
    const titleWords = title.toLowerCase().split(/\s+/);
    const matchingWords = titleWords.filter(word => 
      content.toLowerCase().includes(word) && word.length > 2
    );
    
    return titleWords.length > 0 ? matchingWords.length / titleWords.length : 0;
  }
}
```

### 6. Real-Time Learning & Improvement

**Parsing Performance Learning System:**
```typescript
interface ParsingLearningMetrics {
  extractionPatterns: Map<string, PatternPerformance>;
  parserAccuracy: Map<string, AccuracyMetrics>;
  contentTypeOptimization: Map<string, OptimizationData>;
  userFeedbackIntegration: FeedbackMetrics;
}

class ParsingLearningService {
  private metrics: ParsingLearningMetrics;
  private learningDatabase: LearningDatabase;

  async recordParsingAttempt(
    url: string,
    platform: string,
    parserUsed: string,
    result: ParseResult,
    userFeedback?: UserFeedback
  ): Promise<void> {
    
    const attempt = {
      url,
      platform, 
      parserUsed,
      result,
      timestamp: Date.now(),
      userFeedback
    };
    
    // Store in learning database
    await this.learningDatabase.storeParsingAttempt(attempt);
    
    // Update real-time metrics
    this.updateExtractionPatterns(attempt);
    this.updateParserAccuracy(attempt);
    this.updateContentTypeOptimization(attempt);
    
    // Process user feedback if provided
    if (userFeedback) {
      await this.processUserFeedback(attempt, userFeedback);
    }
  }

  async optimizeParsers(): Promise<OptimizationResult> {
    const recentAttempts = await this.learningDatabase.getRecentAttempts(
      7 * 24 * 60 * 60 * 1000 // Last 7 days
    );
    
    const optimizations = {
      selectorUpdates: this.identifySelectorImprovements(recentAttempts),
      parserPriorityAdjustments: this.calculateParserPriorityAdjustments(recentAttempts),
      contentOptimizations: this.identifyContentOptimizations(recentAttempts),
      promptImprovements: this.generatePromptImprovements(recentAttempts)
    };
    
    // Apply optimizations
    await this.applyOptimizations(optimizations);
    
    return {
      optimizationsApplied: optimizations,
      expectedImprovement: this.calculateExpectedImprovement(optimizations),
      validationRequired: this.requiresValidation(optimizations)
    };
  }

  private async processUserFeedback(
    attempt: ParsingAttempt,
    feedback: UserFeedback
  ): Promise<void> {
    // Store correction for immediate learning
    const correction = {
      originalResult: attempt.result,
      correctedData: feedback.corrections,
      platform: attempt.platform,
      parserUsed: attempt.parserUsed,
      confidenceImprovement: this.calculateConfidenceImprovement(attempt, feedback)
    };
    
    await this.learningDatabase.storeCorrection(correction);
    
    // Update parser strategies based on correction
    this.updateParserStrategies(correction);
    
    // Generate learning insights
    const insights = this.generateLearningInsights(correction);
    await this.storeLearningInsights(insights);
  }
}
```

### 7. Advanced Features & Integration

**Content Preprocessing Pipeline:**
```typescript
interface ContentPreprocessor {
  cleanHTML(content: string): string;
  extractStructuredData(content: string): StructuredData | null;
  identifyContentSections(content: string): ContentSections;
  optimizeForParsing(content: string, strategy: string): string;
}

class AdvancedContentPreprocessor implements ContentPreprocessor {
  cleanHTML(content: string): string {
    return content
      // Remove problematic elements
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      
      // Remove tracking elements
      .replace(/<img[^>]*tracking[^>]*>/gi, '')
      .replace(/\s*onclick\s*=\s*"[^"]*"/gi, '')
      
      .trim();
  }

  extractStructuredData(content: string): StructuredData | null {
    try {
      // Look for JSON-LD structured data
      const jsonLdPattern = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
      const jsonLdMatches = [...content.matchAll(jsonLdPattern)];
      
      for (const match of jsonLdMatches) {
        try {
          const data = JSON.parse(match[1]);
          if (this.isJobPostingStructuredData(data)) {
            return this.normalizeStructuredData(data);
          }
        } catch (error) {
          continue;
        }
      }
      
      // Look for microdata
      const microdataExtraction = this.extractMicrodata(content);
      if (microdataExtraction) {
        return microdataExtraction;
      }
      
      return null;
    } catch (error) {
      console.warn('Structured data extraction failed:', error);
      return null;
    }
  }
}
```

**PDF Parsing Integration:**
```typescript
interface PDFParsingResult {
  text: string;                   // Extracted text content
  metadata: PDFMetadata;          // Document metadata
  structure: DocumentStructure;   // Document structure analysis
  parsingSuccess: boolean;        // Parsing success indicator
}

class PDFParsingService {
  async parsePDFJob(pdfBuffer: ArrayBuffer, context: JobParsingContext): Promise<ParseResult> {
    try {
      // Extract text from PDF using PDF.js
      const textContent = await this.extractPDFText(pdfBuffer);
      
      // Analyze document structure
      const structure = this.analyzePDFStructure(textContent);
      
      // Use WebLLM for intelligent extraction from PDF text
      const webLLMResult = await this.webLLMManager.parseJobData(textContent.text, {
        ...context,
        platform: 'pdf',
        contentType: 'pdf'
      });
      
      return {
        ...webLLMResult,
        extractionMethod: 'pdf_webllm',
        platform: 'pdf',
        additionalMetadata: {
          pdfMetadata: textContent.metadata,
          documentStructure: structure,
          textLength: textContent.text.length
        }
      };
      
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error}`);
    }
  }

  private async extractPDFText(pdfBuffer: ArrayBuffer): Promise<PDFParsingResult> {
    // Implementation using PDF.js for text extraction
    // This integrates with the PDF parsing system documented in other files
    const pdfjsLib = await import('pdfjs-dist');
    
    const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
    const textItems: string[] = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      textItems.push(pageText);
    }
    
    return {
      text: textItems.join('\n\n'),
      metadata: {
        numPages: pdf.numPages,
        title: pdf.title,
        author: pdf.author,
        subject: pdf.subject
      },
      structure: this.analyzePDFStructure(textItems.join('\n\n')),
      parsingSuccess: textItems.length > 0
    };
  }
}
```

This comprehensive parsing system provides reliable, intelligent job data extraction across multiple platforms with continuous learning and optimization capabilities, ensuring high accuracy and consistent performance in the Ghost Job Detector application.