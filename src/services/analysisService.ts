import { AnalysisResult, BulkAnalysisJob } from '@/types'
import { ParserRegistry } from './parsing/ParserRegistry'

export class AnalysisService {
  private static readonly API_BASE = (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) || '/api'

  static async analyzeJob(jobUrl: string): Promise<AnalysisResult> {
    const response = await fetch(`${this.API_BASE}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobUrl }),
    })

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`)
    }

    return response.json()
  }

  static async uploadBulkAnalysis(file: File): Promise<BulkAnalysisJob> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.API_BASE}/bulk-analyze`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Bulk analysis upload failed: ${response.statusText}`)
    }

    return response.json()
  }

  static async getBulkAnalysisStatus(jobId: string): Promise<BulkAnalysisJob> {
    const response = await fetch(`${this.API_BASE}/bulk-analyze/${jobId}`)

    if (!response.ok) {
      throw new Error(`Failed to get bulk analysis status: ${response.statusText}`)
    }

    return response.json()
  }

  static async exportAnalysisResults(
    analysisIds: string[],
    format: 'csv' | 'pdf'
  ): Promise<Blob> {
    const response = await fetch(`${this.API_BASE}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ analysisIds, format }),
    })

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`)
    }

    return response.blob()
  }

  static async extractJobData(jobUrl: string): Promise<{title: string, company: string, parsingMetadata?: any}> {
    try {
      // Use the new parser registry system
      const parserRegistry = ParserRegistry.getInstance()
      const parsedJob = await parserRegistry.parseJob(jobUrl)
      
      return {
        title: parsedJob.title,
        company: parsedJob.company,
        parsingMetadata: {
          parserUsed: parsedJob.metadata.parserUsed,
          parserVersion: parsedJob.metadata.parserVersion,
          extractionMethod: parsedJob.metadata.extractionMethod,
          confidence: parsedJob.metadata.confidence,
          validationResults: parsedJob.metadata.validationResults,
          extractionTimestamp: parsedJob.metadata.extractionTimestamp,
          rawData: parsedJob.metadata.rawData
        }
      }
    } catch (error) {
      console.error('Job extraction error:', error)
      
      // Fallback to legacy system if new parser fails
      try {
        const legacyResult = await this.extractJobDataLegacy(jobUrl)
        return {
          title: legacyResult.title,
          company: legacyResult.company,
          parsingMetadata: {
            parserUsed: 'LegacyParser',
            parserVersion: '1.0.0',
            extractionMethod: 'manual_fallback',
            confidence: { overall: 0.3, title: 0.3, company: 0.3 },
            validationResults: [],
            extractionTimestamp: new Date(),
            rawData: {}
          }
        }
      } catch {
        return {
          title: 'Unknown Position',
          company: 'Unknown Company'
        }
      }
    }
  }

  // Legacy extraction method for fallback
  private static async extractJobDataLegacy(jobUrl: string): Promise<{title: string, company: string}> {
    try {
      const url = new URL(jobUrl)
      const hostname = url.hostname.toLowerCase().replace('www.', '')
      
      // Greenhouse (job-boards.greenhouse.io/company/jobs/id)
      if (hostname.includes('greenhouse')) {
        return this.extractGreenhouseJob(url, jobUrl)
      }
      
      // LinkedIn
      if (hostname.includes('linkedin')) {
        return this.extractLinkedInJob(url, jobUrl)
      }
      
      // Company career pages
      if (hostname.includes('careers.') || url.pathname.includes('/careers') || url.pathname.includes('/jobs')) {
        return this.extractCompanyCareerPageJob(url, jobUrl)
      }
      
      // Major job boards
      if (hostname.includes('indeed') || hostname.includes('glassdoor') || hostname.includes('monster')) {
        return this.extractJobBoardJob(url, jobUrl)
      }
      
      // Generic fallback - try to scrape any job posting
      return this.extractGenericJob(url, jobUrl)
    } catch (error) {
      console.error('Legacy job extraction error:', error)
      return {
        title: 'Unknown Position',
        company: 'Unknown Company'
      }
    }
  }

  private static async extractGreenhouseJob(url: URL, jobUrl: string): Promise<{title: string, company: string}> {
    const pathParts = url.pathname.split('/').filter(part => part.length > 0)
    const company = pathParts[0] || 'Unknown Company'
    
    try {
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(jobUrl)}`)
      const data = await response.json()
      const html = data.contents
      
      const titleMatch = html.match(/<title[^>]*>([^<]+)</i) || 
                       html.match(/<h1[^>]*>([^<]+)</i) ||
                       html.match(/class="[^"]*title[^"]*"[^>]*>([^<]+)/i)
      
      let title = titleMatch ? titleMatch[1].trim() : 'Unknown Position'
      title = title.replace(/\s*-\s*(Contentful|at\s+\w+).*$/i, '').trim()
      
      return {
        title: title,
        company: company.charAt(0).toUpperCase() + company.slice(1)
      }
    } catch (fetchError) {
      return {
        title: 'Unknown Position',
        company: company.charAt(0).toUpperCase() + company.slice(1)
      }
    }
  }

  private static async extractLinkedInJob(_url: URL, jobUrl: string): Promise<{title: string, company: string}> {
    try {
      // LinkedIn requires different approach due to dynamic content
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(jobUrl)}`)
      const data = await response.json()
      const html = data.contents
      
      // Extract title from LinkedIn page structure
      const titleMatch = html.match(/<title[^>]*>([^<]+)</i)
      let title = 'LinkedIn Position'
      let company = 'LinkedIn Company'
      
      if (titleMatch) {
        const fullTitle = titleMatch[1].trim()
        
        // Try multiple LinkedIn title formats:
        // 1. "Job Title - Company Name | LinkedIn"
        // 2. "Job Title at Company Name | LinkedIn" 
        // 3. "Company Name: Job Title | LinkedIn"
        
        if (fullTitle.includes(' - ') && fullTitle.includes(' | LinkedIn')) {
          const parts = fullTitle.replace(' | LinkedIn', '').split(' - ')
          if (parts.length >= 2) {
            title = parts[0].trim()
            company = parts[1].trim()
          }
        } else if (fullTitle.includes(' at ') && fullTitle.includes(' | LinkedIn')) {
          const parts = fullTitle.replace(' | LinkedIn', '').split(' at ')
          if (parts.length >= 2) {
            title = parts[0].trim()
            company = parts[1].trim()
          }
        } else if (fullTitle.includes(': ') && fullTitle.includes(' | LinkedIn')) {
          const parts = fullTitle.replace(' | LinkedIn', '').split(': ')
          if (parts.length >= 2) {
            company = parts[0].trim()
            title = parts[1].trim()
          }
        }
        
        // Fallback: try to extract from JSON-LD or meta tags
        if (company === 'LinkedIn Company') {
          const companyMatch = html.match(/"hiringOrganization"[^}]*"name"\s*:\s*"([^"]+)"/i) ||
                              html.match(/property="og:site_name"[^>]*content="([^"]+)"/i) ||
                              html.match(/"companyName"\s*:\s*"([^"]+)"/i)
          if (companyMatch) {
            company = companyMatch[1].trim()
          }
        }
      }
      
      return { title, company }
    } catch (error) {
      return {
        title: 'LinkedIn Position',
        company: 'LinkedIn Company'
      }
    }
  }

  private static async extractCompanyCareerPageJob(url: URL, jobUrl: string): Promise<{title: string, company: string}> {
    try {
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(jobUrl)}`)
      const data = await response.json()
      const html = data.contents
      
      // Common patterns for career pages
      const titlePatterns = [
        /<title[^>]*>([^<]+)</i,
        /<h1[^>]*class="[^"]*(?:job-title|position|role)[^"]*"[^>]*>([^<]+)</i,
        /<h1[^>]*>([^<]+)</i,
        /class="[^"]*(?:job-title|position|role)[^"]*"[^>]*>([^<]+)/i
      ]
      
      let title = 'Unknown Position'
      for (const pattern of titlePatterns) {
        const match = html.match(pattern)
        if (match) {
          title = match[1].trim()
          // Clean up common suffixes
          title = title.replace(/\s*[-–]\s*.*$/, '').trim()
          break
        }
      }
      
      // Extract company name from hostname or page content
      let company = url.hostname.replace('careers.', '').replace('.com', '').split('.')[0]
      company = company.charAt(0).toUpperCase() + company.slice(1)
      
      // Try to find company name in structured data or meta tags
      const companyPatterns = [
        /"name"\s*:\s*"([^"]+)"/i,  // JSON-LD company name
        /property="og:site_name"[^>]*content="([^"]+)"/i,  // Open Graph
        /<title[^>]*>([^<]*?)\s*[-|]\s*Careers/i,  // Title with "Careers"
        /class="[^"]*company[^"]*"[^>]*>([^<]+)</i  // Company class
      ]
      
      for (const pattern of companyPatterns) {
        const match = html.match(pattern)
        if (match && match[1].trim().length > 1 && !match[1].includes('{')) {
          const extractedCompany = match[1].trim()
          if (extractedCompany.toLowerCase() !== 'careers') {
            company = extractedCompany
            break
          }
        }
      }
      
      return { title, company }
    } catch (error) {
      const company = url.hostname.replace('careers.', '').replace('.com', '').split('.')[0]
      return {
        title: 'Unknown Position',
        company: company.charAt(0).toUpperCase() + company.slice(1)
      }
    }
  }

  private static async extractJobBoardJob(url: URL, jobUrl: string): Promise<{title: string, company: string}> {
    try {
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(jobUrl)}`)
      const data = await response.json()
      const html = data.contents
      
      const titleMatch = html.match(/<title[^>]*>([^<]+)</i) || 
                       html.match(/<h1[^>]*>([^<]+)</i)
      
      let title = titleMatch ? titleMatch[1].trim() : 'Unknown Position'
      title = title.replace(/\s*[-–]\s*.*$/, '').trim()
      
      const platform = url.hostname.includes('indeed') ? 'Indeed' :
                      url.hostname.includes('glassdoor') ? 'Glassdoor' :
                      url.hostname.includes('monster') ? 'Monster' : 'Job Board'
      
      return {
        title: title,
        company: platform
      }
    } catch (error) {
      return {
        title: 'Unknown Position',
        company: 'Job Board'
      }
    }
  }

  private static async extractGenericJob(url: URL, jobUrl: string): Promise<{title: string, company: string}> {
    try {
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(jobUrl)}`)
      const data = await response.json()
      const html = data.contents
      
      const titleMatch = html.match(/<title[^>]*>([^<]+)</i) || 
                       html.match(/<h1[^>]*>([^<]+)</i)
      
      const title = titleMatch ? titleMatch[1].trim() : 'Unknown Position'
      const company = url.hostname.replace('www.', '').split('.')[0] || 'Unknown Company'
      
      return {
        title: title,
        company: company.charAt(0).toUpperCase() + company.slice(1)
      }
    } catch (error) {
      return {
        title: 'Unknown Position',
        company: 'Unknown Company'
      }
    }
  }

  static async extractJobDataFromPDF(file: File, sourceUrl: string): Promise<{title: string, company: string, content: string}> {
    try {
      // For demo purposes, we'll simulate PDF text extraction
      // In production, this would use a proper PDF parsing library or API
      const fileName = file.name.toLowerCase()
      
      // Try to extract info from filename
      let title = 'Position from PDF'
      let company = 'Unknown Company'
      
      // Extract company from source URL if provided
      if (sourceUrl) {
        try {
          const url = new URL(sourceUrl)
          const hostname = url.hostname.toLowerCase().replace('www.', '')
          
          if (hostname.includes('careers.')) {
            company = hostname.replace('careers.', '').replace('.com', '').replace(/\./g, ' ')
            company = company.charAt(0).toUpperCase() + company.slice(1)
          } else {
            company = hostname.split('.')[0] || 'Unknown Company'
            company = company.charAt(0).toUpperCase() + company.slice(1)
          }
        } catch (urlError) {
          // Invalid URL, keep default company name
        }
      }
      
      // Simulate reading PDF content (in production, use PDF.js or similar)
      const reader = new FileReader()
      const fileContent = await new Promise<string>((resolve) => {
        reader.onload = (_e) => {
          // For demo, we'll return a simulated job posting content
          resolve(`
            Job Title: ${title}
            Company: ${company}
            
            We are seeking a qualified candidate for this position.
            
            Requirements:
            - Bachelor's degree or equivalent experience
            - Strong communication skills
            - Team player with leadership potential
            
            This is a full-time position with competitive benefits.
          `)
        }
        reader.readAsText(file)
      })
      
      // Try to extract actual title from filename patterns
      const titlePatterns = [
        /job[_\s-]?description[_\s-]?(.+?)\.pdf$/i,
        /position[_\s-]?(.+?)\.pdf$/i,
        /(.+?)[_\s-]?job[_\s-]?posting\.pdf$/i,
        /(.+?)\.pdf$/i
      ]
      
      for (const pattern of titlePatterns) {
        const match = fileName.match(pattern)
        if (match && match[1]) {
          title = match[1].replace(/[_-]/g, ' ').trim()
          title = title.charAt(0).toUpperCase() + title.slice(1)
          break
        }
      }
      
      return {
        title,
        company,
        content: fileContent
      }
    } catch (error) {
      console.error('PDF extraction error:', error)
      return {
        title: 'Position from PDF',
        company: 'Unknown Company',
        content: 'Could not extract content from PDF'
      }
    }
  }

  static async extractJobsFromLinkedInSearch(searchUrl: string): Promise<string[]> {
    try {
      // Extract job IDs from LinkedIn search URL
      const url = new URL(searchUrl)
      const jobIds: string[] = []
      
      // Parse currentJobId parameter
      const currentJobId = url.searchParams.get('currentJobId')
      if (currentJobId) {
        jobIds.push(`https://www.linkedin.com/jobs/view/${currentJobId}`)
      }
      
      // For demo purposes, simulate extracting multiple job IDs from search results
      // In production, this would scrape the LinkedIn search results page
      const mockJobIds = [
        '4283562303', '4281730064', '4281723876', '4283559564', 
        '4283562302', '4267431281', '4276824745', '4268337639', '4268938377'
      ]
      
      mockJobIds.forEach(id => {
        jobIds.push(`https://www.linkedin.com/jobs/view/${id}`)
      })
      
      return jobIds.slice(0, 10) // Limit to first 10 results
    } catch (error) {
      console.error('LinkedIn search extraction error:', error)
      return []
    }
  }

  static async extractJobsFromCareerSite(careerSiteUrl: string): Promise<string[]> {
    try {
      // Crawl career site for job postings
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(careerSiteUrl)}`)
      const data = await response.json()
      const html = data.contents
      
      const url = new URL(careerSiteUrl)
      const baseUrl = `${url.protocol}//${url.hostname}`
      
      // Common patterns for job links on career pages
      const linkPatterns = [
        /href="([^"]*(?:job|position|career|role)[^"]*\d+[^"]*)"/gi,
        /href="([^"]*\/jobs\/[^"]*\d+[^"]*)"/gi,
        /href="([^"]*\/careers\/[^"]*\d+[^"]*)"/gi
      ]
      
      const jobUrls = new Set<string>()
      
      for (const pattern of linkPatterns) {
        let match
        while ((match = pattern.exec(html)) !== null) {
          let jobUrl = match[1]
          
          // Convert relative URLs to absolute
          if (jobUrl.startsWith('/')) {
            jobUrl = baseUrl + jobUrl
          } else if (!jobUrl.startsWith('http')) {
            jobUrl = baseUrl + '/' + jobUrl
          }
          
          // Validate it looks like a job posting URL
          if (jobUrl.includes('job') || jobUrl.includes('position') || jobUrl.includes('career')) {
            jobUrls.add(jobUrl)
          }
        }
      }
      
      return Array.from(jobUrls).slice(0, 20) // Limit to first 20 results
    } catch (error) {
      console.error('Career site crawling error:', error)
      return []
    }
  }

  static mockAnalyzeJob(_jobUrl: string): Promise<AnalysisResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: Math.random().toString(36).substr(2, 9),
          ghostProbability: Math.random(),
          confidence: 0.8 + Math.random() * 0.2,
          factors: [
            {
              factor: 'Job posting age',
              weight: 0.3,
              description: 'Job has been posted for 45+ days'
            },
            {
              factor: 'Generic job description',
              weight: 0.25,
              description: 'Description contains minimal specific requirements'
            },
            {
              factor: 'Company hiring patterns',
              weight: 0.2,
              description: 'Company has unusual posting frequency'
            }
          ],
          metadata: {
            processingTime: 850,
            modelVersion: 'v1.2.3'
          }
        })
      }, 1500)
    })
  }
}