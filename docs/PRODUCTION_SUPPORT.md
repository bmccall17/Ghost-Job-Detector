# Production Support Guide - Ghost Job Detector

**Version:** Phase 3 Complete  
**Last Updated:** August 25, 2025  
**On-Call Contact:** Engineering Team  

---

## 🚨 Emergency Procedures

### **Immediate Response (0-5 minutes)**

1. **Check System Status**
   ```bash
   curl https://ghost-job-detector-lilac.vercel.app/api/health
   ```

2. **Identify Issue Severity**
   - **P0 (Critical)**: Complete service outage, data loss risk
   - **P1 (High)**: Major functionality broken, user impact >50%  
   - **P2 (Medium)**: Minor functionality issues, user impact <50%
   - **P3 (Low)**: Performance degradation, no functional impact

3. **P0/P1 Emergency Actions**
   ```bash
   # Check recent deployments
   vercel deployments list --prod
   
   # View production logs  
   vercel logs --prod --since=1h
   
   # Quick rollback if needed
   vercel rollback [deployment-url] --prod
   ```

### **Escalation Path**

1. **0-5 minutes**: On-call engineer responds
2. **5-15 minutes**: Engineering lead notified for P0/P1
3. **15-30 minutes**: Product manager notified for P0
4. **30+ minutes**: Leadership escalation for extended P0 outages

---

## 📊 Common Issues & Solutions

### **1. Service Unavailable (503 Error)**

**Symptoms:** Health check returns `"status": "unhealthy"`  
**Likely Causes:** Database connectivity, memory exhaustion, function timeout

**Diagnostic Steps:**
```bash
# Check health endpoint details
curl -s https://ghost-job-detector-lilac.vercel.app/api/health | jq

# Check recent logs for errors
vercel logs --prod --since=30m --filter="ERROR"

# Check function execution times
vercel logs --prod --since=30m --filter="timeout"
```

**Resolution:**
1. If database issue: Check Neon database status
2. If memory issue: Redeploy to refresh instance
3. If function timeout: Investigate slow queries/API calls

**Prevention:** Monitor health checks every 30 seconds

---

### **2. Metadata Extraction Failures**

**Symptoms:** Users report "Unknown Position/Company" consistently  
**Likely Causes:** CORS proxy failures, LinkedIn blocking, API rate limits

**Diagnostic Steps:**
```bash
# Test metadata endpoint directly
curl -X POST https://ghost-job-detector-lilac.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url":"https://linkedin.com/jobs/view/123","title":"Test","company":"Test"}'

# Check proxy failure logs
vercel logs --prod --since=1h --filter="proxy.*failed"
```

**Resolution:**
1. **Proxy Issues**: System automatically falls back to URL-based extraction
2. **LinkedIn Blocking**: Expected behavior - URL extraction works
3. **Rate Limits**: Temporary - wait for reset or implement backoff

**Immediate Fix:** Users can manually edit fields using click-to-edit interface

---

### **3. High Response Times (>5 seconds)**

**Symptoms:** Slow page loads, timeout errors, user complaints  
**Likely Causes:** Database query performance, cold starts, traffic spikes

**Diagnostic Steps:**
```bash
# Check response times in health data
curl -s https://ghost-job-detector-lilac.vercel.app/api/health | jq .checks.performance

# Monitor real-time response times  
watch -n 5 'curl -s -w "%{time_total}" -o /dev/null https://ghost-job-detector-lilac.vercel.app/api/health'

# Check for database slow queries
vercel logs --prod --since=1h --filter="slow query"
```

**Resolution:**
1. **Cold Starts**: Deploy to warm up functions
2. **Database**: Optimize slow queries, check connection pool
3. **Traffic Spike**: Monitor auto-scaling, consider upgrade

**Mitigation:** Enable caching for static data, optimize database indexes

---

### **4. Memory Exhaustion**

**Symptoms:** Functions timing out, "out of memory" errors  
**Likely Causes:** Memory leaks in metadata processing, large payloads

**Diagnostic Steps:**
```bash
# Check memory usage in health data
curl -s https://ghost-job-detector-lilac.vercel.app/api/health | jq .checks.performance.memory

# Look for memory-related errors
vercel logs --prod --since=1h --filter="memory\|heap\|allocation"
```

**Resolution:**
1. **Immediate**: Redeploy to reset memory usage
2. **Short-term**: Optimize metadata processing code
3. **Long-term**: Implement request size limits, add memory monitoring

---

## 🔧 Diagnostic Commands

### **System Health Commands**

```bash
# Comprehensive health check
curl -s https://ghost-job-detector-lilac.vercel.app/api/health | jq

# Database connectivity test
curl -s https://ghost-job-detector-lilac.vercel.app/api/analysis-history | head -c 100

# Function count verification
node scripts/verify-function-count.js

# Recent deployment status
vercel deployments list --prod | head -5
```

### **Performance Analysis**

```bash
# Response time measurement
curl -s -w "Response time: %{time_total}s\nStatus: %{http_code}\n" \
  -o /dev/null https://ghost-job-detector-lilac.vercel.app/api/health

# Load test (use sparingly)
for i in {1..10}; do
  curl -s -w "%{time_total}\n" -o /dev/null \
    https://ghost-job-detector-lilac.vercel.app/api/health
done | awk '{sum+=$1} END {print "Average:", sum/NR "s"}'

# Error rate analysis
vercel logs --prod --since=1h | grep -E "(ERROR|4[0-9][0-9]|5[0-9][0-9])" | wc -l
```

