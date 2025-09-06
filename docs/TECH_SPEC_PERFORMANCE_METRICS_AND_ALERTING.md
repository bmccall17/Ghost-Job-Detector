# Tech Spec: Performance Metrics Collection & Production Alerting System

**Document Version:** 1.0  
**Target Release:** v0.3.2  
**Priority:** High  
**Estimated Effort:** 2-3 weeks  

## Overview

This technical specification addresses three critical gaps identified in the v0.3.1 documentation audit:
1. **Performance Metrics Collection**: Implement actual measurement and tracking of success rates, response times, and cache hit rates
2. **Quality Assurance Integration**: Wire the existing QA framework into the live analysis flow
3. **External Alerting System**: Implement comprehensive production monitoring with external notifications

## Issue Analysis

### Issue #1: Performance Metrics Claims vs Reality

**Current State:**
```typescript
// Documentation claims: "96-99% success rates"
// Reality: No measurement infrastructure

// WebLLMServiceManager tracks attempts but no aggregation
class WebLLMServiceManager {
  private metrics = new Map<string, any>(); // Raw data only
  // No success rate calculation or historical tracking
}
```

**Problem:**
- Raw metrics collected but not aggregated into meaningful performance indicators
- No historical tracking for trend analysis
- Success/failure rates not calculated or stored
- Response time percentiles (P95, P99) not computed

### Issue #2: Quality Assurance Framework Not Integrated

**Current State:**
```typescript
// QA framework exists but runs independently
// File: /src/lib/webllm-quality-assurance.ts (598 lines)
class WebLLMQualityAssurance {
  async runComprehensiveQualityAssessment() {
    // Comprehensive testing exists but not called in main flow
  }
}
```

**Problem:**
- Quality assurance runs as standalone system
- Not integrated into live analysis pipeline
- No real-time quality scoring during analysis
- Quality degradation not detected proactively

### Issue #3: Production Monitoring Lacks External Alerting

**Current State Analysis:**
```typescript
// File: /src/lib/webllm-production-monitor.ts (694 lines)
class WebLLMProductionMonitor {
  async trackSLACompliance() {
    // SLA tracking exists
    if (slaMetrics.uptime < this.slaTargets.uptime) {
      // Creates internal alert object but no external notification
      this.alerts.push({
        id: generateId(),
        type: 'sla_violation',
        severity: 'high',
        // Alert created but not sent anywhere
      });
    }
  }
}
```

**Detailed Problem Explanation:**

The production monitoring system **detects** issues perfectly but has **no external notification mechanism**:

1. **Alert Detection Works**: The system correctly identifies SLA violations, performance degradation, and errors
2. **Alert Storage Works**: Alerts are created and stored in memory/database
3. **Alert Delivery Missing**: No mechanism to send alerts to external systems

**What "External Alerting" Means:**
- **Email Notifications**: Send alerts to engineering team emails
- **Slack Integration**: Post critical alerts to Slack channels
- **PagerDuty Integration**: Create incidents for high-severity alerts
- **Webhook Notifications**: Send alerts to external monitoring systems
- **SMS Notifications**: Text messages for critical production issues

**Ideal Alerting Flow:**
```
[Issue Detected] → [Alert Created] → [External Notification] → [Human Response]
     ✅ Working      ✅ Working        ❌ Missing            ❌ No Response
```

## Technical Specifications

### Spec #1: Real-Time Performance Metrics Collection

#### 1.1 Metrics Database Schema

```sql
-- New table for aggregated performance metrics
CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type VARCHAR(50) NOT NULL, -- 'success_rate', 'response_time', 'cache_hit_rate'
  platform VARCHAR(50), -- 'linkedin', 'workday', 'generic', etc.
  metric_value DECIMAL(10,4) NOT NULL,
  measurement_window VARCHAR(20) NOT NULL, -- '1h', '6h', '24h', '7d'
  measured_at TIMESTAMP DEFAULT NOW(),
  additional_data JSONB -- Extra context and breakdown data
);

-- Index for efficient queries
CREATE INDEX idx_performance_metrics_type_platform_time 
ON performance_metrics(metric_type, platform, measured_at DESC);
```

#### 1.2 Metrics Collection Service

