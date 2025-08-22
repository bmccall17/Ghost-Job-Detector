/**
 * Enhanced Duplicate Detection Service
 * Implements content hash comparison and fuzzy matching for improved duplicate detection
 * Following Implementation Guide specifications
 */
import { ExtractedJobData } from './WebLLMParsingService';
import { CompanyNormalizationService } from './CompanyNormalizationService';
import crypto from 'crypto';

// Type definitions
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchedJobId?: string;
  matchingScore: number;
  matchingFactors: string[];
  contentHash: string;
  existingHash?: string;
  recommendedAction: 'create_new' | 'update_existing' | 'user_confirm';
}

export interface ContentHashResult {
  fullHash: string;          // Hash of all content
  titleHash: string;         // Hash of just title
  companyHash: string;       // Hash of normalized company
  locationHash: string;      // Hash of normalized location
  descriptionHash: string;   // Hash of description (first 500 chars)
  combinedHash: string;      // Hash of title + company + location
}

export interface FuzzyMatchResult {
  score: number;            // 0-1 similarity score
  titleSimilarity: number;  // Title similarity
  companySimilarity: number; // Company similarity
  locationSimilarity: number; // Location similarity
  contentSimilarity: number;  // Description similarity
  factors: string[];        // Matching factors found
}

export interface ExistingJob {
  id: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
  canonicalUrl: string;
  contentHashes: ContentHashResult;
  postedAt?: Date;
  createdAt: Date;
}

export class EnhancedDuplicateDetection {
  private companyNormalizer: CompanyNormalizationService;
  private exactMatchThreshold = 0.95;
  private highSimilarityThreshold = 0.85;
  private moderateSimilarityThreshold = 0.70;

  constructor() {
    this.companyNormalizer = CompanyNormalizationService.getInstance();
  }

  /**
   * Main duplicate detection method
   */
  public async checkForDuplicates(
    newJobData: ExtractedJobData,
    existingJobs: ExistingJob[]
  ): Promise<DuplicateCheckResult> {
    try {
      console.log(`🔍 Checking for duplicates among ${existingJobs.length} existing jobs`);

      // Generate content hashes for new job
      const newHashes = this.generateContentHashes(newJobData);

      // First, check for exact hash matches (fastest)
      const exactMatch = this.findExactHashMatch(newHashes, existingJobs);
      if (exactMatch) {
        return {
          isDuplicate: true,
          matchedJobId: exactMatch.id,
          matchingScore: 1.0,
          matchingFactors: ['Exact content hash match'],
          contentHash: newHashes.fullHash,
          existingHash: exactMatch.contentHashes.fullHash,
          recommendedAction: 'update_existing'
        };
      }

      // Check for partial hash matches
      const partialMatch = this.findPartialHashMatch(newHashes, existingJobs);
      if (partialMatch && partialMatch.score > this.exactMatchThreshold) {
        return {
          isDuplicate: true,
          matchedJobId: partialMatch.job.id,
          matchingScore: partialMatch.score,
          matchingFactors: partialMatch.factors,
          contentHash: newHashes.fullHash,
          existingHash: partialMatch.job.contentHashes.fullHash,
          recommendedAction: 'update_existing'
        };
      }

      // Perform fuzzy matching for similar jobs
      let bestMatch: { job: ExistingJob; fuzzyResult: FuzzyMatchResult } | null = null;
      let highestScore = 0;

      for (const existingJob of existingJobs) {
        const fuzzyResult = this.calculateFuzzyMatch(newJobData, existingJob);
        
        if (fuzzyResult.score > highestScore) {
          highestScore = fuzzyResult.score;
          bestMatch = { job: existingJob, fuzzyResult };
        }
      }

      // Determine result based on similarity score
      if (bestMatch && highestScore > this.highSimilarityThreshold) {
        return {
          isDuplicate: true,
          matchedJobId: bestMatch.job.id,
          matchingScore: highestScore,
          matchingFactors: bestMatch.fuzzyResult.factors,
          contentHash: newHashes.fullHash,
          recommendedAction: highestScore > this.exactMatchThreshold ? 'update_existing' : 'user_confirm'
        };
      }

      if (bestMatch && highestScore > this.moderateSimilarityThreshold) {
        return {
          isDuplicate: false, // Not duplicate, but similar
          matchedJobId: bestMatch.job.id,
          matchingScore: highestScore,
          matchingFactors: [`Moderate similarity (${Math.round(highestScore * 100)}%)`],
          contentHash: newHashes.fullHash,
          recommendedAction: 'user_confirm'
        };
      }

      // No duplicates found
      return {
        isDuplicate: false,
        matchingScore: bestMatch ? highestScore : 0,
        matchingFactors: [],
        contentHash: newHashes.fullHash,
        recommendedAction: 'create_new'
      };

    } catch (error) {
      console.error('❌ Duplicate detection failed:', error);
      
      // Return safe result on error
      return {
        isDuplicate: false,
        matchingScore: 0,
        matchingFactors: ['Error during duplicate detection'],
        contentHash: this.generateContentHashes(newJobData).fullHash,
        recommendedAction: 'create_new'
      };
    }
  }

