import { JobParser, ParsedJob, ExtractionMethod } from '@/types/parsing'
import { LinkedInParser } from './parsers/LinkedInParser'
import { IndeedParser } from './parsers/IndeedParser'
import { CompanyCareerParser } from './parsers/CompanyCareerParser'
import { GreenhouseParser } from './parsers/GreenhouseParser'
import { GenericParser } from './parsers/GenericParser'
import { ParsingLearningService, initializeParsingLearning } from './ParsingLearningService'
import { DuplicateDetectionService } from '../DuplicateDetectionService'
import { JobFieldValidator, needsValidation, type AgentOutput } from '@/agents/validator'
import { isWebGPUSupported } from '@/lib/webllm'

export class ParserRegistry {
  private static instance: ParserRegistry
  private parsers: JobParser[] = []
  private fallbackParser: JobParser
  private learningService: ParsingLearningService
  private duplicateDetection: DuplicateDetectionService
  private validator: JobFieldValidator

  private constructor() {
    this.initializeParsers()
    this.fallbackParser = new GenericParser()
    this.learningService = ParsingLearningService.getInstance()
    this.duplicateDetection = DuplicateDetectionService.getInstance()
    this.validator = new JobFieldValidator()
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
      
      // Check if AI validation is needed based on confidence thresholds
      const agentEnabled = typeof window !== 'undefined' && 
                          (process.env.AGENT_ENABLED === 'true' || 
                           process.env.NEXT_PUBLIC_AGENT_ENABLED === 'true');
      
      if (agentEnabled && this.shouldRunAgentValidation(result)) {
        console.log('🤖 Running AI validation due to low confidence scores');
        result = await this.runAgentValidation(url, html, result, parser.name);
      }
      
      // Validate the result quality
      const isHighQuality = this.validateResult(result)
      
      if (isHighQuality) {
        return result
      } else {
        // If quality is poor, try real-time learning first
        console.warn(`Parser ${parser.name} produced low quality result, trying real-time learning`)
        
        const learningResult = await this.learningService.learnFromFailedParse(
          url,
          html,
          { title: result.title, company: result.company, location: result.location }
        )
        
        if (learningResult.improvements.length > 0) {
          console.log(`🎓 Real-time learning improved result:`, learningResult.improvements)
          
          // Apply learned improvements
          if (learningResult.title) result.title = learningResult.title
          if (learningResult.company) result.company = learningResult.company
          if (learningResult.location) result.location = learningResult.location
          
          // Update confidence if improvements were made
          if (learningResult.title || learningResult.company) {
            result.metadata.confidence.overall = Math.min(0.9, result.metadata.confidence.overall + 0.2)
            if (learningResult.title) result.metadata.confidence.title = Math.min(0.95, result.metadata.confidence.title + 0.3)
            if (learningResult.company) result.metadata.confidence.company = Math.min(0.95, result.metadata.confidence.company + 0.3)
          }
          
          // Mark as learning-enhanced
          result.metadata.extractionMethod = result.metadata.extractionMethod === 'manual_fallback' 
            ? 'real_time_learning'
            : result.metadata.extractionMethod
          
          // Re-validate after learning improvements
          if (this.validateResult(result)) {
            return result
          }
        }
        
        // If learning didn't help enough, try the fallback parser
        console.warn(`Real-time learning insufficient, trying fallback parser`)
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
        
        // Try real-time learning on fallback result too
        const fallbackLearningResult = await this.learningService.learnFromFailedParse(
          url,
          html,
          { title: fallbackResult.title, company: fallbackResult.company, location: fallbackResult.location }
        )
        
        if (fallbackLearningResult.improvements.length > 0) {
          console.log(`🎓 Fallback + learning improvements:`, fallbackLearningResult.improvements)
          if (fallbackLearningResult.title) fallbackResult.title = fallbackLearningResult.title
          if (fallbackLearningResult.company) fallbackResult.company = fallbackLearningResult.company
          if (fallbackLearningResult.location) fallbackResult.location = fallbackLearningResult.location
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

  /**
   * Check if agent validation should run based on confidence thresholds
   */
  private shouldRunAgentValidation(result: ParsedJob): boolean {
    return needsValidation({
      title: { confidence: result.metadata.confidence.title },
      company: { confidence: result.metadata.confidence.company },
      location: { confidence: result.metadata.confidence.location ?? 0.5 },
      description: result.description || ''
    });
  }

  /**
   * Run AI validation using WebLLM or server fallback
   */
  private async runAgentValidation(
    url: string, 
    html: string, 
    result: ParsedJob, 
    _parserName: string
  ): Promise<ParsedJob> {
    try {
      const htmlSnippet = this.validator.extractHtmlSnippet(url, html);
      const parserOutput = {
        title: result.title,
        company: result.company,
        location: result.location,
        description: result.description
      };

      let agentOutput: AgentOutput;

      // Try WebLLM first if WebGPU is supported
      const hasWebGPU = await isWebGPUSupported();
      
      if (hasWebGPU) {
        console.log('🔮 Using WebLLM for validation');
        try {
          agentOutput = await this.validator.validateWithWebLLM({
            url,
            htmlSnippet,
            parserOutput
          });
        } catch (webllmError) {
          console.warn('⚠️ WebLLM validation failed, trying server fallback:', webllmError instanceof Error ? webllmError.message : 'Unknown error');
          agentOutput = await this.tryServerFallback(url, htmlSnippet, parserOutput);
        }
      } else {
        console.log('🌐 Using server fallback for validation');
        agentOutput = await this.tryServerFallback(url, htmlSnippet, parserOutput);
      }

      // Apply agent improvements to result
      if (agentOutput.validated && agentOutput.fields) {
        console.log('✅ Agent validation completed, applying improvements');
        
        if (agentOutput.fields.title && agentOutput.fields.title.conf > result.metadata.confidence.title) {
          result.title = agentOutput.fields.title.value;
          result.metadata.confidence.title = agentOutput.fields.title.conf;
        }
        
        if (agentOutput.fields.company && agentOutput.fields.company.conf > result.metadata.confidence.company) {
          result.company = agentOutput.fields.company.value;
          result.metadata.confidence.company = agentOutput.fields.company.conf;
        }
        
        if (agentOutput.fields.location && agentOutput.fields.location.conf > (result.metadata.confidence.location ?? 0)) {
          result.location = agentOutput.fields.location.value;
          result.metadata.confidence.location = agentOutput.fields.location.conf;
        }

        // Update overall confidence
        result.metadata.confidence.overall = Math.max(
          result.metadata.confidence.overall,
          (result.metadata.confidence.title + result.metadata.confidence.company + (result.metadata.confidence.location ?? 0.5)) / 3
        );

        // Mark as agent-enhanced
        result.metadata.extractionMethod = ExtractionMethod.NLP_EXTRACTION;
        result.metadata.rawData = {
          ...result.metadata.rawData,
          agentValidated: true,
          agentNotes: agentOutput.notes,
          detailedAnalysis: agentOutput.analysis
        } as any;
      }

      // Post agent result to ingest API
      await this.postAgentResult({
        url,
        htmlSnippet,
        parserOutput,
        agent: hasWebGPU ? 'webllm' : 'server',
        out: agentOutput
      });

      return result;
    } catch (error) {
      console.error('❌ Agent validation failed:', error);
      return result; // Return original result if validation fails
    }
  }

  /**
   * Try server fallback for agent validation
   */
  private async tryServerFallback(
    url: string, 
    htmlSnippet: string, 
    parserOutput: any
  ): Promise<AgentOutput> {
    const fallbackEnabled = process.env.AGENT_USE_SERVER_FALLBACK === 'true' || 
                           process.env.NEXT_PUBLIC_AGENT_USE_SERVER_FALLBACK === 'true';

    if (!fallbackEnabled) {
      throw new Error('Server fallback is disabled');
    }

    const response = await fetch('/api/agent/fallback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        htmlSnippet,
        parserOutput
      })
    });

    if (!response.ok) {
      throw new Error(`Server fallback failed: ${response.status}`);
    }

    const data = await response.json();
    return data.out;
  }

  /**
   * Post agent result to ingest API
   */
  private async postAgentResult(payload: {
    url: string;
    htmlSnippet: string;
    parserOutput: any;
    agent: 'webllm' | 'server';
    out: AgentOutput;
  }): Promise<void> {
    try {
      const response = await fetch('/api/agent/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.warn('⚠️ Failed to post agent result to ingest API');
      } else {
        const result = await response.json();
        console.log('📝 Agent result posted to ingest API:', result.eventId);
      }
    } catch (error) {
      console.warn('⚠️ Failed to post agent result:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
}