/**
 * Parsing Attempts Tracking Service
 * Tracks WebLLM parsing performance and errors for system improvement
 * Following Implementation Guide specifications
 */
import { prisma } from '../../lib/db.js';
import { ParsingResult } from './WebLLMParsingService';
import { CrossValidationResult } from './CrossValidationService';

// Type definitions
export interface ParsingAttemptLog {
  id: string;
  sourceUrl: string;
  attemptedAt: Date;
  successStatus: boolean;
  errorMessage?: string;
  processingTimeMs?: number;
  extractionMethod: string;
  confidenceScore?: number;
  validationData?: any;
  userAgentUsed?: string;
  ipAddress?: string;
}

export interface ParsingMetrics {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  averageProcessingTime: number;
  averageConfidence: number;
  commonErrors: Array<{ error: string; count: number }>;
  platformBreakdown: Array<{ platform: string; successRate: number }>;
  confidenceDistribution: {
    high: number;    // >0.8
    medium: number;  // 0.5-0.8
    low: number;     // <0.5
  };
}

export class ParsingAttemptsTracker {
  /**
   * Log a parsing attempt to the database
   */
  public async logParsingAttempt(
    sourceUrl: string,
    result: ParsingResult,
    validationResult?: CrossValidationResult,
    userAgent?: string,
    clientIp?: string
  ): Promise<string> {
    try {
      console.log(`📊 Logging parsing attempt for: ${sourceUrl}`);

      const attempt = await prisma.parsingAttempt.create({
        data: {
          sourceUrl,
          attemptedAt: new Date(),
          successStatus: result.success,
          errorMessage: result.errorMessage || null,
          processingTimeMs: result.processingTimeMs,
          extractionMethod: result.extractionMethod,
          confidenceScore: result.confidence,
          validationData: validationResult ? JSON.parse(JSON.stringify({
            overallConfidence: validationResult.overallConfidence,
            validationSources: validationResult.validationSources.length,
            companyValidation: validationResult.companyValidation.confidence,
            titleValidation: validationResult.titleValidation.confidence,
            consistencyScore: validationResult.consistencyScore,
            issues: validationResult.issues,
            processingTimeMs: validationResult.processingTimeMs
          })) : null,
          userAgentUsed: userAgent,
          ipAddress: this.hashIpAddress(clientIp)
        }
      });

      console.log(`✅ Parsing attempt logged with ID: ${attempt.id}`);
      return attempt.id;

    } catch (error) {
      console.error('❌ Failed to log parsing attempt:', error);
      throw new Error(`Failed to log parsing attempt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Log parsing failure with detailed error information
   */
  public async logParsingFailure(
    sourceUrl: string,
    errorMessage: string,
    processingTimeMs: number,
    extractionMethod: string = 'webllm',
    userAgent?: string,
    clientIp?: string
  ): Promise<string> {
    try {
      console.log(`🚨 Logging parsing failure for: ${sourceUrl}`);

      const attempt = await prisma.parsingAttempt.create({
        data: {
          sourceUrl,
          attemptedAt: new Date(),
          successStatus: false,
          errorMessage,
          processingTimeMs,
          extractionMethod,
          confidenceScore: 0,
          userAgentUsed: userAgent,
          ipAddress: this.hashIpAddress(clientIp),
          validationData: {
            errorType: this.categorizeError(errorMessage),
            failureReason: errorMessage,
            platform: this.extractPlatform(sourceUrl)
          }
        }
      });

      console.log(`✅ Parsing failure logged with ID: ${attempt.id}`);
      return attempt.id;

    } catch (error) {
      console.error('❌ Failed to log parsing failure:', error);
      throw new Error(`Failed to log parsing failure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get parsing metrics for monitoring dashboard
   */
  public async getParsingMetrics(
    fromDate?: Date,
    toDate?: Date,
    platform?: string
  ): Promise<ParsingMetrics> {
    try {
      const whereClause: any = {};
      
      if (fromDate || toDate) {
        whereClause.attemptedAt = {};
        if (fromDate) whereClause.attemptedAt.gte = fromDate;
        if (toDate) whereClause.attemptedAt.lte = toDate;
      }

      if (platform) {
        whereClause.sourceUrl = {
          contains: platform
        };
      }

      const attempts = await prisma.parsingAttempt.findMany({
        where: whereClause,
        orderBy: { attemptedAt: 'desc' }
      });

      return this.calculateMetrics(attempts);

    } catch (error) {
      console.error('❌ Failed to get parsing metrics:', error);
      throw new Error(`Failed to get parsing metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get recent parsing failures for debugging
   */
  public async getRecentFailures(limit: number = 50): Promise<ParsingAttemptLog[]> {
    try {
      const failures = await prisma.parsingAttempt.findMany({
        where: { successStatus: false },
        orderBy: { attemptedAt: 'desc' },
        take: limit
      });

      return failures.map(f => ({
        id: f.id,
        sourceUrl: f.sourceUrl,
        attemptedAt: f.attemptedAt,
        successStatus: f.successStatus,
        errorMessage: f.errorMessage || undefined,
        processingTimeMs: f.processingTimeMs || undefined,
        extractionMethod: f.extractionMethod,
        confidenceScore: f.confidenceScore ? Number(f.confidenceScore) : undefined,
        validationData: f.validationData,
        userAgentUsed: f.userAgentUsed || undefined,
        ipAddress: f.ipAddress || undefined
      }));

    } catch (error) {
      console.error('❌ Failed to get recent failures:', error);
      throw new Error(`Failed to get recent failures: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get parsing success rate by platform
   */
  public async getSuccessRateByPlatform(days: number = 7): Promise<Array<{
    platform: string;
    totalAttempts: number;
    successfulAttempts: number;
    successRate: number;
  }>> {
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const attempts = await prisma.parsingAttempt.findMany({
        where: {
          attemptedAt: { gte: fromDate }
        },
        select: {
          sourceUrl: true,
          successStatus: true
        }
      });

      const platformStats: Record<string, { total: number; successful: number }> = {};

      attempts.forEach(attempt => {
        const platform = this.extractPlatform(attempt.sourceUrl);
        
        if (!platformStats[platform]) {
          platformStats[platform] = { total: 0, successful: 0 };
        }
        
        platformStats[platform].total++;
        if (attempt.successStatus) {
          platformStats[platform].successful++;
        }
      });

      return Object.entries(platformStats).map(([platform, stats]) => ({
        platform,
        totalAttempts: stats.total,
        successfulAttempts: stats.successful,
        successRate: stats.total > 0 ? stats.successful / stats.total : 0
      }));

    } catch (error) {
      console.error('❌ Failed to get success rate by platform:', error);
      throw new Error(`Failed to get success rate by platform: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean old parsing attempts (data retention)
   */
  public async cleanOldAttempts(olderThanDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const deleteResult = await prisma.parsingAttempt.deleteMany({
        where: {
          attemptedAt: { lt: cutoffDate }
        }
      });

      console.log(`🧹 Cleaned ${deleteResult.count} old parsing attempts`);
      return deleteResult.count;

    } catch (error) {
      console.error('❌ Failed to clean old attempts:', error);
      throw new Error(`Failed to clean old attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update parsing attempt with job listing association
   */
  public async linkParsingAttemptToJob(
    attemptId: string,
    jobListingId: string
  ): Promise<void> {
    try {
      await prisma.jobListing.update({
        where: { id: jobListingId },
        data: { parsingAttemptId: attemptId }
      });

      console.log(`🔗 Linked parsing attempt ${attemptId} to job listing ${jobListingId}`);

    } catch (error) {
      console.error('❌ Failed to link parsing attempt to job:', error);
      throw new Error(`Failed to link parsing attempt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Private helper methods
   */
  private calculateMetrics(attempts: any[]): ParsingMetrics {
    const totalAttempts = attempts.length;
    const successfulAttempts = attempts.filter(a => a.successStatus).length;
    const failedAttempts = totalAttempts - successfulAttempts;

    // Calculate average processing time
    const processingTimes = attempts
      .filter(a => a.processingTimeMs)
      .map(a => a.processingTimeMs);
    const averageProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0;

    // Calculate average confidence
    const confidenceScores = attempts
      .filter(a => a.confidenceScore)
      .map(a => Number(a.confidenceScore));
    const averageConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
      : 0;

    // Common errors
    const errorCounts: Record<string, number> = {};
    attempts
      .filter(a => !a.successStatus && a.errorMessage)
      .forEach(a => {
        const errorType = this.categorizeError(a.errorMessage);
        errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
      });

    const commonErrors = Object.entries(errorCounts)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Platform breakdown
    const platformStats: Record<string, { total: number; successful: number }> = {};
    attempts.forEach(attempt => {
      const platform = this.extractPlatform(attempt.sourceUrl);
      if (!platformStats[platform]) {
        platformStats[platform] = { total: 0, successful: 0 };
      }
      platformStats[platform].total++;
      if (attempt.successStatus) {
        platformStats[platform].successful++;
      }
    });

    const platformBreakdown = Object.entries(platformStats).map(([platform, stats]) => ({
      platform,
      successRate: stats.total > 0 ? stats.successful / stats.total : 0
    }));

    // Confidence distribution
    const confidenceDistribution = {
      high: confidenceScores.filter(score => score > 0.8).length,
      medium: confidenceScores.filter(score => score >= 0.5 && score <= 0.8).length,
      low: confidenceScores.filter(score => score < 0.5).length
    };

    return {
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      averageProcessingTime,
      averageConfidence,
      commonErrors,
      platformBreakdown,
      confidenceDistribution
    };
  }

  private categorizeError(errorMessage: string): string {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('timeout') || message.includes('time out')) {
      return 'Timeout Error';
    }
    if (message.includes('network') || message.includes('connection')) {
      return 'Network Error';
    }
    if (message.includes('403') || message.includes('blocked')) {
      return 'Access Blocked';
    }
    if (message.includes('404') || message.includes('not found')) {
      return 'Page Not Found';
    }
    if (message.includes('webllm') || message.includes('ai') || message.includes('model')) {
      return 'WebLLM Error';
    }
    if (message.includes('parse') || message.includes('json')) {
      return 'Parsing Error';
    }
    if (message.includes('rate limit')) {
      return 'Rate Limited';
    }
    if (message.includes('invalid') || message.includes('malformed')) {
      return 'Invalid Input';
    }
    
    return 'Unknown Error';
  }

  private extractPlatform(url: string): string {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      if (hostname.includes('linkedin.com')) return 'LinkedIn';
      if (hostname.includes('indeed.com')) return 'Indeed';
      if (hostname.includes('glassdoor.com')) return 'Glassdoor';
      if (hostname.includes('monster.com')) return 'Monster';
      if (hostname.includes('ziprecruiter.com')) return 'ZipRecruiter';
      if (hostname.includes('greenhouse.io')) return 'Greenhouse';
      if (hostname.includes('lever.co')) return 'Lever';
      if (hostname.includes('careers.') || hostname.includes('jobs.')) return 'Company Career Site';
      return 'Other';
    } catch {
      return 'Unknown';
    }
  }

  private hashIpAddress(ip?: string): string | null {
    if (!ip) return null;
    
    // Hash IP address for privacy (store only hashed version)
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(ip + 'parsing_salt').digest('hex').substring(0, 16);
  }
}

// Factory function for easy usage
export function createParsingTracker(): ParsingAttemptsTracker {
  return new ParsingAttemptsTracker();
}

// Utility function to log successful parsing
export async function logSuccessfulParsing(
  url: string,
  result: ParsingResult,
  validation?: CrossValidationResult,
  userAgent?: string,
  clientIp?: string
): Promise<string> {
  const tracker = new ParsingAttemptsTracker();
  return tracker.logParsingAttempt(url, result, validation, userAgent, clientIp);
}

// Utility function to log parsing failure
export async function logParsingError(
  url: string,
  error: string,
  processingTime: number,
  method: string = 'webllm',
  userAgent?: string,
  clientIp?: string
): Promise<string> {
  const tracker = new ParsingAttemptsTracker();
  return tracker.logParsingFailure(url, error, processingTime, method, userAgent, clientIp);
}