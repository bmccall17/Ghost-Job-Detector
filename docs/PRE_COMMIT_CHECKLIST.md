# Pre-Commit Checklist - Ghost Job Detector

This checklist helps prevent common errors that occur when making changes to the project. Review this before committing any new features.

## 🔧 **TypeScript & Build Issues**

### **Common TypeScript Errors**
- [ ] **Unknown type in catch blocks**: Always use `error instanceof Error ? error.message : 'Unknown error'`
- [ ] **Missing field access**: Check if optional fields exist before accessing (e.g., `analysis?.field`)  
- [ ] **API response types**: Ensure API responses match TypeScript interfaces
- [ ] **Prisma schema sync**: Run `npx prisma generate` after schema changes
- [ ] **Import paths**: Verify all imports resolve correctly (especially after moving files)

### **Build Validation** 
Skip local build and type checks — these are run on the live server as part of staging. Do not configure or run local pre-commit hooks.

## 🗄️ **Database & Schema Issues**

### **Prisma Schema Changes**
- [ ] **Field removals**: Update all API endpoints that reference removed fields
- [ ] **New fields**: Add proper defaults and null handling
- [ ] **Migration safety**: Use `npx prisma db push --accept-data-loss` for development
- [ ] **Relation integrity**: Verify foreign key relationships still work
- [ ] **Index updates**: Remove indexes for deleted fields, add for new queryable fields

### **API Endpoint Updates After Schema Changes**
- [ ] **Remove deleted field references**: Search codebase for removed field names
- [ ] **Update response generation**: Ensure APIs return expected data structure
- [ ] **Legacy data handling**: Add fallbacks for existing records with null new fields
- [ ] **Test with real data**: Verify APIs work with existing database records

### **Common Schema Change Checklist**
```bash
# After any schema changes:
1. Update prisma/schema.prisma
2. Run: npx prisma db push --accept-data-loss
3. Run: npx prisma generate
4. Search codebase for deleted field names: grep -r "deletedFieldName" src/ api/
5. Update all API files that reference changed fields
6. Test API responses match frontend expectations
```

## 🌐 **API & Network Issues**

### **Frontend-Backend Communication**
- [ ] **API endpoint existence**: Verify all called endpoints actually exist in `/api/`
- [ ] **Function count**: Check Vercel function limit with `node scripts/verify-function-count.js`
- [ ] **Consolidated endpoints**: Update frontend calls after endpoint consolidation
- [ ] **Error handling**: Ensure all API calls have proper try-catch blocks
- [ ] **CORS proxy issues**: Handle AllOrigins failures gracefully

### **External Service Integration**  
- [ ] **Rate limiting**: Implement proper delays for external APIs
- [ ] **Timeout handling**: Add timeouts to prevent hanging requests
- [ ] **Fallback mechanisms**: Provide alternatives when external services fail
- [ ] **Error messages**: Give users actionable error messages, not technical details

## 🎨 **Frontend State Management**

### **React State Issues**
- [ ] **State initialization**: Ensure states have proper initial values
- [ ] **Async state updates**: Handle loading/error states for all async operations
- [ ] **Component re-renders**: Check for unnecessary re-renders with heavy operations
- [ ] **Memory leaks**: Clean up subscriptions and timers in useEffect cleanup
- [ ] **Conditional rendering**: Handle null/undefined states before accessing properties

### **Zustand Store Updates**
- [ ] **State mutations**: Always use immutable updates
- [ ] **Store initialization**: Verify initial state values are correct
- [ ] **Action consistency**: Ensure store actions match component expectations

## 🧪 **Testing & Validation**

### **Manual Testing Checklist**
- [ ] **Happy path**: Test main user flows work correctly
- [ ] **Error scenarios**: Test with invalid URLs, missing data, network failures
- [ ] **Edge cases**: Empty responses, malformed data, very long content
- [ ] **Legacy data**: Test with existing database records (not just fresh data)
- [ ] **Different platforms**: Test LinkedIn, Indeed, company career pages

### Staging Only Guidelines
Developers should stage their changes (git add) but not commit. The Product Manager will handle commits after review. Do not install or rely on automated pre-commit hooks.

## 📦 **Deployment Preparation**

### **Vercel Function Limits**
- [ ] **Function count**: Must stay under 12 functions (check with script)
- [ ] **Bundle size**: Keep functions under size limits
- [ ] **Environment variables**: Ensure all required env vars are set
- [ ] **Dependencies**: Check that all packages are properly listed in package.json

### **Production Readiness**
- [ ] **Console logging**: Remove or reduce verbose console.log statements
- [ ] **Error boundaries**: Ensure errors don't crash the entire app
- [ ] **Performance**: Check for memory leaks or performance bottlenecks
- [ ] **Security**: No hardcoded secrets or sensitive data

## 🔍 **Common Error Patterns We've Seen**

### **1. Missing API Endpoints (Function Consolidation)**
**Issue**: Frontend calls `/api/old-endpoint` but it was consolidated into `/api/new-endpoint`
**Fix**: Update frontend service files to use correct endpoints
**Prevention**: Document endpoint changes and search codebase for old references

### **2. Database Field References After Schema Changes**
**Issue**: API tries to access `analysis.deletedField` after field was removed
**Fix**: Update all API files to use new field structure or add fallbacks
**Prevention**: Search entire codebase for deleted field names before schema push

### **3. TypeScript Strict Mode Violations**
**Issue**: `error.message` in catch blocks, `obj.field` without null checks
**Fix**: Always check types before accessing properties
**Prevention**: Enable strict TypeScript settings and fix all warnings

### **4. Legacy Data Compatibility**
**Issue**: New code expects new fields but existing database records have nulls
**Fix**: Add fallback logic: `newField || legacyField || defaultValue`
**Prevention**: Always consider existing data when adding new fields

### **5. CORS/Network Failures**
**Issue**: External API calls fail but no user-friendly error handling
**Fix**: Add retry logic, timeouts, and helpful error messages
**Prevention**: Test with network failures and blocked requests

## 🚀 **Automated Pre-Commit Script**

Consider creating a git pre-commit hook that runs:

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "🔍 Running pre-commit checks..."

# TypeScript check
npm run typecheck || exit 1

# Verify function count
node scripts/verify-function-count.js || exit 1

# Check for common anti-patterns
grep -r "\.message" src/ && echo "⚠️  Found .message usage - check for proper error type handling"

# Check for deleted field references (if any recent schema changes)
# grep -r "ghostProbability\|analysisId\|algorithmAssessment" src/ api/ && echo "⚠️  Found references to deleted fields"

echo "✅ Pre-commit checks passed"
```

## 📝 **Quick Reference Commands**

```bash
# After database schema changes:
npx prisma db push --accept-data-loss && npx prisma generate

# Check TypeScript without building:
npm run typecheck

# Verify Vercel function count:
node scripts/verify-function-count.js

# Find references to deleted database fields:
grep -r "fieldName" src/ api/

# Test build pipeline:
npm run build

# Check for common error patterns:
grep -r "\.message\|catch.*error\|instanceof Error" src/
```

---

**Remember**: Prevention is better than debugging! Taking 2 minutes to check these items saves hours of troubleshooting later.

-- manually added notes --
## 🚫 **Local Testing & Commit Rules**
- **ALL testing is done on the live server**. Do not set up or run local test/build pipelines. The live server handles validation and error catching.  
- **Stage only, do not commit.** Developers should stage changes for review, but commits will be made manually by the Product Manager after verification.
