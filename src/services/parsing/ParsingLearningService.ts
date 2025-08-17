// Parsing Learning Service - Machine Learning for Parser Improvements
// Collects corrections and applies learned patterns to improve parsing accuracy

interface ParsingCorrection {
  sourceUrl: string
  originalTitle?: string
  correctTitle?: string
  originalCompany?: string
  correctCompany?: string
  parserUsed: string
  parserVersion: string
  correctionReason?: string
  confidence?: number
  correctedBy?: string
}

interface LearnedPattern {
  pattern: string
  replacement: string
  confidence: number
  usage_count: number
  domain?: string
  parser?: string
}

export class ParsingLearningService {
  private static instance: ParsingLearningService
  private learnedPatterns: Map<string, LearnedPattern[]> = new Map()
  private corrections: ParsingCorrection[] = []

  private constructor() {
    this.loadLearnedPatterns()
  }

  public static getInstance(): ParsingLearningService {
    if (!ParsingLearningService.instance) {
      ParsingLearningService.instance = new ParsingLearningService()
    }
    return ParsingLearningService.instance
  }

  /**
   * Record a parsing correction for learning
   */
  public async recordCorrection(correction: ParsingCorrection): Promise<void> {
    try {
      // In a real implementation, this would save to the database
      // For now, we'll store in memory and console log
      console.log('📚 Recording parsing correction:', {
        url: correction.sourceUrl,
        titleCorrection: correction.originalTitle !== correction.correctTitle,
        companyCorrection: correction.originalCompany !== correction.correctCompany,
        parser: correction.parserUsed
      })

      this.corrections.push(correction)
      
      // Extract learnable patterns
      this.extractPatternsFromCorrection(correction)
      
      // TODO: Save to database when connected
      // await this.saveToDatabase(correction)
      
    } catch (error) {
      console.error('Failed to record parsing correction:', error)
    }
  }

  /**
   * Get learned corrections for a URL to improve parsing
   */
  public getLearnedCorrectionsForUrl(url: string): { 
    titleCorrections: LearnedPattern[], 
    companyCorrections: LearnedPattern[] 
  } {
    const domain = this.extractDomain(url)
    
    const titleCorrections = this.learnedPatterns.get('title') || []
    const companyCorrections = this.learnedPatterns.get('company') || []
    
    return {
      titleCorrections: titleCorrections.filter(p => 
        !p.domain || p.domain === domain
      ),
      companyCorrections: companyCorrections.filter(p => 
        !p.domain || p.domain === domain
      )
    }
  }

  /**
   * Apply learned patterns to improve parsing results
   */
  public applyLearnedPatterns(
    result: { title: string, company: string }, 
    url: string, 
    _parserName: string
  ): { title: string, company: string, improvements: string[] } {
    const improvements: string[] = []
    let { title, company } = result
    
    const learned = this.getLearnedCorrectionsForUrl(url)
    
    // Apply title corrections
    for (const pattern of learned.titleCorrections) {
      if (pattern.confidence > 0.7) {
        const regex = new RegExp(pattern.pattern, 'gi')
        if (regex.test(title)) {
          const oldTitle = title
          title = title.replace(regex, pattern.replacement)
          improvements.push(`Title improved: "${oldTitle}" → "${title}"`)
        }
      }
    }
    
    // Apply company corrections
    for (const pattern of learned.companyCorrections) {
      if (pattern.confidence > 0.7) {
        const regex = new RegExp(pattern.pattern, 'gi')
        if (regex.test(company)) {
          const oldCompany = company
          company = company.replace(regex, pattern.replacement)
          improvements.push(`Company improved: "${oldCompany}" → "${company}"`)
        }
      }
    }
    
    return { title, company, improvements }
  }

