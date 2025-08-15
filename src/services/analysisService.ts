import { AnalysisResult, BulkAnalysisJob } from '@/types'

export class AnalysisService {
  private static readonly API_BASE = (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) || 'http://localhost:8000/api/v1'

  static async analyzeJob(jobUrl: string): Promise<AnalysisResult> {
    const response = await fetch(`${this.API_BASE}/detection/analyze`, {
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

    const response = await fetch(`${this.API_BASE}/detection/bulk-analyze`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Bulk analysis upload failed: ${response.statusText}`)
    }

    return response.json()
  }

  static async getBulkAnalysisStatus(jobId: string): Promise<BulkAnalysisJob> {
    const response = await fetch(`${this.API_BASE}/detection/bulk-analyze/${jobId}`)

    if (!response.ok) {
      throw new Error(`Failed to get bulk analysis status: ${response.statusText}`)
    }

    return response.json()
  }

  static async exportAnalysisResults(
    analysisIds: string[],
    format: 'csv' | 'pdf'
  ): Promise<Blob> {
    const response = await fetch(`${this.API_BASE}/detection/export`, {
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

  static async extractJobData(jobUrl: string): Promise<{title: string, company: string}> {
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
      console.error('Job extraction error:', error)
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
      // Try to extract from URL parameters or page title
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(jobUrl)}`)
      const data = await response.json()
      const html = data.contents
      
      // Extract title from LinkedIn page structure
      const titleMatch = html.match(/<title[^>]*>([^<]+)</i)
      let title = 'LinkedIn Position'
      let company = 'LinkedIn Company'
      
      if (titleMatch) {
        const fullTitle = titleMatch[1].trim()
        // LinkedIn titles are usually "Job Title - Company Name | LinkedIn"
        const parts = fullTitle.split(' - ')
        if (parts.length >= 2) {
          title = parts[0].trim()
          company = parts[1].replace(' | LinkedIn', '').trim()
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
      let company = url.hostname.replace('careers.', '').replace('.com', '').replace(/\./g, ' ')
      company = company.charAt(0).toUpperCase() + company.slice(1)
      
      // Try to find company name in content
      const companyMatch = html.match(/(?:company|organization)[":\s]*([^<"'\n]+)/i)
      if (companyMatch && companyMatch[1].trim().length > 0) {
        company = companyMatch[1].trim()
      }
      
      return { title, company }
    } catch (error) {
      const company = url.hostname.replace('careers.', '').replace('.com', '').replace(/\./g, ' ')
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