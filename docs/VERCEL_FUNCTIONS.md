# Vercel Serverless Functions - Deployment Tracking

**Last Updated:** August 18, 2025  
**Current Status:** 10/12 functions used on Hobby plan

## ⚠️ CRITICAL CONSTRAINT

**Vercel Hobby Plan Limit: 12 Serverless Functions Maximum**

This project is currently using **10 out of 12** available slots, leaving only **2 remaining**.

## 🔍 Current Function Inventory

Run the verification script to get current status:

```bash
node scripts/verify-function-count.js
```

### Active Functions (10/12)

1. `/api/agent/fallback.js` - Server-side AI validation using Groq API
2. `/api/agent/ingest.js` - Agent validation result persistence 
3. `/api/analysis/tick.js` - Background analysis processing (cron job)
4. `/api/analysis-history.js` - Consolidated analysis history endpoint
5. `/api/analyze.js` - Primary job posting analysis endpoint
6. `/api/analyze-debug.js` - Analysis debugging and testing
7. `/api/blob-upload.js` - File upload handling for PDFs/documents
8. `/api/db-check.js` - Database health check and statistics
9. `/api/ingest/tick.js` - Background document ingestion (cron job)
10. `/api/queue.js` - Queue management for background tasks

### Removed Functions (Historical)

- ❌ `api/simple-test.js` - Removed August 18, 2025 (basic testing endpoint)
- ❌ `api/test-connection.js` - Removed August 18, 2025 (dev connection test)
- ❌ `api/history.js` - Consolidated into `api/analysis-history.js` August 18, 2025

## 📋 Pre-Development Checklist

**MANDATORY:** Before implementing any new API endpoint:

1. **Check Current Count**
   ```bash
   node scripts/verify-function-count.js
   ```

2. **Evaluate Impact**
   - Will adding this function exceed 12 total?
   - Can functionality be consolidated into existing endpoints?
   - Is this function absolutely necessary?

3. **Consider Alternatives**
   - **Consolidation:** Merge with existing function
   - **Client-side:** Move logic to frontend if possible
   - **Removal:** Delete unused or redundant functions first

4. **Update Documentation**
   - Update this file with new function count
   - Update CLAUDE.md deployment constraints
   - Update README.md function warnings

## 🛠 Function Management Strategies

### Consolidation Patterns

1. **Multi-Method Endpoints**
   ```javascript
   // Instead of separate endpoints, use method routing
   export default function handler(req, res) {
     switch (req.method) {
       case 'GET': return handleGet(req, res);
       case 'POST': return handlePost(req, res);
       case 'PUT': return handlePut(req, res);
       default: return res.status(405).json({ error: 'Method not allowed' });
     }
   }
   ```

2. **Parameter-based Routing**
   ```javascript
   // /api/analysis.js?action=history|stats|export
   const { action } = req.query;
   switch (action) {
     case 'history': return getHistory(req, res);
     case 'stats': return getStats(req, res);
     case 'export': return exportData(req, res);
   }
   ```

3. **Resource-based Grouping**
   ```javascript
   // /api/jobs.js handles all job-related operations
   // /api/analysis.js handles all analysis operations
   // /api/admin.js handles all administrative operations
   ```

### Priority Framework

**High Priority (Keep):**
- Core analysis endpoints (`/api/analyze.js`)
- Data persistence (`/api/analysis-history.js`)
- Background processing cron jobs
- Database health checks

**Medium Priority (Consolidate if needed):**
- Debug endpoints
- File upload handlers
- Queue management

**Low Priority (Remove first):**
- Development testing functions
- Simple proxy endpoints
- Redundant utilities

## 🚨 Emergency Procedures

### If Deployment Fails Due to Function Limit

1. **Immediate Action**
   ```bash
   # Check what's pushing over the limit
   node scripts/verify-function-count.js
   
   # Find the least critical function
   ls -la api/ | wc -l  # Manual count verification
   ```

2. **Quick Fixes (in order of preference)**
   - Remove development/test functions
   - Consolidate similar endpoints
   - Move simple logic to client-side
   - Combine multiple small functions into one

3. **Last Resort**
   - Upgrade to Vercel Pro plan ($20/month)
   - Consider alternative deployment platform

### Recovery Steps

1. Identify functions to remove/consolidate
2. Update all references in frontend code
3. Test consolidated endpoints thoroughly
4. Update documentation (this file, CLAUDE.md, README.md)
5. Verify deployment succeeds
6. Update function count tracking

## 📊 Historical Changes

### August 18, 2025
- **Action:** Emergency consolidation due to deployment failure
- **Changes:** 
  - Removed `api/simple-test.js`
  - Removed `api/test-connection.js`
  - Consolidated `api/history.js` → `api/analysis-history.js`
- **Net Change:** 13 → 10 functions (-3)
- **Reason:** Exceeded 12-function limit on deployment

### Future Tracking Template
```
### [Date]
- **Action:** [Description]
- **Changes:** [List of additions/removals/consolidations]
- **Net Change:** [Before → After (+/-)]
- **Reason:** [Why this change was made]
```

## 🔮 Future Planning

### Upgrade Considerations

**Vercel Pro Plan Benefits:**
- 100 serverless functions (vs 12 on Hobby)
- Better performance limits
- Team collaboration features
- Cost: $20/month per team member

### Alternative Architectures

1. **Micro-services**: Split into smaller, specialized deployments
2. **Monolith API**: Single large function with internal routing
3. **Client-side**: Move more logic to browser/WebLLM
4. **Edge Computing**: Use Vercel Edge Functions where applicable

## 🎯 Recommendations

1. **Always check function count before development**
2. **Prefer consolidation over new functions**
3. **Regularly audit and remove unused endpoints**
4. **Consider upgrading to Pro if hitting limits frequently**
5. **Monitor function performance and optimize heavy endpoints**

---

**Remember:** Every file in `/api/` directory counts toward the 12-function limit. Plan accordingly!