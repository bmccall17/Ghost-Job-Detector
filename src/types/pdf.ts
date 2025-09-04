// PDF Processing Types for Ghost Job Detector

export interface PDFTextContent {
  fullText: string
  pageTexts: string[]
  metadata: {
    numPages: number
    title?: string
    author?: string
    subject?: string
    creator?: string
    producer?: string
    creationDate?: Date
    modificationDate?: Date
  }
  processingTimeMs: number
}

export interface PDFExtractionOptions {
  includeHiddenText?: boolean
  preserveSpacing?: boolean
  onProgress?: (pageNumber: number, totalPages: number) => void
}

export interface DetectedURL {
  url: string
  location: 'header' | 'footer' | 'content' | 'metadata'
  confidence: number
  pageNumber?: number
  context?: string
}

export interface URLDetectionResult {
  primaryURL?: DetectedURL
  allURLs: DetectedURL[]
  confidence: number
  detectionMethod: string
  processingTimeMs: number
}

export interface PDFJobData {
  title: string
  company: string
  description: string
  location?: string
  remoteFlag?: boolean
  postedAt?: Date
  sourceUrl?: string
  confidence: {
    title: number
    company: number
    description: number
    url: number
    overall: number
  }
  parsingMetadata: {
    pdfPages: number
    textLength: number
    urlsFound: string[]
    parsingMethod: string
    processingTimeMs: number
    extractorVersion: string
    fileSize: number
    fileName: string
  }
  rawTextContent?: string
}

export interface PDFParsingOptions {
  includeRawText?: boolean
  onProgress?: (stage: string, progress: number) => void
  extractionOptions?: {
    includeHiddenText?: boolean
    preserveSpacing?: boolean
  }
}

// Platform-specific configuration
export interface PlatformConfig {
  weight: number
  platform: string
}

export interface PlatformIndicators {
  [key: string]: PlatformConfig
}

// Error types for PDF processing
export enum PDFErrorTypes {
  CORRUPTED_FILE = 'corrupted_pdf',
  MISSING_TEXT = 'no_text_content',
  NO_URL_DETECTED = 'url_not_found',
  PARSING_FAILED = 'pdf_parsing_failed',
  MEMORY_EXCEEDED = 'file_too_large',
  WORKER_ERROR = 'pdf_worker_error',
  INVALID_FILE_TYPE = 'invalid_file_type'
}

export interface PDFErrorInfo {
  type: PDFErrorTypes
  title: string
  message: string
  solutions: string[]
}

// Performance tracking
export interface PDFPerformanceMetrics {
  fileSize: number
  numPages: number
  textExtractionTimeMs: number
  urlDetectionTimeMs: number
  totalProcessingTimeMs: number
  memoryUsageMB?: number
  workerInitTimeMs?: number
}

// Security validation
export interface PDFSecurityValidation {
  isValidPDF: boolean
  hasMaliciousContent: boolean
  sizeWithinLimits: boolean
  typeValidation: boolean
  errors?: string[]
  warnings?: string[]
}

// Analysis result with PDF-specific metadata
export interface PDFAnalysisResult {
  jobData: PDFJobData
  performanceMetrics: PDFPerformanceMetrics
  securityValidation: PDFSecurityValidation
  extractionErrors?: string[]
  fallbackUsed: boolean
}

// Progress callback types
export type PDFProgressCallback = (stage: string, progress: number) => void
export type PDFPageProgressCallback = (pageNumber: number, totalPages: number) => void

// Configuration for PDF processing
export interface PDFProcessingConfig {
  maxFileSizeMB: number
  maxProcessingTimeMs: number
  workerTimeoutMs: number
  enableSecurityValidation: boolean
  enablePerformanceTracking: boolean
  fallbackToFilenameExtraction: boolean
}

export const DEFAULT_PDF_CONFIG: PDFProcessingConfig = {
  maxFileSizeMB: 10,
  maxProcessingTimeMs: 30000, // 30 seconds
  workerTimeoutMs: 15000, // 15 seconds  
  enableSecurityValidation: true,
  enablePerformanceTracking: true,
  fallbackToFilenameExtraction: true
}