  /**
   * Generate comprehensive content hashes
   */
  public generateContentHashes(jobData: ExtractedJobData): ContentHashResult {
    // Normalize data for hashing
    const normalizedTitle = this.normalizeForHashing(jobData.title || '');
    const normalizedCompany = this.normalizeForHashing(jobData.company || '');
    const normalizedLocation = this.normalizeForHashing(jobData.location || '');
    const normalizedDescription = this.normalizeForHashing(
      (jobData.description || '').substring(0, 500)
    );

    // Generate individual hashes
    const titleHash = this.createHash(normalizedTitle);
    const companyHash = this.createHash(normalizedCompany);
    const locationHash = this.createHash(normalizedLocation);
    const descriptionHash = this.createHash(normalizedDescription);

    // Generate combined hashes
    const combinedHash = this.createHash(
      normalizedTitle + '|' + normalizedCompany + '|' + normalizedLocation
    );

    const fullHash = this.createHash(
      normalizedTitle + '|' + normalizedCompany + '|' + 
      normalizedLocation + '|' + normalizedDescription + '|' + 
      (jobData.originalSource || '')
    );

    return {
      fullHash,
      titleHash,
      companyHash,
      locationHash,
      descriptionHash,
      combinedHash
    };
  }

  /**
   * Calculate fuzzy matching score between jobs
   */
  public calculateFuzzyMatch(newJob: ExtractedJobData, existingJob: ExistingJob): FuzzyMatchResult {
    const factors: string[] = [];
    let totalWeight = 0;
    let weightedScore = 0;

    // Title similarity (30% weight)
    const titleWeight = 0.30;
    const titleSimilarity = this.calculateStringSimilarity(
      newJob.title || '', 
      existingJob.title
    );
    weightedScore += titleSimilarity * titleWeight;
    totalWeight += titleWeight;
    
    if (titleSimilarity > 0.8) {
      factors.push(`High title similarity (${Math.round(titleSimilarity * 100)}%)`);
    }

    // Company similarity (25% weight)
    const companyWeight = 0.25;
    const companySimilarity = this.calculateCompanySimilarity(
      newJob.company || '', 
      existingJob.company
    );
    weightedScore += companySimilarity * companyWeight;
    totalWeight += companyWeight;

    if (companySimilarity > 0.9) {
      factors.push('Same company (normalized)');
    } else if (companySimilarity > 0.7) {
      factors.push(`Similar company (${Math.round(companySimilarity * 100)}%)`);
    }

    // Location similarity (15% weight)
    const locationWeight = 0.15;
    const locationSimilarity = this.calculateLocationSimilarity(
      newJob.location || '', 
      existingJob.location || ''
    );
    weightedScore += locationSimilarity * locationWeight;
    totalWeight += locationWeight;

    if (locationSimilarity > 0.8) {
      factors.push('Same location');
    }

    // Content similarity (20% weight)
    const contentWeight = 0.20;
    const contentSimilarity = this.calculateStringSimilarity(
      (newJob.description || '').substring(0, 500),
      (existingJob.description || '').substring(0, 500)
    );
    weightedScore += contentSimilarity * contentWeight;
    totalWeight += contentWeight;

    if (contentSimilarity > 0.7) {
      factors.push(`Similar job description (${Math.round(contentSimilarity * 100)}%)`);
    }

    // Time proximity bonus (10% weight)
    const timeWeight = 0.10;
    const timeSimilarity = this.calculateTimeProximity(newJob.postedAt, existingJob.postedAt);
    weightedScore += timeSimilarity * timeWeight;
    totalWeight += timeWeight;

    if (timeSimilarity > 0.8) {
      factors.push('Posted around same time');
    }

    const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

    return {
      score: Math.min(finalScore, 1.0),
      titleSimilarity,
      companySimilarity,
      locationSimilarity,
      contentSimilarity,
      factors
    };
  }

  /**
   * Check if content should be considered duplicate based on business rules
   */
  public isDuplicateByBusinessRules(
    newJob: ExtractedJobData, 
    existingJob: ExistingJob
  ): boolean {
    // Exact title and company match = duplicate
    const normalizedNewTitle = this.normalizeForHashing(newJob.title || '');
    const normalizedExistingTitle = this.normalizeForHashing(existingJob.title);
    
    const normalizedNewCompany = this.normalizeCompanyName(newJob.company || '');
    const normalizedExistingCompany = this.normalizeCompanyName(existingJob.company);

    if (normalizedNewTitle === normalizedExistingTitle && 
        normalizedNewCompany === normalizedExistingCompany) {
      return true;
    }

    // Same URL = duplicate (different platforms can have same URL)
    if (newJob.originalSource === existingJob.canonicalUrl) {
      return true;
    }

    // Job ID match on same platform
    if (newJob.jobId && existingJob.id && 
        newJob.jobId === existingJob.id &&
        this.extractPlatform(newJob.originalSource) === this.extractPlatform(existingJob.canonicalUrl)) {
      return true;
    }

    return false;
  }

