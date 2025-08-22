# Current Implementation: Job Posting Parsing & Analysis

**Version:** v0.1.8  
**Last Updated:** August 20, 2025  
**Documentation Scope:** Complete parsing pipeline and data flow

---

## Overview

The Ghost Job Detector currently implements a **client-side parsing system** that processes job posting URLs and extracts relevant information for ghost job analysis. The system is designed around a **rule-based detection algorithm** with comprehensive data storage and analysis capabilities.

---

## Architecture Overview

```
User Input (URL/PDF) → Frontend Parsing → Analysis Algorithm → Database Storage → Results Display
```

### Core Components:
1. **Frontend Input Processing** (`src/components/`)
2. **Analysis API Endpoint** (`/api/analyze.js`)
3. **Detection Algorithm** (Rule-based v0.1.7)
4. **Database Layer** (Prisma + PostgreSQL)
5. **Results Display** (Detailed analyzer views)

---

## 1. Input Processing Layer

### Supported Input Types
- **Job Posting URLs**: Direct links to job listings
- **PDF Documents**: Job posting PDFs (future enhancement)
- **Manual Entry**: Title, company, description fields

### Frontend Processing (`src/components/JobAnalysisDashboard.tsx`)

```typescript
interface JobAnalysisInput {
  url: string
  title?: string
  company?: string
  description?: string
  location?: string
  remoteFlag?: boolean
  postedAt?: string
  sourceType?: 'url' | 'pdf'
}
```

**Input Validation:**
- URL format validation
- Required field checking
- Data sanitization with DOMPurify
- Length limits and character validation

**Current Limitations:**
- No automatic web scraping of job posting content
- Relies on user-provided job details
- No integration with job board APIs

---

## 2. Analysis API Endpoint

### Primary Endpoint: `/api/analyze.js`

**Method:** POST  
**Purpose:** Process job posting data and perform ghost job analysis

#### Request Flow:
```javascript
POST /api/analyze
{
  "url": "https://example.com/job",
  "title": "Software Engineer",
  "company": "Tech Corp",
  "description": "Job description text...",
  "location": "Remote",
  "remoteFlag": true,
  "postedAt": "2024-08-15"
}
```

#### Processing Steps:
1. **Input Validation & Sanitization**
2. **Content Hash Generation** (SHA-256 for deduplication)
3. **Duplicate Job Detection**
4. **Source Record Creation**
5. **Ghost Job Analysis**
6. **Database Storage**
7. **Response Generation**

---

## 3. Data Extraction & Processing

### Current Implementation Status
⚠️ **Important**: The current system does **NOT** automatically extract content from URLs. 

**What Works:**
- Manual job data input processing
- Analysis of user-provided text content
- URL metadata storage
- Company name normalization

**What's Missing:**
- Automatic web scraping
- HTML content parsing
- Job board API integration
- Real-time content extraction

### Content Processing Pipeline

```javascript
// Current data flow
const contentString = `${url}${title || ''}${company || ''}${description || ''}`;
const contentSha256 = crypto.createHash('sha256').update(contentString).digest('hex');
```

**Duplicate Detection:**
```javascript
const existingSource = await prisma.source.findUnique({
  where: { contentSha256 },
  include: {
    jobListings: {
      include: { analyses: { orderBy: { createdAt: 'desc' }, take: 1 } }
    }
  }
});
```

---

## 4. Ghost Job Analysis Algorithm

### Algorithm Version: v0.1.7 (Enhanced Detection Criteria)

**File Location:** `/api/analyze.js` (Lines 497-704)

#### Analysis Categories:
1. **Posting Recency Analysis** (NEW v0.1.7)
2. **Company-Site Verification** 
3. **Language Cues Analysis**
4. **Job Title Analysis**
5. **Company Analysis**
6. **Positive Signal Recognition**

#### Scoring System:
```javascript
function analyzeJob({ url, title, company, description, postedAt }) {
  let ghostScore = 0; // Accumulative scoring
  const riskFactors = [];
  const keyFactors = [];
  
  // Category-based analysis with weighted scoring
  // Final probability: Math.max(0, Math.min(ghostScore, 1.0))
}
```

**Risk Thresholds (v0.1.7):**
- **High Risk**: ≥60% (lowered from 70%)
- **Medium Risk**: ≥35% (lowered from 40%)
- **Low Risk**: <35%

---

## 5. Database Schema & Storage

### Prisma Schema Structure

