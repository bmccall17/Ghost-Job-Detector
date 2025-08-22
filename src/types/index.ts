export interface JobAnalysis {
  id: string
  jobUrl: string
  title: string
  company: string
  ghostProbability: number
  confidence: number
  factors: string[]
  analyzedAt: Date
  status: 'pending' | 'completed' | 'failed'
  isNewContribution?: boolean
  
  // WebLLM parsing fields
  extractionMethod?: 'webllm' | 'manual' | 'fallback' | 'hybrid'
  parsingConfidence?: number
  validationSources?: string[]
  metadata?: {
    // New detailed analyzer processing data
    algorithmAssessment?: {
      ghostProbability: number
      modelConfidence: string
      assessmentText: string
    }
    riskFactorsAnalysis?: {
      warningSignsCount: number
      warningSignsTotal: number
      riskFactors: Array<{
        type: string
        description: string
        impact: string
      }>
      positiveIndicators: Array<{
        type: string
        description: string
        impact: string
      }>
    }
    recommendation?: {
      action: string
      message: string
      confidence: string
    }
    analysisDetails?: {
      analysisId: string
      modelVersion: string
      processingTimeMs: number
      analysisDate: string
      algorithmType?: string
      platform?: string
    }
    processingTimeMs?: number
    analysisId?: string

    // Legacy detailed analysis structure
    rawData?: {
      detailedAnalysis?: {
        thoughtProcess?: string[]
        linksChecked?: Array<{
          url: string
          platform: string
          status: string
          findings: string
          confidence: number
        }>
        companyResearch?: {
          companyName: string
          domain: string
          businessContext: string
          recentActivity: string[]
          locationVerification: string
          legitimacyScore: number
        }
        crossPlatformCheck?: {
          platformsFound: string[]
          consistentInfo: boolean
          duplicatesDetected: number
          postingPattern: string
        }
        confidenceBreakdown?: Record<string, number>
        verificationSteps?: Array<{
          step: number
          action: string
          result: string
          confidence: number
          nextSteps?: string[]
        }>
        finalAssessment?: string
        riskFactors?: string[]
        legitimacyIndicators?: string[]
      }
    }
  }
  parsingMetadata?: {
    parserUsed: string
    parserVersion: string
    extractionMethod: string
    confidence: {
      overall: number
      title: number
      company: number
      description?: number
    }
    validationResults: {
      field: string
      passed: boolean
      rule: string
      message?: string
      score: number
    }[]
    extractionTimestamp: Date
    rawData?: {
      structuredData?: any
      htmlTitle?: string
      htmlMetaTags?: Record<string, string>
      agentValidated?: boolean
      agentNotes?: string
      detailedAnalysis?: {
        thoughtProcess?: string[]
        linksChecked?: Array<{
          url: string
          platform: string
          status: string
          findings: string
          confidence: number
        }>
        companyResearch?: {
          companyName: string
          domain: string
          businessContext: string
          recentActivity: string[]
          locationVerification: string
          legitimacyScore: number
        }
        crossPlatformCheck?: {
          platformsFound: string[]
          consistentInfo: boolean
          duplicatesDetected: number
          postingPattern: string
        }
        confidenceBreakdown?: {
          overallConfidence: number
          titleConfidence: number
          companyConfidence: number
          locationConfidence: number
          legitimacyConfidence: number
          reasoningQuality: number
        }
        verificationSteps?: Array<{
          step: number
          action: string
          result: string
          confidence: number
          nextSteps?: string[]
        }>
        finalAssessment?: string
        riskFactors?: string[]
        legitimacyIndicators?: string[]
      }
    }
  }
}

export interface AnalysisResult {
  id: string
  url?: string
  jobData?: {
    title: string
    company: string
    description: string
    location: string | null
    remote: boolean
  }
  ghostProbability: number
  riskLevel: string
  riskFactors: string[]
  keyFactors: string[]
  metadata: {
    storage: string
    version: string
    cached: boolean
    analysisDate: string
    // New detailed analyzer processing data
    algorithmAssessment?: {
      ghostProbability: number
      modelConfidence: string
      assessmentText: string
    }
    riskFactorsAnalysis?: {
      warningSignsCount: number
      warningSignsTotal: number
      riskFactors: Array<{
        type: string
        description: string
        impact: string
      }>
      positiveIndicators: Array<{
        type: string
        description: string
        impact: string
      }>
    }
    recommendation?: {
      action: string
      message: string
      confidence: string
    }
    analysisDetails?: {
      analysisId: string
      modelVersion: string
      processingTimeMs: number
      analysisDate: string
      algorithmType?: string
      platform?: string
    }
    processingTimeMs?: number
    analysisId?: string
  }
}

export interface BulkAnalysisJob {
  id: string
  fileName: string
  totalJobs: number
  completedJobs: number
  failedJobs: number
  status: 'uploading' | 'processing' | 'completed' | 'failed'
  createdAt: Date
  completedAt?: Date
  results: JobAnalysis[]
}

// WebLLM Parsing interfaces
export interface ParsePreviewRequest {
  url: string
}

export interface ParsePreviewResponse {
  url: string
  extractedData: ExtractedJobData | null
  confidence: number
  extractionMethod: 'webllm' | 'manual' | 'fallback'
  validationResult?: {
    overallConfidence: number
    companyValidation: {
      isValid: boolean
      confidence: number
      legitimacyScore: number
    }
    titleValidation: {
      isValid: boolean
      confidence: number
      industryMatch: boolean
    }
    issues: string[]
    recommendations: string[]
  }
  duplicateCheck?: {
    isDuplicate: boolean
    matchingScore: number
    matchingFactors: string[]
    matchedJobId?: string
    recommendedAction: string
  }
  processingTimeMs: number
  message: string
  recommendedAction: 'auto_proceed' | 'user_confirm' | 'manual_entry' | 'duplicate_found'
  metadata?: {
    parsingEnabled: boolean
    platform: string
    timestamp: string
  }
}

export interface ExtractedJobData {
  title: string | null
  company: string | null
  location: string | null
  description: string | null
  salary: string | null
  jobType: string | null
  postedAt: string | null
  jobId: string | null
  contactDetails: string | null
  originalSource: string
}

export interface ParsedJobConfirmation {
  url: string
  extractedData: ExtractedJobData
  confidence: number
  userConfirmed: boolean
  editedFields?: Partial<ExtractedJobData>
  userNotes?: string
}