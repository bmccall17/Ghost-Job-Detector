/**
 * Lever.co Job Parser - WebLLM v0.1.8 Enhanced
 * Specialized parser for jobs.lever.co URLs with learning-based extraction
 */
import { JobParser, ParsedJob, ExtractionMethod } from '@/types/parsing';

export class LeverParser implements JobParser {
  name = 'LeverParser';
  version = '0.1.8-webllm';

  canHandle(url: string): boolean {
    return url.toLowerCase().includes('lever.co');
  }

  getConfidence(): number {
    return 0.82; // High confidence for Lever.co URLs
  }

  getSupportedMethods(): ExtractionMethod[] {
    return [
      ExtractionMethod.CSS_SELECTORS,
      ExtractionMethod.CSS_SELECTORS_WITH_LEARNING,
      ExtractionMethod.TEXT_PATTERNS,
      ExtractionMethod.DOMAIN_INTELLIGENCE
    ];
  }

  async extract(url: string, html: string): Promise<ParsedJob> {
    try {
      console.log(`🎯 LeverParser extracting from: ${url}`);
      
      // WebLLM v0.1.8: URL-based company extraction
      const company = this.extractCompanyFromUrl(url);
      
      // Content-based title extraction with cleaning
      const title = this.extractTitleFromContent(html, company);
      
      // Basic location and description extraction
      const location = this.extractLocationFromContent(html);
      const description = this.extractDescriptionFromContent(html);
      
      const confidence = {
        overall: company !== 'Unknown Company' ? 0.75 : 0.4,
        title: title !== 'Unknown Position' ? 0.7 : 0.3,
        company: company !== 'Unknown Company' ? 0.85 : 0.3,
        location: location ? 0.6 : 0.3
      };

      return {
        title,
        company,
        location: location || 'Not specified',
        description: description || 'Description not available',
        salary: undefined,
        postedAt: undefined,
        metadata: {
          parserUsed: this.name,
          parserVersion: this.version,
          extractionMethod: ExtractionMethod.CSS_SELECTORS_WITH_LEARNING,
          confidence,
          validationResults: [],
          extractionTimestamp: new Date(),
          sourceUrl: url,
          rawData: {
            structuredData: {
              platform: 'Lever',
              urlExtractionSuccess: company !== 'Unknown Company',
              leverSpecific: true
            },
            textContent: html.substring(0, 500)
          }
        }
      };
    } catch (error) {
      console.error('❌ LeverParser extraction failed:', error);
      
      return {
        title: 'Unknown Position',
        company: 'Unknown Company',
        location: 'Not specified',
        description: 'Extraction failed',
        salary: undefined,
        postedAt: undefined,
        metadata: {
          parserUsed: this.name,
          parserVersion: this.version,
          extractionMethod: ExtractionMethod.MANUAL_FALLBACK,
          confidence: { overall: 0.1, title: 0.1, company: 0.1, location: 0.1 },
          validationResults: [],
          extractionTimestamp: new Date(),
          sourceUrl: url,
          rawData: {
            textContent: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      };
    }
  }

  /**
   * WebLLM v0.1.8: Extract company from Lever URL pattern
   */
  private extractCompanyFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      
      if (pathParts.length >= 1) {
        const companySlug = pathParts[0];
        
        // Lever company mappings based on screenshot analysis and WebLLM learning
        const leverCompanyMappings: Record<string, string> = {
          'highspot': 'Highspot',
          'stripe': 'Stripe',
          'figma': 'Figma',
          'notion': 'Notion',
          'segment': 'Segment',
          'lever': 'Lever',
          'postman': 'Postman',
          'rippling': 'Rippling',
          'mixpanel': 'Mixpanel',
          'pinterest': 'Pinterest'
        };
        
        return leverCompanyMappings[companySlug] || 
               companySlug.charAt(0).toUpperCase() + companySlug.slice(1).toLowerCase();
      }
      
      return 'Unknown Company';
    } catch {
      return 'Unknown Company';
    }
  }

  /**
   * WebLLM v0.1.8: Extract and clean title from HTML content
   */
  private extractTitleFromContent(html: string, companyName: string): string {
    const titleSelectors = [
      // Lever-specific selectors
      '.posting-headline',
      '.posting-name', 
      'h1[data-qa="posting-name"]',
      '.posting-title',
      
      // Generic fallbacks
      'h1',
      '.job-title',
      '[data-testid*="title"]'
    ];

    for (const selector of titleSelectors) {
      const regex = new RegExp(`<[^>]*class="[^"]*${selector.replace('.', '')}[^"]*"[^>]*>([^<]+)`, 'i');
      const match = html.match(regex);
      
      if (match && match[1]) {
        let title = match[1].trim();
        
        // WebLLM v0.1.8: Clean company prefixes (learning from screenshot)
        if (companyName !== 'Unknown Company') {
          const patterns = [
            new RegExp(`^${this.escapeRegex(companyName)}\\s*[-:]\\s*`, 'i'),
            new RegExp(`^${this.escapeRegex(companyName)}\\s+`, 'i')
          ];
          
          for (const pattern of patterns) {
            if (pattern.test(title)) {
              const cleaned = title.replace(pattern, '').trim();
              if (cleaned.length > 5) {
                console.log(`🧹 Cleaned Lever title: "${title}" → "${cleaned}"`);
                title = cleaned;
                break;
              }
            }
          }
        }
        
        if (title.length > 3) {
          return title;
        }
      }
    }

    return 'Unknown Position';
  }

  private extractLocationFromContent(html: string): string | null {
    const locationPatterns = [
      /"location"\s*:\s*"([^"]+)"/i,
      /class="[^"]*location[^"]*"[^>]*>([^<]+)/i,
      /<span[^>]*>([^<]*(?:Remote|Hybrid|On-?site)[^<]*)</i
    ];

    for (const pattern of locationPatterns) {
      const match = html.match(pattern);
      if (match && match[1] && match[1].trim().length > 2) {
        return match[1].trim();
      }
    }

    return null;
  }

  private extractDescriptionFromContent(html: string): string | null {
    const descriptionPatterns = [
      /<div[^>]*class="[^"]*description[^"]*"[^>]*>(.*?)<\/div>/is,
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>(.*?)<\/div>/is,
      /<p[^>]*>((?:(?!<\/p>).)*(?:responsibilities|requirements|qualifications)(?:(?!<\/p>).)*)<\/p>/is
    ];

    for (const pattern of descriptionPatterns) {
      const match = html.match(pattern);
      if (match && match[1] && match[1].trim().length > 20) {
        // Clean HTML tags and return first 200 characters
        return match[1].replace(/<[^>]*>/g, ' ').trim().substring(0, 200) + '...';
      }
    }

    return null;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}