#### Core Tables:
```prisma
model Source {
  id            String       @id @default(cuid())
  kind          String       // 'url' | 'pdf'
  url           String?
  contentSha256 String       @unique
  httpStatus    Int?
  jobListings   JobListing[]
  rawDocuments  RawDocument[]
  createdAt     DateTime     @default(now())
}

model JobListing {
  id              String     @id @default(cuid())
  sourceId        String
  title           String
  company         String
  location        String?
  remoteFlag      Boolean    @default(false)
  postedAt        DateTime?
  canonicalUrl    String
  rawParsedJson   Json?      // Metadata storage
  normalizedKey   String     @unique
  analyses        Analysis[]
  keyFactors      KeyFactor[]
}

model Analysis {
  id                    String   @id @default(cuid())
  jobListingId         String
  score                Decimal  @db.Decimal(3, 4)
  verdict              String   // 'likely_real' | 'uncertain' | 'likely_ghost'
  reasonsJson          Json?    // Risk factors & key factors
  modelVersion         String
  processingTimeMs     Int?
  
  // Enhanced v0.1.7 fields
  algorithmAssessment  Json?    // Algorithm assessment details
  riskFactorsAnalysis  Json?    // Risk factors breakdown
  recommendation       Json?    // Action recommendations
  analysisDetails      Json?    // Processing metadata
}
```

#### Metadata Storage (`rawParsedJson`):
```json
{
  "originalTitle": "Software Engineer",
  "originalCompany": "Tech Corp", 
  "originalDescription": "Job description...",
  "extractedAt": "2024-08-20T10:30:00Z",
  "totalPositions": 1,
  "duplicateUrls": [],
  "sources": [{
    "url": "https://example.com/job",
    "platform": "Company Career Site",
    "addedAt": "2024-08-20T10:30:00Z",
    "postedAt": "2024-08-15T09:00:00Z"
  }],
  "latestPostedAt": "2024-08-15T09:00:00Z"
}
```

---

## 6. Company Normalization & Intelligence

### Company Name Processing
**Service:** `CompanyNormalizationService.js`

```javascript
const normalizationResult = normalizationService.normalizeCompanyName(companyName);
// Returns: { canonical, normalized, confidence, isLearned }
```

**Features:**
- Intelligent company name canonicalization
- Variation learning and mapping
- Confidence scoring
- Duplicate job detection across company variations

**Example Normalization:**
```javascript
"Microsoft Corp" → { 
  canonical: "Microsoft", 
  normalized: "microsoft", 
  confidence: 0.95 
}
```

---

## 7. Platform Source Detection

### URL Analysis & Platform Recognition

```javascript
function extractSourcePlatform(url) {
  const hostname = new URL(url).hostname.toLowerCase();
  
  if (hostname.includes('linkedin.com')) return 'LinkedIn';
  if (hostname.includes('indeed.com')) return 'Indeed';
  if (hostname.includes('glassdoor.com')) return 'Glassdoor';
  if (hostname.includes('careers.') || hostname.includes('jobs.')) {
    return 'Company Career Site';
  }
  // ... additional platform detection
}
```

**Supported Platforms:**
- LinkedIn
- Indeed  
- Glassdoor
- Monster
- ZipRecruiter
- Company career sites (careers.*, jobs.*)
- ATS systems (Greenhouse, Lever, Workday, BambooHR)

---

## 8. Analysis Response Structure

### API Response Format

```javascript
{
  "id": "analysis_id",
  "url": "https://example.com/job",
  "jobData": {
    "title": "Software Engineer",
    "company": "Tech Corp",
    "description": "Job description...",
    "location": "Remote",
    "remote": true
  },
  "ghostProbability": 0.45,
  "riskLevel": "medium",
  "riskFactors": [
    "Vague salary description",
    "Generic corporate language"
  ],
  "keyFactors": [
    "Posted on company career site/ATS",
    "Specific technical requirements mentioned"
  ],
  "metadata": {
    "storage": "postgres",
    "version": "2.0",
    "cached": false,
    "analysisDate": "2024-08-20T10:30:00Z",
    
    // Enhanced v0.1.7 data
    "algorithmAssessment": {
      "ghostProbability": 45,
      "modelConfidence": "Medium (75%)",
      "assessmentText": "This job posting has mixed indicators..."
    },
    "riskFactorsAnalysis": {
      "warningSignsCount": 2,
      "warningSignsTotal": 4,
      "riskFactors": [...],
      "positiveIndicators": [...]
    },
    "recommendation": {
      "action": "investigate",
      "message": "Exercise caution with this posting...",
      "confidence": "medium"
    },
    "analysisDetails": {
      "analysisId": "cmehk7abc123def456",
      "modelVersion": "v0.1.7",
      "processingTimeMs": 850,
      "algorithmType": "rule_based_v1.7",
      "platform": "Company Career Site"
    }
  }
}
```

