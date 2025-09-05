/**
 * WebLLM-powered Job Field Validator Agent
 * Validates and improves parsing results using local AI
 * Enhanced with reliable model selection and error handling
 */
import { WebLLMManager } from '@/lib/webllm';

// Type definitions matching ML_INTEGRATION.md specification
export type AgentField = { 
  value: string; 
  conf: number; 
  spans?: Array<[number, number]> 
};

export type AgentOutput = {
  validated: boolean;
  fields: {
    title?: AgentField;
    company?: AgentField;
    location?: AgentField;
  };
  notes?: string;
  analysis?: DetailedAnalysis;
};

export type DetailedAnalysis = {
  thoughtProcess: string[];
  linksChecked: LinkVerification[];
  companyResearch: CompanyResearch;
  crossPlatformCheck: CrossPlatformResult;
  confidenceBreakdown: ConfidenceBreakdown;
  verificationSteps: VerificationStep[];
  finalAssessment: string;
  riskFactors: string[];
  legitimacyIndicators: string[];
};

export type LinkVerification = {
  url: string;
  platform: string;
  status: 'accessible' | 'blocked' | 'not_found' | 'error';
  findings: string;
  confidence: number;
};

export type CompanyResearch = {
  companyName: string;
  domain: string;
  businessContext: string;
  recentActivity: string[];
  locationVerification: string;
  legitimacyScore: number;
};

export type CrossPlatformResult = {
  platformsFound: string[];
  consistentInfo: boolean;
  duplicatesDetected: number;
  postingPattern: 'single' | 'multiple' | 'suspicious';
};

export type ConfidenceBreakdown = {
  overallConfidence: number;
  titleConfidence: number;
  companyConfidence: number;
  locationConfidence: number;
  legitimacyConfidence: number;
  reasoningQuality: number;
};

export type VerificationStep = {
  step: number;
  action: string;
  result: string;
  confidence: number;
  nextSteps?: string[];
};

export interface ValidationInput {
  url: string;
  htmlSnippet: string; // trimmed container
  parserOutput: { 
    title?: string; 
    company?: string; 
    location?: string; 
    description?: string 
  };
}

export class JobFieldValidator {
  private webllmManager: WebLLMManager;

  constructor() {
    this.webllmManager = WebLLMManager.getInstance();
  }

  /**
   * Validate job fields using WebLLM
   */
  public async validateWithWebLLM(input: ValidationInput): Promise<AgentOutput> {
    try {
      console.log('🎯 Starting WebLLM validation for:', input.url);
      
      // Initialize WebLLM engine
      await this.webllmManager.initWebLLM();
      
      // Create validation prompt
      const systemPrompt = this.createSystemPrompt();
      const userPrompt = this.createUserPrompt(input);
      
      // Generate response
      const response = await this.webllmManager.generateCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        temperature: 0.2,
        max_tokens: 512
      });

      console.log('🤖 WebLLM raw response:', response);

