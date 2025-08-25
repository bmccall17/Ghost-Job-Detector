// Live Metadata Display - Performance Monitoring
// Phase 4: Performance optimization and monitoring

interface PerformanceMetrics {
  extractionStartTime: number;
  extractionDuration?: number;
  fieldsExtracted: number;
  apiResponseTime?: number;
  errorCount: number;
  cacheHits: number;
  cacheMisses: number;
}

class MetadataPerformanceMonitor {
  private metrics: PerformanceMetrics = {
    extractionStartTime: 0,
    fieldsExtracted: 0,
    errorCount: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  startExtraction(): void {
    this.metrics.extractionStartTime = performance.now();
    this.metrics.fieldsExtracted = 0;
    this.metrics.errorCount = 0;
  }

  recordFieldExtraction(): void {
    this.metrics.fieldsExtracted += 1;
  }

  recordError(): void {
    this.metrics.errorCount += 1;
  }

  recordCacheHit(): void {
    this.metrics.cacheHits += 1;
  }

  recordCacheMiss(): void {
    this.metrics.cacheMisses += 1;
  }

  completeExtraction(): PerformanceMetrics {
    this.metrics.extractionDuration = performance.now() - this.metrics.extractionStartTime;
    
    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Metadata Extraction Performance:', {
        duration: `${this.metrics.extractionDuration.toFixed(2)}ms`,
        fieldsExtracted: this.metrics.fieldsExtracted,
        errorsEncountered: this.metrics.errorCount,
        averageFieldTime: this.metrics.fieldsExtracted > 0 
          ? `${(this.metrics.extractionDuration / this.metrics.fieldsExtracted).toFixed(2)}ms/field`
          : 'N/A',
        cacheHitRate: `${((this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100).toFixed(1)}%`
      });
    }

    return { ...this.metrics };
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      extractionStartTime: 0,
      fieldsExtracted: 0,
      errorCount: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }
}

// Singleton instance
export const performanceMonitor = new MetadataPerformanceMonitor();

// Cache management utilities
export class MetadataCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private defaultTtl = 5 * 60 * 1000; // 5 minutes

  get(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      performanceMonitor.recordCacheMiss();
      return null;
    }

    // Check if expired
    if (Date.now() > cached.timestamp + cached.ttl) {
      this.cache.delete(key);
      performanceMonitor.recordCacheMiss();
      return null;
    }

    performanceMonitor.recordCacheHit();
    return cached.data;
  }

  set(key: string, data: any, ttl: number = this.defaultTtl): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.timestamp + value.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const metadataCache = new MetadataCache();

// Auto-cleanup every 10 minutes
setInterval(() => {
  metadataCache.cleanup();
}, 10 * 60 * 1000);