---

## 9. Current Limitations & Missing Features

### ❌ Not Currently Implemented

**Web Scraping & Content Extraction:**
- Automatic HTML content parsing from URLs
- Job board API integrations
- Real-time web scraping capabilities
- Dynamic content loading (JavaScript-rendered pages)

**Advanced Text Processing:**
- Natural Language Processing (NLP)
- Machine learning-based content analysis
- Semantic text analysis
- Multi-language support

**Real-time Data Verification:**
- Live company website verification
- ATS integration checking
- Real-time posting status validation
- Application tracking system monitoring

### ✅ Currently Working

**Data Processing:**
- Manual job data input and analysis
- Rule-based ghost job detection
- Company name normalization
- Duplicate job detection
- Comprehensive metadata storage

**Analysis Features:**
- 6-category risk assessment
- Confidence scoring
- Historical analysis tracking
- Detailed factor explanations

---

## 10. Future Enhancement Roadmap

### Phase 1: Web Scraping Integration (v0.1.9)
```javascript
// Planned implementation
const scrapedData = await webScrapingService.extractJobData(url);
const analysis = await analyzeJob({
  ...scrapedData,
  url,
  extractionMethod: 'automated'
});
```

### Phase 2: ML-Enhanced Analysis (v0.2.0)
- NLP-based content analysis
- Machine learning model integration  
- Sentiment analysis of job descriptions
- Advanced pattern recognition

### Phase 3: Real-time Verification (v0.2.5)
- Live company website checking
- ATS integration verification
- Real-time posting status monitoring
- Application response tracking

---

## 11. Performance & Scalability

### Current Performance Metrics
- **Analysis Processing**: <2ms average
- **Database Operations**: Single write per analysis
- **Response Time**: <1 second end-to-end
- **Memory Usage**: Minimal (stateless functions)

### Scalability Considerations
- **Horizontal Scaling**: Stateless API functions
- **Database Optimization**: Indexed queries and connection pooling
- **Caching Strategy**: Content hash-based deduplication
- **Rate Limiting**: Built-in request throttling

---

## 12. Production-First Testing & Deployment

### Production Testing Workflow
**PRIMARY RULE:** Never run database operations locally. Always test on live production environment.

```bash
# 1. Deploy changes immediately
git add .
git commit -m "Phase X: [description]"
git push origin main

# 2. Test against production endpoints
curl -X POST https://ghost-job-detector-lilac.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url":"test","title":"Engineer","company":"Test"}'

# 3. Check production logs
vercel logs --prod
```

### Error Recovery System
```javascript
try {
  const analysis = analyzeJob(jobData);
  await storeAnalysis(analysis);
  return successResponse(analysis);
} catch (error) {
  console.error('Analysis error:', error);
  return fallbackAnalysis(jobData); // Graceful degradation
}
```

**Production-Only Strategies:**
- Database operations via production API endpoints
- Real production data for testing
- Live error monitoring through Vercel logs
- Neon dashboard for database debugging

### ⛔ **Never Run Locally:**
- `npm run dev` (development server)
- `npx prisma migrate` (database migrations)
- `npx prisma studio` (database browser) 
- `npx prisma generate` (client generation)
- Any direct database connections

---

## 13. Security & Data Protection

### Input Sanitization
```javascript
import DOMPurify from 'dompurify';
import validator from 'validator';

// All user inputs sanitized before processing
const sanitizedDescription = DOMPurify.sanitize(description);
const isValidUrl = validator.isURL(url);
```

### Data Privacy
- Content hash storage (not raw content)
- GDPR-compliant data handling
- User data anonymization
- Secure database connections

---

## Conclusion

The current parsing implementation provides a **solid foundation** for ghost job detection with comprehensive data storage, intelligent analysis, and scalable architecture. While web scraping capabilities are planned for future releases, the existing manual input system effectively supports the core ghost job detection functionality.

**Key Strengths:**
- Robust rule-based analysis algorithm
- Comprehensive database schema
- Intelligent company normalization
- Detailed metadata tracking
- Production-ready error handling

**Next Priority:**
- Web scraping integration for automated content extraction
- Enhanced ML-based analysis capabilities
- Real-time verification systems

---

*This documentation reflects the current implementation as of v0.1.8. For technical questions or enhancement requests, refer to the development team.*