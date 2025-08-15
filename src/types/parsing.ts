export interface ParsedJob {
  title: string
  company: string
  description?: string
  location?: string
  salary?: string
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
  MANUAL_FALLBACK = 'manual_fallback'
}

export interface JobParser {
  name: string
  version: string
  canHandle(url: string): boolean
  extract(url: string, html: string): Promise<ParsedJob>
  getConfidence(): number
  getSupportedMethods(): ExtractionMethod[]
}

export interface ExtractionStrategy {
  method: ExtractionMethod
  priority: number
  extract(html: string, url: string): Promise<Partial<ParsedJob>>
  validate(data: Partial<ParsedJob>): ValidationResult[]
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
  }
  structuredDataPaths: {
    title: string[]
    company: string[]
    description?: string[]
  }
  textPatterns: {
    title: RegExp[]
    company: RegExp[]
  }
  validationRules: ValidationRule[]
}

export interface ValidationRule {
  field: string
  rule: string
  validate: (value: string) => { passed: boolean; score: number; message?: string }
}