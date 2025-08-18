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