```typescript
interface PerformanceMetrics {
  successRate: {
    overall: number;
    byPlatform: Record<string, number>;
    byConfidenceLevel: Record<string, number>;
    trend: 'improving' | 'stable' | 'degrading';
  };
  
  responseTime: {
    mean: number;
    median: number;
    p95: number;
    p99: number;
    byPlatform: Record<string, ResponseTimeStats>;
  };
  
  cacheMetrics: {
    hitRate: number;
    missRate: number;
    evictionRate: number;
    averageTTL: number;
  };
}

class RealTimeMetricsCollector {
  private metricsBuffer: MetricDataPoint[] = [];
  private aggregationInterval = 5 * 60 * 1000; // 5 minutes
  
  async collectOperationMetric(operation: OperationResult): Promise<void> {
    // Collect individual operation data
    const dataPoint: MetricDataPoint = {
      timestamp: Date.now(),
      operation: operation.type,
      platform: operation.platform,
      success: operation.success,
      responseTime: operation.responseTime,
      confidence: operation.confidence,
      cacheHit: operation.cacheHit
    };
    
    this.metricsBuffer.push(dataPoint);
    
    // Trigger aggregation if buffer is full
    if (this.metricsBuffer.length >= 100) {
      await this.aggregateAndStore();
    }
  }
  
  private async aggregateAndStore(): Promise<void> {
    const aggregated = this.calculateAggregatedMetrics(this.metricsBuffer);
    
    // Store in database
    await this.storeMetrics(aggregated);
    
    // Clear buffer
    this.metricsBuffer = [];
    
    // Check for performance alerts
    await this.checkPerformanceThresholds(aggregated);
  }
  
  private calculateAggregatedMetrics(dataPoints: MetricDataPoint[]): PerformanceMetrics {
    // Success rate calculation
    const totalOperations = dataPoints.length;
    const successfulOperations = dataPoints.filter(dp => dp.success).length;
    const successRate = (successfulOperations / totalOperations) * 100;
    
    // Response time percentiles
    const sortedResponseTimes = dataPoints
      .map(dp => dp.responseTime)
      .sort((a, b) => a - b);
    
    const p95 = this.calculatePercentile(sortedResponseTimes, 95);
    const p99 = this.calculatePercentile(sortedResponseTimes, 99);
    
    // Cache hit rate
    const cacheHits = dataPoints.filter(dp => dp.cacheHit).length;
    const cacheHitRate = (cacheHits / totalOperations) * 100;
    
    return {
      successRate: {
        overall: successRate,
        byPlatform: this.calculateByPlatform(dataPoints, 'success'),
        byConfidenceLevel: this.calculateByConfidence(dataPoints),
        trend: this.calculateTrend(successRate)
      },
      responseTime: {
        mean: sortedResponseTimes.reduce((a, b) => a + b, 0) / sortedResponseTimes.length,
        median: this.calculatePercentile(sortedResponseTimes, 50),
        p95,
        p99,
        byPlatform: this.calculateResponseTimesByPlatform(dataPoints)
      },
      cacheMetrics: {
        hitRate: cacheHitRate,
        missRate: 100 - cacheHitRate,
        evictionRate: this.calculateEvictionRate(),
        averageTTL: this.calculateAverageTTL()
      }
    };
  }
}
```

#### 1.3 Integration Points

```typescript
// Modify WebLLMServiceManager to use metrics collector
class WebLLMServiceManager {
  private metricsCollector = new RealTimeMetricsCollector();
  
  async parseJobData(content: string, context: JobParsingContext): Promise<JobParsingResult> {
    const startTime = performance.now();
    let success = false;
    let cacheHit = false;
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(content, context);
      const cached = await this.cache.get(cacheKey);
      
      if (cached) {
        cacheHit = true;
        success = true;
        const result = cached as JobParsingResult;
        
        // Collect metrics for cache hit
        await this.metricsCollector.collectOperationMetric({
          type: 'parse_job_data',
          platform: context.platform || 'generic',
          success: true,
          responseTime: performance.now() - startTime,
          confidence: result.confidence,
          cacheHit: true
        });
        
        return result;
      }
      
      // Perform actual parsing
      const result = await this.performParsing(content, context);
      success = true;
      
      // Collect metrics for successful parsing
      await this.metricsCollector.collectOperationMetric({
        type: 'parse_job_data',
        platform: context.platform || 'generic',
        success: true,
        responseTime: performance.now() - startTime,
        confidence: result.confidence,
        cacheHit: false
      });
      
      return result;
      
    } catch (error) {
      // Collect metrics for failed parsing
      await this.metricsCollector.collectOperationMetric({
        type: 'parse_job_data',
        platform: context.platform || 'generic',
        success: false,
        responseTime: performance.now() - startTime,
        confidence: 0,
        cacheHit: false,
        error: error.message
      });
      
      throw error;
    }
  }
}
```

