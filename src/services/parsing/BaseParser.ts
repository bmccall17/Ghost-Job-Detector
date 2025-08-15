import { 
  JobParser, 
  ParsedJob, 
  ExtractionMethod, 
  ExtractionStrategy, 
  ParsingMetadata, 
  ConfidenceScores,
  ValidationResult,
  ParserConfig
} from '@/types/parsing'
import { StructuredDataStrategy } from './strategies/StructuredDataStrategy'
import { CssSelectorStrategy } from './strategies/CssSelectorStrategy'
import { TextPatternStrategy } from './strategies/TextPatternStrategy'
import { DataValidator } from './DataValidator'

export abstract class BaseParser implements JobParser {
  abstract name: string
  abstract version: string
  protected config: ParserConfig
  protected strategies: ExtractionStrategy[] = []
  protected validator: DataValidator

  constructor(config: ParserConfig) {
    this.config = config
    this.validator = new DataValidator()
    this.initializeStrategies()
  }

  private initializeStrategies(): void {
    this.strategies = [
      new StructuredDataStrategy(this.config),
      new CssSelectorStrategy(this.config),
      new TextPatternStrategy(this.config)
    ].sort((a, b) => a.priority - b.priority) // Lower priority number = higher priority
  }

  abstract canHandle(url: string): boolean

  public async extract(url: string, html: string): Promise<ParsedJob> {
    let bestResult: Partial<ParsedJob> = {}
    let usedMethod = ExtractionMethod.MANUAL_FALLBACK
    let allValidationResults: ValidationResult[] = []

    // Try each extraction strategy in priority order
    for (const strategy of this.strategies) {
      try {
        const result = await strategy.extract(html, url)
        const validationResults = strategy.validate(result)
        
        // Calculate confidence for this extraction
        const confidence = this.calculateConfidence(result, validationResults)
        
        // If this result is better than what we have, use it
        if (confidence.overall > (bestResult.metadata?.confidence?.overall || 0)) {
          bestResult = result
          usedMethod = strategy.method
          allValidationResults = validationResults
        }

        // If we have a high-confidence result, we can stop early
        if (confidence.overall > 0.9) {
          break
        }
      } catch (error) {
        console.warn(`Strategy ${strategy.method} failed:`, error)
      }
    }

    // Apply fallback values if needed
    const finalResult = this.applyFallbacks(bestResult, html, url)
    
    // Calculate final confidence scores
    const confidence = this.calculateConfidence(finalResult, allValidationResults)
    
    // Create parsing metadata
    const metadata: ParsingMetadata = {
      parserUsed: this.name,
      parserVersion: this.version,
      extractionMethod: usedMethod,
      confidence,
      validationResults: allValidationResults,
      extractionTimestamp: new Date(),
      sourceUrl: url,
      rawData: {
        htmlTitle: this.extractHtmlTitle(html),
        htmlMetaTags: this.extractMetaTags(html),
        structuredData: this.extractJsonLD(html)
      }
    }

    return {
      title: finalResult.title || 'Unknown Position',
      company: finalResult.company || 'Unknown Company',
      description: finalResult.description,
      location: finalResult.location,
      salary: finalResult.salary,
      metadata
    }
  }

  protected applyFallbacks(result: Partial<ParsedJob>, _html: string, url: string): Partial<ParsedJob> {
    // Apply domain-based company fallback
    if (!result.company || result.company === 'Unknown Company') {
      result.company = this.extractCompanyFromDomain(url)
    }

    // Apply title cleanup
    if (result.title) {
      result.title = this.cleanTitle(result.title)
    }

    return result
  }

  protected extractCompanyFromDomain(url: string): string {
    try {
      const domain = new URL(url).hostname.toLowerCase()
      
      // Remove common prefixes and suffixes
      const cleanDomain = domain
        .replace(/^(www\.|careers\.|jobs\.)/g, '')
        .replace(/\.(com|org|net|io|co\.uk)$/g, '')
        .split('.')[0]
      
      return cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1)
    } catch {
      return 'Unknown Company'
    }
  }

  protected cleanTitle(title: string): string {
    return title
      .replace(/\s*[-–|]\s*(LinkedIn|Indeed|Glassdoor|Monster).*$/i, '')
      .replace(/\s*\|\s*.*$/g, '')
      .trim()
  }

  protected extractHtmlTitle(html: string): string {
    const match = html.match(/<title[^>]*>([^<]+)/i)
    return match ? match[1].trim() : ''
  }

  protected extractMetaTags(html: string): Record<string, string> {
    const metaTags: Record<string, string> = {}
    const metaMatches = html.matchAll(/<meta[^>]+>/gi)
    
    for (const match of metaMatches) {
      const metaTag = match[0]
      const nameMatch = metaTag.match(/name="([^"]+)"/i) || metaTag.match(/property="([^"]+)"/i)
      const contentMatch = metaTag.match(/content="([^"]+)"/i)
      
      if (nameMatch && contentMatch) {
        metaTags[nameMatch[1]] = contentMatch[1]
      }
    }
    
    return metaTags
  }

  protected extractJsonLD(html: string): any {
    try {
      const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([^<]+)<\/script>/gi)
      
      for (const match of jsonLdMatches) {
        try {
          return JSON.parse(match[1])
        } catch {
          continue
        }
      }
    } catch {
      // Ignore JSON parsing errors
    }
    return null
  }

  protected calculateConfidence(result: Partial<ParsedJob>, validationResults: ValidationResult[]): ConfidenceScores {
    const scores = {
      title: this.calculateFieldConfidence(result.title, validationResults, 'title'),
      company: this.calculateFieldConfidence(result.company, validationResults, 'company'),
      description: this.calculateFieldConfidence(result.description, validationResults, 'description'),
      location: this.calculateFieldConfidence(result.location, validationResults, 'location'),
      salary: this.calculateFieldConfidence(result.salary, validationResults, 'salary')
    }

    // Calculate overall confidence as weighted average
    const weights = { title: 0.4, company: 0.4, description: 0.1, location: 0.05, salary: 0.05 }
    const overall = Object.entries(weights).reduce((sum, [field, weight]) => {
      const score = scores[field as keyof typeof scores] || 0
      return sum + (score * weight)
    }, 0)

    return { overall, ...scores }
  }

  private calculateFieldConfidence(value: string | undefined, validationResults: ValidationResult[], field: string): number {
    if (!value) return 0

    const fieldValidations = validationResults.filter(r => r.field === field)
    if (fieldValidations.length === 0) return 0.5 // Default moderate confidence

    return fieldValidations.reduce((sum, r) => sum + r.score, 0) / fieldValidations.length
  }

  public getConfidence(): number {
    // Return a base confidence for this parser type
    return 0.8
  }

  public getSupportedMethods(): ExtractionMethod[] {
    return this.strategies.map(s => s.method)
  }
}