// Ghost Job Detector - KV Queue System
// Database: ghost-job-kv

import { kv } from '@vercel/kv';

// Queue names
export const QUEUES = {
  INGEST: 'q:ingest',
  ANALYSIS: 'q:analysis',
  DEADLETTER_INGEST: 'q:deadletter:ingest',
  DEADLETTER_ANALYSIS: 'q:deadletter:analysis',
};

// Lock and idempotency keys
export const KEYS = {
  seen: (sha) => `seen:source:${sha}`,
  lock: (sha) => `lock:ingest:${sha}`,
  rateLimit: (userId, date) => `rate:user:${userId}:${date}`,
};

// Queue operations
export class QueueManager {
  // Add job to ingest queue
  static async enqueueIngest(job) {
    const fullJob = {
      ...job,
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };
    
    await kv.lpush(QUEUES.INGEST, JSON.stringify(fullJob));
  }

  // Add job to analysis queue
  static async enqueueAnalysis(job) {
    const fullJob = {
      ...job,
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };
    
    await kv.lpush(QUEUES.ANALYSIS, JSON.stringify(fullJob));
  }

  // Pop jobs from queue (batch processing)
  static async popIngestJobs(batchSize = 10) {
    const jobs = await kv.rpop(QUEUES.INGEST, batchSize);
    return jobs ? jobs.map(job => JSON.parse(job)) : [];
  }

  static async popAnalysisJobs(batchSize = 10) {
    const jobs = await kv.rpop(QUEUES.ANALYSIS, batchSize);
    return jobs ? jobs.map(job => JSON.parse(job)) : [];
  }

  // Idempotency checks
  static async isSourceSeen(sha) {
    const result = await kv.get(KEYS.seen(sha));
    return result !== null;
  }

  static async markSourceSeen(sha, sourceId) {
    await kv.set(KEYS.seen(sha), sourceId, { ex: 60 * 60 * 24 * 7 }); // 7 days
  }

  // Locking mechanism
  static async acquireLock(sha, ttlSeconds = 300) {
    const result = await kv.set(KEYS.lock(sha), '1', { nx: true, ex: ttlSeconds });
    return result === 'OK';
  }

  static async releaseLock(sha) {
    await kv.del(KEYS.lock(sha));
  }

  // Rate limiting
  static async checkRateLimit(userId, maxRequests = 1000) {
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
  static async moveToDeadLetter(job, reason) {
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
  static async getQueueStats() {
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