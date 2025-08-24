# Ghost Job Detector - Parsing Architecture

## Overview

The Ghost Job Detector parsing system is a sophisticated, multi-layered architecture designed to extract job posting information from various sources with high accuracy and continuous learning capabilities. The system employs a plugin-based parser registry, machine learning for pattern recognition, and duplicate detection to ensure comprehensive job data extraction.

## Architecture Components

### 1. Core Parsing System

```
ParserRegistry (Central Orchestrator)
├── Parser Selection & Routing
├── Extraction Strategy Coordination  
├── Learning Integration
├── Duplicate Detection
└── Quality Validation
```

### 2. Parser Hierarchy

```
BaseParser (Abstract Foundation)
├── LinkedInParser v2.0.0
├── GreenhouseParser v2.0.0  
├── CompanyCareerParser v2.0.0
├── IndeedParser v1.0.0
└── GenericParser (Fallback)
```

### 3. Learning & Intelligence Layer

```
ParsingLearningService
├── Correction Recording
├── Pattern Recognition
├── Contextual Learning
└── Performance Analytics

DuplicateDetectionService  
├── URL Matching
├── Content Similarity
├── Cross-Platform Detection
└── Merge Operations
```

## Detailed Component Documentation

### ParserRegistry (`src/services/parsing/ParserRegistry.ts`)

**Purpose**: Central orchestrator that manages all parsing operations, parser selection, and coordination between learning and duplicate detection systems.

**Key Methods**:
- `parseJob(url, html)`: Main parsing entry point
- `findBestParser(url)`: Intelligent parser selection
- `recordCorrection(correction)`: Manual correction recording
- `detectDuplicates(job, existingJobs)`: Duplicate detection
- `joinDuplicates(duplicateGroup)`: Merge duplicate jobs

**Flow**:
1. Receive job URL and HTML content
2. Select best parser based on URL patterns and confidence
3. Execute primary parsing with chosen parser
4. Apply learned patterns for enhancement
5. Validate result quality
6. Use fallback parser if quality is insufficient
7. Return enhanced, validated job data

### BaseParser (`src/services/parsing/BaseParser.ts`)

**Purpose**: Abstract foundation providing common parsing infrastructure and strategy coordination.

**Extraction Strategies** (Priority-ordered):
1. **StructuredDataStrategy**: JSON-LD and microdata extraction
2. **CssSelectorStrategy**: DOM element selection and parsing
3. **TextPatternStrategy**: Regex-based content extraction

**Enhancement Features**:
- Metadata extraction (HTML title, meta tags)
- Confidence scoring per field
- Validation rule application
- Quality assessment

### Enhanced Parser Implementations

#### LinkedInParser v2.0.0 (`src/services/parsing/parsers/LinkedInParser.ts`)

**Enhancements**:
- Generic company name filtering (filters out "LinkedIn", "Company", etc.)
- Contextual company extraction from job descriptions
- Multi-strategy title extraction
- Enhanced HTML parsing for dynamic content

**Key Features**:
```typescript
- isGenericCompanyName(): Filters placeholder company names
- extractCompanyFromContext(): Extracts hiring company from content
- extractLinkedInCompanyFromHtml(): Multiple extraction strategies
```

#### GreenhouseParser v2.0.0 (`src/services/parsing/parsers/GreenhouseParser.ts`)

**Enhancements**:
- Page title extraction and cleaning
- Company name extraction from URL slugs
- Structured data parsing (JSON-LD)
- Meta property tag extraction
- Advanced text pattern matching

**Key Features**:
```typescript
- extractTitleFromContext(): Multi-strategy title extraction
- extractCompanyFromGreenhouseUrl(): URL-based company detection
- formatCompanyName(): Company name standardization
```

#### CompanyCareerParser v2.0.0 (`src/services/parsing/parsers/CompanyCareerParser.ts`)

**Enhancements**:
- Domain intelligence mapping (300+ known companies)
- Company name cleaning and artifact removal
- Pattern-based extraction for subdomains
- Extensive company formatting rules

