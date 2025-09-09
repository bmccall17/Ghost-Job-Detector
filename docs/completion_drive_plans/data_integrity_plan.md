# Data Integrity Protection Plan
**Ghost Job Detector v0.2.0 - Database Pollution Prevention & Audit Trail System**
*Created: September 9, 2025*

## Executive Summary

The PDF parsing system has been creating "database pollution" by storing analysis results based on placeholder data ("Unknown Company", "PDF Parsing Failed") with artificial ghost job scores. This plan outlines a comprehensive solution to protect database integrity and implement robust audit trails for all parsing and analysis operations.

## Current Database Pollution Analysis

### Critical Issues Identified

1. **Placeholder Data Storage**: Analysis results stored with companies like "Unknown Company"
2. **Failed Parsing Results**: Ghost job scores calculated on meaningless content 
3. **No Success/Failure Tracking**: Missing audit trail for parsing attempts
4. **Analytics Contamination**: Invalid data skewing reports and statistics
5. **No Data Quality Validation**: Lack of constraints preventing bad data entry

### Pollution Patterns Found

```javascript
// Current problematic patterns in analyze.js:
const hasValidManualData = (title && title.trim().length > 0 && title !== 'Unknown Position') && 
                           (company && company.trim().length > 0 && company !== 'Unknown Company');

// Fallback patterns that create pollution:
title: 'Unknown Position'
company: 'Unknown Company' 
description: 'PDF Parsing Failed'
```

## Phase 1: Database Schema Modifications

### 1.1 Data Quality Status Tracking

**New Enum for Data Quality Status:**
```prisma
enum DataQualityStatus {
  VALID           // High-quality, verified data
  SUSPECT         // Potentially valid but needs review  
  PLACEHOLDER     // Contains placeholder/fallback data
  FAILED_PARSING  // Parsing failed, should not be analyzed
  MANUAL_REVIEW   // Flagged for human verification
}
```

### 1.2 JobListing Table Enhancements

**Add Data Quality Fields:**
```prisma
model JobListing {
  // ... existing fields ...
  
  // NEW: Data Quality Protection
  dataQualityStatus    DataQualityStatus @default(SUSPECT)
  isAnalyzable        Boolean           @default(false)  // Only true for VALID status
  qualityScore        Decimal?          @db.Decimal(3,2) // 0.00-1.00 overall quality
  placeholderFields   String[]          // Track which fields contain placeholders
  parsingErrorCode    String?           // Error classification if parsing failed
  lastQualityCheck    DateTime?         // When quality was last assessed
  qualityCheckVersion String?           // Version of quality check algorithm
  
  // Enhanced validation metadata
  titleValidated      Boolean           @default(false)
  companyValidated    Boolean           @default(false)
  descriptionValidated Boolean          @default(false)
  
  // Indexes for quality filtering
  @@index([dataQualityStatus, isAnalyzable])
  @@index([qualityScore])
  @@index([parsingErrorCode])
  @@index([lastQualityCheck])
}
```

### 1.3 Analysis Table Protection

**Prevent Analysis of Invalid Data:**
```prisma
model Analysis {
  // ... existing fields ...
  
  // NEW: Analysis Quality Protection
  dataQualityWarning   String?    // Warning if analyzing suspect data
  isValidAnalysis     Boolean    @default(true)  // False if based on placeholder data
  excludeFromReports  Boolean    @default(false) // Exclude from analytics if invalid
  qualityFlags        String[]   // Array of quality issues identified
  
  // Database constraint to prevent analysis of PLACEHOLDER or FAILED_PARSING data
  // This will be enforced by application logic and database triggers
  
  @@index([isValidAnalysis])
  @@index([excludeFromReports])
}
```

## Phase 2: Comprehensive Audit Trail System

### 2.1 Enhanced ParsingAttempt Table