  /**
   * Private helper methods
   */
  private findExactHashMatch(newHashes: ContentHashResult, existingJobs: ExistingJob[]): ExistingJob | null {
    return existingJobs.find(job => 
      job.contentHashes.fullHash === newHashes.fullHash ||
      job.contentHashes.combinedHash === newHashes.combinedHash
    ) || null;
  }

  private findPartialHashMatch(
    newHashes: ContentHashResult, 
    existingJobs: ExistingJob[]
  ): { job: ExistingJob; score: number; factors: string[] } | null {
    let bestMatch: { job: ExistingJob; score: number; factors: string[] } | null = null;
    let highestScore = 0;

    for (const job of existingJobs) {
      const factors: string[] = [];
      let matchCount = 0;
      let totalChecks = 0;

      // Check individual hash matches
      if (job.contentHashes.titleHash === newHashes.titleHash) {
        factors.push('Identical title');
        matchCount++;
      }
      totalChecks++;

      if (job.contentHashes.companyHash === newHashes.companyHash) {
        factors.push('Identical company');
        matchCount++;
      }
      totalChecks++;

      if (job.contentHashes.descriptionHash === newHashes.descriptionHash) {
        factors.push('Identical description');
        matchCount++;
      }
      totalChecks++;

      const score = matchCount / totalChecks;
      
      if (score > highestScore && factors.length >= 2) {
        highestScore = score;
        bestMatch = { job, score, factors };
      }
    }

    return bestMatch;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1.0;
    
    // Use Levenshtein distance
    return this.levenshteinSimilarity(s1, s2);
  }

  private calculateCompanySimilarity(company1: string, company2: string): number {
    if (!company1 || !company2) return 0;

    // Use company normalization service for intelligent comparison
    const norm1 = this.companyNormalizer.normalizeCompanyName(company1);
    const norm2 = this.companyNormalizer.normalizeCompanyName(company2);

    // Check if they normalize to the same canonical name
    if (norm1.canonical === norm2.canonical) {
      return 1.0;
    }

    // Fallback to string similarity
    return this.calculateStringSimilarity(company1, company2);
  }

  private calculateLocationSimilarity(location1: string, location2: string): number {
    if (!location1 && !location2) return 1.0; // Both empty
    if (!location1 || !location2) return 0.3; // One empty
    
    const loc1 = location1.toLowerCase().trim();
    const loc2 = location2.toLowerCase().trim();
    
    if (loc1 === loc2) return 1.0;
    
    // Check for common location patterns
    if (loc1.includes('remote') && loc2.includes('remote')) return 0.9;
    if (loc1.includes('hybrid') && loc2.includes('hybrid')) return 0.9;
    
    // Check for city/state matches
    const similarity = this.calculateStringSimilarity(loc1, loc2);
    return similarity;
  }

  private calculateTimeProximity(date1?: string | null, date2?: Date): number {
    if (!date1 || !date2) return 0.5; // No date information
    
    try {
      const d1 = new Date(date1);
      const d2 = date2;
      
      const daysDiff = Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24);
      
      // Jobs posted within 7 days get high similarity
      if (daysDiff <= 7) return 0.9;
      if (daysDiff <= 30) return 0.7;
      if (daysDiff <= 90) return 0.5;
      return 0.2;
      
    } catch (error) {
      return 0.5;
    }
  }

  private levenshteinSimilarity(str1: string, str2: string): number {
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Calculate distances
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const maxLength = Math.max(len1, len2);
    const distance = matrix[len1][len2];
    return 1 - (distance / maxLength);
  }

  private normalizeForHashing(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')              // Normalize whitespace
      .replace(/[^\w\s]/g, '')           // Remove special characters
      .replace(/\b(the|and|or|of|in|at|to|for|with|by)\b/g, '') // Remove common words
      .trim();
  }

  private normalizeCompanyName(company: string): string {
    const result = this.companyNormalizer.normalizeCompanyName(company);
    return result.canonical;
  }

  private createHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private extractPlatform(url: string): string {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      if (hostname.includes('linkedin.com')) return 'linkedin';
      if (hostname.includes('indeed.com')) return 'indeed';
      if (hostname.includes('glassdoor.com')) return 'glassdoor';
      return 'other';
    } catch {
      return 'unknown';
    }
  }
}

// Factory function for easy usage
export function createDuplicateDetector(): EnhancedDuplicateDetection {
  return new EnhancedDuplicateDetection();
}