**Key Features**:
```typescript
- extractCompanyFromDomainUrl(): Domain-to-company mapping
- cleanCompanyName(): Artifact removal (numbers, suffixes)
- formatCompanyName(): Standardized company formatting
```

### Learning System (`src/services/parsing/ParsingLearningService.ts`)

**Purpose**: Machine learning system that improves parsing accuracy through pattern recognition and correction learning.

**Core Capabilities**:

#### 1. Correction Recording
```typescript
recordCorrection(correction: ParsingCorrection): Promise<void>
```
- Records manual and automated corrections
- Extracts learnable patterns from corrections
- Stores in database for persistent learning

#### 2. Pattern Application
```typescript
applyLearnedPatterns(result, url, parserName): { title, company, improvements }
```
- Applies learned corrections to new parsing results
- Confidence-based pattern matching
- Real-time result enhancement

#### 3. Contextual Learning
```typescript
learnFromSimilarPostings(currentJob, referenceJobs): Promise<improvements>
```
- Cross-references similar job postings
- Fuzzy matching for companies and titles
- Automatic knowledge transfer between platforms

#### 4. Pre-populated Knowledge
- LinkedIn parsing corrections (company extraction fixes)
- Deloitte domain mapping corrections
- Greenhouse SurveyMonkey title extraction
- Expandable knowledge base

### Duplicate Detection (`src/services/DuplicateDetectionService.ts`)

**Purpose**: Identifies and manages duplicate job postings across different platforms and sources.

**Detection Methods**:

#### 1. URL Exact Match (Confidence: 1.0)
- Normalized URL comparison
- Tracking parameter removal
- Canonical URL generation

#### 2. URL Canonical Match (Confidence: 0.9)
- Platform-specific URL normalization
- Job ID removal while preserving structure
- Cross-platform URL mapping

#### 3. Content Similarity (Confidence: 0.85)
- Company name fuzzy matching (80% threshold)
- Job title similarity analysis (70% threshold)
- Location normalization and comparison
- Weighted scoring algorithm

#### 4. Contextual Matching (Confidence: 0.75)
- Cross-platform job detection
- Same company + similar title analysis
- LinkedIn ↔ Greenhouse job correlation

**Duplicate Resolution**:
- Primary job selection based on quality scoring
- Platform preference (LinkedIn > Company Sites > Job Boards)
- Data completeness evaluation
- Recency weighting

## Database Integration

### Parsing Corrections Table

```sql
CREATE TABLE parsing_corrections (
  id                TEXT PRIMARY KEY,
  source_url        TEXT NOT NULL,
  original_title    TEXT,
  correct_title     TEXT,
  original_company  TEXT,
  correct_company   TEXT,
  parser_used       TEXT NOT NULL,
  parser_version    TEXT NOT NULL,
  correction_reason TEXT,
  confidence        DECIMAL(3,2) DEFAULT 1.0,
  corrected_by      TEXT,
  is_verified       BOOLEAN DEFAULT false,
  created_at        TIMESTAMP DEFAULT now()
);
```

### Job Listings Enhancement

```sql
-- Enhanced job listings with parsing metadata
SELECT 
  jl.*,
  pc.correct_title,
  pc.correct_company,
  pc.confidence as correction_confidence
FROM job_listings jl
LEFT JOIN parsing_corrections pc ON jl.canonical_url = pc.source_url
WHERE pc.is_verified = true;
```

## Configuration and Extension

### Adding New Parsers

1. **Create Parser Class**:
```typescript
export class NewSiteParser extends BaseParser {
  name = 'NewSiteParser'
  version = '1.0.0'
  
  canHandle(url: string): boolean {
    return url.includes('newsite.com')
  }
  
  // Implement site-specific parsing logic
}
```

2. **Register Parser**:
```typescript
// In ParserRegistry.initializeParsers()
this.parsers = [
  new LinkedInParser(),
  new GreenhouseParser(),
  new NewSiteParser(), // Add here
  // ...
]
```

