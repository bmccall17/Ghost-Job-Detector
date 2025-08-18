// Correction Service - Handles manual job listing corrections with learning integration

import { ParserRegistry } from './parsing/ParserRegistry'

interface JobCorrection {
  jobId: string
  originalData: {
    title: string
    company: string
    location?: string
    postedAt?: string
    platform?: string
  }
  correctedData: {
    title: string
    company: string
    location?: string
    postedAt?: string
    platform?: string
  }
  userVerified: boolean
  algorithmVerified: boolean
  learningWeight: number
  correctionReason?: string
  forceCommit?: boolean
}

interface ValidationResult {
  verified: boolean
  confidence: number
  algorithmData?: any
  discrepancies?: string[]
  reasons?: string[]
}

export class CorrectionService {
  private static instance: CorrectionService
  private parserRegistry: ParserRegistry

  private constructor() {
    this.parserRegistry = ParserRegistry.getInstance()
  }

  public static getInstance(): CorrectionService {
    if (!CorrectionService.instance) {
      CorrectionService.instance = new CorrectionService()
    }
    return CorrectionService.instance
  }

  /**
   * Validate user corrections by re-scraping and comparing with algorithm
   */
  public async validateCorrections(
    jobUrl: string,
    userCorrections: Partial<JobCorrection['correctedData']>,
    originalData: JobCorrection['originalData']
  ): Promise<ValidationResult> {
    try {
      console.log(`🔍 Validating corrections for: ${jobUrl}`)
      
      // Re-scrape the job posting
      const freshData = await this.reScrapeJob(jobUrl)
      
      if (!freshData) {
        return {
          verified: false,
          confidence: 0.1,
          discrepancies: ['Unable to re-scrape job posting'],
          reasons: ['Network error or job posting no longer available']
        }
      }

      // Compare user corrections with fresh algorithm results
      const comparison = this.compareData(userCorrections, freshData, originalData)
      
      return {
        verified: comparison.verified,
        confidence: comparison.confidence,
        algorithmData: freshData,
        discrepancies: comparison.discrepancies,
        reasons: comparison.reasons
      }
      
    } catch (error) {
      console.error('Validation failed:', error)
      return {
        verified: false,
        confidence: 0.0,
        discrepancies: ['Validation process failed'],
        reasons: ['Technical error during validation']
      }
    }
  }

  /**
   * Save corrections and update learning system
   */
  public async saveCorrections(correction: JobCorrection): Promise<void> {
    try {
      console.log(`💾 Saving corrections for job: ${correction.jobId}`)
      
      // Determine learning weight based on verification status
      const learningWeight = this.calculateLearningWeight(correction)
      
      // Record correction for learning system
      await this.recordCorrectionForLearning({
        sourceUrl: this.getJobUrl(correction.jobId),
        originalTitle: correction.originalData.title,
        correctTitle: correction.correctedData.title,
        originalCompany: correction.originalData.company,
        correctCompany: correction.correctedData.company,
        parserUsed: correction.originalData.platform || 'Unknown',
        parserVersion: '2.0.0',
        correctionReason: correction.correctionReason || 'Manual user correction',
        confidence: learningWeight,
        correctedBy: correction.forceCommit ? 'manual_override' : 'user_correction'
      })

      // Update job record in database
      await this.updateJobRecord(correction)
      
      // Add correction to history
      await this.saveCorrectionHistory(correction, learningWeight)
      
      console.log(`✅ Corrections saved with learning weight: ${learningWeight}`)
      
    } catch (error) {
      console.error('Failed to save corrections:', error)
      throw new Error('Failed to save corrections')
    }
  }

  /**
   * Re-scrape job posting to get fresh algorithm results
   */
  private async reScrapeJob(jobUrl: string): Promise<any> {
    try {
      // Simulate re-scraping by fetching HTML and parsing
      const html = await this.fetchJobHTML(jobUrl)
      if (!html) return null

      const parsedResult = await this.parserRegistry.parseJob(jobUrl, html)
      
      return {
        title: parsedResult.title,
        company: parsedResult.company,
        location: parsedResult.location,
        confidence: parsedResult.metadata.confidence,
        extractionMethod: parsedResult.metadata.extractionMethod
      }
      
    } catch (error) {
      console.error('Re-scraping failed:', error)
      return null
    }
  }

