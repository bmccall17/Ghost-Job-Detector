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