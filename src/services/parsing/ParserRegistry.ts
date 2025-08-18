import { JobParser, ParsedJob, ExtractionMethod } from '@/types/parsing'
import { LinkedInParser } from './parsers/LinkedInParser'
import { IndeedParser } from './parsers/IndeedParser'
import { CompanyCareerParser } from './parsers/CompanyCareerParser'
import { GreenhouseParser } from './parsers/GreenhouseParser'
import { GenericParser } from './parsers/GenericParser'
import { ParsingLearningService, initializeParsingLearning } from './ParsingLearningService'
import { DuplicateDetectionService } from '../DuplicateDetectionService'

export class ParserRegistry {
  private static instance: ParserRegistry
  private parsers: JobParser[] = []
  private fallbackParser: JobParser
  private learningService: ParsingLearningService
  private duplicateDetection: DuplicateDetectionService

  private constructor() {
    this.initializeParsers()
    this.fallbackParser = new GenericParser()
    this.learningService = ParsingLearningService.getInstance()
    this.duplicateDetection = DuplicateDetectionService.getInstance()
    this.initializeLearning()
  }

  private async initializeLearning(): Promise<void> {
    try {
      await initializeParsingLearning()
    } catch (error) {
      console.warn('Failed to initialize parsing learning:', error)
    }
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
      let result = await parser.extract(url, html)
      
      // Apply learned patterns to improve the result
      const improvements = this.learningService.applyLearnedPatterns(
        { title: result.title, company: result.company },
        url,
        parser.name
      )
      
      if (improvements.improvements.length > 0) {
        console.log(`🎓 Applied ${improvements.improvements.length} learned improvements:`, improvements.improvements)
        result.title = improvements.title
        result.company = improvements.company
        
        // Update confidence if we made improvements
        result.metadata.confidence.overall = Math.min(0.95, result.metadata.confidence.overall + 0.1)
        // Update extraction method to indicate learning was applied
        switch (result.metadata.extractionMethod) {
          case ExtractionMethod.STRUCTURED_DATA:
            result.metadata.extractionMethod = ExtractionMethod.STRUCTURED_DATA_WITH_LEARNING
            break
          case ExtractionMethod.CSS_SELECTORS:
            result.metadata.extractionMethod = ExtractionMethod.CSS_SELECTORS_WITH_LEARNING
            break
          case ExtractionMethod.TEXT_PATTERNS:
            result.metadata.extractionMethod = ExtractionMethod.TEXT_PATTERNS_WITH_LEARNING
            break
          case ExtractionMethod.NLP_EXTRACTION:
            result.metadata.extractionMethod = ExtractionMethod.NLP_EXTRACTION_WITH_LEARNING
            break
          case ExtractionMethod.MANUAL_FALLBACK:
            result.metadata.extractionMethod = ExtractionMethod.MANUAL_FALLBACK_WITH_LEARNING
            break
          case ExtractionMethod.DOMAIN_INTELLIGENCE:
            result.metadata.extractionMethod = ExtractionMethod.DOMAIN_INTELLIGENCE
            break
        }
      }
      
      // Validate the result quality
      const isHighQuality = this.validateResult(result)
      
      if (isHighQuality) {
        return result
      } else {
        // If quality is poor, try the fallback parser
        console.warn(`Parser ${parser.name} produced low quality result, trying fallback`)
        const fallbackResult = await this.fallbackParser.extract(url, html)
        
        // Apply learning to fallback result too
        const fallbackImprovements = this.learningService.applyLearnedPatterns(
          { title: fallbackResult.title, company: fallbackResult.company },
          url,
          this.fallbackParser.name
        )
        
        if (fallbackImprovements.improvements.length > 0) {
          fallbackResult.title = fallbackImprovements.title
          fallbackResult.company = fallbackImprovements.company
        }
        
        return fallbackResult
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

  /**
   * Record a parsing correction to improve future results
   */
  public async recordCorrection(correction: {
    sourceUrl: string
    originalTitle?: string
    correctTitle?: string
    originalCompany?: string
    correctCompany?: string
    correctionReason?: string
  }): Promise<void> {
    const parser = this.findBestParser(correction.sourceUrl)
    
    await this.learningService.recordCorrection({
      sourceUrl: correction.sourceUrl,
      originalTitle: correction.originalTitle,
      correctTitle: correction.correctTitle,
      originalCompany: correction.originalCompany,
      correctCompany: correction.correctCompany,
      parserUsed: parser.name,
      parserVersion: parser.version,
      correctionReason: correction.correctionReason,
      correctedBy: 'manual_correction'
    })
  }

  /**
   * Get learning statistics
   */
  public getLearningStats() {
    return this.learningService.getLearningStats()
  }

  /**
   * Detect duplicates for a parsed job
   */
  public async detectDuplicates(
    newJob: { id: string, url: string, title: string, company: string, location?: string, normalizedKey: string, sourceId: string, createdAt: Date },
    existingJobs: { id: string, url: string, title: string, company: string, location?: string, normalizedKey: string, sourceId: string, createdAt: Date }[]
  ) {
    return this.duplicateDetection.detectDuplicates(newJob, existingJobs)
  }

  /**
   * Join/merge duplicate job postings
   */
  public async joinDuplicates(duplicateGroup: any) {
    return this.duplicateDetection.joinDuplicates(duplicateGroup)
  }
}