3. **Add Learning Patterns**:
```typescript
// In ParsingLearningService.initializeKnownCorrections()
await this.recordCorrection({
  sourceUrl: 'https://newsite.com/*',
  // Add known corrections
})
```

### Extraction Method Types

```typescript
enum ExtractionMethod {
  STRUCTURED_DATA = 'structured_data',
  CSS_SELECTORS = 'css_selectors', 
  TEXT_PATTERNS = 'text_patterns',
  DOMAIN_INTELLIGENCE = 'domain_intelligence',
  STRUCTURED_DATA_WITH_LEARNING = 'structured_data_with_learning',
  // ... learning-enhanced variants
}
```

## Performance Metrics

### Parser Performance Tracking

```typescript
interface ParsingMetadata {
  parserUsed: string
  parserVersion: string
  extractionMethod: ExtractionMethod
  confidence: ConfidenceScores
  validationResults: ValidationResult[]
  extractionTimestamp: Date
  processingTimeMs?: number
}
```

### Learning Statistics

```typescript
interface LearningStats {
  totalCorrections: number
  titlePatterns: number
  companyPatterns: number
  contextualLearnings: number
  topDomains: { domain: string, corrections: number }[]
}
```

## Error Handling and Fallbacks

### Parsing Failure Recovery

1. **Primary Parser Failure**: Automatic fallback to GenericParser
2. **Low Quality Results**: Retry with fallback parser
3. **Network Issues**: Graceful degradation with cached patterns
4. **Learning Service Issues**: Continue parsing without learning enhancement

### Quality Validation

```typescript
interface QualityThresholds {
  minOverallConfidence: 0.6
  minTitleConfidence: 0.7
  minCompanyConfidence: 0.7
  minTitleLength: 3
  minCompanyLength: 2
}
```

## Future Enhancements

### Planned Features

1. **NLP Integration**: Advanced natural language processing for content extraction
2. **ML Model Training**: Custom machine learning models for site-specific parsing
3. **Real-time Learning**: Continuous learning from user interactions
4. **Performance Optimization**: Caching and parallel processing improvements
5. **Additional Parsers**: Support for more job sites and international platforms

### Integration Points

1. **Browser Extension**: Direct parsing integration for real-time analysis
2. **API Endpoints**: RESTful APIs for parsing service access
3. **Webhook Support**: Real-time duplicate detection notifications
4. **Analytics Dashboard**: Parsing performance and learning progress monitoring

## Troubleshooting

### Common Issues

1. **Parser Not Selected**: Check `canHandle()` method URL patterns
2. **Poor Extraction Quality**: Review CSS selectors and text patterns
3. **Learning Not Applied**: Verify correction recording and confidence thresholds
4. **Duplicate Detection Fails**: Check URL normalization and similarity algorithms

### Debug Tools

```typescript
// Enable detailed logging
console.log('🎓 Applied learned improvements:', improvements)
console.log('📚 Recording parsing correction:', correction)
console.log('🔗 Joining duplicate group:', duplicateGroup.id)
```

### Performance Monitoring

- Extraction time tracking
- Confidence score distributions
- Learning pattern effectiveness
- Duplicate detection accuracy

---

## Quick Reference

### Key Files
- `src/services/parsing/ParserRegistry.ts` - Main orchestrator
- `src/services/parsing/ParsingLearningService.ts` - ML learning system
- `src/services/DuplicateDetectionService.ts` - Duplicate detection
- `src/services/parsing/parsers/` - Individual parser implementations
- `prisma/schema.prisma` - Database schema with ParsingCorrection model

### CLI Commands
```bash
npm run typecheck  # Validate TypeScript
npm run lint       # Code quality check
npm run build      # Compile and build
```

### Learning Integration Example
```typescript
const registry = ParserRegistry.getInstance()
await registry.recordCorrection({
  sourceUrl: 'https://example.com/job/123',
  originalTitle: 'Unknown Position',
  correctTitle: 'Software Engineer',
  correctionReason: 'Manual user correction'
})
```

This architecture provides a robust, extensible, and continuously improving parsing system that adapts to new job sites and user corrections while maintaining high accuracy and performance.