  /**
   * Compare user corrections with fresh algorithm data
   */
  private compareData(
    userCorrections: Partial<JobCorrection['correctedData']>,
    algorithmData: any,
    originalData: JobCorrection['originalData']
  ): { verified: boolean, confidence: number, discrepancies: string[], reasons: string[] } {
    const discrepancies: string[] = []
    const reasons: string[] = []
    let agreementScore = 0
    let totalComparisons = 0

    // Compare title
    if (userCorrections.title && algorithmData.title) {
      totalComparisons++
      const titleSimilarity = this.calculateSimilarity(userCorrections.title, algorithmData.title)
      if (titleSimilarity > 0.8) {
        agreementScore++
        reasons.push(`Title matches algorithm result (${Math.round(titleSimilarity * 100)}% similarity)`)
      } else {
        discrepancies.push(`Title differs: User="${userCorrections.title}" vs Algorithm="${algorithmData.title}"`)
      }
    }

    // Compare company
    if (userCorrections.company && algorithmData.company) {
      totalComparisons++
      const companySimilarity = this.calculateSimilarity(userCorrections.company, algorithmData.company)
      if (companySimilarity > 0.8) {
        agreementScore++
        reasons.push(`Company matches algorithm result (${Math.round(companySimilarity * 100)}% similarity)`)
      } else {
        discrepancies.push(`Company differs: User="${userCorrections.company}" vs Algorithm="${algorithmData.company}"`)
      }
    }

    // Check if this is an improvement over original data
    if (userCorrections.title && originalData.title === 'Unknown Position') {
      agreementScore += 0.5
      reasons.push('Title improvement: User provided specific title for "Unknown Position"')
    }

    if (userCorrections.company && originalData.company === 'Unknown Company') {
      agreementScore += 0.5
      reasons.push('Company improvement: User provided specific company for "Unknown Company"')
    }

    const confidence = totalComparisons > 0 ? agreementScore / totalComparisons : 0.5
    const verified = confidence >= 0.8

    return {
      verified,
      confidence: Math.max(0.1, Math.min(1.0, confidence)),
      discrepancies,
      reasons
    }
  }

  /**
   * Calculate learning weight based on verification status
   */
  private calculateLearningWeight(correction: JobCorrection): number {
    if (correction.algorithmVerified && correction.userVerified) {
      return 1.0 // High weight - both algorithm and user agree
    }
    if (correction.forceCommit && correction.userVerified) {
      return 0.6 // Medium weight - user force committed
    }
    if (correction.userVerified) {
      return 0.8 // High weight - user verified without algorithm disagreement
    }
    return 0.3 // Low weight - uncertain/conflicting data
  }

  /**
   * Record correction for the learning system
   */
  private async recordCorrectionForLearning(correctionData: any): Promise<void> {
    try {
      await this.parserRegistry.recordCorrection(correctionData)
    } catch (error) {
      console.error('Failed to record correction for learning:', error)
    }
  }

  /**
   * Calculate string similarity (simple version)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0
    
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
    const norm1 = normalize(str1)
    const norm2 = normalize(str2)
    
    if (norm1 === norm2) return 0.95
    
    // Simple word overlap similarity
    const words1 = norm1.split(/\s+/)
    const words2 = norm2.split(/\s+/)
    
    const commonWords = words1.filter(word => 
      words2.some(w2 => w2.includes(word) || word.includes(w2))
    )
    
    return commonWords.length / Math.max(words1.length, words2.length)
  }

  /**
   * Fetch job HTML (mock implementation)
   */
  private async fetchJobHTML(jobUrl: string): Promise<string | null> {
    try {
      // In production, this would use a CORS proxy or backend service
      console.log(`📡 Fetching HTML for: ${jobUrl}`)
      
      // Mock HTML response for demonstration
      return `<html><head><title>Mock Job Title | Company Name</title></head><body>Job content...</body></html>`
      
    } catch (error) {
      console.error('HTML fetch failed:', error)
      return null
    }
  }

  /**
   * Get job URL from job ID (mock implementation)
   */
  private getJobUrl(jobId: string): string {
    // In production, this would query the database
    return `https://example.com/job/${jobId}`
  }

  /**
   * Update job record in database (mock implementation)
   */
  private async updateJobRecord(correction: JobCorrection): Promise<void> {
    console.log(`🔄 Updating job record for: ${correction.jobId}`)
    // TODO: Implement actual database update
    // await prisma.jobListing.update({
    //   where: { id: correction.jobId },
    //   data: correction.correctedData
    // })
  }

  /**
   * Save correction to history table (mock implementation)
   */
  private async saveCorrectionHistory(correction: JobCorrection, _learningWeight: number): Promise<void> {
    console.log(`📝 Saving correction history for: ${correction.jobId}`)
    // TODO: Implement actual database save
    // await prisma.correction.create({
    //   data: {
    //     jobId: correction.jobId,
    //     originalData: correction.originalData,
    //     correctedData: correction.correctedData,
    //     userVerified: correction.userVerified,
    //     algorithmVerified: correction.algorithmVerified,
    //     learningWeight,
    //     correctionDate: new Date()
    //   }
    // })
  }

  /**
   * Get correction statistics
   */
  public getCorrectionStats(): {
    totalCorrections: number
    verifiedCorrections: number
    forceCommittedCorrections: number
    averageLearningWeight: number
  } {
    // Mock statistics - in production this would query the database
    return {
      totalCorrections: 23,
      verifiedCorrections: 18,
      forceCommittedCorrections: 5,
      averageLearningWeight: 0.78
    }
  }
}

// Export helper functions for external use
export const validateJobCorrections = async (
  jobUrl: string,
  userCorrections: any,
  originalData: any
): Promise<ValidationResult> => {
  const service = CorrectionService.getInstance()
  return service.validateCorrections(jobUrl, userCorrections, originalData)
}

export const saveJobCorrections = async (correction: JobCorrection): Promise<void> => {
  const service = CorrectionService.getInstance()
  return service.saveCorrections(correction)
}