      // Parse and validate response
      return this.parseAgentResponse(response, input);
    } catch (error) {
      console.error('❌ WebLLM validation failed:', error);
      
      // Return fallback response
      return {
        validated: false,
        fields: {},
        notes: `WebLLM validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check if validation is needed based on confidence thresholds
   */
  public needsValidation(parserResult: {
    title?: { confidence: number };
    company?: { confidence: number };
    location?: { confidence: number };
    description?: string;
  }): boolean {
    const titleConf = parserResult.title?.confidence ?? 0;
    const companyConf = parserResult.company?.confidence ?? 0;
    const locationConf = parserResult.location?.confidence ?? 0;
    const descLength = parserResult.description?.length ?? 0;

    const needsValidation = (
      titleConf < 0.85 ||
      companyConf < 0.80 ||
      locationConf < 0.75 ||
      descLength < 140
    );

    if (needsValidation) {
      console.log('⚠️ Parser confidence below thresholds:', {
        title: titleConf,
        company: companyConf,
        location: locationConf,
        descriptionLength: descLength
      });
    }

    return needsValidation;
  }

  /**
   * Extract HTML container for validation
   */
  public extractHtmlSnippet(url: string, html: string): string {
    try {
      // Create temporary DOM element
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Site-specific selectors for main job content
      const selectors = this.getJobContentSelectors(url);
      
      for (const selector of selectors) {
        const element = doc.querySelector(selector);
        if (element) {
          let snippet = element.outerHTML;
          
          // Apply size limit (40KB max as per spec)
          if (snippet.length > 40000) {
            snippet = snippet.slice(0, 40000);
          }
          
          // Clean up tracking and ads
          snippet = this.cleanHtmlSnippet(snippet);
          
          console.log(`📄 Extracted HTML snippet (${snippet.length} chars) using selector: ${selector}`);
          return snippet;
        }
      }
      
      // Fallback: use body with size limit
      const body = doc.body?.outerHTML || html;
      const fallback = this.cleanHtmlSnippet(body.slice(0, 40000));
      
      console.log(`📄 Using fallback HTML snippet (${fallback.length} chars)`);
      return fallback;
    } catch (error) {
      console.error('HTML snippet extraction failed:', error);
      return html.slice(0, 40000); // Basic fallback
    }
  }

  private createSystemPrompt(): string {
    return `You are an advanced job posting legitimacy analyzer and field validator. Perform comprehensive analysis similar to a professional investigative researcher.

ANALYSIS PROCESS (follow this exact methodology):

1. THOUGHT PROCESS DOCUMENTATION
   - Document your reasoning step-by-step
   - Show your analytical process for transparency
   - Include "Thought for [X]s" timing estimates

2. FIELD EXTRACTION & VALIDATION
   - Extract and validate: title, company, location
   - Compare against HTML content for accuracy
   - Identify any parsing errors or improvements needed

3. EXTERNAL VERIFICATION (simulate these checks)
   - Company website analysis and domain verification
   - Cross-platform job posting searches
   - Company legitimacy and recent business activity research
   - Location and office verification

4. COMPREHENSIVE ASSESSMENT
   - Rate overall legitimacy vs ghost job probability
   - Identify specific risk factors and legitimacy indicators
   - Provide confidence breakdown for each component
   - Suggest actionable verification steps

Return ONLY valid JSON matching this structure:
{
  "validated": boolean,
  "fields": {
    "title": {"value": "string", "conf": number},
    "company": {"value": "string", "conf": number},
    "location": {"value": "string", "conf": number}
  },
  "notes": "brief summary",
  "analysis": {
    "thoughtProcess": ["step 1", "step 2", "step 3"],
    "linksChecked": [{"url": "string", "platform": "string", "status": "accessible|blocked|not_found", "findings": "string", "confidence": number}],
    "companyResearch": {
      "companyName": "string",
      "domain": "string", 
      "businessContext": "string",
      "recentActivity": ["activity 1", "activity 2"],
      "locationVerification": "string",
      "legitimacyScore": number
    },
    "crossPlatformCheck": {
      "platformsFound": ["LinkedIn", "Company Site"],
      "consistentInfo": boolean,
      "duplicatesDetected": number,
      "postingPattern": "single|multiple|suspicious"
    },
    "confidenceBreakdown": {
      "overallConfidence": number,
      "titleConfidence": number,
      "companyConfidence": number,
      "locationConfidence": number,
      "legitimacyConfidence": number,
      "reasoningQuality": number
    },
    "verificationSteps": [{"step": number, "action": "string", "result": "string", "confidence": number, "nextSteps": ["step 1"]}],
    "finalAssessment": "detailed conclusion",
    "riskFactors": ["factor 1", "factor 2"],
    "legitimacyIndicators": ["indicator 1", "indicator 2"]
  }
}

CONFIDENCE SCORING:
- 0.95-1.0: Extremely confident, multiple verification sources
- 0.85-0.94: Highly confident, strong evidence
- 0.70-0.84: Confident, good supporting evidence  
- 0.50-0.69: Moderate confidence, some uncertainty
- 0.30-0.49: Low confidence, significant concerns
- 0.0-0.29: Very low confidence, major red flags

Be thorough, analytical, and provide actionable insights like a professional job market investigator.`;
  }

  private createUserPrompt(input: ValidationInput): string {
    return JSON.stringify({
      url: input.url,
      parserOutput: input.parserOutput,
      htmlSnippet: input.htmlSnippet
    });
  }

  private parseAgentResponse(response: string, input: ValidationInput): AgentOutput {
    try {
      // Clean response (remove markdown formatting if present)
      let cleanResponse = response.trim();
      
      // Remove markdown code blocks
      cleanResponse = cleanResponse.replace(/```json\s*|\s*```/g, '');
      cleanResponse = cleanResponse.replace(/```\s*|\s*```/g, '');
      
      // Parse JSON
      const parsed = JSON.parse(cleanResponse) as AgentOutput;
      
      // Validate required structure
      if (typeof parsed.validated !== 'boolean') {
        throw new Error('Invalid validated field');
      }
      
      if (!parsed.fields || typeof parsed.fields !== 'object') {
        throw new Error('Invalid fields structure');
      }
      
      // Validate each field if present
      for (const [fieldName, field] of Object.entries(parsed.fields)) {
        if (field && (typeof field.value !== 'string' || typeof field.conf !== 'number')) {
          throw new Error(`Invalid ${fieldName} field structure`);
        }
      }
      
      // Validate analysis structure if present
      if (parsed.analysis) {
        this.validateAnalysisStructure(parsed.analysis);
      }
      
      console.log('✅ Successfully parsed WebLLM response');
      return parsed;
    } catch (error) {
      console.error('❌ Failed to parse WebLLM response:', error);
      
      // Return safe fallback
      return {
        validated: false,
        fields: {
          title: input.parserOutput.title ? { value: input.parserOutput.title, conf: 0.5 } : undefined,
          company: input.parserOutput.company ? { value: input.parserOutput.company, conf: 0.5 } : undefined,
          location: input.parserOutput.location ? { value: input.parserOutput.location, conf: 0.5 } : undefined,
        },
        notes: `Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private getJobContentSelectors(url: string): string[] {
    const hostname = new URL(url).hostname.toLowerCase();
    
    // Site-specific selectors for job content containers
    if (hostname.includes('linkedin.com')) {
      return [
        '.jobs-description__content',
        '.jobs-box__html-content',
        '.job-details-jobs-unified-top-card__content',
        '.jobs-details__main-content'
      ];
    }
    
    if (hostname.includes('greenhouse.io')) {
      return [
        '.job-post',
        '.job-description',
        '.content',
        'main'
      ];
    }
    
    // Generic selectors for company career pages
    return [
      '[class*="job-description"]',
      '[class*="job-content"]', 
      '[class*="job-details"]',
      'main',
      '.content',
      'article'
    ];
  }

  /**
   * Validate the detailed analysis structure
   */
  private validateAnalysisStructure(analysis: any): void {
    const requiredFields = [
      'thoughtProcess', 'linksChecked', 'companyResearch', 
      'crossPlatformCheck', 'confidenceBreakdown', 'verificationSteps',
      'finalAssessment', 'riskFactors', 'legitimacyIndicators'
    ];

    for (const field of requiredFields) {
      if (!analysis.hasOwnProperty(field)) {
        console.warn(`Analysis missing field: ${field}`);
      }
    }

    // Validate arrays
    if (analysis.thoughtProcess && !Array.isArray(analysis.thoughtProcess)) {
      throw new Error('thoughtProcess must be an array');
    }

    if (analysis.linksChecked && !Array.isArray(analysis.linksChecked)) {
      throw new Error('linksChecked must be an array');
    }

    if (analysis.verificationSteps && !Array.isArray(analysis.verificationSteps)) {
      throw new Error('verificationSteps must be an array');
    }

    // Validate confidence breakdown
    if (analysis.confidenceBreakdown) {
      const conf = analysis.confidenceBreakdown;
      const confFields = ['overallConfidence', 'titleConfidence', 'companyConfidence', 'locationConfidence', 'legitimacyConfidence', 'reasoningQuality'];
      
      for (const field of confFields) {
        if (conf[field] !== undefined && (typeof conf[field] !== 'number' || conf[field] < 0 || conf[field] > 1)) {
          throw new Error(`Invalid confidence value for ${field}`);
        }
      }
    }
  }

  private cleanHtmlSnippet(html: string): string {
    return html
      // Remove script tags
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      // Remove style tags
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Remove tracking attributes
      .replace(/\s(data-tracking|data-analytics)[^=]*="[^"]*"/gi, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove comments
      .replace(/<!--[\s\S]*?-->/g, '')
      .trim();
  }
}

// Factory function for easy usage
export async function validateWithWebLLM(input: ValidationInput): Promise<AgentOutput> {
  const validator = new JobFieldValidator();
  return validator.validateWithWebLLM(input);
}

// Threshold checking utility
export function needsValidation(parserResult: {
  title?: { confidence: number };
  company?: { confidence: number };
  location?: { confidence: number };
  description?: string;
}): boolean {
  const validator = new JobFieldValidator();
  return validator.needsValidation(parserResult);
}