import { JobParser, ParsedJob } from '@/types/parsing'
import { LinkedInParser } from './parsers/LinkedInParser'
import { IndeedParser } from './parsers/IndeedParser'
import { CompanyCareerParser } from './parsers/CompanyCareerParser'
import { GreenhouseParser } from './parsers/GreenhouseParser'
import { GenericParser } from './parsers/GenericParser'

export class ParserRegistry {
  private static instance: ParserRegistry
  private parsers: JobParser[] = []
  private fallbackParser: JobParser

  private constructor() {
    this.initializeParsers()
    this.fallbackParser = new GenericParser()
  }

  public static getInstance(): ParserRegistry {
    if (!ParserRegistry.instance) {
      ParserRegistry.instance = new ParserRegistry()
    }
    return ParserRegistry.instance
  }

  private initializeParsers(): void {
    this.parsers = [
      new LinkedInParser(),
      new IndeedParser(),
      new GreenhouseParser(),
      new CompanyCareerParser()
    ]
  }

  public async parseJob(url: string, html?: string): Promise<ParsedJob> {
    // Find the best parser for this URL
    const parser = this.findBestParser(url)
    
    // If no HTML provided, fetch it
    if (!html) {
      html = await this.fetchHtml(url)
    }

    try {
      // Attempt parsing with the selected parser
      const result = await parser.extract(url, html)
      
      // Validate the result quality
      const isHighQuality = this.validateResult(result)
      
      if (isHighQuality) {
        return result
      } else {
        // If quality is poor, try the fallback parser
        console.warn(`Parser ${parser.name} produced low quality result, trying fallback`)
        return await this.fallbackParser.extract(url, html)
      }
    } catch (error) {
      console.error(`Parser ${parser.name} failed:`, error)
      // Fallback to generic parser
      return await this.fallbackParser.extract(url, html)
    }
  }

  private findBestParser(url: string): JobParser {
    // Find parsers that can handle this URL
    const capableParsers = this.parsers.filter(parser => parser.canHandle(url))
    
    if (capableParsers.length === 0) {
      return this.fallbackParser
    }

    // Sort by confidence and return the best one
    return capableParsers.sort((a, b) => b.getConfidence() - a.getConfidence())[0]
  }

  private validateResult(result: ParsedJob): boolean {
    const { confidence } = result.metadata
    
    // Minimum quality thresholds
    const minOverallConfidence = 0.6
    const minTitleConfidence = 0.7
    const minCompanyConfidence = 0.7
    
    return (
      confidence.overall >= minOverallConfidence &&
      confidence.title >= minTitleConfidence &&
      confidence.company >= minCompanyConfidence &&
      result.title !== 'Unknown Position' &&
      result.company !== 'Unknown Company' &&
      result.title.length > 2 &&
      result.company.length > 2
    )
  }

  private async fetchHtml(url: string): Promise<string> {
    try {
      // Use AllOrigins proxy for CORS handling
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`)
      const data = await response.json()
      return data.contents || ''
    } catch (error) {
      console.error('Failed to fetch HTML:', error)
      throw new Error(`Failed to fetch content from ${url}`)
    }
  }

  public registerParser(parser: JobParser): void {
    this.parsers.push(parser)
  }

  public getRegisteredParsers(): JobParser[] {
    return [...this.parsers, this.fallbackParser]
  }

  public getParserForUrl(url: string): JobParser {
    return this.findBestParser(url)
  }
}