/**
 * Comprehensive WebLLM Health Monitoring System - Phase 3 Implementation
 * Advanced monitoring with alerting, trend analysis, and automatic recovery
 */

export interface PerformanceMetric {
  timestamp: Date;
  responseTime: number;
  success: boolean;
  confidence?: number;
  platform?: string;
  url?: string;
  errorType?: string;
}

export interface HealthAlert {
  id: string;
  type: 'low_success_rate' | 'high_response_time' | 'circuit_open' | 'model_failure' | 'cache_overflow';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  data?: any;
  resolved?: boolean;
}

export interface HealthThresholds {
  successRate: {
    warning: number; // 0.85
    critical: number; // 0.75
  };
  responseTime: {
    warning: number; // 3000ms
    critical: number; // 8000ms
  };
  errorRate: {
    warning: number; // 0.15
    critical: number; // 0.25
  };
}

export interface TrendAnalysis {
  direction: 'improving' | 'declining' | 'stable';
  magnitude: number; // 0-1 scale
  confidence: number; // Statistical confidence
  timeframe: string;
  metrics: {
    successRateTrend: number;
    responseTimeTrend: number;
    errorRateTrend: number;
  };
}

/**
 * Advanced health monitoring with trend analysis and automated alerting
 */
export class WebLLMHealthMonitor {
  private static instance: WebLLMHealthMonitor;
  
  private performanceMetrics: PerformanceMetric[] = [];
  private healthAlerts: HealthAlert[] = [];
  private listeners: Array<(alert: HealthAlert) => void> = [];
  
  private totalAttempts = 0;
  private successCount = 0;
  private recentErrors: Array<{timestamp: Date; error: string; url?: string}> = [];
  
  private readonly thresholds: HealthThresholds = {
    successRate: { warning: 0.85, critical: 0.75 },
    responseTime: { warning: 3000, critical: 8000 },
    errorRate: { warning: 0.15, critical: 0.25 }
  };

  private readonly maxMetrics = 1000; // Keep last 1000 metrics
  private readonly maxAlerts = 100;   // Keep last 100 alerts

  private constructor() {
    // Start background health monitoring
    this.startHealthMonitoring();
  }

  public static getInstance(): WebLLMHealthMonitor {
    if (!WebLLMHealthMonitor.instance) {
      WebLLMHealthMonitor.instance = new WebLLMHealthMonitor();
    }
    return WebLLMHealthMonitor.instance;
  }

