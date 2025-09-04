import { PDFTextExtractor, PDFTextContent } from './PDFTextExtractor'
import { PDFURLDetector, URLDetectionResult } from './PDFURLDetector'

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
  rawTextContent?: string // For debugging
}

export interface PDFParsingOptions {
  includeRawText?: boolean
  onProgress?: (stage: string, progress: number) => void
  extractionOptions?: {
    includeHiddenText?: boolean
    preserveSpacing?: boolean
  }
}

export class PDFParsingService {
  private static instance: PDFParsingService
  private textExtractor: PDFTextExtractor
  
  static getInstance(): PDFParsingService {
    if (!PDFParsingService.instance) {
      PDFParsingService.instance = new PDFParsingService()
    }
    return PDFParsingService.instance
  }

  constructor() {
    this.textExtractor = PDFTextExtractor.getInstance()
  }

  async extractJobData(file: File, options: PDFParsingOptions = {}): Promise<PDFJobData> {
    const startTime = Date.now()
    
    try {
      options.onProgress?.('Initializing PDF parsing', 10)
      
      // 1. Extract text from PDF
      options.onProgress?.('Extracting text from PDF', 20)
      const textContent = await this.textExtractor.extractText(file, {
        ...options.extractionOptions,
        onProgress: (pageNum, totalPages) => {
          const pageProgress = 20 + (pageNum / totalPages) * 30
          options.onProgress?.(`Processing page ${pageNum} of ${totalPages}`, pageProgress)
        }
      })
      
      options.onProgress?.('Detecting job posting URL', 60)
      
      // 2. Detect URLs in PDF (enable debug mode for troubleshooting)
      console.log('🔍 ENHANCED PDF URL DEBUG:')
      console.log('📄 Full extracted text length:', textContent.fullText.length)
      console.log('📄 Last 500 characters of PDF:', textContent.fullText.slice(-500))
      console.log('📄 Character codes of last 50 chars:', textContent.fullText.slice(-50).split('').map(c => `${c}(${c.charCodeAt(0)})`))
      console.log('📄 Searching for common URL patterns...')
      
      // More comprehensive manual URL checks
      const manualHttpCheck = textContent.fullText.match(/https?:\/\/[^\s]+/gi)
      const manualWwwCheck = textContent.fullText.match(/www\.[^\s]+/gi)
      const manualComCheck = textContent.fullText.match(/[a-zA-Z0-9.-]+\.com[^\s]*/gi)
      const manualOrgCheck = textContent.fullText.match(/[a-zA-Z0-9.-]+\.org[^\s]*/gi)
      const manualIoCheck = textContent.fullText.match(/[a-zA-Z0-9.-]+\.io[^\s]*/gi)
      const manualJobsCheck = textContent.fullText.match(/jobs?\.[a-zA-Z0-9.-]+/gi)
      const manualCareersCheck = textContent.fullText.match(/careers?\.[a-zA-Z0-9.-]+/gi)
      const manualApplyCheck = textContent.fullText.match(/apply\.[a-zA-Z0-9.-]+/gi)
      
      console.log('🔍 Manual HTTP check found:', manualHttpCheck?.length || 0, 'URLs')
      if (manualHttpCheck) console.log('Sample HTTP URLs:', manualHttpCheck.slice(0, 3))
      
      console.log('🔍 Manual WWW check found:', manualWwwCheck?.length || 0, 'URLs')
      if (manualWwwCheck) console.log('Sample WWW URLs:', manualWwwCheck.slice(0, 3))
      
      console.log('🔍 Manual .com check found:', manualComCheck?.length || 0, 'domains')
      if (manualComCheck) console.log('Sample .com domains:', manualComCheck.slice(0, 3))
      
      console.log('🔍 Manual .org check found:', manualOrgCheck?.length || 0, 'domains')  
      if (manualOrgCheck) console.log('Sample .org domains:', manualOrgCheck.slice(0, 3))
      
      console.log('🔍 Manual .io check found:', manualIoCheck?.length || 0, 'domains')
      if (manualIoCheck) console.log('Sample .io domains:', manualIoCheck.slice(0, 3))
      
      console.log('🔍 Manual jobs. check found:', manualJobsCheck?.length || 0, 'domains')
      if (manualJobsCheck) console.log('Sample jobs domains:', manualJobsCheck.slice(0, 3))
      
      console.log('🔍 Manual careers. check found:', manualCareersCheck?.length || 0, 'domains')
      if (manualCareersCheck) console.log('Sample careers domains:', manualCareersCheck.slice(0, 3))
      
      console.log('🔍 Manual apply. check found:', manualApplyCheck?.length || 0, 'domains')
      if (manualApplyCheck) console.log('Sample apply domains:', manualApplyCheck.slice(0, 3))
      
      const urlDetection = PDFURLDetector.detectURLs(textContent, true)
      
      options.onProgress?.('Analyzing job content', 70)
      
      // 3. Parse job information from text
      const jobInfo = await this.parseJobInformation(textContent, urlDetection)
      
      options.onProgress?.('Calculating confidence scores', 85)
      
      // 4. Calculate confidence scores
      const confidence = this.calculateConfidenceScores(textContent, urlDetection, jobInfo)
      
      options.onProgress?.('Finalizing results', 95)
      
      // 5. Compile final result
      const result: PDFJobData = {
        ...jobInfo,
        sourceUrl: urlDetection.primaryURL?.url,
        confidence,
        parsingMetadata: {
          pdfPages: textContent.metadata.numPages,
          textLength: textContent.fullText.length,
          urlsFound: urlDetection.allURLs.map(u => u.url),
          parsingMethod: `pdf_extraction_v1.0_${urlDetection.detectionMethod}`,
          processingTimeMs: Date.now() - startTime,
          extractorVersion: '1.0.0',
          fileSize: file.size,
          fileName: file.name
        },
        rawTextContent: options.includeRawText ? textContent.fullText : undefined
      }
      
      options.onProgress?.('Complete', 100)
      
      console.log('🎉 PDF parsing completed successfully:', {
        fileName: file.name,
        pages: textContent.metadata.numPages,
        textLength: textContent.fullText.length,
        urlsFound: urlDetection.allURLs.length,
        primaryURL: urlDetection.primaryURL?.url,
        processingTime: result.parsingMetadata.processingTimeMs
      })
      
      return result
    } catch (error) {
      console.error('🚨 PDF parsing failed - STOPPING processing:', error)
      
      // CRITICAL: Do NOT return fake data when PDF parsing fails
      // This prevents fake analysis results from being generated
      throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async parseJobInformation(
    textContent: PDFTextContent, 
    urlDetection: URLDetectionResult
  ): Promise<Pick<PDFJobData, 'title' | 'company' | 'description' | 'location' | 'remoteFlag' | 'postedAt'>> {
    // Extract job title
    const title = this.extractJobTitle(textContent, urlDetection)
    
    // Extract company name
    const company = this.extractCompanyName(textContent, urlDetection)
    
    // Extract description
    const description = this.extractJobDescription(textContent)
    
    // Extract location
    const location = this.extractLocation(textContent)
    
    // Check for remote work indicators
    const remoteFlag = this.detectRemoteWork(textContent)
    
    // Try to extract posting date
    const postedAt = this.extractPostingDate(textContent)
    
    return {
      title,
      company,
      description,
      location,
      remoteFlag,
      postedAt
    }
  }

  private extractJobTitle(textContent: PDFTextContent, urlDetection: URLDetectionResult): string {
    // Strategy 1: Look for title patterns in the first page
    const firstPageText = textContent.pageTexts[0] || ''
    
    // Common title patterns
    const titlePatterns = [
      /(?:position|role|job\s+title|title):\s*([^\n\r]{3,60})/i,
      /^([A-Z][^.\n\r]{10,60})$/m, // Capitalized lines that look like titles
      /job\s+title[:\s]+([^\n\r]{3,60})/i
    ]
    
    for (const pattern of titlePatterns) {
      const match = firstPageText.match(pattern)
      if (match && match[1]) {
        const title = match[1].trim()
        if (this.isValidTitle(title)) {
          return title
        }
      }
    }
    
    // Strategy 2: Extract from URL if available
    if (urlDetection.primaryURL?.url) {
      const urlTitle = this.extractTitleFromURL(urlDetection.primaryURL.url)
      if (urlTitle) return urlTitle
    }
    
    // Strategy 3: Extract from PDF metadata
    if (textContent.metadata.title && this.isValidTitle(textContent.metadata.title)) {
      return textContent.metadata.title
    }
    
    // Strategy 4: Look for prominent text in early pages
    const prominentText = this.findProminentText(textContent.pageTexts.slice(0, 2))
    if (prominentText) return prominentText
    
    return 'Position from PDF'
  }

  private extractCompanyName(textContent: PDFTextContent, urlDetection: URLDetectionResult): string {
    // Strategy 1: Extract from URL
    if (urlDetection.primaryURL?.url) {
      const urlCompany = this.extractCompanyFromURL(urlDetection.primaryURL.url)
      if (urlCompany) return urlCompany
    }
    
    // Strategy 2: Look for company patterns in text
    const fullText = textContent.fullText
    const companyPatterns = [
      /(?:company|organization|employer):\s*([^\n\r]{2,40})/i,
      /(?:at|with|for)\s+([A-Z][A-Za-z\s&.,]{2,30}(?:\s+(?:Inc|LLC|Ltd|Corp|Company|Co\.?))?)/,
      /([A-Z][A-Za-z\s&.,]{2,30}(?:\s+(?:Inc|LLC|Ltd|Corp|Company|Co\.?)))/
    ]
    
    for (const pattern of companyPatterns) {
      const match = fullText.match(pattern)
      if (match && match[1]) {
        const company = match[1].trim()
        if (this.isValidCompanyName(company)) {
          return company
        }
      }
    }
    
    // Strategy 3: Extract from PDF metadata
    if (textContent.metadata.author && this.isValidCompanyName(textContent.metadata.author)) {
      return textContent.metadata.author
    }
    
    return 'Company from PDF'
  }

  private extractJobDescription(textContent: PDFTextContent): string {
    const fullText = textContent.fullText
    
    // Find section that looks like job description
    const descriptionPatterns = [
      /(?:job\s+description|description|summary|overview|about\s+the\s+role)[:\s]*([\s\S]{100,2000}?)(?:\n\s*\n|\n(?:requirements|qualifications|skills|education))/i,
      /(?:responsibilities|duties)[:\s]*([\s\S]{100,1500}?)(?:\n\s*\n|$)/i
    ]
    
    for (const pattern of descriptionPatterns) {
      const match = fullText.match(pattern)
      if (match && match[1]) {
        return match[1].trim().substring(0, 1000) // Limit length
      }
    }
    
    // Fallback: return first substantial paragraph
    const paragraphs = fullText.split(/\n\s*\n/).filter(p => p.trim().length > 50)
    if (paragraphs.length > 0) {
      return paragraphs[0].trim().substring(0, 500)
    }
    
    return 'Job description extracted from PDF'
  }

  private extractLocation(textContent: PDFTextContent): string | undefined {
    const fullText = textContent.fullText
    
    const locationPatterns = [
      /(?:location|based in|located in)[:\s]*([A-Za-z\s,]{3,50})/i,
      /([A-Za-z\s]+,\s*[A-Z]{2}(?:\s+\d{5})?)/,  // City, State format
      /([A-Za-z\s]+,\s*[A-Za-z\s]{3,20})/        // City, Country format
    ]
    
    for (const pattern of locationPatterns) {
      const match = fullText.match(pattern)
      if (match && match[1]) {
        const location = match[1].trim()
        if (location.length > 2 && location.length < 50) {
          return location
        }
      }
    }
    
    return undefined
  }

  private detectRemoteWork(textContent: PDFTextContent): boolean {
    const fullText = textContent.fullText.toLowerCase()
    
    const remoteIndicators = [
      'remote', 'work from home', 'wfh', 'telecommute', 'distributed team',
      'anywhere', 'location independent', 'virtual position'
    ]
    
    return remoteIndicators.some(indicator => fullText.includes(indicator))
  }

  private extractPostingDate(textContent: PDFTextContent): Date | undefined {
    const fullText = textContent.fullText
    
    // Try PDF metadata first
    if (textContent.metadata.creationDate) {
      return textContent.metadata.creationDate
    }
    
    // Look for date patterns in text
    const datePatterns = [
      /(?:posted|published|date)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /(?:posted|published|date)[:\s]*(\d{4}-\d{2}-\d{2})/i,
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(\d{4}-\d{2}-\d{2})/
    ]
    
    for (const pattern of datePatterns) {
      const match = fullText.match(pattern)
      if (match && match[1]) {
        const date = new Date(match[1])
        if (!isNaN(date.getTime()) && date > new Date('2020-01-01')) {
          return date
        }
      }
    }
    
    return undefined
  }

  private calculateConfidenceScores(
    textContent: PDFTextContent,
    urlDetection: URLDetectionResult,
    jobInfo: Pick<PDFJobData, 'title' | 'company' | 'description'>
  ): PDFJobData['confidence'] {
    // Title confidence
    const titleConfidence = this.calculateTitleConfidence(jobInfo.title, textContent)
    
    // Company confidence  
    const companyConfidence = this.calculateCompanyConfidence(jobInfo.company, urlDetection)
    
    // Description confidence
    const descriptionConfidence = this.calculateDescriptionConfidence(jobInfo.description)
    
    // URL confidence
    const urlConfidence = urlDetection.confidence
    
    // Overall confidence (weighted average)
    const overall = (
      titleConfidence * 0.3 +
      companyConfidence * 0.3 +
      descriptionConfidence * 0.2 +
      urlConfidence * 0.2
    )
    
    return {
      title: titleConfidence,
      company: companyConfidence,
      description: descriptionConfidence,
      url: urlConfidence,
      overall
    }
  }

  private calculateTitleConfidence(title: string, _textContent: PDFTextContent): number {
    let confidence = 0.5
    
    // Boost if title looks professional
    if (title.match(/^[A-Z][\w\s,-]{5,50}$/)) confidence += 0.2
    
    // Boost if contains job-related keywords
    const jobKeywords = ['engineer', 'manager', 'analyst', 'specialist', 'director', 'coordinator']
    if (jobKeywords.some(keyword => title.toLowerCase().includes(keyword))) {
      confidence += 0.2
    }
    
    // Reduce if too generic
    if (title.includes('Position from PDF') || title.length < 5) {
      confidence -= 0.3
    }
    
    return Math.min(1.0, Math.max(0.1, confidence))
  }

  private calculateCompanyConfidence(company: string, urlDetection: URLDetectionResult): number {
    let confidence = 0.5
    
    // Boost if extracted from URL
    if (urlDetection.primaryURL && company !== 'Company from PDF') {
      confidence += 0.3
    }
    
    // Boost if looks like real company name
    if (company.match(/^[A-Z][\w\s&.,]{2,30}$/)) confidence += 0.2
    
    // Boost if contains company indicators
    if (company.match(/\b(?:Inc|LLC|Ltd|Corp|Company|Co\.?)\b/)) {
      confidence += 0.1
    }
    
    // Reduce if too generic
    if (company.includes('Company from PDF') || company.length < 3) {
      confidence -= 0.3
    }
    
    return Math.min(1.0, Math.max(0.1, confidence))
  }

  private calculateDescriptionConfidence(description: string): number {
    let confidence = 0.5
    
    // Boost for longer, detailed descriptions
    if (description.length > 200) confidence += 0.2
    if (description.length > 500) confidence += 0.1
    
    // Boost if contains job-related terms
    const jobTerms = ['responsibilities', 'requirements', 'qualifications', 'skills', 'experience']
    const foundTerms = jobTerms.filter(term => description.toLowerCase().includes(term))
    confidence += foundTerms.length * 0.1
    
    // Reduce for generic descriptions
    if (description.includes('Job description extracted from PDF')) {
      confidence -= 0.2
    }
    
    return Math.min(1.0, Math.max(0.1, confidence))
  }

  // Helper methods
  private isValidTitle(title: string): boolean {
    return title.length >= 5 && title.length <= 100 && 
           !title.match(/^(page \d+|untitled|document)/i)
  }

  private isValidCompanyName(name: string): boolean {
    return name.length >= 2 && name.length <= 50 && 
           !name.match(/^(user|admin|document|page)/i)
  }

  private extractTitleFromURL(url: string): string | null {
    // Extract job title from common URL patterns
    const patterns = [
      /\/jobs?\/([^\/\?]+)/i,
      /jobTitle=([^&]+)/i,
      /position[_-]([^\/\?]+)/i
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return decodeURIComponent(match[1].replace(/[_-]/g, ' '))
      }
    }
    
    return null
  }

  private extractCompanyFromURL(url: string): string | null {
    const hostname = new URL(url).hostname.toLowerCase()
    
    // Well-known companies
    const companyMap: { [key: string]: string } = {
      'deloitte.com': 'Deloitte',
      'microsoft.com': 'Microsoft',
      'google.com': 'Google',
      'apple.com': 'Apple',
      'amazon.com': 'Amazon'
    }
    
    for (const [domain, company] of Object.entries(companyMap)) {
      if (hostname.includes(domain)) {
        return company
      }
    }
    
    // Extract from greenhouse/lever URLs
    if (hostname.includes('greenhouse.io')) {
      const match = url.match(/\/\/([^.]+)\.greenhouse\.io/)
      if (match && match[1]) {
        return match[1].charAt(0).toUpperCase() + match[1].slice(1)
      }
    }
    
    if (hostname.includes('lever.co')) {
      const match = url.match(/jobs\.lever\.co\/([^\/]+)/)
      if (match && match[1]) {
        return match[1].charAt(0).toUpperCase() + match[1].slice(1)
      }
    }
    
    return null
  }

  private findProminentText(pageTexts: string[]): string | null {
    // Find text that appears prominent (short lines that could be titles)
    for (const pageText of pageTexts) {
      const lines = pageText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
      
      for (const line of lines.slice(0, 10)) { // Check first 10 lines
        if (line.length >= 10 && line.length <= 80 && this.isValidTitle(line)) {
          return line
        }
      }
    }
    
    return null
  }

}