**Expand Current ParsingAttempt Model:**
```prisma
model ParsingAttempt {
  id                    String    @id @default(cuid())
  sourceUrl            String
  attemptedAt          DateTime  @default(now())
  
  // ENHANCED: Detailed success/failure tracking
  successStatus        ParsingStatus @default(IN_PROGRESS)
  overallSuccessRate   Decimal?  @db.Decimal(3,2) // 0.00-1.00
  
  // ENHANCED: Field-level success tracking
  titleExtractionStatus   FieldExtractionStatus
  companyExtractionStatus FieldExtractionStatus  
  descriptionExtractionStatus FieldExtractionStatus
  locationExtractionStatus FieldExtractionStatus?
  
  // ENHANCED: Error classification
  primaryErrorCode     String?   // Standardized error codes
  errorCategory        ErrorCategory?
  errorMessage         String?   // Detailed error message
  stackTrace           String?   // Technical error details
  
  // ENHANCED: Performance metrics
  processingTimeMs     Int?      
  extractionStages     Json?     // Detailed timing for each extraction stage
  memoryUsageKB        Int?      // Memory consumption during parsing
  retryCount           Int       @default(0)
  
  // ENHANCED: Method tracking
  extractionMethod     String    // 'webllm', 'fallback', 'manual'
  parserVersion        String?   // Version of parser used
  webllmModelVersion   String?   // Specific WebLLM model version
  
  // ENHANCED: Confidence and quality
  confidenceScore      Decimal?  @db.Decimal(3,2)
  qualityScore         Decimal?  @db.Decimal(3,2)
  dataQualityIssues    String[]  // Array of quality problems detected
  
  // ENHANCED: Validation results
  validationData       Json?     // Cross-validation results
  externalValidation   Json?     // Third-party verification results
  
  // ENHANCED: Client context
  userAgentUsed        String?
  ipAddress            String?   
  sessionId            String?   // Link multiple attempts from same session
  referrerUrl          String?   // Where user came from
  
  // Relations
  jobListings          JobListing[] @relation("ParsingAttemptToJobListing")
  qualityChecks        DataQualityCheck[]
  
  // Indexes
  @@index([sourceUrl, attemptedAt])
  @@index([successStatus])
  @@index([primaryErrorCode])
  @@index([errorCategory])
  @@index([extractionMethod, parserVersion])
  @@index([sessionId])
  @@index([overallSuccessRate])
  @@map("parsing_attempts")
}
```

### 2.2 New Audit Trail Tables

**Data Quality Check History:**
```prisma
model DataQualityCheck {
  id                  String    @id @default(cuid())
  jobListingId        String?
  parsingAttemptId    String?
  checkedAt           DateTime  @default(now())
  
  // Quality assessment results
  overallQuality      DataQualityStatus
  qualityScore        Decimal   @db.Decimal(3,2)
  checkVersion        String    // Version of quality algorithm
  
  // Field-specific quality scores
  titleQuality        Decimal?  @db.Decimal(3,2)
  companyQuality      Decimal?  @db.Decimal(3,2)
  descriptionQuality  Decimal?  @db.Decimal(3,2)
  locationQuality     Decimal?  @db.Decimal(3,2)
  
  // Issues detected
  qualityIssues       String[]  // Array of specific problems
  placeholderFlags    String[]  // Fields containing placeholders
  suspiciousPatterns  String[]  // Patterns that suggest fake/test data
  
  // Recommendations
  recommendedAction   QualityAction // ANALYZE, REJECT, MANUAL_REVIEW, RE_PARSE
  confidenceReason    String?   // Why this recommendation was made
  
  // Relations  
  jobListing          JobListing? @relation(fields: [jobListingId], references: [id])
  parsingAttempt      ParsingAttempt? @relation(fields: [parsingAttemptId], references: [id])
  
  @@index([jobListingId])
  @@index([parsingAttemptId])
  @@index([overallQuality])
  @@index([checkedAt])
  @@index([recommendedAction])
  @@map("data_quality_checks")
}
```

