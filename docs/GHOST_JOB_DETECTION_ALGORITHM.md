# Ghost Job Detection Algorithm - Technical Documentation

**Version:** 0.1.7  
**Last Updated:** August 20, 2025  
**For:** Lead Backend Developer  

## Overview

The Ghost Job Detector uses an **enhanced rule-based scoring algorithm v0.1.7** to analyze job postings and determine the probability that they are "ghost jobs" (fake or misleading job postings that companies post without intention to hire). The algorithm incorporates updated detection criteria based on industry research and calibrated thresholds for improved accuracy.

## Core Algorithm Location

**File:** `/api/analyze.js`  
**Function:** `analyzeJob({ url, title, company, description, postedAt })`  
**Lines:** 497-704  

## Algorithm Flow

### 1. Input Processing
```javascript
function analyzeJob({ url, title, company, description, postedAt }) {
    let ghostScore = 0;              // Starts at 0, accumulates ghost indicators
    const riskFactors = [];          // Negative indicators (red flags)
    const keyFactors = [];           // Positive indicators (legitimate signs)
    const algorithmVersion = 'v0.1.7';
    let confidence = 0.8;            // Base confidence level
```

### 2. Enhanced Scoring Categories

The algorithm evaluates **6 comprehensive categories** based on updated detection criteria:

#### A. Posting Recency Analysis (NEW v0.1.7)
```javascript
// Check posting age with exception handling
if (postedAt) {
    const daysSincePosted = Math.floor((now - postDate) / (1000 * 60 * 60 * 24));
    
    if (daysSincePosted > 45) {
        const isException = checkExceptionRoles(title, company);
        if (!isException || daysSincePosted > 90) {
            ghostScore += 0.20;     // +20% for stale postings
            riskFactors.push(`Posted ${daysSincePosted} days ago (stale posting)`);
        }
    } else if (daysSincePosted <= 30) {
        keyFactors.push(`Recently posted (${daysSincePosted} days ago)`);
    }
}
```
**Rationale:** Jobs posted/updated within 30-45 days indicate active hiring. Exceptions apply for government, academic, and executive roles (60-90 days).

#### B. Company-Site Verification
```javascript
// Enhanced source verification
const isJobBoard = urlLower.includes('linkedin.com') || urlLower.includes('indeed.com');
const isCompanySite = urlLower.includes('careers.') || urlLower.includes('greenhouse.io');

if (isJobBoard && !isCompanySite) {
    ghostScore += 0.15;             // +15% for board-only postings
    riskFactors.push('Job board only posting (not on company site)');
} else if (isCompanySite) {
    keyFactors.push('Posted on company career site/ATS');
}
```
**Rationale:** Jobs mirrored on company sites/ATS indicate legitimate hiring intent.

#### C. Language Cues Analysis (Enhanced)
```javascript
// Pipeline building language (high ghost indicator)
if (descLower.includes('always accepting') || descLower.includes('building a pipeline')) {
    ghostScore += 0.25;             // +25% for pipeline language
    riskFactors.push('Pipeline building language');
}

// Concrete details (positive indicator)
if (descLower.match(/deadline|apply by|start date|timeline/)) {
    keyFactors.push('Concrete timeline or compensation details');
}

// Technical specificity (positive indicator)
if (descLower.match(/(javascript|python|java|react|angular|sql|aws)/)) {
    keyFactors.push('Specific technical requirements mentioned');
}
```

#### D. Job Title Analysis (Enhanced)
```javascript
// Urgent language detection
if (titleLower.includes('urgent') || titleLower.includes('immediate')) {
    ghostScore += 0.25;             // +25% for urgent language
    riskFactors.push('Urgent hiring language');
}

// Title length analysis
if (title.length > 60) {
    ghostScore += 0.10;             // +10% for overly long titles
    riskFactors.push('Overly long job title');
}
```

#### E. Company Analysis (Enhanced)
```javascript
// Staffing/consulting patterns
if (companyLower.includes('staffing') || companyLower.includes('consulting')) {
    ghostScore += 0.15;             // +15% for staffing companies
    riskFactors.push('Staffing/consulting company posting');
}

// Anonymous company indicators
if (companyLower.includes('confidential') || companyLower.includes('fortune')) {
    ghostScore += 0.20;             // +20% for anonymous companies
    riskFactors.push('Anonymous or generic company name');
}
```

#### F. Positive Adjustments (NEW v0.1.7)
```javascript
// Reward multiple positive indicators
if (keyFactors.length >= 3) {
    ghostScore -= 0.15;             // -15% for multiple positive signals
    keyFactors.push('Multiple positive indicators found');
}
```

### 3. Enhanced Risk Level Classification

Updated with calibrated thresholds and dynamic confidence scoring:

