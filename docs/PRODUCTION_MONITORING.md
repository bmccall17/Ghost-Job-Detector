# Production Monitoring Setup - Ghost Job Detector

**Status:** Phase 3 Complete ✅  
**Health Endpoint:** `/api/health`  
**Last Updated:** August 25, 2025

---

## 🎯 Monitoring Overview

The Ghost Job Detector platform includes comprehensive production monitoring designed to ensure 99.9% uptime and optimal user experience for the live metadata extraction system.

### **Key Monitoring Endpoints**

| Endpoint | Purpose | Expected Response |
|----------|---------|------------------|
| `GET /api/health` | System health check | 200 (healthy), 503 (unhealthy) |
| `GET /api/analyze` | Core functionality test | <2s response time |
| `GET /api/analysis-history` | Database connectivity | Active connection verified |

### **Critical Metrics Dashboard**

```javascript
// Real-time monitoring configuration
const criticalMetrics = {
  // System Health
  healthEndpoint: {
    url: 'https://ghost-job-detector-lilac.vercel.app/api/health',
    interval: '30s',
    timeout: '10s',
    expectedStatus: [200, 503],
    alerts: ['response_time > 5000ms', 'status == unhealthy']
  },

  // Metadata Extraction Performance  
  metadataExtraction: {
    url: 'https://ghost-job-detector-lilac.vercel.app/api/analyze?stream=metadata',
    interval: '2m',
    testData: { url: 'https://example.com/test-job' },
    expectedResponseTime: '<2000ms',
    alerts: ['response_time > 5000ms', 'error_rate > 5%']
  },

  // Database Performance
  database: {
    metric: 'database_response_time',
    threshold: '1000ms',
    alerts: ['response_time > 2000ms', 'connection_errors > 0']
  },

  // Memory and Resource Usage
  resources: {
    heapMemory: { threshold: '512MB', critical: '800MB' },
    functionCount: { current: 8, limit: 12, alert: 10 },
    uptime: { expected: '>99.9%' }
  }
};
```

---

## 📊 Health Check System

### **Health Check Response Format**

```json
{
  "timestamp": "2025-08-25T12:00:00.000Z",
  "status": "healthy|degraded|unhealthy", 
  "version": "0.1.8",
  "environment": "production",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTimeMs": 150,
      "message": "Database connection successful"
    },
    "metadata": {
      "status": "healthy", 
      "responseTimeMs": 200,
      "extractionSupported": true,
      "streamingSupported": true,
      "message": "Metadata extraction system operational"
    },
    "performance": {
      "status": "healthy",
      "memory": {
        "rss": 120,
        "heapTotal": 80, 
        "heapUsed": 45,
        "external": 15
      },
      "uptime": 3600,
      "message": "Memory usage: 45MB heap"
    },
    "activity": {
      "status": "healthy",
      "analyses24h": 150,
      "avgProcessingTimeMs": 800,
      "message": "150 analyses in last 24h"
    },
    "resources": {
      "status": "healthy", 
      "functions": {
        "current": 8,
        "limit": 12,
        "available": 4,
        "percentage": 66
      },
      "message": "8/12 functions used (66%)"
    }
  },
  "metrics": {
    "totalResponseTimeMs": 450,
    "checksCompleted": 5,
    "timestamp": "2025-08-25T12:00:00.000Z"
  },
  "errors": []
}
```

### **Status Definitions**

- **healthy (200)**: All systems operational, performance within targets
- **degraded (200)**: Minor issues detected, core functionality available  
- **unhealthy (503)**: Critical systems down, service may be unavailable

---

## 🚨 Alert Configuration

### **Critical Alerts (Immediate Response - 1 minute)**

```yaml
# High-priority alerts requiring immediate attention
alerts:
  - name: "Service Unavailable"
    condition: "health_status == 'unhealthy'"
    channels: ["pagerduty", "slack-emergency", "sms"]
    
  - name: "Database Connection Failed"
    condition: "database.status == 'unhealthy'"
    channels: ["pagerduty", "slack-emergency"]
    
  - name: "High Error Rate"
    condition: "error_rate > 10% for 2 minutes"
    channels: ["pagerduty", "slack-emergency"]
    
  - name: "Memory Critical"
    condition: "heap_memory > 800MB"
    channels: ["pagerduty", "slack-engineering"]
```

### **Warning Alerts (Response - 5 minutes)**

```yaml
alerts:
  - name: "Degraded Performance"
    condition: "health_status == 'degraded'"
    channels: ["slack-engineering"]
    
  - name: "Slow Response Time"
    condition: "avg_response_time > 3000ms for 5 minutes"
    channels: ["slack-engineering"]
    
  - name: "High Memory Usage"
    condition: "heap_memory > 512MB"
    channels: ["slack-engineering"]
    
  - name: "Function Limit Warning"
    condition: "function_count > 10"
    channels: ["slack-engineering"]
```