**System Quality Metrics:**
```prisma
model QualityMetric {
  id                  String    @id @default(cuid())
  metricType          QualityMetricType
  measurementPeriod   String    // 'daily', 'weekly', 'monthly'
  periodStart         DateTime
  periodEnd           DateTime
  
  // Quality statistics
  totalParsingAttempts    Int
  successfulParses        Int
  failedParses           Int
  placeholderDataCount   Int
  validAnalysisCount     Int
  excludedAnalysisCount  Int
  
  // Success rates by category
  titleSuccessRate       Decimal @db.Decimal(3,2)
  companySuccessRate     Decimal @db.Decimal(3,2)
  descriptionSuccessRate Decimal @db.Decimal(3,2)
  overallSuccessRate     Decimal @db.Decimal(3,2)
  
  // Quality trend data
  qualityTrend          String    // 'improving', 'declining', 'stable'
  averageQualityScore   Decimal   @db.Decimal(3,2)
  qualityDistribution   Json      // Distribution of quality scores
  
  createdAt             DateTime  @default(now())
  
  @@index([metricType, periodStart])
  @@index([measurementPeriod])
  @@map("quality_metrics")
}
```

### 2.3 New Enums for Audit System

```prisma
enum ParsingStatus {
  IN_PROGRESS
  SUCCESS
  PARTIAL_SUCCESS  // Some fields extracted successfully
  FAILED
  TIMEOUT
  RETRYING
}

enum FieldExtractionStatus {
  SUCCESS         // Field extracted with high confidence
  PARTIAL         // Field extracted but low confidence  
  PLACEHOLDER     // Fallback/placeholder value used
  FAILED          // Could not extract field
  VALIDATED       // Externally verified as correct
}

enum ErrorCategory {
  NETWORK_ERROR       // Connection/timeout issues
  PARSING_ERROR       // HTML/PDF parsing failures
  CONTENT_ERROR       // Invalid/unexpected content
  RATE_LIMIT_ERROR    // API/service rate limiting
  VALIDATION_ERROR    // Data validation failures
  SYSTEM_ERROR        // Internal application errors
}

enum QualityAction {
  ANALYZE           // Data quality sufficient for analysis
  REJECT            // Data quality too poor, exclude from system
  MANUAL_REVIEW     // Flag for human verification
  RE_PARSE          // Attempt parsing again with different method
  VALIDATE          // Perform additional external validation
}

enum QualityMetricType {
  DAILY_SUMMARY
  WEEKLY_SUMMARY  
  MONTHLY_SUMMARY
  PLATFORM_SPECIFIC   // Per-platform (LinkedIn, Workday, etc.)
  PARSER_PERFORMANCE  // Per-parser method performance
  ERROR_ANALYSIS      // Error pattern analysis
}
```

## Phase 3: Data Validation Constraints and Triggers

### 3.1 Application-Level Validation Rules

**Pre-Storage Validation Service:**
```javascript
class DataIntegrityValidator {
  constructor() {
    this.placeholderPatterns = [
      'unknown company',
      'unknown position', 
      'pdf parsing failed',
      'company via linkedin',
      'linkedin job opportunity',
      'job opportunity',
      'test company',
      'sample company'
    ];
    
    this.suspiciousPatterns = [
      /^(test|sample|demo|placeholder)/i,
      /company \d+$/i,
      /^job \d+$/i,
      /lorem ipsum/i
    ];
  }

  validateJobData(jobData) {
    const issues = [];
    let qualityScore = 1.0;
    
    // Title validation
    if (this.isPlaceholder(jobData.title)) {
      issues.push('title_placeholder');
      qualityScore -= 0.4;
    }
    
    // Company validation  
    if (this.isPlaceholder(jobData.company)) {
      issues.push('company_placeholder');
      qualityScore -= 0.4;
    }
    
    // Description validation
    if (!jobData.description || jobData.description.length < 50) {
      issues.push('description_insufficient');
      qualityScore -= 0.2;
    }
    
    // Determine data quality status
    let status = 'VALID';
    if (issues.some(i => i.includes('placeholder'))) {
      status = 'PLACEHOLDER';
    } else if (qualityScore < 0.6) {
      status = 'SUSPECT';
    }
    
    return {
      isValid: status === 'VALID',
      qualityScore: Math.max(0, qualityScore),
      dataQualityStatus: status,
      issues,
      isAnalyzable: status === 'VALID' && qualityScore >= 0.7
    };
  }
  
  isPlaceholder(value) {
    if (!value) return true;
    
    const lowerValue = value.toLowerCase().trim();
    
    // Check exact matches
    if (this.placeholderPatterns.includes(lowerValue)) {
      return true;
    }
    
    // Check pattern matches
    return this.suspiciousPatterns.some(pattern => pattern.test(value));
  }
}
```

