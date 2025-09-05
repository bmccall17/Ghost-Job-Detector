/**
 * WebLLM Performance Optimization and Caching Layer
 * Phase 2: Implement intelligent caching for parsing results
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  contentHash?: string;
}

export interface CacheMetrics {
  hitCount: number;
  missCount: number;
  hitRate: number;
  totalEntries: number;
  totalMemoryMB: number;
}

/**
 * Intelligent cache for WebLLM parsing results with TTL and content-based invalidation
 */
export class WebLLMCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private metrics = {
    hitCount: 0,
    missCount: 0
  };
  
  private readonly maxEntries: number;
  private readonly defaultTTL: number;

  constructor(maxEntries = 1000, defaultTTLMs = 24 * 60 * 60 * 1000) { // 24 hours default
    this.maxEntries = maxEntries;
    this.defaultTTL = defaultTTLMs;
    
    // Cleanup expired entries every hour
    setInterval(() => this.cleanupExpired(), 60 * 60 * 1000);
  }

  /**
   * Get cached entry if valid
   */
  get(key: string, contentHash?: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.metrics.missCount++;
      return null;
    }

    // Check TTL expiration
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.metrics.missCount++;
      return null;
    }

    // Check content hash invalidation
    if (contentHash && entry.contentHash && entry.contentHash !== contentHash) {
      this.cache.delete(key);
      this.metrics.missCount++;
      return null;
    }

    // Valid cache hit
    entry.hits++;
    this.metrics.hitCount++;
    console.log(`📋 Cache HIT for ${key}`, {
      hits: entry.hits,
      age: Math.round((Date.now() - entry.timestamp) / 1000) + 's'
    });
    
    return entry.data;
  }

  /**
   * Set cache entry with optional TTL and content hash
   */
  set(key: string, data: T, ttlMs?: number, contentHash?: string): void {
    // Enforce cache size limit
    if (this.cache.size >= this.maxEntries) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs || this.defaultTTL,
      hits: 0,
      contentHash
    };

    this.cache.set(key, entry);
    console.log(`💾 Cache SET for ${key}`, {
      ttlHours: Math.round((entry.ttl / (1000 * 60 * 60)) * 10) / 10,
      hasContentHash: !!contentHash
    });
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string, contentHash?: string): boolean {
    return this.get(key, contentHash) !== null;
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.metrics.hitCount = 0;
    this.metrics.missCount = 0;
    console.log('🗑️ Cache cleared');
  }

  /**
   * Get cache performance metrics
   */
  getMetrics(): CacheMetrics {
    const totalRequests = this.metrics.hitCount + this.metrics.missCount;
    const hitRate = totalRequests > 0 ? this.metrics.hitCount / totalRequests : 0;
    
    // Estimate memory usage (rough calculation)
    let totalMemoryBytes = 0;
    for (const [key, entry] of this.cache.entries()) {
      totalMemoryBytes += this.estimateSize(key) + this.estimateSize(entry);
    }

    return {
      hitCount: this.metrics.hitCount,
      missCount: this.metrics.missCount,
      hitRate: Math.round(hitRate * 100) / 100,
      totalEntries: this.cache.size,
      totalMemoryMB: Math.round((totalMemoryBytes / (1024 * 1024)) * 100) / 100
    };
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️ Evicted LRU cache entry: ${oldestKey}`);
    }
  }

  /**
   * Remove expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      console.log(`🧹 Cleaned up ${expiredCount} expired cache entries`);
    }
  }

  /**
   * Rough memory size estimation
   */
  private estimateSize(obj: any): number {
    const jsonStr = JSON.stringify(obj);
    return new Blob([jsonStr]).size;
  }

  /**
   * Export cache state for debugging
   */
  exportState(): Array<{key: string; entry: CacheEntry<T>}> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      entry: {
        ...entry,
        age: Date.now() - entry.timestamp,
        remaining: Math.max(0, entry.ttl - (Date.now() - entry.timestamp))
      }
    }));
  }
}

/**
 * Generate cache key for job parsing results
 */
export function generateJobParsingCacheKey(
  url: string, 
  contentLength: number, 
  platform?: string
): string {
  const urlKey = new URL(url).hostname + new URL(url).pathname;
  return `job_parse:${urlKey}:${contentLength}:${platform || 'generic'}`;
}

/**
 * Generate content hash for cache invalidation
 */
export function generateContentHash(content: string): string {
  // Simple hash function for content-based cache invalidation
  let hash = 0;
  for (let i = 0; i < Math.min(content.length, 1000); i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Singleton cache instance for job parsing results
export const jobParsingCache = new WebLLMCache<any>(500, 12 * 60 * 60 * 1000); // 500 entries, 12 hours TTL

// Cache for model validation results
export const modelValidationCache = new WebLLMCache<any>(100, 60 * 60 * 1000); // 100 entries, 1 hour TTL

// Cache for WebGPU validation results  
export const webgpuValidationCache = new WebLLMCache<any>(10, 24 * 60 * 60 * 1000); // 10 entries, 24 hours TTL