  /**
   * Record successful WebLLM operation
   */
  recordSuccess(
    responseTime: number, 
    confidence?: number, 
    platform?: string, 
    url?: string
  ): void {
    const metric: PerformanceMetric = {
      timestamp: new Date(),
      responseTime,
      success: true,
      confidence,
      platform,
      url
    };

    this.performanceMetrics.push(metric);
    this.totalAttempts++;
    this.successCount++;

    // Maintain metrics buffer size
    if (this.performanceMetrics.length > this.maxMetrics) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.maxMetrics);
    }

    this.checkHealthThresholds();
    console.log('📊 Health Monitor: Success recorded', {
      responseTime,
      confidence,
      platform,
      successRate: this.getSuccessRate()
    });
  }

  /**
   * Record failed WebLLM operation
   */
  recordFailure(
    responseTime: number,
    error: string, 
    errorType?: string,
    platform?: string, 
    url?: string
  ): void {
    const metric: PerformanceMetric = {
      timestamp: new Date(),
      responseTime,
      success: false,
      platform,
      url,
      errorType
    };

    this.performanceMetrics.push(metric);
    this.totalAttempts++;
    
    this.recentErrors.push({ 
      timestamp: new Date(), 
      error, 
      url 
    });
    
    // Maintain buffers
    if (this.performanceMetrics.length > this.maxMetrics) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.maxMetrics);
    }
    
    if (this.recentErrors.length > 50) {
      this.recentErrors = this.recentErrors.slice(-50);
    }

    this.checkHealthThresholds();
    console.warn('📊 Health Monitor: Failure recorded', {
      error,
      errorType,
      platform,
      successRate: this.getSuccessRate()
    });
  }

  /**
   * Get current success rate
   */
  getSuccessRate(timeframeMs?: number): number {
    if (this.totalAttempts === 0) return 1.0;
    
    if (timeframeMs) {
      const cutoff = Date.now() - timeframeMs;
      const recentMetrics = this.performanceMetrics.filter(
        m => m.timestamp.getTime() > cutoff
      );
      
      if (recentMetrics.length === 0) return 1.0;
      
      const recentSuccesses = recentMetrics.filter(m => m.success).length;
      return recentSuccesses / recentMetrics.length;
    }
    
    return this.successCount / this.totalAttempts;
  }

  /**
   * Get average response time
   */
  getAverageResponseTime(timeframeMs?: number): number {
    let metrics = this.performanceMetrics;
    
    if (timeframeMs) {
      const cutoff = Date.now() - timeframeMs;
      metrics = metrics.filter(m => m.timestamp.getTime() > cutoff);
    }
    
    if (metrics.length === 0) return 0;
    
    const totalTime = metrics.reduce((sum, m) => sum + m.responseTime, 0);
    return totalTime / metrics.length;
  }

  /**
   * Get current health status
   */
  getHealthStatus(): 'healthy' | 'warning' | 'critical' {
    const successRate = this.getSuccessRate();
    const avgResponseTime = this.getAverageResponseTime();
    
    // Critical conditions
    if (successRate < this.thresholds.successRate.critical || 
        avgResponseTime > this.thresholds.responseTime.critical) {
      return 'critical';
    }
    
    // Warning conditions  
    if (successRate < this.thresholds.successRate.warning || 
        avgResponseTime > this.thresholds.responseTime.warning) {
      return 'warning';
    }
    
    return 'healthy';
  }

  /**
   * Analyze performance trends over time
   */
  analyzeTrends(timeframeMs = 24 * 60 * 60 * 1000): TrendAnalysis {
    const cutoff = Date.now() - timeframeMs;
    const recentMetrics = this.performanceMetrics.filter(
      m => m.timestamp.getTime() > cutoff
    );

    if (recentMetrics.length < 10) {
      return {
        direction: 'stable',
        magnitude: 0,
        confidence: 0,
        timeframe: this.formatTimeframe(timeframeMs),
        metrics: {
          successRateTrend: 0,
          responseTimeTrend: 0,
          errorRateTrend: 0
        }
      };
    }

    // Split metrics into two halves for trend comparison
    const midpoint = Math.floor(recentMetrics.length / 2);
    const firstHalf = recentMetrics.slice(0, midpoint);
    const secondHalf = recentMetrics.slice(midpoint);

    // Calculate trend metrics
    const firstHalfSuccess = firstHalf.filter(m => m.success).length / firstHalf.length;
    const secondHalfSuccess = secondHalf.filter(m => m.success).length / secondHalf.length;
    const successRateTrend = secondHalfSuccess - firstHalfSuccess;

    const firstHalfAvgTime = firstHalf.reduce((sum, m) => sum + m.responseTime, 0) / firstHalf.length;
    const secondHalfAvgTime = secondHalf.reduce((sum, m) => sum + m.responseTime, 0) / secondHalf.length;
    const responseTimeTrend = (secondHalfAvgTime - firstHalfAvgTime) / firstHalfAvgTime;

    const errorRateTrend = -successRateTrend; // Inverse of success rate

    // Determine overall direction and magnitude
    const overallTrend = (successRateTrend * 0.6) + ((-responseTimeTrend) * 0.4);
    
    let direction: 'improving' | 'declining' | 'stable' = 'stable';
    if (Math.abs(overallTrend) > 0.05) {
      direction = overallTrend > 0 ? 'improving' : 'declining';
    }

    return {
      direction,
      magnitude: Math.abs(overallTrend),
      confidence: Math.min(recentMetrics.length / 50, 1), // Higher confidence with more data
      timeframe: this.formatTimeframe(timeframeMs),
      metrics: {
        successRateTrend,
        responseTimeTrend,
        errorRateTrend
      }
    };
  }

  /**
   * Get recent health alerts
   */
  getHealthAlerts(limit = 10): HealthAlert[] {
    return this.healthAlerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Subscribe to health alerts
   */
  onHealthAlert(callback: (alert: HealthAlert) => void): void {
    this.listeners.push(callback);
  }

  /**
   * Get comprehensive health report
   */
  getHealthReport(): {
    status: 'healthy' | 'warning' | 'critical';
    metrics: {
      successRate: number;
      averageResponseTime: number;
      totalRequests: number;
      recentErrors: number;
    };
    trends: TrendAnalysis;
    alerts: HealthAlert[];
    recommendations: string[];
  } {
    const status = this.getHealthStatus();
    const trends = this.analyzeTrends();
    const alerts = this.getHealthAlerts(5);
    
    const recommendations = this.generateRecommendations(status, trends);

    return {
      status,
      metrics: {
        successRate: this.getSuccessRate(),
        averageResponseTime: this.getAverageResponseTime(),
        totalRequests: this.totalAttempts,
        recentErrors: this.recentErrors.length
      },
      trends,
      alerts,
      recommendations
    };
  }

  /**
   * Check health thresholds and generate alerts
   */
  private checkHealthThresholds(): void {
    const successRate = this.getSuccessRate();
    const avgResponseTime = this.getAverageResponseTime();
    
    // Success rate alerts
    if (this.totalAttempts >= 10) {
      if (successRate < this.thresholds.successRate.critical) {
        this.createAlert('low_success_rate', 'critical', 
          `Critical: Success rate dropped to ${(successRate * 100).toFixed(1)}%`, {
          successRate,
          threshold: this.thresholds.successRate.critical,
          recentErrors: this.recentErrors.slice(-5)
        });
      } else if (successRate < this.thresholds.successRate.warning) {
        this.createAlert('low_success_rate', 'warning',
          `Warning: Success rate below target at ${(successRate * 100).toFixed(1)}%`, {
          successRate,
          threshold: this.thresholds.successRate.warning
        });
      }
    }

    // Response time alerts
    if (avgResponseTime > this.thresholds.responseTime.critical) {
      this.createAlert('high_response_time', 'critical',
        `Critical: Average response time is ${Math.round(avgResponseTime)}ms`, {
        responseTime: avgResponseTime,
        threshold: this.thresholds.responseTime.critical
      });
    } else if (avgResponseTime > this.thresholds.responseTime.warning) {
      this.createAlert('high_response_time', 'warning',
        `Warning: Response time elevated at ${Math.round(avgResponseTime)}ms`, {
        responseTime: avgResponseTime,
        threshold: this.thresholds.responseTime.warning
      });
    }
  }

  /**
   * Create and dispatch health alert
   */
  private createAlert(
    type: HealthAlert['type'], 
    severity: HealthAlert['severity'],
    message: string, 
    data?: any
  ): void {
    // Check if similar alert exists recently
    const recentSimilar = this.healthAlerts.find(alert => 
      alert.type === type && 
      alert.severity === severity &&
      Date.now() - alert.timestamp.getTime() < 5 * 60 * 1000 // 5 minutes
    );

    if (recentSimilar) return; // Don't spam alerts

    const alert: HealthAlert = {
      id: `${type}_${Date.now()}`,
      type,
      severity,
      message,
      timestamp: new Date(),
      data,
      resolved: false
    };

    this.healthAlerts.push(alert);
    
    // Maintain alerts buffer
    if (this.healthAlerts.length > this.maxAlerts) {
      this.healthAlerts = this.healthAlerts.slice(-this.maxAlerts);
    }

    // Notify listeners
    this.listeners.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Health alert listener error:', error);
      }
    });

    // Dispatch browser event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('webllm-health-alert', {
        detail: alert
      }));
    }

    console.warn(`🚨 WebLLM Health Alert [${severity}]: ${message}`, data);
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    status: 'healthy' | 'warning' | 'critical',
    trends: TrendAnalysis
  ): string[] {
    const recommendations: string[] = [];

    if (status === 'critical') {
      recommendations.push('Immediate action required: WebLLM service is in critical state');
      recommendations.push('Check WebGPU support and browser compatibility');
      recommendations.push('Verify model loading and initialization');
    }

    if (trends.direction === 'declining') {
      recommendations.push('Performance trend is declining - investigate recent changes');
      if (trends.metrics.responseTimeTrend > 0.2) {
        recommendations.push('Response times increasing significantly - check system resources');
      }
      if (trends.metrics.successRateTrend < -0.1) {
        recommendations.push('Success rate dropping - review error patterns and model stability');
      }
    }

    if (this.getAverageResponseTime() > 5000) {
      recommendations.push('Consider implementing response caching for frequently parsed content');
      recommendations.push('Review prompt optimization and token limits');
    }

    if (recommendations.length === 0) {
      recommendations.push('System performance is within acceptable parameters');
    }

    return recommendations;
  }

  /**
   * Start background monitoring
   */
  private startHealthMonitoring(): void {
    // Check health every 30 seconds
    setInterval(() => {
      const report = this.getHealthReport();
      
      if (report.status === 'critical') {
        console.error('🚨 WebLLM Health: CRITICAL STATUS', report.metrics);
      } else if (report.status === 'warning') {
        console.warn('⚠️ WebLLM Health: WARNING STATUS', report.metrics);
      }
      
      // Auto-resolve old alerts
      this.resolveOldAlerts();
      
    }, 30000);
  }

  /**
   * Auto-resolve alerts older than 1 hour if conditions improved
   */
  private resolveOldAlerts(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const currentStatus = this.getHealthStatus();
    
    this.healthAlerts.forEach(alert => {
      if (!alert.resolved && 
          alert.timestamp.getTime() < oneHourAgo &&
          currentStatus === 'healthy') {
        alert.resolved = true;
      }
    });
  }

  /**
   * Format timeframe for display
   */
  private formatTimeframe(ms: number): string {
    const hours = ms / (1000 * 60 * 60);
    if (hours < 1) return `${Math.round(ms / (1000 * 60))}m`;
    if (hours < 24) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}d`;
  }

  /**
   * Reset monitoring data (for testing)
   */
  reset(): void {
    this.performanceMetrics = [];
    this.healthAlerts = [];
    this.totalAttempts = 0;
    this.successCount = 0;
    this.recentErrors = [];
    console.log('🔄 Health Monitor: Data reset');
  }
}