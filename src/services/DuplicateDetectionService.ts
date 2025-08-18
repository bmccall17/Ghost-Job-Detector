// Duplicate Detection Service
// Identifies and manages duplicate job postings across different sources

interface JobPosting {
  id: string
  url: string
  title: string
  company: string
  location?: string
  normalizedKey: string
  sourceId: string
  createdAt: Date
}

interface DuplicateGroup {
  id: string
  jobs: JobPosting[]
  primaryJob: JobPosting // The "best" version to keep
  confidence: number
  detectionMethod: 'url_exact' | 'url_canonical' | 'content_similarity' | 'contextual_match'
  suggestedAction: 'merge' | 'review' | 'ignore'
}

export class DuplicateDetectionService {
  private static instance: DuplicateDetectionService

  private constructor() {}

  public static getInstance(): DuplicateDetectionService {
    if (!DuplicateDetectionService.instance) {
      DuplicateDetectionService.instance = new DuplicateDetectionService()
    }
    return DuplicateDetectionService.instance
  }

  /**
   * Detect duplicates for a new job posting
   */
  public async detectDuplicates(
    newJob: JobPosting,
    existingJobs: JobPosting[]
  ): Promise<DuplicateGroup[]> {
    const duplicateGroups: DuplicateGroup[] = []

    // 1. Exact URL match (highest confidence)
    const exactUrlMatches = existingJobs.filter(job => 
      this.normalizeUrl(job.url) === this.normalizeUrl(newJob.url)
    )

    if (exactUrlMatches.length > 0) {
      duplicateGroups.push({
        id: `url_exact_${Date.now()}`,
        jobs: [newJob, ...exactUrlMatches],
        primaryJob: this.selectPrimaryJob([newJob, ...exactUrlMatches]),
        confidence: 1.0,
        detectionMethod: 'url_exact',
        suggestedAction: 'merge'
      })
    }

    // 2. Canonical URL match (high confidence)
    const canonicalMatches = existingJobs.filter(job => 
      this.extractCanonicalUrl(job.url) === this.extractCanonicalUrl(newJob.url) &&
      !exactUrlMatches.includes(job)
    )

    if (canonicalMatches.length > 0) {
      duplicateGroups.push({
        id: `url_canonical_${Date.now()}`,
        jobs: [newJob, ...canonicalMatches],
        primaryJob: this.selectPrimaryJob([newJob, ...canonicalMatches]),
        confidence: 0.9,
        detectionMethod: 'url_canonical',
        suggestedAction: 'merge'
      })
    }

    // 3. Content similarity (medium-high confidence)
    const contentMatches = existingJobs.filter(job => 
      this.areContentSimilar(newJob, job) &&
      !exactUrlMatches.includes(job) &&
      !canonicalMatches.includes(job)
    )

    if (contentMatches.length > 0) {
      duplicateGroups.push({
        id: `content_similarity_${Date.now()}`,
        jobs: [newJob, ...contentMatches],
        primaryJob: this.selectPrimaryJob([newJob, ...contentMatches]),
        confidence: 0.85,
        detectionMethod: 'content_similarity',
        suggestedAction: 'review'
      })
    }

    // 4. Contextual matching for cross-platform jobs (medium confidence)
    const contextualMatches = existingJobs.filter(job => 
      this.areContextuallyRelated(newJob, job) &&
      !exactUrlMatches.includes(job) &&
      !canonicalMatches.includes(job) &&
      !contentMatches.includes(job)
    )

    if (contextualMatches.length > 0) {
      duplicateGroups.push({
        id: `contextual_match_${Date.now()}`,
        jobs: [newJob, ...contextualMatches],
        primaryJob: this.selectPrimaryJob([newJob, ...contextualMatches]),
        confidence: 0.75,
        detectionMethod: 'contextual_match',
        suggestedAction: 'review'
      })
    }

    return duplicateGroups
  }