### **Information Alerts (Response - 15 minutes)**

```yaml
alerts:
  - name: "Low Activity"
    condition: "analyses_24h < 10"
    channels: ["slack-product"]
    
  - name: "Metadata Extraction Degraded"
    condition: "metadata_success_rate < 80%"
    channels: ["slack-engineering"]
```

---

## 📈 Performance Benchmarks

### **Response Time Targets**

| Endpoint | Target | Warning | Critical |
|----------|--------|---------|----------|
| `/api/health` | <500ms | <2s | <5s |
| `/api/analyze` | <2s | <5s | <10s |  
| `/api/analysis-history` | <1s | <3s | <5s |
| Metadata streaming | <2s first field | <5s | <10s |

### **Availability Targets**

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Overall Uptime** | 99.9% | 8.77 hours downtime/year |
| **API Availability** | 99.95% | 4.38 hours downtime/year |
| **Database Uptime** | 99.99% | 52 minutes downtime/year |

### **Resource Usage Baselines**

| Resource | Normal | Warning | Critical |
|----------|--------|---------|----------|
| **Heap Memory** | <256MB | <512MB | <800MB |
| **Response Time** | <1s | <3s | <5s |
| **Error Rate** | <1% | <5% | <10% |
| **Function Count** | 8/12 | 10/12 | 12/12 |

---

## 🔧 Monitoring Tools Integration

### **Primary Monitoring Stack**

1. **Health Check Endpoint** (`/api/health`)
   - Custom-built comprehensive health monitoring
   - 30-second interval checks
   - Detailed system metrics and error reporting

2. **Vercel Analytics** 
   - Built-in performance monitoring
   - Real user monitoring (RUM) 
   - Core Web Vitals tracking

3. **External Uptime Monitoring**
   ```bash
   # Recommended external services
   curl -X GET https://ghost-job-detector-lilac.vercel.app/api/health
   # Monitor: response time, status codes, content validation
   ```

### **Log Analysis**

```bash
# Production log monitoring commands
vercel logs --prod --since=1h
vercel logs --prod --filter="ERROR"
vercel logs --prod --filter="metadata extraction"
```

### **Performance Monitoring Queries**

```javascript
// Custom monitoring dashboard queries
const monitoringQueries = {
  // Average response time last hour  
  avgResponseTime: `
    SELECT AVG(totalResponseTimeMs) as avg_response_time
    FROM health_checks 
    WHERE timestamp > NOW() - INTERVAL '1 hour'
  `,
  
  // Error rate by endpoint
  errorRate: `
    SELECT endpoint, 
           COUNT(*) as total_requests,
           SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as errors,
           (SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as error_rate
    FROM request_logs 
    WHERE timestamp > NOW() - INTERVAL '1 hour'
    GROUP BY endpoint
  `,
  
  // Metadata extraction success rate
  metadataSuccessRate: `
    SELECT 
      COUNT(*) as total_extractions,
      SUM(CASE WHEN metadata IS NOT NULL THEN 1 ELSE 0 END) as successful,
      (SUM(CASE WHEN metadata IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as success_rate
    FROM analyses 
    WHERE createdAt > NOW() - INTERVAL '1 hour'
  `
};
```

---

## 🚀 Deployment Monitoring

### **Pre-Deployment Checks**

```bash
# Phase 3 deployment validation
npm run typecheck          # TypeScript validation
npm run build              # Build verification  
node scripts/verify-function-count.js  # Function limit check
curl -f https://ghost-job-detector-lilac.vercel.app/api/health  # Health check
```

### **Post-Deployment Monitoring**

```bash
# Immediate post-deployment checks (first 5 minutes)
watch -n 10 'curl -s https://ghost-job-detector-lilac.vercel.app/api/health | jq .status'

# Extended monitoring (first hour)
vercel logs --prod --follow --filter="ERROR|WARN"
```

### **Rollback Criteria**

Automatic rollback triggers:
- Health status = "unhealthy" for >2 minutes
- Error rate >15% for >3 minutes  
- Response time >10s for >5 minutes
- Database connection failures for >1 minute

---

## 📋 Operational Procedures

### **Daily Health Checks**

```bash
# Daily operations checklist
curl https://ghost-job-detector-lilac.vercel.app/api/health | jq
vercel logs --prod --since=24h --filter="ERROR" | wc -l
node scripts/verify-function-count.js
```

### **Weekly Performance Review**

1. Review response time trends
2. Analyze error patterns and resolution
3. Check resource usage growth
4. Validate metadata extraction accuracy
5. Update performance baselines if needed

### **Monthly Capacity Planning**

1. Function count utilization review
2. Memory usage trend analysis  
3. Database performance optimization
4. Vercel plan limits assessment
5. Monitoring alert threshold adjustments

---

**Monitoring Status:** ✅ **Fully Operational**  
**Next Review:** September 25, 2025  
**Contact:** Engineering Team - Slack: #ghost-job-detector