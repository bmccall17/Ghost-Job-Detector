export interface ParsedJob {
  title: string
  company: string
  description?: string
  location?: string
  salary?: string
  remoteFlag?: boolean
  postedAt?: Date
  metadata: ParsingMetadata
}

export interface ParsingMetadata {
  parserUsed: string
  parserVersion: string
  extractionMethod: ExtractionMethod
  confidence: ConfidenceScores
  validationResults: ValidationResult[]
  extractionTimestamp: Date
  sourceUrl: string
  rawData?: {
    structuredData?: any
    htmlTitle?: string
    htmlMetaTags?: Record<string, string>
    textContent?: string
  }
}

export interface ConfidenceScores {
  overall: number // 0-1, weighted average
  title: number
  company: number
  description?: number
  location?: number
  salary?: number
  remoteFlag?: number
  postedAt?: number
}

export interface ValidationResult {
  field: string
  passed: boolean
  rule: string
  message?: string
  score: number
}

export enum ExtractionMethod {
  STRUCTURED_DATA = 'structured_data',
  CSS_SELECTORS = 'css_selectors',
  TEXT_PATTERNS = 'text_patterns',
  NLP_EXTRACTION = 'nlp_extraction',
  MANUAL_FALLBACK = 'manual_fallback',
  DOMAIN_INTELLIGENCE = 'domain_intelligence',
  STRUCTURED_DATA_WITH_LEARNING = 'structured_data_with_learning',
  CSS_SELECTORS_WITH_LEARNING = 'css_selectors_with_learning',
  TEXT_PATTERNS_WITH_LEARNING = 'text_patterns_with_learning',
  NLP_EXTRACTION_WITH_LEARNING = 'nlp_extraction_with_learning',
  MANUAL_FALLBACK_WITH_LEARNING = 'manual_fallback_with_learning',
  REAL_TIME_LEARNING = 'real_time_learning'
}

export interface JobParser {
  name: string
  version: string
  canHandle(_url: string): boolean
  extract(_url: string, _html: string): Promise<ParsedJob>
  getConfidence(): number
  getSupportedMethods(): ExtractionMethod[]
}

export interface ExtractionStrategy {
  method: ExtractionMethod
  priority: number
  extract(_html: string, _url: string): Promise<Partial<ParsedJob>>
  validate(_data: Partial<ParsedJob>): ValidationResult[]
}

export interface ParserConfig {
  name: string
  urlPatterns: RegExp[]
  selectors: {
    title: string[]
    company: string[]
    description?: string[]
    location?: string[]
    salary?: string[]
    postedDate?: string[]
  }
  structuredDataPaths: {
    title: string[]
    company: string[]
    description?: string[]
    location?: string[]
    postedDate?: string[]
  }
  textPatterns: {
    title: RegExp[]
    company: RegExp[]
    location?: RegExp[]
    postedDate?: RegExp[]
  }
  validationRules: ValidationRule[]
}

export interface ValidationRule {
  field: string
  rule: string
  validate: (_value: string) => { passed: boolean; score: number; message?: string }
}