  /**
   * Normalize URLs for comparison (remove tracking params, etc.)
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      
      // Remove tracking parameters
      const paramsToRemove = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
        'ref', 'referrer', 'source', 'campaign', 'fbclid', 'gclid',
        'si', 'igshid', 'feature', 'app', 'platform'
      ]
      
      paramsToRemove.forEach(param => urlObj.searchParams.delete(param))
      
      // Normalize path (remove trailing slashes, convert to lowercase)
      urlObj.pathname = urlObj.pathname.toLowerCase().replace(/\/+$/, '') || '/'
      
      return urlObj.toString()
    } catch {
      return url.toLowerCase().trim()
    }
  }

  /**
   * Extract canonical job URL (remove job-specific IDs but keep company/position info)
   */
  private extractCanonicalUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.toLowerCase()
      
      // LinkedIn: remove job ID but keep basic structure
      if (hostname.includes('linkedin.com')) {
        const pathParts = urlObj.pathname.split('/').filter(p => p)
        if (pathParts[0] === 'jobs' && pathParts[1] === 'view') {
          return `${urlObj.protocol}//${hostname}/jobs/view/`
        }
      }
      
      // Greenhouse: keep company but remove job ID
      if (hostname.includes('greenhouse.io')) {
        const pathParts = urlObj.pathname.split('/').filter(p => p)
        if (pathParts.length >= 2) {
          return `${urlObj.protocol}//${hostname}/${pathParts[0]}/`
        }
      }
      
      // Indeed: normalize to basic search structure
      if (hostname.includes('indeed.com')) {
        return `${urlObj.protocol}//${hostname}/viewjob`
      }
      
