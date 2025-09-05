/**
 * Production Monitoring and Alerting System - Phase 4 Implementation
 * Enterprise-grade monitoring, alerting, and incident response
 */

export interface ProductionAlert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  type: 'performance' | 'reliability' | 'accuracy' | 'security' | 'capacity';
  title: string;
  description: string;
  timestamp: Date;
  source: string;
  metadata: any;
  status: 'active' | 'acknowledged' | 'resolved';
  actions: string[];
  escalationLevel: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'outage';
  uptime: number;
  lastIncident?: Date;
  activeAlerts: number;
  systemLoad: {
    cpu: number;
    memory: number;
    requests: number;
  };
  businessImpact: 'none' | 'minimal' | 'moderate' | 'severe';
}

export interface IncidentReport {
  id: string;
  title: string;
  description: string;
  severity: ProductionAlert['severity'];
  startTime: Date;
  endTime?: Date;
  duration?: number;
  rootCause?: string;
  resolution?: string;
  affectedUsers?: number;
  businessImpact: string;
  postMortemRequired: boolean;
  lessons: string[];
  preventionMeasures: string[];
}

export interface ProductionMetrics {
  availability: {
    uptime: number;
    sla: number;
    mtbf: number; // Mean Time Between Failures
    mttr: number; // Mean Time To Recovery
  };
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    throughput: number;
    errorRate: number;
  };
  quality: {
    accuracyScore: number;
    consistencyScore: number;
    userSatisfaction: number;
  };
  business: {
    successfulJobs: number;
    failedJobs: number;
    costPerJob: number;
    revenueImpact: number;
  };
}

/**
 * Production monitoring and alerting for WebLLM system
 */
export class WebLLMProductionMonitor {
  private static instance: WebLLMProductionMonitor;
  
  private alerts: ProductionAlert[] = [];
  private incidents: IncidentReport[] = [];
  private systemMetrics: ProductionMetrics;
  
  private alertListeners: Array<(alert: ProductionAlert) => void> = [];
  private incidentListeners: Array<(incident: IncidentReport) => void> = [];
  
  // SLA thresholds
  private readonly slaThresholds = {
    availability: 0.999, // 99.9% uptime
    responseTime: 3000, // 3 seconds
    errorRate: 0.01, // 1% error rate
    accuracy: 0.90 // 90% accuracy
  };
  
  // Alert escalation rules
  private readonly escalationRules = {
    critical: { timeout: 5 * 60 * 1000, maxLevel: 3 }, // 5 minutes
    high: { timeout: 15 * 60 * 1000, maxLevel: 2 }, // 15 minutes
    medium: { timeout: 60 * 60 * 1000, maxLevel: 1 }, // 1 hour
    low: { timeout: 4 * 60 * 60 * 1000, maxLevel: 1 }, // 4 hours
    info: { timeout: 24 * 60 * 60 * 1000, maxLevel: 0 } // 24 hours
  };

  private startTime = Date.now();
  private lastHealthCheck = Date.now();

  private constructor() {
    this.systemMetrics = this.initializeMetrics();
    this.startProductionMonitoring();
  }

  public static getInstance(): WebLLMProductionMonitor {
    if (!WebLLMProductionMonitor.instance) {
      WebLLMProductionMonitor.instance = new WebLLMProductionMonitor();
    }
    return WebLLMProductionMonitor.instance;
  }

  /**
   * Record successful job processing
   */
  recordSuccess(responseTime: number, accuracy?: number): void {
    this.systemMetrics.business.successfulJobs++;
    this.updatePerformanceMetrics(responseTime, true);
    
    if (accuracy) {
      this.updateQualityMetrics(accuracy);
    }
    
    // Check for SLA violations
    this.checkSLACompliance();
    
    this.lastHealthCheck = Date.now();
  }

  /**
   * Record failed job processing
   */
  recordFailure(responseTime: number, error: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
    this.systemMetrics.business.failedJobs++;
    this.systemMetrics.performance.errorRate = this.calculateErrorRate();
    this.updatePerformanceMetrics(responseTime, false);
    
    // Create alert for significant failures
    if (severity === 'critical' || severity === 'high') {
      this.createAlert({
        severity,
        type: 'reliability',
        title: `WebLLM ${severity === 'critical' ? 'Critical' : 'High'} Failure`,
        description: `Job processing failed: ${error}`,
        source: 'webllm-service',
        metadata: { error, responseTime }
      });
    }
    
    // Check for incident threshold
    this.checkIncidentThresholds();
    
    this.lastHealthCheck = Date.now();
  }

