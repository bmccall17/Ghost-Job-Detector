# Ghost Job Detection Algorithm - Technical Documentation

**Version:** 0.1.6  
**Last Updated:** August 19, 2025  
**For:** Lead Backend Developer  

## Overview

The Ghost Job Detector uses a **rule-based scoring algorithm** to analyze job postings and determine the probability that they are "ghost jobs" (fake or misleading job postings that companies post without intention to hire).

## Core Algorithm Location

**File:** `/api/analyze.js`  
**Function:** `analyzeJob({ url, title, company, description })`  
**Lines:** 497-569  

## Algorithm Flow

### 1. Input Processing
```javascript
function analyzeJob({ url, title, company, description }) {
    let ghostProbability = 0;        // Starts at 0% ghost probability
    const riskFactors = [];          // Negative indicators (red flags)
    const keyFactors = [];           // Positive indicators (legitimate signs)
```

### 2. Scoring Categories

The algorithm evaluates **4 primary categories**, each contributing to the overall ghost probability score:

#### A. URL Analysis
```javascript
// LinkedIn Posting Detection
if (url && url.includes('linkedin.com')) {
    ghostProbability += 0.1;        // +10% ghost probability
    keyFactors.push('LinkedIn posting');
}
```
**Rationale:** LinkedIn job postings often have less verification than direct company postings.

#### B. Job Title Analysis
```javascript
// Urgent Language Detection
if (titleLower.includes('urgent') || titleLower.includes('immediate')) {
    ghostProbability += 0.3;        // +30% ghost probability
    riskFactors.push('Urgent hiring language');
}

// Remote Work Indicators  
if (titleLower.includes('remote') || titleLower.includes('work from home')) {
    ghostProbability += 0.2;        // +20% ghost probability
    keyFactors.push('Remote position');
}

// Title Length Analysis
if (titleLower.length > 50) {
    ghostProbability += 0.1;        // +10% ghost probability
    riskFactors.push('Very long job title');
}
```

#### C. Company Analysis
```javascript
// Staffing/Consulting Company Detection
if (company.toLowerCase().includes('consulting') || 
    company.toLowerCase().includes('staffing')) {
    ghostProbability += 0.2;        // +20% ghost probability
    keyFactors.push('Consulting/staffing company');
}
```

#### D. Job Description Analysis
```javascript
// Vague Salary Information
if (descLower.includes('competitive salary') && !descLower.match(/\$[\d,]+/)) {
    ghostProbability += 0.2;        // +20% ghost probability
    riskFactors.push('Vague salary description');
}

// Generic Corporate Language
if (descLower.includes('fast-paced') || descLower.includes('dynamic')) {
    ghostProbability += 0.1;        // +10% ghost probability
    riskFactors.push('Generic corporate language');
}

// Description Length Analysis
if (description.length < 100) {
    ghostProbability += 0.3;        // +30% ghost probability
    riskFactors.push('Very short job description');
}
```

### 3. Risk Level Classification

After calculating the cumulative ghost probability, the algorithm classifies the risk:

```javascript
// Cap probability at 100%
ghostProbability = Math.min(ghostProbability, 1.0);

// Risk Level Determination
let riskLevel;
if (ghostProbability >= 0.7) {        // 70%+ ghost probability
    riskLevel = 'high';
} else if (ghostProbability >= 0.4) {  // 40-69% ghost probability
    riskLevel = 'medium';
} else {                               // 0-39% ghost probability
    riskLevel = 'low';
}
```

### 4. Output Structure

The algorithm returns a comprehensive analysis object:

```javascript
return {
    ghostProbability,    // Float 0.0-1.0 (percentage likelihood of being ghost job)
    riskLevel,          // String: 'low', 'medium', 'high'
    riskFactors,        // Array of negative indicators found
    keyFactors          // Array of positive indicators found
};
```

## Current Risk Factors (Red Flags)

| Risk Factor | Ghost Probability Increase | Rationale |
|-------------|---------------------------|-----------|
| Urgent hiring language | +30% | Artificial urgency to pressure applicants |
| Very short job description | +30% | Lack of specific requirements indicates low effort |
| Vague salary description | +20% | "Competitive salary" without specifics |
| Very long job title | +10% | Overly complex titles often indicate fake positions |
| Generic corporate language | +10% | "Fast-paced", "dynamic" are overused buzzwords |

## Current Key Factors (Positive Indicators)

| Key Factor | Classification | Notes |
|------------|---------------|--------|
| LinkedIn posting | Neutral/Slight Risk | Tracked but considered normal |
| Remote position | Neutral/Slight Risk | Remote jobs have higher ghost probability |
| Consulting/staffing company | Slight Risk | These companies often post speculative positions |

## Algorithm Strengths

1. **Rule-Based Transparency:** Easy to understand and modify
2. **Fast Processing:** No ML model dependencies, sub-second analysis
3. **Cumulative Scoring:** Multiple factors contribute to final assessment
4. **Configurable Thresholds:** Risk levels easily adjustable
5. **Detailed Feedback:** Specific factors identified for user education

## Algorithm Limitations

1. **Static Rules:** No machine learning adaptation
2. **False Positives:** Legitimate urgent positions may be flagged
3. **Language Dependent:** Currently English-only pattern matching  
4. **Limited Context:** Doesn't consider company reputation or industry norms
5. **Simple Scoring:** Linear addition may not reflect complex interactions

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

### Near-term Improvements
1. **Company Reputation Database:** Cross-reference known ghost job companies
2. **Posting Duration Analysis:** Jobs posted for 30+ days are suspicious
3. **Application Volume Tracking:** High application counts with no responses
4. **Salary Range Validation:** Compare against industry standards
5. **Location Analysis:** Remote-only companies with physical addresses

### Long-term ML Integration
1. **Training Data Collection:** Use correction feedback for supervised learning
2. **Feature Engineering:** Extract more sophisticated text patterns  
3. **Ensemble Methods:** Combine rule-based with ML predictions
4. **Continuous Learning:** Update model based on user feedback
5. **Industry-Specific Models:** Different algorithms for different job sectors

## Configuration and Tuning

### Threshold Adjustment
Risk level thresholds can be modified in the algorithm:

```javascript
// Current thresholds
const THRESHOLDS = {
    HIGH_RISK: 0.7,      // 70%+
    MEDIUM_RISK: 0.4,    // 40-69%
    LOW_RISK: 0.0        // 0-39%
};
```

### Adding New Risk Factors
To add new detection rules:

1. Add pattern detection logic to appropriate section
2. Define probability weight (0.1-0.3 recommended)
3. Add descriptive message to riskFactors array
4. Update documentation and test cases

### Performance Considerations
- **Response Time:** Current algorithm processes in <1ms
- **Scalability:** Stateless function, scales horizontally
- **Memory Usage:** Minimal, no model loading required
- **Database Impact:** Single write operation per analysis

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

**Contact:** For questions about this algorithm or enhancement requests, consult the development team.

**Documentation Maintained By:** Ghost Job Detector Development Team  
**Repository:** https://github.com/bmccall17/Ghost-Job-Detector  
**Version Control:** All changes tracked in git with detailed commit messages