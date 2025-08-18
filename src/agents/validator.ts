/**
 * WebLLM-powered Job Field Validator Agent
 * Validates and improves parsing results using local AI
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
    return `You are a strict job-posting field validator. Analyze the provided job posting HTML and parser output to validate and improve field extraction.

Your task:
1. Examine the HTML snippet and parser output
2. Validate the accuracy of extracted title, company, and location
3. Provide improved values if the parser made errors
4. Assign confidence scores (0.0-1.0) for each field

Return ONLY valid JSON matching this exact structure:
{
  "validated": boolean,
  "fields": {
    "title": {"value": "string", "conf": number},
    "company": {"value": "string", "conf": number}, 
    "location": {"value": "string", "conf": number}
  },
  "notes": "optional string"
}

Rules:
- Only include fields you can confidently improve or validate
- Confidence scores: 0.9+ = very confident, 0.7-0.89 = confident, 0.5-0.69 = uncertain
- Set validated=true only if you found and corrected issues
- Keep values concise and accurate`;
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
      
      // Validate structure
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