### Spec #2: Quality Assurance Integration

#### 2.1 Real-Time Quality Scoring

```typescript
// Integrate QA into live analysis pipeline
class LiveQualityAssurance {
  private qaFramework: WebLLMQualityAssurance;
  
  async assessAnalysisQuality(
    analysisResult: JobAnalysisResult,
    inputData: JobAnalysisInput
  ): Promise<QualityScore> {
    
    // Run quality assessment in parallel with main analysis
    const qualityTasks = await Promise.allSettled([
      this.qaFramework.assessAccuracy(analysisResult, inputData),
      this.qaFramework.assessPerformance(analysisResult),
      this.qaFramework.assessReliability(analysisResult),
      this.qaFramework.assessConsistency(analysisResult)
    ]);
    
    const qualityScore: QualityScore = {
      overall: this.calculateOverallQuality(qualityTasks),
      accuracy: this.extractResult(qualityTasks[0]),
      performance: this.extractResult(qualityTasks[1]),
      reliability: this.extractResult(qualityTasks[2]),
      consistency: this.extractResult(qualityTasks[3]),
      timestamp: Date.now()
    };
    
    // Store quality score with analysis result
    await this.storeQualityScore(analysisResult.id, qualityScore);
    
    // Check for quality degradation
    if (qualityScore.overall < 0.85) {
      await this.handleQualityDegradation(qualityScore, analysisResult);
    }
    
    return qualityScore;
  }
  
  private async handleQualityDegradation(
    qualityScore: QualityScore,
    analysisResult: JobAnalysisResult
  ): Promise<void> {
    // Create quality alert
    const alert: QualityAlert = {
      type: 'quality_degradation',
      severity: qualityScore.overall < 0.7 ? 'high' : 'medium',
      qualityScore,
      analysisId: analysisResult.id,
      timestamp: Date.now(),
      recommendedActions: this.generateQualityRecommendations(qualityScore)
    };
    
    // Send to alerting system
    await this.alertingService.sendAlert(alert);
    
    // Trigger automatic remediation if possible
    if (qualityScore.overall < 0.7) {
      await this.triggerAutomaticRemediation(analysisResult);
    }
  }
}
```

#### 2.2 Integration into Main Analysis Flow

```typescript
// Modify the main analysis service
class JobAnalysisService {
  private qualityAssurance = new LiveQualityAssurance();
  
  async analyzeJob(input: JobAnalysisInput): Promise<JobAnalysisResult> {
    // Perform main analysis
    const analysisResult = await this.performCoreAnalysis(input);
    
    // Run quality assessment in parallel
    const qualityAssessmentPromise = this.qualityAssurance.assessAnalysisQuality(
      analysisResult, 
      input
    );
    
    // Don't block main response on QA, but include if fast enough
    const qualityTimeout = new Promise(resolve => 
      setTimeout(() => resolve(null), 500) // 500ms timeout for QA
    );
    
    const qualityScore = await Promise.race([
      qualityAssessmentPromise,
      qualityTimeout
    ]);
    
    // Include quality score if available
    if (qualityScore) {
      analysisResult.qualityScore = qualityScore;
    }
    
    return analysisResult;
  }
}
```

### Spec #3: External Alerting System

#### 3.1 Alerting Service Architecture