### 3.2 Database Constraints (PostgreSQL)

**Database-Level Data Protection:**
```sql
-- Constraint: Prevent analysis of placeholder data
ALTER TABLE analyses 
ADD CONSTRAINT prevent_placeholder_analysis 
CHECK (
  is_valid_analysis = false OR 
  NOT EXISTS (
    SELECT 1 FROM job_listings jl 
    WHERE jl.id = job_listing_id 
    AND jl.data_quality_status IN ('PLACEHOLDER', 'FAILED_PARSING')
  )
);

-- Constraint: Quality score range validation
ALTER TABLE job_listings 
ADD CONSTRAINT quality_score_range 
CHECK (quality_score IS NULL OR (quality_score >= 0.0 AND quality_score <= 1.0));

-- Constraint: Analyzable jobs must be VALID status
ALTER TABLE job_listings
ADD CONSTRAINT analyzable_must_be_valid
CHECK (NOT is_analyzable OR data_quality_status = 'VALID');

-- Index for fast quality filtering
CREATE INDEX CONCURRENTLY idx_job_listings_quality_filter 
ON job_listings (data_quality_status, is_analyzable, quality_score DESC);
```

### 3.3 Database Triggers for Data Protection

**Automatic Quality Assessment Trigger:**
```sql
-- Function to assess data quality on insert/update
CREATE OR REPLACE FUNCTION assess_job_listing_quality()
RETURNS TRIGGER AS $$
DECLARE
  quality_issues TEXT[] := '{}';
  calculated_score DECIMAL(3,2) := 1.0;
  placeholder_fields TEXT[] := '{}';
BEGIN
  -- Check title for placeholders
  IF NEW.title IS NULL OR 
     LOWER(TRIM(NEW.title)) IN ('unknown position', 'job opportunity', 'position') OR
     NEW.title ~ '^(test|sample|demo).*'::citext THEN
    quality_issues := array_append(quality_issues, 'title_placeholder');
    placeholder_fields := array_append(placeholder_fields, 'title');
    calculated_score := calculated_score - 0.4;
  END IF;
  
  -- Check company for placeholders  
  IF NEW.company IS NULL OR
     LOWER(TRIM(NEW.company)) IN ('unknown company', 'company', 'linkedin company') OR
     NEW.company ~ '^(test|sample|demo).*'::citext THEN
    quality_issues := array_append(quality_issues, 'company_placeholder');
    placeholder_fields := array_append(placeholder_fields, 'company');
    calculated_score := calculated_score - 0.4;
  END IF;
  
  -- Check description quality
  IF NEW.description IS NULL OR LENGTH(TRIM(NEW.description)) < 50 OR
     NEW.description ~ 'pdf parsing failed'::citext THEN
    quality_issues := array_append(quality_issues, 'description_insufficient');
    calculated_score := calculated_score - 0.2;
  END IF;
  
  -- Set quality fields
  NEW.quality_score := GREATEST(0.0, calculated_score);
  NEW.placeholder_fields := placeholder_fields;
  
  -- Determine data quality status and analyzability
  IF array_length(placeholder_fields, 1) > 0 THEN
    NEW.data_quality_status := 'PLACEHOLDER';
    NEW.is_analyzable := false;
  ELSIF calculated_score >= 0.7 THEN
    NEW.data_quality_status := 'VALID';  
    NEW.is_analyzable := true;
  ELSIF calculated_score >= 0.4 THEN
    NEW.data_quality_status := 'SUSPECT';
    NEW.is_analyzable := false;  
  ELSE
    NEW.data_quality_status := 'FAILED_PARSING';
    NEW.is_analyzable := false;
  END IF;
  
  NEW.last_quality_check := NOW();
  NEW.quality_check_version := '1.0.0';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_assess_job_listing_quality
  BEFORE INSERT OR UPDATE ON job_listings
  FOR EACH ROW
  EXECUTE FUNCTION assess_job_listing_quality();
```

## Phase 4: Historical Data Cleanup Strategy

### 4.1 Identifying Polluted Records