### **Log Analysis Commands**

```bash
# Recent error patterns
vercel logs --prod --since=2h --filter="ERROR" | tail -20

# Metadata extraction issues
vercel logs --prod --since=1h --filter="metadata.*failed\|proxy.*error"

# Performance issues
vercel logs --prod --since=1h --filter="slow\|timeout\|memory"

# User activity patterns  
vercel logs --prod --since=1h --filter="POST.*analyze" | wc -l
```

---

## 📱 User Communication

### **Status Updates**

**During Incident:**
- **Internal**: Update #ghost-job-detector Slack channel every 15 minutes
- **External**: Consider status page updates for P0 incidents >30 minutes
- **User-facing**: Error messages already include helpful guidance

**Post-Incident:**
- Document root cause and resolution  
- Update monitoring if new failure mode discovered
- Consider user-facing improvements to prevent similar issues

### **Customer Support Responses**

**"The site is loading slowly"**
> We're monitoring performance and are aware of some slower response times. Our systems automatically scale to handle increased load. If you continue experiencing issues, please try refreshing the page or waiting a few minutes.

**"Metadata extraction shows 'Unknown Position'"**
> This can happen when job sites block automated data extraction. You can click on any field (like job title or company name) to edit it manually. Our system will still analyze the job posting accurately with your corrections.

**"I'm getting error messages"**
> We apologize for any inconvenience. Our systems include multiple fallback mechanisms. Please try refreshing the page, and if the issue persists, the error should resolve automatically within a few minutes.

---

## 🔄 Recovery Procedures

### **Standard Recovery Process**

1. **Identify Root Cause** (5-10 minutes)
   - Check health endpoint for specific failing component
   - Review logs for error patterns
   - Verify external dependencies (database, proxy services)

2. **Implement Fix** (10-30 minutes)
   - **Code fix**: Create hotfix branch, deploy via GitHub Actions
   - **Config fix**: Update environment variables, redeploy
   - **Infrastructure fix**: Scale resources, restart services

3. **Validate Resolution** (5-10 minutes)
   ```bash
   # Confirm health status
   curl https://ghost-job-detector-lilac.vercel.app/api/health
   
   # Test core functionality
   curl -X POST https://ghost-job-detector-lilac.vercel.app/api/analyze \
     -H "Content-Type: application/json" \
     -d '{"url":"test","title":"test","company":"test"}'
   
   # Monitor for 10 minutes
   watch -n 30 'curl -s https://ghost-job-detector-lilac.vercel.app/api/health | jq .status'
   ```

### **Rollback Procedures**

**When to Rollback:**
- New deployment causing >10% error rate increase
- Critical functionality completely broken
- Performance degradation >5x normal response time

**Rollback Steps:**
```bash
# List recent deployments
vercel deployments list --prod

# Identify last known good deployment
vercel deployment [deployment-id] --prod

# Execute rollback
vercel rollback [deployment-url] --prod

# Verify rollback success  
curl https://ghost-job-detector-lilac.vercel.app/api/health
```

### **Data Recovery**

**Database Issues:**
- Neon PostgreSQL includes automated backups
- Point-in-time recovery available
- Contact Neon support for critical data recovery

**Application State:**
- Metadata extraction is stateless - no recovery needed
- Analysis history preserved in database
- User corrections stored and retrievable

---

## 📈 Maintenance Procedures

### **Weekly Health Check**

```bash
#!/bin/bash
# Weekly production health review

echo "🔍 Weekly Health Check - $(date)"

# System health
curl -s https://ghost-job-detector-lilac.vercel.app/api/health | jq

# Function count status  
node scripts/verify-function-count.js

# Performance baseline
curl -s -w "Response time: %{time_total}s\n" \
  -o /dev/null https://ghost-job-detector-lilac.vercel.app/api/health

# Error rate (last 7 days)
echo "Recent error count:"
vercel logs --prod --since=7d | grep -c ERROR

# Deployment history
echo "Recent deployments:"
vercel deployments list --prod | head -5

echo "✅ Weekly health check complete"
```

### **Monthly Capacity Review**

1. **Resource Utilization**
   - Function count trending: Should stay <10/12
   - Memory usage trending: Should stay <512MB average
   - Response time trending: Should stay <2s average

2. **Performance Optimization**
   - Review slow query logs
   - Analyze bundle size growth  
   - Check for memory leak patterns

3. **Monitoring Updates**
   - Adjust alert thresholds based on new baselines
   - Update runbook based on recent incidents
   - Validate backup and recovery procedures

---

## 📞 Contact Information

### **On-Call Engineer**
- **Primary**: Check #ghost-job-detector Slack channel
- **Escalation**: Engineering Lead
- **After Hours**: PagerDuty rotation

### **External Dependencies**
- **Database (Neon)**: Support available via dashboard
- **Hosting (Vercel)**: Status at https://vercel-status.com
- **DNS (Vercel)**: Managed automatically

### **Documentation Updates**
- **Runbook**: Update after each incident
- **Monitoring**: Adjust thresholds monthly  
- **Procedures**: Review quarterly with team

---

**Status:** ✅ **Production Support Ready**  
**Next Review:** September 25, 2025  
**Maintained by:** Engineering Team