```typescript
interface AlertChannel {
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'pagerduty';
  config: AlertChannelConfig;
  enabled: boolean;
  severityThresholds: AlertSeverity[];
}

interface AlertingRule {
  id: string;
  name: string;
  condition: AlertCondition;
  channels: string[]; // Alert channel names
  cooldownPeriod: number; // Prevent spam
  escalationRules?: EscalationRule[];
}

class ExternalAlertingService {
  private channels: Map<string, AlertChannel> = new Map();
  private rules: AlertingRule[] = [];
  private cooldownTracker: Map<string, number> = new Map();
  
  async initializeChannels(): Promise<void> {
    // Email channel
    this.registerChannel({
      name: 'engineering_email',
      type: 'email',
      config: {
        smtpHost: process.env.SMTP_HOST,
        smtpPort: parseInt(process.env.SMTP_PORT || '587'),
        smtpUser: process.env.SMTP_USER,
        smtpPassword: process.env.SMTP_PASSWORD,
        recipients: [
          'engineering@ghostjobdetector.com',
          'alerts@ghostjobdetector.com'
        ]
      },
      enabled: true,
      severityThresholds: ['medium', 'high', 'critical']
    });
    
    // Slack channel
    this.registerChannel({
      name: 'slack_engineering',
      type: 'slack',
      config: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: '#engineering-alerts',
        username: 'Ghost Job Detector',
        iconEmoji: ':warning:'
      },
      enabled: true,
      severityThresholds: ['high', 'critical']
    });
    
    // PagerDuty for critical issues
    this.registerChannel({
      name: 'pagerduty_oncall',
      type: 'pagerduty',
      config: {
        serviceKey: process.env.PAGERDUTY_SERVICE_KEY,
        apiUrl: 'https://events.pagerduty.com/v2/enqueue'
      },
      enabled: true,
      severityThresholds: ['critical']
    });
  }
  
  async sendAlert(alert: Alert): Promise<void> {
    // Check cooldown period
    const cooldownKey = `${alert.type}_${alert.severity}`;
    const lastSent = this.cooldownTracker.get(cooldownKey) || 0;
    const cooldownPeriod = this.getCooldownPeriod(alert.severity);
    
    if (Date.now() - lastSent < cooldownPeriod) {
      console.log(`Alert ${alert.type} still in cooldown period`);
      return;
    }
    
    // Find matching alerting rules
    const applicableRules = this.rules.filter(rule => 
      this.evaluateAlertCondition(rule.condition, alert)
    );
    
    // Send alerts through configured channels
    for (const rule of applicableRules) {
      await this.executeAlertingRule(rule, alert);
    }
    
    // Update cooldown tracker
    this.cooldownTracker.set(cooldownKey, Date.now());
  }
  
  private async executeAlertingRule(rule: AlertingRule, alert: Alert): Promise<void> {
    const channelPromises = rule.channels.map(channelName => {
      const channel = this.channels.get(channelName);
      if (!channel || !channel.enabled) return null;
      
      if (!channel.severityThresholds.includes(alert.severity)) return null;
      
      return this.sendToChannel(channel, alert);
    }).filter(Boolean);
    
    await Promise.allSettled(channelPromises);
  }
  
  private async sendToChannel(channel: AlertChannel, alert: Alert): Promise<void> {
    switch (channel.type) {
      case 'email':
        return this.sendEmailAlert(channel, alert);
      case 'slack':
        return this.sendSlackAlert(channel, alert);
      case 'pagerduty':
        return this.sendPagerDutyAlert(channel, alert);
      case 'webhook':
        return this.sendWebhookAlert(channel, alert);
      case 'sms':
        return this.sendSMSAlert(channel, alert);
    }
  }
  
  private async sendSlackAlert(channel: AlertChannel, alert: Alert): Promise<void> {
    const slackMessage = {
      channel: channel.config.channel,
      username: channel.config.username,
      icon_emoji: channel.config.iconEmoji,
      attachments: [{
        color: this.getSeverityColor(alert.severity),
        title: `🚨 ${alert.type.toUpperCase()} Alert`,
        text: alert.message,
        fields: [
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Service',
            value: 'Ghost Job Detector',
            short: true
          },
          {
            title: 'Time',
            value: new Date(alert.timestamp).toISOString(),
            short: true
          }
        ],
        actions: [{
          type: 'button',
          text: 'View Dashboard',
          url: 'https://ghostjobdetector.vercel.app/health'
        }]
      }]
    };
    
    const response = await fetch(channel.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send Slack alert: ${response.statusText}`);
    }
  }
}
```

#### 3.2 Alerting Rules Configuration

```typescript
// Configure alerting rules for different scenarios
const alertingRules: AlertingRule[] = [
  {
    id: 'sla_violation',
    name: 'SLA Compliance Violation',
    condition: {
      type: 'metric_threshold',
      metric: 'uptime',
      operator: 'less_than',
      threshold: 99.9,
      timeWindow: '5m'
    },
    channels: ['engineering_email', 'slack_engineering'],
    cooldownPeriod: 15 * 60 * 1000 // 15 minutes
  },
  {
    id: 'high_error_rate',
    name: 'High Error Rate Detected',
    condition: {
      type: 'metric_threshold',
      metric: 'error_rate',
      operator: 'greater_than',
      threshold: 5, // 5% error rate
      timeWindow: '5m'
    },
    channels: ['slack_engineering'],
    cooldownPeriod: 10 * 60 * 1000 // 10 minutes
  },
  {
    id: 'critical_service_failure',
    name: 'Critical Service Failure',
    condition: {
      type: 'service_status',
      service: 'webllm_service',
      status: 'down'
    },
    channels: ['engineering_email', 'slack_engineering', 'pagerduty_oncall'],
    cooldownPeriod: 5 * 60 * 1000, // 5 minutes
    escalationRules: [{
      delay: 15 * 60 * 1000, // Escalate after 15 minutes
      channels: ['pagerduty_oncall']
    }]
  }
];
```

#### 3.3 Integration with Production Monitor

```typescript
// Modify WebLLMProductionMonitor to use external alerting
class WebLLMProductionMonitor {
  private alertingService: ExternalAlertingService;
  
