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
    // Job posting URLs - specific platforms (ordered by priority)
    /https?:\/\/(www\.)?(apply\.)?deloitte\.com\/[^\s"<>(){}[\]]+/gi,
    /https?:\/\/(www\.)?linkedin\.com\/jobs\/view\/\d+[^\s"<>(){}[\]]*/gi,
    /https?:\/\/[^.\s]+\.greenhouse\.io\/jobs\/\d+[^\s"<>(){}[\]]*/gi,
    
    // Code for America jobs (Greenhouse-hosted) - comprehensive pattern
    /https?:\/\/(www\.)?codeforamerica\.org\/jobs\/posting\/[^\s"<>(){}[\]]*(?:\?[^\s"<>(){}[\]]*)*/gi,
    
    // Enhanced Lever.co pattern - more permissive for UUIDs with hyphens
    /https?:\/\/jobs\.lever\.co\/[a-zA-Z0-9\-_]+\/[a-zA-Z0-9\-_]+/gi,
    
    /https?:\/\/(www\.)?workday\.com\/[^\s"<>(){}[\]]+/gi,
    /https?:\/\/(www\.)?indeed\.com\/viewjob[^\s"<>(){}[\]]*/gi,
    /https?:\/\/(www\.)?glassdoor\.com\/job-listing\/[^\s"<>(){}[\]]*/gi,
    /https?:\/\/(www\.)?monster\.com\/job-openings\/[^\s"<>(){}[\]]*/gi,
    
    // Career page URLs
    /https?:\/\/careers\.[^\s"<>(){}[\]]+\/[^\s"<>(){}[\]]*/gi,
    /https?:\/\/[^.\s]+\.org\/jobs\/[^\s"<>(){}[\]]*/gi,
    /https?:\/\/[^.\s]+\.org\/careers\/[^\s"<>(){}[\]]*/gi,
    /https?:\/\/[^.\s]+\.com\/careers\/[^\s"<>(){}[\]]*/gi,
    /https?:\/\/[^.\s]+\.com\/jobs\/[^\s"<>(){}[\]]*/gi,
    
    // Generic URLs that might be job postings
    /https?:\/\/[^\s"<>(){}[\]]+(?:job|career|position|role|hiring)[^\s"<>(){}[\]]*/gi,
    /https?:\/\/[^\s"<>(){}[\]]+\/(?:job|career|position|role|hiring)[^\s"<>(){}[\]]*/gi,
    
    // General URL pattern (lowest priority) - more comprehensive with query parameters
    /https?:\/\/[^\s"<>(){}[\]]+(?:\?[^\s"<>(){}[\]]*)*/gi
  ]

  private static readonly PLATFORM_INDICATORS = {
    'deloitte.com': { weight: 0.95, platform: 'Deloitte' },
    'codeforamerica.org/jobs': { weight: 0.9, platform: 'Code for America' },
    'linkedin.com/jobs': { weight: 0.9, platform: 'LinkedIn' },
    'greenhouse.io': { weight: 0.9, platform: 'Greenhouse' },
    'jobs.lever.co': { weight: 0.9, platform: 'Lever' }, // Enhanced Lever detection
    'lever.co': { weight: 0.9, platform: 'Lever' },
    'workday.com': { weight: 0.85, platform: 'Workday' },
    'indeed.com': { weight: 0.8, platform: 'Indeed' },
    'glassdoor.com': { weight: 0.8, platform: 'Glassdoor' },
    'monster.com': { weight: 0.75, platform: 'Monster' },
    'careers.': { weight: 0.7, platform: 'Career Page' },
    '/careers/': { weight: 0.7, platform: 'Career Page' },
    '/jobs/': { weight: 0.7, platform: 'Job Board' }
  }

  static detectURLs(pdfContent: PDFTextContent, debug: boolean = false): URLDetectionResult {
    const startTime = Date.now()
    const allURLs: DetectedURL[] = []
    
    try {
      // Debug logging for troubleshooting (only when enabled)
      if (debug) {
        console.log('🔍 PDF URL Detection Debug:')
        console.log('📄 PDF Pages:', pdfContent.pageTexts.length)
        console.log('📝 Total text length:', pdfContent.fullText.length)
        
        // Show sample of text from first and last pages for debugging
        if (pdfContent.pageTexts.length > 0) {
          const firstPage = pdfContent.pageTexts[0].substring(0, 200)
          const lastPage = pdfContent.pageTexts[pdfContent.pageTexts.length - 1]
          console.log('📄 First page sample:', firstPage)
          console.log('📄 Last page sample (first 200):', lastPage.substring(0, 200))
          console.log('📄 Last page sample (last 200):', lastPage.slice(-200))
          
          // Look for URL fragments that might be split
          const urlFragments = lastPage.match(/https?:|www\.|\.com|\.org|jobs\.|careers\.|lever\.co|greenhouse\.io|linkedin\.com|deloitte\.com/gi)
          if (urlFragments) {
            console.log('🔍 Found URL fragments in last page:', urlFragments)
          }
        }
      }
      // 1. Check metadata for URLs
      const metadataURLs = this.extractURLsFromMetadata(pdfContent, debug)
      allURLs.push(...metadataURLs)
      
      // 2. Check first and last pages for headers/footers
      const headerFooterURLs = this.extractHeaderFooterURLs(pdfContent, debug)
      allURLs.push(...headerFooterURLs)
      
      // 3. Check all content for URLs
      const contentURLs = this.extractContentURLs(pdfContent, debug)
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

  private static extractURLsFromMetadata(pdfContent: PDFTextContent, debug: boolean = false): DetectedURL[] {
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
        const foundURLs = this.findURLsInText(field, debug)
        urls.push(...foundURLs.map(url => ({
          ...url,
          location: 'metadata' as const,
          confidence: url.confidence * 0.9 // Slightly lower confidence for metadata
        })))
      }
    }
    
    return urls
  }

  private static extractHeaderFooterURLs(pdfContent: PDFTextContent, debug: boolean = false): DetectedURL[] {
    const urls: DetectedURL[] = []
    
    // Check first page (likely has header)
    if (pdfContent.pageTexts.length > 0) {
      const firstPageURLs = this.findURLsInText(pdfContent.pageTexts[0], debug)
      urls.push(...firstPageURLs.map(url => ({
        ...url,
        location: 'header' as const,
        pageNumber: 1,
        confidence: url.confidence * 1.1 // Boost confidence for first page
      })))
    }
    
    // Check last page (likely has footer)
    if (pdfContent.pageTexts.length > 1) {
      const lastPageURLs = this.findURLsInText(pdfContent.pageTexts[pdfContent.pageTexts.length - 1], debug)
      urls.push(...lastPageURLs.map(url => ({
        ...url,
        location: 'footer' as const,
        pageNumber: pdfContent.pageTexts.length,
        confidence: url.confidence * 1.05 // Slight boost for last page
      })))
    }
    
    // Check for URLs that appear at the top/bottom of multiple pages
    if (pdfContent.pageTexts.length > 2) {
      const commonURLs = this.findCommonHeaderFooterURLs(pdfContent.pageTexts, debug)
      urls.push(...commonURLs)
    }
    
    return urls
  }

  private static extractContentURLs(pdfContent: PDFTextContent, debug: boolean = false): DetectedURL[] {
    const urls: DetectedURL[] = []
    
    pdfContent.pageTexts.forEach((pageText, index) => {
      const pageURLs = this.findURLsInText(pageText, debug)
      urls.push(...pageURLs.map(url => ({
        ...url,
        location: 'content' as const,
        pageNumber: index + 1
      })))
    })
    
    return urls
  }

  private static findURLsInText(text: string, debug: boolean = false): Array<Omit<DetectedURL, 'location'>> {
    const urls: Array<Omit<DetectedURL, 'location'>> = []
    const foundURLs = new Set<string>()
    
    // Try to reconstruct URLs that might be split across lines
    const reconstructedText = this.reconstructSplitURLs(text)
    
    // Debug: Check for specific domains and URL patterns (only when debug enabled)
    if (debug) {
      console.log('🔍 Searching for URLs in text sample:', text.substring(0, 500))
      
      if (reconstructedText !== text) {
        console.log('🔧 Reconstructed text differs - found potential split URLs')
        console.log('🔧 Reconstructed sample:', reconstructedText.substring(0, 500))
      }
      
      // Check for specific domain patterns
      const leverCheck = reconstructedText.match(/jobs\.lever\.co/gi)
      const codeforamericaCheck = reconstructedText.match(/codeforamerica\.org/gi)
      const httpUrlCheck = reconstructedText.match(/https?:\/\/[^\s]+/gi)
      
      if (leverCheck) {
        console.log('✅ Found Lever domain in text!')
      }
      if (codeforamericaCheck) {
        console.log('✅ Found Code for America domain in text!')
      }
      if (httpUrlCheck) {
        console.log(`✅ Found ${httpUrlCheck.length} HTTP URLs:`, httpUrlCheck.slice(0, 3))
      }
      
      if (!leverCheck && !codeforamericaCheck && !httpUrlCheck) {
        console.log('❌ No recognizable URL patterns found in this text segment')
      }
    }
    
    for (let i = 0; i < this.URL_PATTERNS.length; i++) {
      const pattern = this.URL_PATTERNS[i]
      pattern.lastIndex = 0 // Reset regex
      let match
      let patternMatches = 0
      
      // Use reconstructed text for pattern matching
      while ((match = pattern.exec(reconstructedText)) !== null) {
        patternMatches++
        const url = match[0].trim()
        
        // Debug logging for specific platforms (only when debug enabled)
        if (debug && (url.includes('lever.co') || url.includes('codeforamerica.org') || url.includes('deloitte.com'))) {
          console.log(`🎯 Important URL found with pattern ${i}:`, url)
        }
        
        // Clean up URL (remove trailing punctuation)
        const cleanURL = this.cleanURL(url)
        
        if (cleanURL && !foundURLs.has(cleanURL)) {
          foundURLs.add(cleanURL)
          
          const confidence = this.calculateURLConfidence(cleanURL)
          const context = this.extractContext(text, match.index, 50)
          
          if (debug) {
            console.log(`✅ Added URL: ${cleanURL} (confidence: ${confidence.toFixed(2)})`)
          }
          
          urls.push({
            url: cleanURL,
            confidence,
            context
          })
        }
      }
      
      if (debug && patternMatches > 0) {
        console.log(`📊 Pattern ${i} matched ${patternMatches} URLs`)
      }
    }
    
    if (debug) {
      console.log(`🎯 Total URLs found in this text: ${urls.length}`)
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

  private static findCommonHeaderFooterURLs(pageTexts: string[], debug: boolean = false): DetectedURL[] {
    const urls: DetectedURL[] = []
    
    // Find URLs that appear in multiple pages (likely headers/footers)
    const urlCounts = new Map<string, number>()
    const urlPages = new Map<string, number[]>()
    
    pageTexts.forEach((pageText, index) => {
      const pageURLs = this.findURLsInText(pageText, debug)
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

  /**
   * Reconstruct URLs that might be split across lines or text items
   */
  private static reconstructSplitURLs(text: string): string {
    let reconstructed = text
    
    // Common URL split patterns - handle cases where URLs are broken across lines
    const splitPatterns = [
      // https:// split from domain
      /https?:\s*[\r\n]+\s*\/\//g,
      // Domain split from path  
      /([a-zA-Z0-9.-]+\.(?:com|org|net|edu|gov))\s*[\r\n]+\s*\//g,
      // Path components split
      /\/([a-zA-Z0-9-]+)\s*[\r\n]+\s*\/([a-zA-Z0-9-]+)/g,
      // Remove line breaks within URLs (between URL-like components)
      /([a-zA-Z0-9.-]+\.(?:com|org|net|edu|gov))[\r\n\s]+([a-zA-Z0-9\/._-]+)/g
    ]
    
    // Apply each pattern to reconstruct URLs
    reconstructed = reconstructed.replace(splitPatterns[0], 'https://')
    reconstructed = reconstructed.replace(splitPatterns[1], '$1/')  
    reconstructed = reconstructed.replace(splitPatterns[2], '/$1/$2')
    reconstructed = reconstructed.replace(splitPatterns[3], '$1/$2')
    
    // Also try to join lines that look like they contain URL fragments
    const lines = reconstructed.split(/[\r\n]+/)
    const joinedLines: string[] = []
    let i = 0
    
    while (i < lines.length) {
      let currentLine = lines[i].trim()
      
      // Look ahead to see if the next line might be a continuation of a URL
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim()
        
        // Check if current line ends with URL-like content and next line starts with URL-like content
        if (this.looksLikeURLFragment(currentLine) && this.looksLikeURLFragment(nextLine)) {
          // Join the lines
          currentLine = currentLine + nextLine
          i++ // Skip the next line since we consumed it
        }
      }
      
      joinedLines.push(currentLine)
      i++
    }
    
    return joinedLines.join('\n')
  }

  /**
   * Check if a text fragment looks like it could be part of a URL
   */
  private static looksLikeURLFragment(text: string): boolean {
    return /^(https?:|www\.|[a-zA-Z0-9.-]+\.(com|org|net|edu|gov)|\/[a-zA-Z0-9._-]|[a-zA-Z0-9._-]+\/)/.test(text) ||
           /[a-zA-Z0-9.-]+\.(com|org|net|edu|gov)$/.test(text) ||
           /\/(jobs?|careers?|positions?|apply|posting)[\/\w-]*$/.test(text)
  }
}