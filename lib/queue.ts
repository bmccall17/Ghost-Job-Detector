// Ghost Job Detector - KV Queue System
// Database: ghost-job-kv

import { kv } from '@vercel/kv';

// Queue names
export const QUEUES = {
  INGEST: 'q:ingest',
  ANALYSIS: 'q:analysis',
  DEADLETTER_INGEST: 'q:deadletter:ingest',
  DEADLETTER_ANALYSIS: 'q:deadletter:analysis',
} as const;

// Lock and idempotency keys
export const KEYS = {
  seen: (sha: string) => `seen:source:${sha}`,
  lock: (sha: string) => `lock:ingest:${sha}`,
  rateLimit: (userId: string, date: string) => `rate:user:${userId}:${date}`,
} as const;

// Queue job interfaces
export interface IngestJob {
  id: string;
  sourceId: string;
  url?: string;
  blobUrl?: string;
  priority: number;
  retryCount: number;
  createdAt: string;
}

export interface AnalysisJob {
  id: string;
  jobListingId: string;
  sourceId: string;
  modelVersion: string;
  priority: number;
  retryCount: number;
  createdAt: string;
}

// Queue operations
export class QueueManager {
  // Add job to ingest queue
  static async enqueueIngest(job: Omit<IngestJob, 'retryCount' | 'createdAt'>): Promise<void> {
    const fullJob: IngestJob = {
      ...job,
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };
    
    await kv.lpush(QUEUES.INGEST, JSON.stringify(fullJob));
  }

  // Add job to analysis queue
  static async enqueueAnalysis(job: Omit<AnalysisJob, 'retryCount' | 'createdAt'>): Promise<void> {
    const fullJob: AnalysisJob = {
      ...job,
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };
    
    await kv.lpush(QUEUES.ANALYSIS, JSON.stringify(fullJob));
  }

  // Pop jobs from queue (batch processing)
  static async popIngestJobs(batchSize = 10): Promise<IngestJob[]> {
    const jobs = await kv.rpop(QUEUES.INGEST, batchSize);
    return jobs ? jobs.map(job => JSON.parse(job)) : [];
  }

  static async popAnalysisJobs(batchSize = 10): Promise<AnalysisJob[]> {
    const jobs = await kv.rpop(QUEUES.ANALYSIS, batchSize);
    return jobs ? jobs.map(job => JSON.parse(job)) : [];
  }

  // Idempotency checks
  static async isSourceSeen(sha: string): Promise<boolean> {
    const result = await kv.get(KEYS.seen(sha));
    return result !== null;
  }

  static async markSourceSeen(sha: string, sourceId: string): Promise<void> {
    await kv.set(KEYS.seen(sha), sourceId, { ex: 60 * 60 * 24 * 7 }); // 7 days
  }

  // Locking mechanism
  static async acquireLock(sha: string, ttlSeconds = 300): Promise<boolean> {
    const result = await kv.set(KEYS.lock(sha), '1', { nx: true, ex: ttlSeconds });
    return result === 'OK';
  }

  static async releaseLock(sha: string): Promise<void> {
    await kv.del(KEYS.lock(sha));
  }

  // Rate limiting
  static async checkRateLimit(userId: string, maxRequests = 1000): Promise<{ allowed: boolean; remaining: number }> {
    const today = new Date().toISOString().split('T')[0];
    const key = KEYS.rateLimit(userId, today);
    
    const current = await kv.incr(key);
    if (current === 1) {
      await kv.expire(key, 60 * 60 * 24); // 24 hours
    }
    
    return {
      allowed: current <= maxRequests,
      remaining: Math.max(0, maxRequests - current),
    };
  }

  // Dead letter queue operations
  static async moveToDeadLetter(job: IngestJob | AnalysisJob, reason: string): Promise<void> {
    const isIngestJob = 'url' in job || 'blobUrl' in job;
    const queue = isIngestJob ? QUEUES.DEADLETTER_INGEST : QUEUES.DEADLETTER_ANALYSIS;
    
    const deadLetterJob = {
      ...job,
      failureReason: reason,
      movedAt: new Date().toISOString(),
    };
    
    await kv.lpush(queue, JSON.stringify(deadLetterJob));
  }

  // Queue monitoring
  static async getQueueStats(): Promise<{
    ingestLength: number;
    analysisLength: number;
    deadLetterIngest: number;
    deadLetterAnalysis: number;
  }> {
    const [ingestLength, analysisLength, deadLetterIngest, deadLetterAnalysis] = await Promise.all([
      kv.llen(QUEUES.INGEST),
      kv.llen(QUEUES.ANALYSIS),
      kv.llen(QUEUES.DEADLETTER_INGEST),
      kv.llen(QUEUES.DEADLETTER_ANALYSIS),
    ]);

    return {
      ingestLength,
      analysisLength,
      deadLetterIngest,
      deadLetterAnalysis,
    };
  }
}