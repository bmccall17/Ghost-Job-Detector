# PHASE 2: WebLLM Extraction Logic Optimization Plan

**Project:** Ghost Job Detector v0.1.8  
**Date:** August 22, 2025  
**Status:** 🚧 IN PROGRESS  
**Priority:** HIGH - Critical for WebLLM functionality

---

## 🎯 **OBJECTIVE**

Fix WebLLM extraction logic to properly extract job data from URLs, moving from "Unknown Position/Company" to actual parsed job information.

## 📊 **CURRENT STATUS**

### ✅ **Working Components**
- WebLLM activation: `extractionMethod: "webllm"` ✅
- Platform detection: "Workday", "LinkedIn" correctly identified ✅  
- Database writes: Jobs created and stored successfully ✅
- Endpoint functionality: Both `/api/analyze` and `/api/analyze-debug` operational ✅

### ❌ **Issues Identified**
- **Data extraction**: Returns "Unknown Position", "Unknown Company" ❌
- **Conditional logic**: Frontend data flow not properly handled ❌
- **Dynamic content**: JavaScript-rendered pages not parsed ❌
- **Fallback logic**: URL-based extraction incomplete ❌

## 🔍 **ROOT CAUSE ANALYSIS**

### **Issue 1: Conditional Logic Gap**
```javascript
// CURRENT (PROBLEMATIC)
const hasManualData = title && company;
if (!hasManualData) {
  // WebLLM extraction
}

// ISSUE: Doesn't handle undefined vs empty string vs "Unknown" values
```

### **Issue 2: Dynamic Content Challenge**  
- **Workday URLs**: Use JavaScript to load job content
- **Server-side parsing**: Gets empty `<title></title>` tags
- **Current extraction**: Fails because no static HTML content available

### **Issue 3: URL-Based Extraction Missing**
- **Current**: Only attempts HTML parsing
- **Needed**: Smart URL structure parsing for Workday, LinkedIn
- **Example**: `bostondynamics.wd1.myworkdayjobs.com/.../R-D-Product-Manager_R1675` should extract company and title

---

## 🔧 **4-STEP FIX PLAN**

### **STEP 1: Fix Conditional Logic** ⚡ **HIGH PRIORITY**

**Target Files:**
- `/api/analyze.js` (Line ~32)
- `/api/analyze-debug.js` (Line ~54)

**Implementation:**
```javascript
// ENHANCED LOGIC
const hasValidManualData = (title && title.trim().length > 0 && title !== 'Unknown Position') && 
                          (company && company.trim().length > 0 && company !== 'Unknown Company');
                          
const shouldExtract = !hasValidManualData;

if (shouldExtract) {
  console.log('🤖 Triggering WebLLM extraction - no valid manual data provided');
  // Always attempt extraction for URL-only requests
}
```

**Expected Result:**
- URL-only requests → WebLLM extraction triggered
- Empty string requests → WebLLM extraction triggered  
- "Unknown" values → WebLLM extraction triggered
- Valid manual data → Skip extraction, use provided data

### **STEP 2: Enhanced URL-Based Fallback Extraction** ⚡ **HIGH PRIORITY**

**Target Files:**
- `/api/analyze.js` (smartExtractFromHtml function)
- `/api/analyze-debug.js` (performSmartExtraction function)

**New Functions to Add:**

#### **Workday URL Parser:**
```javascript
function extractFromWorkdayUrl(url) {
  const urlObj = new URL(url);
  
  // Extract company: bostondynamics.wd1.myworkdayjobs.com → "Boston Dynamics"  
  const hostname = urlObj.hostname.toLowerCase();
  const companyMatch = hostname.match(/([^.]+)\.wd\d*\.myworkdayjobs\.com/);
  let company = 'Unknown Company';
  
  if (companyMatch) {
    const rawCompany = companyMatch[1];
    // Convert bostondynamics → Boston Dynamics
    company = rawCompany
      .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase split
      .replace(/([a-z])(\d)/g, '$1 $2')     // letter-number split  
      .split(/[-_\s]+/)                     // split on separators
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  // Extract title from URL path: R-D-Product-Manager_R1675 → "R&D Product Manager"
  const pathMatch = url.match(/\/([^\/]+)_R\d+/);
  let title = 'Unknown Position';
  
  if (pathMatch) {
    title = pathMatch[1]
      .replace(/[-_]/g, ' ')
      .replace(/\bR D\b/g, 'R&D')
      .replace(/\b\w+/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  }
  
  return { title, company, confidence: 0.8 };
}
```

#### **LinkedIn URL Parser:**
```javascript
function extractFromLinkedInUrl(url) {
  // Extract job ID and attempt smart parsing
  const jobIdMatch = url.match(/\/view\/(\d+)/);
  
  // For LinkedIn, we'll need to rely more on HTML content
  // But can extract some context from URL structure
  return {
    title: null, // Rely on HTML extraction
    company: null, // Rely on HTML extraction  
    jobId: jobIdMatch ? jobIdMatch[1] : null,
    confidence: 0.3
  };
}
```

#### **Enhanced Smart Extraction:**
```javascript
async function smartExtractFromHtml(html, url, platform) {
  // Step 1: Try HTML content extraction
  let extraction = await extractFromHtmlContent(html, platform);
  
  // Step 2: If HTML extraction fails, use URL-based extraction  
  if (!extraction.title || extraction.title === 'Unknown Position') {
    console.log('🔄 HTML extraction failed, trying URL-based extraction...');
    
    if (platform === 'Workday') {
      const urlExtraction = extractFromWorkdayUrl(url);
      extraction = { ...extraction, ...urlExtraction };
      console.log('🎯 Workday URL extraction:', urlExtraction);
    } else if (platform === 'LinkedIn') {
      const urlExtraction = extractFromLinkedInUrl(url);
      extraction = { ...extraction, ...urlExtraction };
      console.log('🎯 LinkedIn URL extraction:', urlExtraction);
    }
  }
  
  // Step 3: Final validation and cleanup
  extraction.title = extraction.title || 'Unknown Position';
  extraction.company = extraction.company || 'Unknown Company';
  extraction.confidence = Math.max(extraction.confidence || 0.5, 0.1);
  
  return extraction;
}
```