```javascript
// Cap probability between 0 and 1
const ghostProbability = Math.max(0, Math.min(ghostScore, 1.0));

// Enhanced Risk Level Determination with calibrated thresholds
let riskLevel;
if (ghostProbability >= 0.6) {        // 60%+ ghost probability (lowered from 0.7)
    riskLevel = 'high';
    confidence = 0.85;
} else if (ghostProbability >= 0.35) { // 35-59% ghost probability (lowered from 0.4)
    riskLevel = 'medium';
    confidence = 0.75;
} else {                               // 0-34% ghost probability
    riskLevel = 'low';
    confidence = 0.80;
}
```
**Key Changes:** Lowered thresholds for increased sensitivity, added dynamic confidence scoring.

### 4. Enhanced Output Structure

The algorithm returns an expanded analysis object with metadata:

```javascript
return {
    ghostProbability,    // Float 0.0-1.0 (percentage likelihood of being ghost job)
    riskLevel,          // String: 'low', 'medium', 'high'
    riskFactors,        // Array of negative indicators found
    keyFactors,         // Array of positive indicators found
    confidence,         // Float 0.0-1.0 (algorithm confidence in assessment)
    algorithmVersion,   // String: 'v0.1.7'
    metadata: {
        totalRiskFactors: riskFactors.length,
        totalKeyFactors: keyFactors.length,
        scoringModel: 'weighted_accumulative_v1.7'
    }
};
```

## Enhanced Risk Factors v0.1.7

| Risk Factor | Ghost Score Increase | Rationale |
| **NEW** Stale posting (45+ days) | +20% | Jobs not updated recently suggest inactive hiring |
| Pipeline building language | +25% | "Always accepting", "building pipeline" indicates talent hoarding |
| Urgent hiring language | +25% | Artificial urgency to pressure applicants |
| Very short job description | +20% | Lack of specific requirements (under 200 chars) |
| Anonymous company name | +20% | "Confidential client", "Fortune company" lack transparency |
| Job board only posting | +15% | Not mirrored on company career sites |
| Staffing/consulting company | +15% | Often post speculative positions |
| Vague salary description | +15% | "Competitive salary" without specific ranges |
| Excessive corporate buzzwords | +10% | 2+ instances of "fast-paced", "dynamic", etc. |
| Overly long job title | +10% | Titles over 60 characters often indicate fake positions |
| Very generic job title | +5% | Single-word titles like "Developer", "Manager" |

## Enhanced Key Factors v0.1.7 (Positive Indicators)

| Key Factor | Classification | Impact |
|------------|---------------|--------|
| Recently posted (≤30 days) | Strong Positive | Indicates active, current hiring |
| Posted on company career site/ATS | Strong Positive | Shows legitimate company involvement |
| Concrete timeline/compensation | Strong Positive | Specific deadlines and salary ranges |
| Specific technical requirements | Strong Positive | Detailed tech stack indicates real role |
| Multiple positive indicators | Strong Positive | -15% ghost score for 3+ positive signals |
| **Removed** Remote position | N/A | No longer considered a risk factor |
| **Removed** LinkedIn posting | N/A | Neutral - not inherently positive or negative |

## Algorithm Strengths v0.1.7

1. **Enhanced Rule-Based Logic:** Comprehensive 6-category analysis with calibrated weights
2. **Industry-Aligned Criteria:** Based on updated detection guidelines and research
3. **Fast Processing:** No ML dependencies, <1ms analysis time
4. **Dynamic Confidence Scoring:** Algorithm reports its own confidence level
5. **Exception Handling:** Special rules for government, academic, and executive roles
6. **Positive Signal Recognition:** Balances negative and positive indicators
7. **Configurable Thresholds:** Lowered for increased sensitivity (60% vs 70%)
8. **Detailed Feedback:** Specific factors with impact explanations

## Algorithm Limitations v0.1.7

1. **Static Rules:** No machine learning adaptation (planned for v0.2.0)
2. **Basic Company Verification:** Limited to URL pattern matching (not live API verification)
3. **Language Dependent:** Currently English-only pattern matching
4. **No Engagement Tracking:** Cannot verify actual application responses or ATS activity
5. **Industry Context:** Limited industry-specific adjustments
6. **Reposting Detection:** Basic implementation without historical posting analysis

## Data Flow Integration

### 1. Analysis Pipeline
```
Job URL/PDF Input → Data Extraction → analyzeJob() → Database Storage → User Display
```

### 2. Database Schema Integration
The analysis results are stored with detailed metadata:

```javascript
// Analysis record structure in database
{
    id: "analysis_id",
    score: ghostProbability,           // Decimal 0.0000-1.0000
    verdict: riskLevel,                // 'likely_real', 'uncertain', 'likely_ghost'
    reasonsJson: {
        riskFactors: [...],            // Negative indicators
        keyFactors: [...],             // Positive indicators  
        confidence: 0.8                // Algorithm confidence
    },
    algorithmAssessment: {
        ghostProbability: 72,          // Percentage format
        modelConfidence: "High (80%)", // Human-readable confidence
        assessmentText: "..."          // Explanation for user
    }
}
```

