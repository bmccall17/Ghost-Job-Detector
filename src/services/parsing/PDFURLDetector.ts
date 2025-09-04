import { PDFTextContent } from './PDFTextExtractor'

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

export class PDFURLDetector {
  private static readonly URL_PATTERNS = [
    // Job posting URLs - specific platforms
    /https?:\/\/(www\.)?(apply\.)?deloitte\.com\/[^"\s\)]+/gi,
    /https?:\/\/(www\.)?linkedin\.com\/jobs\/view\/\d+[^"\s\)]*/gi,
    /https?:\/\/[^.]+\.greenhouse\.io\/jobs\/\d+[^"\s\)]*/gi,
    /https?:\/\/jobs\.lever\.co\/[^\/]+\/[^"\s\)]+/gi,
    /https?:\/\/(www\.)?workday\.com\/[^"\s\)]+/gi,
    /https?:\/\/(www\.)?indeed\.com\/viewjob[^"\s\)]*/gi,
    /https?:\/\/(www\.)?glassdoor\.com\/job-listing\/[^"\s\)]*/gi,
    /https?:\/\/(www\.)?monster\.com\/job-openings\/[^"\s\)]*/gi,
    
    // Career page URLs
    /https?:\/\/careers\.[^"\s\)]+\/[^"\s\)]*/gi,
    /https?:\/\/[^.]+\.com\/careers\/[^"\s\)]*/gi,
    /https?:\/\/[^.]+\.com\/jobs\/[^"\s\)]*/gi,
    
    // Generic URLs that might be job postings
    /https?:\/\/[^"\s\)]+(?:job|career|position|role|hiring)[^"\s\)]*/gi,
    /https?:\/\/[^"\s\)]+\/(?:job|career|position|role|hiring)[^"\s\)]*/gi,
    
    // General URL pattern (lowest priority)
    /https?:\/\/[^\s"<>(){}[\]]+/gi
  ]

  private static readonly PLATFORM_INDICATORS = {
    'deloitte.com': { weight: 0.95, platform: 'Deloitte' },
    'linkedin.com/jobs': { weight: 0.9, platform: 'LinkedIn' },
    'greenhouse.io': { weight: 0.9, platform: 'Greenhouse' },
    'lever.co': { weight: 0.9, platform: 'Lever' },
    'workday.com': { weight: 0.85, platform: 'Workday' },
    'indeed.com': { weight: 0.8, platform: 'Indeed' },
    'glassdoor.com': { weight: 0.8, platform: 'Glassdoor' },
    'monster.com': { weight: 0.75, platform: 'Monster' },
    'careers.': { weight: 0.7, platform: 'Career Page' },
    '/careers/': { weight: 0.7, platform: 'Career Page' },
    '/jobs/': { weight: 0.7, platform: 'Job Board' }
  }

  static detectURLs(pdfContent: PDFTextContent): URLDetectionResult {
    const startTime = Date.now()
    const allURLs: DetectedURL[] = []
    
    try {
      // 1. Check metadata for URLs
      const metadataURLs = this.extractURLsFromMetadata(pdfContent)
      allURLs.push(...metadataURLs)
      
      // 2. Check first and last pages for headers/footers
      const headerFooterURLs = this.extractHeaderFooterURLs(pdfContent)
      allURLs.push(...headerFooterURLs)
      
      // 3. Check all content for URLs
      const contentURLs = this.extractContentURLs(pdfContent)
      allURLs.push(...contentURLs)
      
      // 4. Deduplicate and score URLs
      const uniqueURLs = this.deduplicateURLs(allURLs)
      
      // 5. Select primary URL
      const primaryURL = this.selectPrimaryURL(uniqueURLs)
      
      // 6. Calculate overall confidence
      const confidence = this.calculateOverallConfidence(uniqueURLs, primaryURL)
      
      return {
        primaryURL,
        allURLs: uniqueURLs,
        confidence,
        detectionMethod: this.getDetectionMethod(uniqueURLs),
        processingTimeMs: Date.now() - startTime
      }
    } catch (error) {
      console.error('URL detection failed:', error)
      return {
        allURLs: [],
        confidence: 0,
        detectionMethod: 'failed',
        processingTimeMs: Date.now() - startTime
      }
    }
  }

  private static extractURLsFromMetadata(pdfContent: PDFTextContent): DetectedURL[] {
    const urls: DetectedURL[] = []
    const metadata = pdfContent.metadata
    
    // Check common metadata fields for URLs
    const metadataFields = [
      metadata.title,
      metadata.subject,
      metadata.creator,
      metadata.producer
    ]
    
    for (const field of metadataFields) {
      if (field) {
        const foundURLs = this.findURLsInText(field)
        urls.push(...foundURLs.map(url => ({
          ...url,
          location: 'metadata' as const,
          confidence: url.confidence * 0.9 // Slightly lower confidence for metadata
        })))
      }
    }
    
    return urls
  }

  private static extractHeaderFooterURLs(pdfContent: PDFTextContent): DetectedURL[] {
    const urls: DetectedURL[] = []
    
    // Check first page (likely has header)
    if (pdfContent.pageTexts.length > 0) {
      const firstPageURLs = this.findURLsInText(pdfContent.pageTexts[0])
      urls.push(...firstPageURLs.map(url => ({
        ...url,
        location: 'header' as const,
        pageNumber: 1,
        confidence: url.confidence * 1.1 // Boost confidence for first page
      })))
    }
    
    // Check last page (likely has footer)
    if (pdfContent.pageTexts.length > 1) {
      const lastPageURLs = this.findURLsInText(pdfContent.pageTexts[pdfContent.pageTexts.length - 1])
      urls.push(...lastPageURLs.map(url => ({
        ...url,
        location: 'footer' as const,
        pageNumber: pdfContent.pageTexts.length,
        confidence: url.confidence * 1.05 // Slight boost for last page
      })))
    }
    
    // Check for URLs that appear at the top/bottom of multiple pages
    if (pdfContent.pageTexts.length > 2) {
      const commonURLs = this.findCommonHeaderFooterURLs(pdfContent.pageTexts)
      urls.push(...commonURLs)
    }
    
    return urls
  }

  private static extractContentURLs(pdfContent: PDFTextContent): DetectedURL[] {
    const urls: DetectedURL[] = []
    
    pdfContent.pageTexts.forEach((pageText, index) => {
      const pageURLs = this.findURLsInText(pageText)
      urls.push(...pageURLs.map(url => ({
        ...url,
        location: 'content' as const,
        pageNumber: index + 1
      })))
    })
    
    return urls
  }

  private static findURLsInText(text: string): Array<Omit<DetectedURL, 'location'>> {
    const urls: Array<Omit<DetectedURL, 'location'>> = []
    const foundURLs = new Set<string>()
    
    for (const pattern of this.URL_PATTERNS) {
      pattern.lastIndex = 0 // Reset regex
      let match
      
      while ((match = pattern.exec(text)) !== null) {
        const url = match[0].trim()
        
        // Clean up URL (remove trailing punctuation)
        const cleanURL = this.cleanURL(url)
        
        if (cleanURL && !foundURLs.has(cleanURL)) {
          foundURLs.add(cleanURL)
          
          const confidence = this.calculateURLConfidence(cleanURL)
          const context = this.extractContext(text, match.index, 50)
          
          urls.push({
            url: cleanURL,
            confidence,
            context
          })
        }
      }
    }
    
    return urls
  }

  private static cleanURL(url: string): string {
    // Remove trailing punctuation and whitespace
    return url.replace(/[.,;:!?)\]}>'"]*$/, '').trim()
  }

  private static extractContext(text: string, index: number, contextLength: number): string {
    const start = Math.max(0, index - contextLength)
    const end = Math.min(text.length, index + contextLength)
    return text.substring(start, end).trim()
  }

  private static calculateURLConfidence(url: string): number {
    let confidence = 0.5 // Base confidence
    
    // Check against platform indicators
    for (const [indicator, config] of Object.entries(this.PLATFORM_INDICATORS)) {
      if (url.toLowerCase().includes(indicator.toLowerCase())) {
        confidence = Math.max(confidence, config.weight)
      }
    }
    
    // Boost for HTTPS
    if (url.startsWith('https://')) {
      confidence += 0.1
    }
    
    // Boost for job-specific parameters
    if (url.match(/(?:job|position|role|career)id/i)) {
      confidence += 0.1
    }
    
    // Reduce for very long or suspicious URLs
    if (url.length > 200) {
      confidence -= 0.2
    }
    
    return Math.min(1.0, Math.max(0.1, confidence))
  }

  private static findCommonHeaderFooterURLs(pageTexts: string[]): DetectedURL[] {
    const urls: DetectedURL[] = []
    
    // Find URLs that appear in multiple pages (likely headers/footers)
    const urlCounts = new Map<string, number>()
    const urlPages = new Map<string, number[]>()
    
    pageTexts.forEach((pageText, index) => {
      const pageURLs = this.findURLsInText(pageText)
      pageURLs.forEach(urlInfo => {
        const count = urlCounts.get(urlInfo.url) || 0
        urlCounts.set(urlInfo.url, count + 1)
        
        if (!urlPages.has(urlInfo.url)) {
          urlPages.set(urlInfo.url, [])
        }
        urlPages.get(urlInfo.url)!.push(index + 1)
      })
    })
    
    // URLs that appear on multiple pages are likely headers/footers
    urlCounts.forEach((count, url) => {
      if (count >= 2) {
        const pages = urlPages.get(url) || []
        const confidence = this.calculateURLConfidence(url) * 1.2 // Boost for repeated URLs
        
        urls.push({
          url,
          location: count === pageTexts.length ? 'header' : 'footer',
          confidence: Math.min(1.0, confidence),
          context: `Appears on ${count} pages: ${pages.join(', ')}`
        })
      }
    })
    
    return urls
  }

  private static deduplicateURLs(urls: DetectedURL[]): DetectedURL[] {
    const urlMap = new Map<string, DetectedURL>()
    
    for (const url of urls) {
      const existing = urlMap.get(url.url)
      
      if (!existing || url.confidence > existing.confidence) {
        urlMap.set(url.url, url)
      }
    }
    
    return Array.from(urlMap.values()).sort((a, b) => b.confidence - a.confidence)
  }

  private static selectPrimaryURL(urls: DetectedURL[]): DetectedURL | undefined {
    if (urls.length === 0) return undefined
    
    // Prefer URLs from headers/footers with high confidence
    const headerFooterURLs = urls.filter(url => 
      (url.location === 'header' || url.location === 'footer') && 
      url.confidence > 0.7
    )
    
    if (headerFooterURLs.length > 0) {
      return headerFooterURLs[0]
    }
    
    // Fall back to highest confidence URL
    return urls[0]
  }

  private static calculateOverallConfidence(urls: DetectedURL[], primaryURL?: DetectedURL): number {
    if (!primaryURL) return 0
    
    let confidence = primaryURL.confidence
    
    // Boost confidence if we found multiple URLs
    if (urls.length > 1) {
      confidence += 0.1
    }
    
    // Boost if URL is from header/footer
    if (primaryURL.location === 'header' || primaryURL.location === 'footer') {
      confidence += 0.1
    }
    
    return Math.min(1.0, confidence)
  }

  private static getDetectionMethod(urls: DetectedURL[]): string {
    if (urls.length === 0) return 'none'
    
    const locations = urls.map(url => url.location)
    
    if (locations.includes('header')) return 'header_detection'
    if (locations.includes('footer')) return 'footer_detection'
    if (locations.includes('metadata')) return 'metadata_extraction'
    return 'content_scan'
  }
}