### **STEP 3: Improve Dynamic Content Handling** 🔄 **MEDIUM PRIORITY**

**Target:** Enhanced extraction hierarchy

**Implementation Strategy:**
1. **HTML Content** → Try structured data, meta tags, title parsing
2. **URL Structure** → Parse company/title from URL patterns  
3. **Context Inference** → Use domain knowledge and fallbacks
4. **Confidence Scoring** → Rate extraction quality for each method

### **STEP 4: Add Robust Validation and Logging** 📊 **MEDIUM PRIORITY**

**Enhanced Debugging:**
```javascript
async function extractJobDataWithWebLLM(url) {
  console.log(`🤖 WebLLM extraction starting for: ${url}`);
  console.log(`📍 Platform: ${extractPlatformFromUrl(url)}`);
  
  try {
    const html = await fetchUrlContent(url);
    const titleTag = html.match(/<title[^>]*>([^<]*)/)?.[1] || 'EMPTY';
    console.log(`📄 Fetched ${html.length} chars, title tag: "${titleTag}"`);
    
    const result = await smartExtractFromHtml(html, url, extractPlatformFromUrl(url));
    
    console.log('🎯 Final extraction result:', {
      title: result.title,
      company: result.company,  
      confidence: result.confidence,
      method: html.length > 100 ? 'html+url' : 'url-only',
      platform: extractPlatformFromUrl(url)
    });
    
    return { success: true, ...result };
  } catch (error) {
    console.error('❌ WebLLM extraction failed:', error);
    return { success: false, error: error.message };
  }
}
```

---

## 📅 **IMPLEMENTATION TIMELINE**

### **Phase 2A: Quick Fixes** (30 minutes)
- [x] Document comprehensive plan
- [ ] **STEP 1**: Fix conditional logic in both analyze endpoints
- [ ] **STEP 2A**: Add Workday URL extraction function  
- [ ] **TEST**: Verify Boston Dynamics URL shows proper extraction

### **Phase 2B: Enhanced Extraction** (45 minutes)  
- [ ] **STEP 2B**: Implement smart extraction hierarchy
- [ ] **STEP 2C**: Add LinkedIn URL parsing  
- [ ] **STEP 3**: Enhance logging and debugging
- [ ] **TEST**: Verify both screenshot URLs work properly

### **Phase 2C: Testing & Validation** (15 minutes)
- [ ] **END-TO-END**: Test both URLs from screenshots
- [ ] **UI VERIFICATION**: Check Analysis History shows "WebLLM" with real data  
- [ ] **CONFIDENCE**: Verify parsing confidence > 0.5

---

## 🎯 **SUCCESS CRITERIA**

### **Functional Requirements:**
- [ ] **Boston Dynamics URL** extracts: "R&D Product Manager" + "Boston Dynamics"  
- [ ] **LinkedIn URL** extracts: "Product Manager - Orbit Platform" + "Boston Dynamics"
- [ ] **Analysis History** shows "WebLLM" extraction with real job data
- [ ] **Parsing confidence** scores > 0.5 for URL-based extraction
- [ ] **No "Unknown" values** for supported URLs

### **Technical Requirements:**  
- [ ] **Extraction method** consistently shows "webllm"  
- [ ] **Console logs** provide clear extraction debugging info
- [ ] **Database metadata** stores parsing details correctly
- [ ] **Fallback logic** works when HTML parsing fails

### **Performance Requirements:**
- [ ] **Response time** < 3 seconds for URL extraction
- [ ] **Success rate** > 80% for Workday and LinkedIn URLs
- [ ] **Error handling** graceful for unsupported platforms

---

## 📊 **EXPECTED TRANSFORMATION**

### **BEFORE (Current State):**
```json
{
  "title": "Unknown Position",
  "company": "Unknown Company", 
  "extractionMethod": "webllm",
  "parsingConfidence": 0.0,
  "platform": "Workday"
}
```

### **AFTER (Target State):**
```json
{
  "title": "R&D Product Manager",
  "company": "Boston Dynamics",
  "extractionMethod": "webllm", 
  "parsingConfidence": 0.8,
  "platform": "Workday",
  "extractionSource": "url-structure"
}
```

---

## 🚨 **RISK MITIGATION**

### **Potential Issues:**
1. **URL Pattern Changes**: Companies might change URL structures
   - **Mitigation**: Robust pattern matching with multiple fallbacks

2. **Performance Impact**: Additional processing overhead  
   - **Mitigation**: Efficient parsing, cached results

3. **False Positives**: Incorrect extraction from URLs
   - **Mitigation**: Confidence scoring, validation against HTML when available

### **Rollback Plan:**
- Keep current extraction logic as fallback
- Add feature flag to disable URL-based extraction if needed
- Monitor extraction confidence scores for quality regression

---

## 📈 **METRICS TO TRACK**

### **Extraction Quality:**
- Percentage of "Unknown Position/Company" reduced
- Average parsing confidence scores
- Platform-specific extraction success rates

### **System Performance:**  
- WebLLM endpoint response times
- Database write success rates  
- Error rates by platform type

### **User Experience:**
- Analysis History showing real job data
- Reduced manual data entry requirements
- Improved ghost job detection accuracy

---

**Next Step:** Execute STEP 1 - Fix conditional logic in both analyze endpoints