## Enhancement Opportunities

### v0.1.8 Planned Improvements
1. **Live Company-Site Verification:** API calls to verify job presence on company careers pages
2. **Enhanced Reposting Detection:** Track posting history and identify unchanged reposts
3. **Engagement Signal Integration:** Monitor ATS state transitions and response patterns
4. **Industry-Specific Adjustments:** Different thresholds for tech, healthcare, finance
5. **Advanced Pattern Recognition:** ML-enhanced text analysis for subtle language cues
6. **Company Reputation Scoring:** Historical ghost job probability by company

### v0.2.0 ML Integration Roadmap
1. **Supervised Learning Pipeline:** Train on user feedback and verified outcomes
2. **Advanced Feature Engineering:** NLP-based semantic analysis of job descriptions
3. **Hybrid Approach:** Combine rule-based v0.1.7 with ML predictions
4. **Continuous Learning:** Real-time model updates from user corrections
5. **Multi-Modal Analysis:** Incorporate company financial data, hiring patterns
6. **Personalized Scoring:** User-specific risk tolerance and industry preferences

## Configuration and Tuning

### Calibrated Threshold Configuration v0.1.7
Updated risk level thresholds based on detection criteria analysis:

```javascript
// Updated thresholds (v0.1.7)
const THRESHOLDS = {
    HIGH_RISK: 0.6,      // 60%+ (lowered from 0.7 for increased sensitivity)
    MEDIUM_RISK: 0.35,   // 35-59% (lowered from 0.4 for better granularity)
    LOW_RISK: 0.0        // 0-34%
};

// Dynamic confidence scoring
const CONFIDENCE_LEVELS = {
    HIGH_RISK: 0.85,     // High confidence in ghost job detection
    MEDIUM_RISK: 0.75,   // Medium confidence in uncertain cases
    LOW_RISK: 0.80       // High confidence in legitimate job detection
};
```

### Adding New Detection Rules v0.1.7
To add new detection rules following the enhanced framework:

1. **Identify Category:** Place in appropriate section (Recency, Company-Site, Language, etc.)
2. **Define Weight:** Use calibrated scoring (0.05-0.25 range, see criteria document)
3. **Add Exception Handling:** Consider government/academic/executive exceptions if applicable
4. **Include Positive Counterpart:** Balance negative indicators with positive signals
5. **Test Edge Cases:** Verify against known legitimate and ghost job examples
6. **Update Confidence Logic:** Adjust confidence levels based on rule reliability
7. **Document Rationale:** Reference industry research or data supporting the rule

### Performance Considerations v0.1.7
- **Response Time:** Enhanced algorithm processes in <2ms (increased due to additional checks)
- **Scalability:** Stateless function, scales horizontally with no external dependencies
- **Memory Usage:** Minimal overhead, no ML model loading required
- **Database Impact:** Single write operation with enhanced metadata storage
- **Exception Role Checking:** Adds ~0.5ms for government/academic/executive role detection
- **URL Pattern Analysis:** Minimal performance impact for company-site verification

## Testing and Validation

### Current Test Coverage
- Unit tests for individual risk factor detection
- Integration tests for full analysis pipeline  
- Performance benchmarks for response time
- Database transaction integrity tests

### Validation Metrics
- **Accuracy:** Measured against manually labeled dataset
- **Precision:** Percentage of flagged jobs that are actually ghost jobs
- **Recall:** Percentage of ghost jobs successfully identified
- **F1 Score:** Harmonic mean of precision and recall

## Monitoring and Logging

### Analysis Logging
Every analysis operation logs:
```javascript
{
    analysisId: "unique_identifier",
    processingTimeMs: 850,
    inputHash: "content_hash",
    algorithmVersion: "v0.1.6",
    riskFactorsFound: [...],
    ghostProbability: 0.45
}
```

### Error Handling
- Graceful degradation if input data is incomplete
- Fallback scoring for missing job descriptions
- Error logging for debugging and improvement

---

## Version History

**v0.1.7 (August 20, 2025):**
- Implemented enhanced detection criteria based on industry research
- Added posting recency analysis with exception role handling
- Enhanced company-site verification logic
- Introduced positive signal adjustment system
- Calibrated thresholds for improved sensitivity (60%/35% vs 70%/40%)
- Added dynamic confidence scoring
- Expanded from 4 to 6 comprehensive analysis categories

**v0.1.6 (August 19, 2025):**
- Base rule-based algorithm with 4 primary categories
- Static thresholds (70%/40%)
- Basic pattern matching for titles and descriptions

---

**Contact:** For questions about this algorithm or enhancement requests, consult the development team.

**Documentation Maintained By:** Ghost Job Detector Development Team  
**Repository:** https://github.com/bmccall17/Ghost-Job-Detector  
**Version Control:** All changes tracked in git with detailed commit messages  
**Algorithm Version:** v0.1.7 - Enhanced Detection Criteria Implementation