  /**
   * Get current system health status
   */
  getSystemHealth(): SystemHealth {
    const uptime = Date.now() - this.startTime;
    const activeAlerts = this.alerts.filter(a => a.status === 'active').length;
    const criticalAlerts = this.alerts.filter(a => a.status === 'active' && a.severity === 'critical').length;
    
    // Determine status
    let status: SystemHealth['status'] = 'healthy';
    let businessImpact: SystemHealth['businessImpact'] = 'none';
    
    if (criticalAlerts > 0) {
      status = 'outage';
      businessImpact = 'severe';
    } else if (activeAlerts > 3 || this.systemMetrics.performance.errorRate > 0.1) {
      status = 'degraded';
      businessImpact = 'moderate';
    } else if (activeAlerts > 1 || this.systemMetrics.performance.errorRate > 0.05) {
      businessImpact = 'minimal';
    }
    
    return {
      status,
      uptime,
      lastIncident: this.getLastIncident()?.startTime,
      activeAlerts,
      systemLoad: {
        cpu: this.estimateSystemLoad().cpu,
        memory: this.estimateSystemLoad().memory,
        requests: this.systemMetrics.performance.throughput
      },
      businessImpact
    };
  }

  /**
   * Get production metrics
   */
  getProductionMetrics(): ProductionMetrics {
    return { ...this.systemMetrics };
  }

  /**
   * Create production alert
   */
  createAlert(alertData: {
    severity: ProductionAlert['severity'];
    type: ProductionAlert['type'];
    title: string;
    description: string;
    source: string;
    metadata?: any;
  }): ProductionAlert {
    const alert: ProductionAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...alertData,
      metadata: alertData.metadata || {},
      timestamp: new Date(),
      status: 'active',
      actions: this.generateAlertActions(alertData.severity, alertData.type),
      escalationLevel: 0
    };
    
    this.alerts.push(alert);
    