  /**
   * Pre-populate known corrections for immediate improvements
   */
  public async initializeKnownCorrections(): Promise<void> {
    console.log('🎓 Initializing known parsing corrections...')
    
    // Known LinkedIn parsing issues
    await this.recordCorrection({
      sourceUrl: 'https://linkedin.com/jobs/view/ANY',
      originalCompany: 'LinkedIn',
      correctCompany: 'EXTRACT_FROM_CONTENT',
      parserUsed: 'LinkedInParser',
      parserVersion: '2.0.0',
      correctionReason: 'LinkedIn parser should extract hiring company, not LinkedIn',
      confidence: 0.9,
      correctedBy: 'system_initialization'
    })

    await this.recordCorrection({
      sourceUrl: 'https://linkedin.com/jobs/view/ANY',
      originalTitle: 'LinkedIn Position',
      correctTitle: 'EXTRACT_FROM_CONTENT',
      parserUsed: 'LinkedInParser',
      parserVersion: '2.0.0',
      correctionReason: 'LinkedIn parser should extract actual job title',
      confidence: 0.9,
      correctedBy: 'system_initialization'
    })

    // Known Deloitte parsing issues
    await this.recordCorrection({
      sourceUrl: 'https://apply.deloitte.com/en_US/careers/JobDetail/Epic-ODBA-Specialist-Leader/309308',
      originalCompany: '- 309308',
      correctCompany: 'Deloitte',
      parserUsed: 'CompanyCareerParser',
      parserVersion: '2.0.0',
      correctionReason: 'Should extract company from domain for Deloitte',
      confidence: 1.0,
      correctedBy: 'system_initialization'
    })

    console.log(`✅ Initialized ${this.corrections.length} known corrections`)
  }

  /**
   * Extract learnable patterns from a correction
   */
  private extractPatternsFromCorrection(correction: ParsingCorrection): void {
    const domain = this.extractDomain(correction.sourceUrl)
    
    // Company name patterns
    if (correction.originalCompany && correction.correctCompany) {
      this.addPattern('company', {
        pattern: this.escapeRegex(correction.originalCompany),
        replacement: correction.correctCompany,
        confidence: correction.confidence || 0.8,
        usage_count: 1,
        domain,
        parser: correction.parserUsed
      })
    }
    
    // Title patterns
    if (correction.originalTitle && correction.correctTitle) {
      this.addPattern('title', {
        pattern: this.escapeRegex(correction.originalTitle),
        replacement: correction.correctTitle,
        confidence: correction.confidence || 0.8,
        usage_count: 1,
        domain,
        parser: correction.parserUsed
      })
    }
  }

  private addPattern(type: 'title' | 'company', pattern: LearnedPattern): void {
    if (!this.learnedPatterns.has(type)) {
      this.learnedPatterns.set(type, [])
    }
    
    const patterns = this.learnedPatterns.get(type)!
    
    // Check if pattern already exists
    const existing = patterns.find(p => p.pattern === pattern.pattern && p.domain === pattern.domain)
    if (existing) {
      existing.usage_count += 1
      existing.confidence = Math.min(0.95, existing.confidence + 0.05) // Increase confidence
    } else {
      patterns.push(pattern)
    }
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.toLowerCase()
    } catch {
      return 'unknown'
    }
  }


  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  private loadLearnedPatterns(): void {
    // In production, this would load from database
    // For now, initialize empty patterns
    this.learnedPatterns.set('title', [])
    this.learnedPatterns.set('company', [])
  }

  /**
   * Get statistics about learning progress
   */
  public getLearningStats(): {
    totalCorrections: number
    titlePatterns: number
    companyPatterns: number
    topDomains: { domain: string, corrections: number }[]
  } {
    const domainCounts = new Map<string, number>()
    
    this.corrections.forEach(correction => {
      const domain = this.extractDomain(correction.sourceUrl)
      domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1)
    })
    
    const topDomains = Array.from(domainCounts.entries())
      .map(([domain, corrections]) => ({ domain, corrections }))
      .sort((a, b) => b.corrections - a.corrections)
      .slice(0, 5)
    
    return {
      totalCorrections: this.corrections.length,
      titlePatterns: this.learnedPatterns.get('title')?.length || 0,
      companyPatterns: this.learnedPatterns.get('company')?.length || 0,
      topDomains
    }
  }
}

// Initialize the learning service with known corrections
export const initializeParsingLearning = async (): Promise<void> => {
  const learningService = ParsingLearningService.getInstance()
  await learningService.initializeKnownCorrections()
}

// Helper function to record a correction from the API
export const recordParsingCorrection = async (correction: ParsingCorrection): Promise<void> => {
  const learningService = ParsingLearningService.getInstance()
  await learningService.recordCorrection(correction)
}