**Cleanup Analysis Query:**
```sql
-- Find all potentially polluted job listings
WITH polluted_jobs AS (
  SELECT 
    jl.id,
    jl.title,
    jl.company, 
    jl.description,
    jl.created_at,
    CASE 
      WHEN LOWER(TRIM(jl.company)) IN ('unknown company', 'company', 'linkedin company') THEN 'company_placeholder'
      WHEN LOWER(TRIM(jl.title)) IN ('unknown position', 'job opportunity') THEN 'title_placeholder'
      WHEN jl.description ILIKE '%pdf parsing failed%' THEN 'description_failed'
      WHEN LENGTH(TRIM(jl.description)) < 50 THEN 'description_insufficient'
      ELSE 'unknown'
    END as pollution_type,
    COUNT(a.id) as analysis_count
  FROM job_listings jl
  LEFT JOIN analyses a ON a.job_listing_id = jl.id
  WHERE 
    LOWER(TRIM(jl.company)) IN ('unknown company', 'company', 'linkedin company') OR
    LOWER(TRIM(jl.title)) IN ('unknown position', 'job opportunity', 'position') OR
    jl.description ILIKE '%pdf parsing failed%' OR
    LENGTH(TRIM(jl.description)) < 50 OR
    jl.company ~ '^(test|sample|demo).*'::citext OR
    jl.title ~ '^(test|sample|demo).*'::citext
  GROUP BY jl.id, jl.title, jl.company, jl.description, jl.created_at
)
SELECT 
  pollution_type,
  COUNT(*) as record_count,
  SUM(analysis_count) as total_analyses,
  MIN(created_at) as earliest_record,
  MAX(created_at) as latest_record
FROM polluted_jobs
GROUP BY pollution_type
ORDER BY record_count DESC;
```

### 4.2 Cleanup Procedures

**PLAN_UNCERTAINTY**: The cleanup strategy needs to balance data integrity with preserving legitimate user analyses. We need to determine if any "Unknown Company" records might be legitimate user inputs.

**Staged Cleanup Process:**
```javascript
class DataCleanupService {
  async performCleanup(options = {}) {
    const { dryRun = true, batchSize = 100 } = options;
    
    const cleanupResults = {
      analyzed: 0,
      flagged: 0,
      excluded: 0,
      deleted: 0
    };
    
    // Stage 1: Flag polluted records
    await this.flagPollutedRecords();
    
    // Stage 2: Exclude analyses from reports
    await this.excludeAnalysesFromReports();
    
    // Stage 3: (Optional) Delete obvious test/placeholder data
    if (!dryRun) {
      await this.deleteTestData();
    }
    
    return cleanupResults;
  }
  
  async flagPollutedRecords() {
    // Update data_quality_status for existing records
    await prisma.$executeRaw`
      UPDATE job_listings 
      SET 
        data_quality_status = 'PLACEHOLDER',
        is_analyzable = false,
        quality_score = 0.0,
        last_quality_check = NOW()
      WHERE 
        LOWER(TRIM(company)) IN ('unknown company', 'company', 'linkedin company') OR
        LOWER(TRIM(title)) IN ('unknown position', 'job opportunity', 'position') OR
        description ILIKE '%pdf parsing failed%' OR
        company ~ '^(test|sample|demo).*' OR
        title ~ '^(test|sample|demo).*'
    `;
  }
  
  async excludeAnalysesFromReports() {
    // Mark analyses based on placeholder data as invalid
    await prisma.$executeRaw`
      UPDATE analyses 
      SET 
        is_valid_analysis = false,
        exclude_from_reports = true,
        data_quality_warning = 'Analysis based on placeholder or failed parsing data'
      WHERE job_listing_id IN (
        SELECT id FROM job_listings 
        WHERE data_quality_status IN ('PLACEHOLDER', 'FAILED_PARSING')
      )
    `;
  }
}
```

## Phase 5: Analytics Integrity Framework

### 5.1 Modified Query Patterns