  constructor() {
    this.alertingService = new ExternalAlertingService();
    this.alertingService.initializeChannels();
  }
  
  async trackSLACompliance(): Promise<SLAMetrics> {
    const slaMetrics = await this.calculateSLAMetrics();
    
    // Check for SLA violations
    if (slaMetrics.uptime < this.slaTargets.uptime) {
      await this.alertingService.sendAlert({
        id: generateId(),
        type: 'sla_violation',
        severity: 'high',
        message: `SLA violation detected: Uptime ${slaMetrics.uptime}% below target ${this.slaTargets.uptime}%`,
        timestamp: Date.now(),
        metadata: {
          currentUptime: slaMetrics.uptime,
          targetUptime: this.slaTargets.uptime,
          affectedServices: ['webllm_parsing', 'job_analysis']
        }
      });
    }
    
    if (slaMetrics.averageResponseTime > this.slaTargets.responseTime) {
      await this.alertingService.sendAlert({
        id: generateId(),
        type: 'performance_degradation',
        severity: 'medium',
        message: `Response time degradation: ${slaMetrics.averageResponseTime}ms exceeds target ${this.slaTargets.responseTime}ms`,
        timestamp: Date.now(),
        metadata: {
          currentResponseTime: slaMetrics.averageResponseTime,
          targetResponseTime: this.slaTargets.responseTime,
          p95ResponseTime: slaMetrics.p95ResponseTime
        }
      });
    }
    
    return slaMetrics;
  }
}
```

## Implementation Plan

### Phase 1: Performance Metrics Collection (Week 1)
1. **Day 1-2**: Create database schema and migrations
2. **Day 3-4**: Implement RealTimeMetricsCollector
3. **Day 5**: Integrate with WebLLMServiceManager
4. **Day 6-7**: Testing and validation

### Phase 2: Quality Assurance Integration (Week 2)
1. **Day 1-2**: Implement LiveQualityAssurance service
2. **Day 3-4**: Integrate with main analysis flow
3. **Day 5**: Add quality scoring to API responses
4. **Day 6-7**: Testing and performance optimization

### Phase 3: External Alerting System (Week 3)
1. **Day 1-2**: Implement ExternalAlertingService
2. **Day 3**: Configure Slack and email channels
3. **Day 4**: Integrate with production monitor
4. **Day 5**: Add PagerDuty integration
5. **Day 6-7**: End-to-end testing and documentation

## Environment Variables Required

```env
# SMTP Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key

# Slack Integration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url

# PagerDuty Integration
PAGERDUTY_SERVICE_KEY=your_pagerduty_integration_key

# Metrics Database
METRICS_DATABASE_URL=postgresql://user:pass@host:5432/metrics_db
```

## Success Criteria

### Phase 1 Success Criteria:
- [ ] Real success rates measured and displayed (target: match 90-95% actual performance)
- [ ] P95/P99 response times calculated and tracked
- [ ] Cache hit rates measured and optimized (target: 80%+ hit rate)

### Phase 2 Success Criteria:
- [ ] Quality scores integrated into all analysis results
- [ ] Quality degradation automatically detected and alerted
- [ ] Quality trends tracked over time

### Phase 3 Success Criteria:
- [ ] Alerts sent to Slack within 30 seconds of detection
- [ ] Email notifications for SLA violations
- [ ] PagerDuty incidents created for critical issues
- [ ] Cooldown periods prevent alert spam

This implementation will transform the documentation from aspirational claims to measurable reality, providing genuine enterprise-grade monitoring and alerting capabilities.