      // For other sites, use domain + first path segment
      const pathParts = urlObj.pathname.split('/').filter(p => p)
      const basePath = pathParts.length > 0 ? `/${pathParts[0]}` : ''
      return `${urlObj.protocol}//${hostname}${basePath}`
      
    } catch {
      return this.normalizeUrl(url)
    }
  }

  /**
   * Check if two jobs have similar content (title + company + location)
   */
  private areContentSimilar(job1: JobPosting, job2: JobPosting): boolean {
    // Company similarity (high weight)
    const companySimilarity = this.calculateStringSimilarity(
      this.normalizeCompanyName(job1.company),
      this.normalizeCompanyName(job2.company)
    )
    
    if (companySimilarity < 0.8) return false // Companies must be very similar
    
    // Title similarity (medium weight)
    const titleSimilarity = this.calculateStringSimilarity(
      this.normalizeJobTitle(job1.title),
      this.normalizeJobTitle(job2.title)
    )
    
    if (titleSimilarity < 0.7) return false // Titles must be fairly similar
    
    // Location similarity (lower weight, optional)
    let locationSimilarity = 1.0
    if (job1.location && job2.location) {
      locationSimilarity = this.calculateStringSimilarity(
        this.normalizeLocation(job1.location),
        this.normalizeLocation(job2.location)
      )
    }
    
    // Weighted score
    const overallSimilarity = 
      (companySimilarity * 0.4) + 
      (titleSimilarity * 0.4) + 
      (locationSimilarity * 0.2)
    
    return overallSimilarity >= 0.8
  }

  /**
   * Check if two jobs are contextually related (like LinkedIn + Greenhouse same job)
   */
  private areContextuallyRelated(job1: JobPosting, job2: JobPosting): boolean {
    // Different platforms but same company and similar title
    const isDifferentPlatform = this.getDomain(job1.url) !== this.getDomain(job2.url)
    
    if (!isDifferentPlatform) return false
    
    const companySimilarity = this.calculateStringSimilarity(
      this.normalizeCompanyName(job1.company),
      this.normalizeCompanyName(job2.company)
    )
    
    const titleSimilarity = this.calculateStringSimilarity(
      this.normalizeJobTitle(job1.title),
      this.normalizeJobTitle(job2.title)
    )
    
    // For cross-platform detection, we need high company similarity and decent title similarity
    return companySimilarity >= 0.9 && titleSimilarity >= 0.6
  }

  /**
   * Select the "primary" job from a group of duplicates
   */
  private selectPrimaryJob(jobs: JobPosting[]): JobPosting {
    // Scoring criteria:
    // 1. Prefer jobs from official company sites
    // 2. Prefer more recent postings
    // 3. Prefer more complete data (non-"Unknown" values)
    // 4. Prefer certain platforms (LinkedIn > Company Sites > Job Boards)
    
    return jobs.reduce((best, current) => {
      let bestScore = this.calculateJobQualityScore(best)
      let currentScore = this.calculateJobQualityScore(current)
      
      return currentScore > bestScore ? current : best
    })
  }

  /**
   * Calculate a quality score for job selection
   */
  private calculateJobQualityScore(job: JobPosting): number {
    let score = 0
    
    // Platform preference
    const domain = this.getDomain(job.url)
    if (domain.includes('linkedin.com')) score += 30
    else if (domain.includes('careers.') || domain.includes('jobs.')) score += 25
    else if (domain.includes('greenhouse.io')) score += 20
    else if (domain.includes('indeed.com')) score += 15
    else score += 10
    
    // Data completeness
    if (job.title && job.title !== 'Unknown Position' && job.title.length > 3) score += 20
    if (job.company && job.company !== 'Unknown Company' && job.company.length > 2) score += 20
    if (job.location && job.location.length > 2) score += 10
    
    // Recency (newer is better)
    const ageInDays = (Date.now() - job.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    score += Math.max(0, 20 - ageInDays) // Up to 20 points for very recent jobs
    
    return score
  }

  /**
   * Calculate string similarity using basic algorithm
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0
    
    const longer = str1.length > str2.length ? str1 : str2
    
    if (longer.length === 0) return 1.0
    
    const distance = this.calculateLevenshteinDistance(str1, str2)
    return (longer.length - distance) / longer.length
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        )
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  /**
   * Normalize company name for comparison
   */
  private normalizeCompanyName(company: string): string {
    return company
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\b(inc|corp|corporation|company|ltd|llc|co)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Normalize job title for comparison
   */
  private normalizeJobTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\b(sr|senior|jr|junior|lead|principal|staff|i|ii|iii|iv|v)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Normalize location for comparison
   */
  private normalizeLocation(location: string): string {
    return location
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\b(remote|hybrid|onsite|usa|us|united states)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Extract domain from URL
   */
  private getDomain(url: string): string {
    try {
      return new URL(url).hostname.toLowerCase()
    } catch {
      return ''
    }
  }

  /**
   * Mark duplicate group for joining/merging
   */
  public async joinDuplicates(duplicateGroup: DuplicateGroup): Promise<void> {
    console.log(`🔗 Joining duplicate group: ${duplicateGroup.id}`)
    console.log(`   Primary job: ${duplicateGroup.primaryJob.title} at ${duplicateGroup.primaryJob.company}`)
    console.log(`   ${duplicateGroup.jobs.length} total duplicates found`)
    console.log(`   Detection method: ${duplicateGroup.detectionMethod}`)
    console.log(`   Confidence: ${(duplicateGroup.confidence * 100).toFixed(1)}%`)
    
    // TODO: Implement actual database operations to:
    // 1. Update all job records to reference the primary job
    // 2. Mark secondary jobs as duplicates
    // 3. Preserve analysis history from all sources
    // 4. Update normalized keys and search indexes
  }
}

// Export helper function for external use
export const detectJobDuplicates = async (
  newJob: JobPosting,
  existingJobs: JobPosting[]
): Promise<DuplicateGroup[]> => {
  const service = DuplicateDetectionService.getInstance()
  return service.detectDuplicates(newJob, existingJobs)
}