**Analytics with Quality Filtering:**
```javascript
class AnalyticsService {
  async getGhostJobStatistics(options = {}) {
    const { includeInvalid = false, minQualityScore = 0.7 } = options;
    
    const whereClause = {
      isValidAnalysis: true,
      excludeFromReports: false,
      ...(includeInvalid ? {} : {
        jobListing: {
          dataQualityStatus: 'VALID',
          isAnalyzable: true,
          qualityScore: { gte: minQualityScore }
        }
      })
    };
    
    const statistics = await prisma.analysis.groupBy({
      by: ['verdict'],
      where: whereClause,
      _count: { id: true },
      _avg: { score: true }
    });
    
    return {
      ...statistics,
      metadata: {
        qualityFiltered: !includeInvalid,
        minQualityScore,
        totalValidRecords: statistics.reduce((sum, stat) => sum + stat._count.id, 0)
      }
    };
  }
  
  async getCompanyAnalytics(companyName) {
    // Only include high-quality analyses
    return prisma.analysis.findMany({
      where: {
        isValidAnalysis: true,
        excludeFromReports: false,
        jobListing: {
          company: { contains: companyName, mode: 'insensitive' },
          dataQualityStatus: 'VALID',
          isAnalyzable: true
        }
      },
      include: {
        jobListing: {
          select: {
            title: true,
            location: true,
            postedAt: true,
            qualityScore: true
          }
        }
      }
    });
  }
}
```

### 5.2 Quality Metrics Dashboard

**Real-time Quality Monitoring:**
```javascript
class QualityMonitoringService {
  async getCurrentQualityMetrics() {
    const metrics = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_job_listings,
        COUNT(CASE WHEN data_quality_status = 'VALID' THEN 1 END) as valid_listings,
        COUNT(CASE WHEN data_quality_status = 'PLACEHOLDER' THEN 1 END) as placeholder_listings,
        COUNT(CASE WHEN data_quality_status = 'FAILED_PARSING' THEN 1 END) as failed_listings,
        COUNT(CASE WHEN is_analyzable THEN 1 END) as analyzable_listings,
        AVG(quality_score) as average_quality_score,
        COUNT(CASE WHEN quality_score >= 0.8 THEN 1 END) as high_quality_count,
        COUNT(CASE WHEN quality_score < 0.4 THEN 1 END) as low_quality_count
      FROM job_listings
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `;
    
    const analysisMetrics = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_analyses,
        COUNT(CASE WHEN is_valid_analysis THEN 1 END) as valid_analyses,
        COUNT(CASE WHEN exclude_from_reports THEN 1 END) as excluded_analyses,
        AVG(CASE WHEN is_valid_analysis THEN score END) as avg_valid_score
      FROM analyses a
      JOIN job_listings jl ON a.job_listing_id = jl.id  
      WHERE a.created_at >= NOW() - INTERVAL '24 hours'
    `;
    
    return {
      parsing: metrics[0],
      analysis: analysisMetrics[0],
      qualityTrend: await this.calculateQualityTrend(),
      alerts: await this.getQualityAlerts()
    };
  }
}
```

## Phase 6: Performance Optimization Strategies

### 6.1 Indexing Strategy

**Optimized Database Indexes:**
```sql
-- Quality filtering performance
CREATE INDEX CONCURRENTLY idx_job_listings_quality_composite 
ON job_listings (data_quality_status, is_analyzable, quality_score DESC, created_at DESC);

-- Analytics performance
CREATE INDEX CONCURRENTLY idx_analyses_reporting_filter
ON analyses (is_valid_analysis, exclude_from_reports, verdict, created_at DESC)
WHERE is_valid_analysis = true AND exclude_from_reports = false;

-- Parsing attempt analysis
CREATE INDEX CONCURRENTLY idx_parsing_attempts_success_analysis
ON parsing_attempts (extraction_method, success_status, attempted_at DESC, confidence_score);

-- Quality metrics aggregation
CREATE INDEX CONCURRENTLY idx_quality_checks_metrics
ON data_quality_checks (overall_quality, checked_at, quality_score);

-- Cleanup operations
CREATE INDEX CONCURRENTLY idx_job_listings_cleanup
ON job_listings (company, title, created_at)
WHERE data_quality_status IN ('PLACEHOLDER', 'FAILED_PARSING');
```

### 6.2 Caching Strategy