    // Limit alert history
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }
    
    // Notify listeners
    this.notifyAlertListeners(alert);
    
    // Schedule escalation
    this.scheduleEscalation(alert);
    
    console.warn(`🚨 Production Alert [${alert.severity}]: ${alert.title}`, {
      type: alert.type,
      source: alert.source,
      id: alert.id
    });
    
    return alert;
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert || alert.status !== 'active') {
      return false;
    }
    
    alert.status = 'acknowledged';
    alert.metadata = {
      ...alert.metadata,
      acknowledgedBy,
      acknowledgedAt: new Date()
    };
    
    console.log(`✅ Alert acknowledged: ${alert.title} by ${acknowledgedBy}`);
    return true;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string, resolvedBy: string, resolution: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) {
      return false;
    }
    
    alert.status = 'resolved';
    alert.metadata = {
      ...alert.metadata,
      resolvedBy,
      resolvedAt: new Date(),
      resolution
    };
    
    console.log(`🔧 Alert resolved: ${alert.title} by ${resolvedBy}`);
    return true;
  }

  /**
   * Create incident report
   */
  createIncident(incidentData: {
    title: string;
    description: string;
    severity: ProductionAlert['severity'];
    affectedUsers?: number;
    businessImpact: string;
  }): IncidentReport {
    const incident: IncidentReport = {
      id: `incident_${Date.now()}`,
      ...incidentData,
      startTime: new Date(),
      postMortemRequired: incidentData.severity === 'critical' || incidentData.severity === 'high',
      lessons: [],
      preventionMeasures: []
    };
    
    this.incidents.push(incident);
    
    // Notify listeners
    this.notifyIncidentListeners(incident);
    
    console.error(`🚨 Production Incident [${incident.severity}]: ${incident.title}`, {
      affectedUsers: incident.affectedUsers,
      businessImpact: incident.businessImpact
    });
    
    return incident;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(severity?: ProductionAlert['severity']): ProductionAlert[] {
    let alerts = this.alerts.filter(a => a.status === 'active');
    
    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }
    
    return alerts.sort((a, b) => {
      // Sort by severity priority, then by timestamp
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      
      if (severityDiff !== 0) return severityDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }

  /**
   * Get recent incidents
   */
  getRecentIncidents(limit = 10): IncidentReport[] {
    return this.incidents
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  /**
   * Subscribe to alerts
   */
  onAlert(callback: (alert: ProductionAlert) => void): void {
    this.alertListeners.push(callback);
  }

  /**
   * Subscribe to incidents
   */
  onIncident(callback: (incident: IncidentReport) => void): void {
    this.incidentListeners.push(callback);
  }

  /**
   * Start production monitoring
   */
  private startProductionMonitoring(): void {
    // Health check every 30 seconds
    setInterval(() => {
      this.performHealthCheck();
    }, 30000);
    
    // Metrics calculation every minute
    setInterval(() => {
      this.updateSystemMetrics();
    }, 60000);
    
    // Alert cleanup every hour
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 3600000);
    
    console.log('🔍 Production monitoring started');
  }

  /**
   * Perform system health check
   */
  private performHealthCheck(): void {
    
    // Check for stale system (no activity in 5 minutes)
    if (Date.now() - this.lastHealthCheck > 5 * 60 * 1000) {
      this.createAlert({
        severity: 'medium',
        type: 'performance',
        title: 'System Activity Warning',
        description: 'No WebLLM activity detected in the last 5 minutes',
        source: 'health-monitor',
        metadata: { lastActivity: new Date(this.lastHealthCheck) }
      });
    }
    
    // Check SLA compliance
    if (this.systemMetrics.availability.uptime < this.slaThresholds.availability) {
      this.createAlert({
        severity: 'high',
        type: 'reliability',
        title: 'SLA Availability Breach',
        description: `System availability ${(this.systemMetrics.availability.uptime * 100).toFixed(2)}% below SLA target of ${(this.slaThresholds.availability * 100).toFixed(1)}%`,
        source: 'sla-monitor',
        metadata: { currentUptime: this.systemMetrics.availability.uptime }
      });
    }
  }

  /**
   * Update system metrics
   */
  private updateSystemMetrics(): void {
    // Update availability metrics
    this.systemMetrics.availability.uptime = this.calculateUptime();
    
    // Update business metrics
    const totalJobs = this.systemMetrics.business.successfulJobs + this.systemMetrics.business.failedJobs;
    if (totalJobs > 0) {
      this.systemMetrics.performance.errorRate = this.systemMetrics.business.failedJobs / totalJobs;
    }
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): ProductionMetrics {
    return {
      availability: {
        uptime: 1.0,
        sla: this.slaThresholds.availability,
        mtbf: 0,
        mttr: 0
      },
      performance: {
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        throughput: 0,
        errorRate: 0
      },
      quality: {
        accuracyScore: 0,
        consistencyScore: 0,
        userSatisfaction: 0
      },
      business: {
        successfulJobs: 0,
        failedJobs: 0,
        costPerJob: 0.001, // Estimated
        revenueImpact: 0
      }
    };
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(responseTime: number, _success: boolean): void {
    // Update response time statistics
    const metrics = this.systemMetrics.performance;
    const totalRequests = this.systemMetrics.business.successfulJobs + this.systemMetrics.business.failedJobs;
    
    if (totalRequests === 1) {
      metrics.avgResponseTime = responseTime;
    } else {
      metrics.avgResponseTime = ((metrics.avgResponseTime * (totalRequests - 1)) + responseTime) / totalRequests;
    }
    
    // Estimate percentiles (simplified)
    metrics.p95ResponseTime = Math.max(metrics.p95ResponseTime, responseTime * 0.95);
    metrics.p99ResponseTime = Math.max(metrics.p99ResponseTime, responseTime * 0.99);
    
    // Update throughput (requests per minute)
    const uptimeMinutes = (Date.now() - this.startTime) / (1000 * 60);
    metrics.throughput = totalRequests / Math.max(uptimeMinutes, 1);
  }

  /**
   * Update quality metrics
   */
  private updateQualityMetrics(accuracy: number): void {
    const quality = this.systemMetrics.quality;
    const successfulJobs = this.systemMetrics.business.successfulJobs;
    
    if (successfulJobs === 1) {
      quality.accuracyScore = accuracy;
    } else {
      quality.accuracyScore = ((quality.accuracyScore * (successfulJobs - 1)) + accuracy) / successfulJobs;
    }
  }

  /**
   * Calculate system uptime
   */
  private calculateUptime(): number {
    const totalTime = Date.now() - this.startTime;
    const downtime = this.calculateDowntime();
    return Math.max(0, (totalTime - downtime) / totalTime);
  }

  /**
   * Calculate total downtime
   */
  private calculateDowntime(): number {
    // Calculate downtime based on critical incidents
    return this.incidents
      .filter(incident => incident.severity === 'critical')
      .reduce((total, incident) => {
        if (incident.endTime) {
          return total + (incident.endTime.getTime() - incident.startTime.getTime());
        }
        return total + (Date.now() - incident.startTime.getTime()); // Ongoing incident
      }, 0);
  }

  /**
   * Calculate current error rate
   */
  private calculateErrorRate(): number {
    const totalJobs = this.systemMetrics.business.successfulJobs + this.systemMetrics.business.failedJobs;
    return totalJobs > 0 ? this.systemMetrics.business.failedJobs / totalJobs : 0;
  }

  /**
   * Check SLA compliance
   */
  private checkSLACompliance(): void {
    const metrics = this.systemMetrics;
    
    // Response time SLA
    if (metrics.performance.avgResponseTime > this.slaThresholds.responseTime) {
      this.createAlert({
        severity: 'medium',
        type: 'performance',
        title: 'Response Time SLA Breach',
        description: `Average response time ${Math.round(metrics.performance.avgResponseTime)}ms exceeds SLA target of ${this.slaThresholds.responseTime}ms`,
        source: 'sla-monitor',
        metadata: { currentResponseTime: metrics.performance.avgResponseTime }
      });
    }
    
    // Error rate SLA
    if (metrics.performance.errorRate > this.slaThresholds.errorRate) {
      this.createAlert({
        severity: 'high',
        type: 'reliability',
        title: 'Error Rate SLA Breach',
        description: `Error rate ${(metrics.performance.errorRate * 100).toFixed(2)}% exceeds SLA target of ${(this.slaThresholds.errorRate * 100).toFixed(1)}%`,
        source: 'sla-monitor',
        metadata: { currentErrorRate: metrics.performance.errorRate }
      });
    }
  }

  /**
   * Check for incident thresholds
   */
  private checkIncidentThresholds(): void {
    const recentFailures = this.systemMetrics.business.failedJobs;
    const errorRate = this.systemMetrics.performance.errorRate;
    
    // Major incident threshold
    if (errorRate > 0.5 && recentFailures > 10) {
      this.createIncident({
        title: 'Major WebLLM Service Degradation',
        description: `High error rate (${(errorRate * 100).toFixed(1)}%) with ${recentFailures} recent failures`,
        severity: 'critical',
        affectedUsers: Math.round(recentFailures * 0.8), // Estimate
        businessImpact: 'Severe - Job parsing functionality compromised'
      });
    }
  }

  /**
   * Generate alert actions
   */
  private generateAlertActions(severity: string, type: string): string[] {
    const actions: string[] = [];
    
    if (severity === 'critical') {
      actions.push('Immediate investigation required');
      actions.push('Consider activating incident response team');
    }
    
    if (type === 'performance') {
      actions.push('Check system resources and scaling');
      actions.push('Review recent deployments');
    } else if (type === 'reliability') {
      actions.push('Investigate error patterns');
      actions.push('Check circuit breaker status');
    } else if (type === 'accuracy') {
      actions.push('Review model performance');
      actions.push('Validate recent prompt changes');
    }
    
    actions.push('Update stakeholders');
    return actions;
  }

  /**
   * Schedule alert escalation
   */
  private scheduleEscalation(alert: ProductionAlert): void {
    const rule = this.escalationRules[alert.severity];
    
    setTimeout(() => {
      if (alert.status === 'active' && alert.escalationLevel < rule.maxLevel) {
        alert.escalationLevel++;
        console.warn(`🔺 Alert escalated to level ${alert.escalationLevel}: ${alert.title}`);
        
        // Schedule next escalation
        if (alert.escalationLevel < rule.maxLevel) {
          this.scheduleEscalation(alert);
        }
      }
    }, rule.timeout);
  }

  /**
   * Estimate system load (simplified)
   */
  private estimateSystemLoad(): { cpu: number; memory: number } {
    const activeAlerts = this.alerts.filter(a => a.status === 'active').length;
    const throughput = this.systemMetrics.performance.throughput;
    
    return {
      cpu: Math.min(100, (throughput * 2) + (activeAlerts * 5)),
      memory: Math.min(100, (throughput * 1.5) + (activeAlerts * 3))
    };
  }

  /**
   * Get last incident
   */
  private getLastIncident(): IncidentReport | undefined {
    return this.incidents
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0];
  }

  /**
   * Notify alert listeners
   */
  private notifyAlertListeners(alert: ProductionAlert): void {
    this.alertListeners.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Alert listener error:', error);
      }
    });
  }

  /**
   * Notify incident listeners
   */
  private notifyIncidentListeners(incident: IncidentReport): void {
    this.incidentListeners.forEach(callback => {
      try {
        callback(incident);
      } catch (error) {
        console.error('Incident listener error:', error);
      }
    });
  }

  /**
   * Cleanup old resolved alerts
   */
  private cleanupOldAlerts(): void {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    const initialCount = this.alerts.length;
    this.alerts = this.alerts.filter(alert => 
      alert.status === 'active' || 
      alert.status === 'acknowledged' ||
      alert.timestamp.getTime() > oneDayAgo
    );
    
    const cleanedCount = initialCount - this.alerts.length;
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old alerts`);
    }
  }
}