**Quality Metrics Caching:**
```javascript
class QualityMetricsCache {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }
  
  async getQualityMetrics(period = 'daily') {
    const cacheKey = `quality_metrics_${period}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    const metrics = await this.calculateQualityMetrics(period);
    this.cache.set(cacheKey, {
      data: metrics,
      timestamp: Date.now()
    });
    
    return metrics;
  }
}
```

### 6.3 Background Processing

**Asynchronous Quality Assessment:**
```javascript
class QualityAssessmentWorker {
  constructor() {
    this.queue = [];
    this.processing = false;
  }
  
  async assessJobListingQuality(jobListingId) {
    // Add to background queue to avoid blocking analysis
    this.queue.push({
      type: 'quality_assessment',
      jobListingId,
      timestamp: Date.now()
    });
    
    this.processQueue();
  }
  
  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      await this.processQualityAssessment(job.jobListingId);
    }
    
    this.processing = false;
  }
}
```

## Phase 7: Implementation Timeline

### Week 1: Schema and Infrastructure
- [ ] Add new fields to JobListing and Analysis tables
- [ ] Create new audit trail tables (ParsingAttempt, DataQualityCheck, QualityMetric)
- [ ] Implement database constraints and triggers
- [ ] Create quality validation service

### Week 2: Data Protection Logic
- [ ] Implement DataIntegrityValidator service
- [ ] Update analyze.js to prevent placeholder data storage
- [ ] Add quality assessment to parsing workflow
- [ ] Create background quality assessment worker

### Week 3: Historical Data Cleanup
- [ ] Run cleanup analysis on existing data
- [ ] Implement staged cleanup procedures
- [ ] Flag polluted records and exclude from reports
- [ ] Verify cleanup results

### Week 4: Analytics Protection and Monitoring  
- [ ] Update all analytics queries to exclude invalid data
- [ ] Implement quality metrics dashboard
- [ ] Add real-time quality monitoring
- [ ] Create quality alerts system

## Quality Assurance and Testing

### Testing Strategy
1. **Unit Tests**: Data validation logic, quality assessment algorithms
2. **Integration Tests**: Full parsing workflow with quality gates
3. **Performance Tests**: Impact of quality checks on API response times
4. **Data Migration Tests**: Historical data cleanup verification

### Success Metrics
- **Zero Placeholder Analyses**: No analysis records created from placeholder data
- **Quality Score Distribution**: 80%+ of stored jobs have quality_score >= 0.7
- **Parsing Success Rate**: Track improvement in successful extractions
- **Analytics Accuracy**: Verify exclusion of invalid data from reports

### Monitoring and Alerts
- **Daily Quality Reports**: Automated quality assessment summaries
- **Pollution Detection**: Alerts when placeholder data attempts storage
- **Performance Impact**: Monitor quality check processing time
- **Trend Analysis**: Track improvement/degradation in parsing quality

## Risk Mitigation

### PLAN_UNCERTAINTY: Legitimate "Unknown Company" Cases
Some job postings might legitimately have "Unknown Company" if:
- User manually enters this as the actual company name
- Company explicitly uses this as their name
- Job posting intentionally anonymizes the employer

**Mitigation**: Implement user confirmation dialog when placeholder-like data is detected during manual entry.

### Performance Impact
Quality checks add processing overhead to every analysis request.

**Mitigation**: 
- Implement asynchronous quality assessment
- Cache quality results
- Optimize database queries with proper indexing

### Data Loss During Cleanup
Aggressive cleanup might remove legitimate data.

**Mitigation**:
- Implement staged cleanup with review steps
- Provide data recovery mechanisms
- Start with flagging before deletion

## Conclusion

This comprehensive data integrity protection plan addresses the core database pollution issues while establishing robust audit trails and quality monitoring systems. The implementation prioritizes data accuracy and system reliability while maintaining performance and user experience.

The plan's phased approach allows for gradual implementation with validation at each step, ensuring that improvements don't disrupt existing functionality while progressively enhancing data quality and system trustworthiness.

**Next Steps**: Begin with Phase 1 schema modifications and establish the data quality assessment framework before proceeding with historical data cleanup and analytics protection measures.