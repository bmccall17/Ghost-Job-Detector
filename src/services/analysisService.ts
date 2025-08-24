import { AnalysisResult, BulkAnalysisJob } from '@/types'
import { ParserRegistry } from './parsing/ParserRegistry'

export class AnalysisService {
  private static readonly API_BASE = '/api'

  static async analyzeJob(jobUrl: string, jobData?: {title: string, company: string, description?: string, location?: string, remoteFlag?: boolean, postedAt?: Date}): Promise<AnalysisResult> {
    // If job data is not provided, extract it first
    if (!jobData) {
      try {
        const extracted = await this.extractJobData(jobUrl);
        jobData = {
          title: extracted.title,
          company: extracted.company,
          description: '', // We don't have description from basic extraction
          location: extracted.location,
          remoteFlag: extracted.remoteFlag,
          postedAt: extracted.postedAt
        };
      } catch (error) {
        console.warn('Job data extraction failed:', error)
        
        // If extraction fails, use fallback data and trigger learning
        jobData = {
          title: 'Unknown Position',
          company: 'Unknown Company',
          description: '',
          location: undefined,
          remoteFlag: false,
          postedAt: undefined
        };

        // Proactively trigger learning for failed parsing
        this.triggerLearningForFailure(jobUrl, jobData, error instanceof Error ? error : new Error(String(error))).catch(learningError => {
          console.warn('Learning trigger failed:', learningError)
        })
      }
    }

    const requestBody = { 
      url: jobUrl,
      title: jobData?.title,
      company: jobData?.company,
      description: jobData?.description || '',
      location: jobData?.location,
      remoteFlag: jobData?.remoteFlag,
      postedAt: jobData?.postedAt
    };

    console.log('🚀 AnalysisService: Making API call to /analyze', {
      url: jobUrl.substring(0, 50) + '...',
      apiBase: this.API_BASE,
      requestBody
    });

    const response = await fetch(`${this.API_BASE}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    console.log('📡 AnalysisService: Response received', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: {
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ AnalysisService: API error response:', errorText);
      throw new Error(`Analysis failed: ${response.statusText} - ${errorText}`)
    }

    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      console.error('❌ AnalysisService: Failed to parse JSON response:', parseError);
      const responseText = await response.text();
      console.error('❌ AnalysisService: Raw response:', responseText);
      throw new Error(`Failed to parse analysis response: ${parseError.message}`);
    }

    console.log('✅ AnalysisService: API response parsed successfully', {
      hasId: !!result.id,
      hasJobData: !!result.jobData,
      hasGhostProbability: typeof result.ghostProbability === 'number',
      resultKeys: result ? Object.keys(result) : [],
      ghostProbValue: result.ghostProbability,
      jobDataKeys: result.jobData ? Object.keys(result.jobData) : []
    });

    // Validate critical fields
    if (!result.id) {
      console.warn('⚠️ AnalysisService: Response missing id field');
    }
    if (typeof result.ghostProbability !== 'number') {
      console.warn('⚠️ AnalysisService: Response missing or invalid ghostProbability:', result.ghostProbability);
    }

    return result;
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

  static async getAnalysisHistory(): Promise<{
    analyses: any[];
    stats: { total: number; highRisk: number; mediumRisk: number; lowRisk: number };
  }> {
    try {
      const response = await fetch(`${this.API_BASE}/analysis-history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch analysis history: ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      console.warn('API call failed, returning mock data for development:', error)
      
      // Return mock data for development
      const mockAnalyses = [
        {
          id: "mock-1",
          jobUrl: "https://www.linkedin.com/jobs/view/4283562303",
          jobData: {
            title: "Senior Software Engineer",
            company: "Tech Corp",
            description: "We are looking for a senior software engineer...",
            location: "San Francisco, CA",
            remote: false
          },
          title: "Senior Software Engineer",
          company: "Tech Corp", 
          location: "San Francisco, CA",
          remote: false,
          ghostProbability: 0.15,
          riskLevel: "low",
          riskFactors: [],
          keyFactors: ["Recent posting", "Detailed requirements", "Clear job description"],
          timestamp: new Date(Date.now() - 86400000), // 1 day ago
          isNewContribution: false,
          metadata: {
            storage: 'mock',
            version: '1.0',
            sourceType: 'linkedin',
            analysisDate: new Date(Date.now() - 86400000),
            jobListingId: 'mock-job-1',
            sourceId: 'mock-source-1',
            algorithmAssessment: {
              ghostProbability: 15,
              modelConfidence: "High (95%)",
              assessmentText: "This job posting shows strong indicators of being legitimate with clear requirements and recent posting activity."
            },
            riskFactorsAnalysis: {
              warningSignsCount: 0,
              warningSignsTotal: 8,
              riskFactors: [],
              positiveIndicators: [
                {
                  type: "posting_freshness",
                  description: "Recently posted within 48 hours",
                  impact: "Positive"
                },
                {
                  type: "requirements_detail",
                  description: "Detailed technical requirements specified",
                  impact: "Positive"
                }
              ]
            },
            recommendation: {
              action: "Apply",
              message: "This appears to be a legitimate opportunity worth pursuing. The job posting shows positive indicators and minimal risk factors.",
              confidence: "High"
            },
            analysisDetails: {
              analysisId: "mock-analysis-1",
              modelVersion: "v0.1.0",
              processingTimeMs: 850,
              analysisDate: new Date(Date.now() - 86400000).toISOString(),
              algorithmType: "ensemble_classifier",
              platform: "linkedin"
            }
          }
        },
        {
          id: "mock-2", 
          jobUrl: "https://job-boards.greenhouse.io/company/jobs/123456",
          jobData: {
            title: "Product Manager",
            company: "StartupCo",
            description: "Join our amazing team...",
            location: "Remote",
            remote: true
          },
          title: "Product Manager",
          company: "StartupCo",
          location: "Remote", 
          remote: true,
          ghostProbability: 0.72,
          riskLevel: "high",
          riskFactors: ["Vague job description", "Posted for 60+ days", "Unusual posting frequency"],
          keyFactors: ["Remote position", "Startup company"],
          timestamp: new Date(Date.now() - 172800000), // 2 days ago
          isNewContribution: false,
          metadata: {
            storage: 'mock',
            version: '1.0', 
            sourceType: 'greenhouse',
            analysisDate: new Date(Date.now() - 172800000),
            jobListingId: 'mock-job-2',
            sourceId: 'mock-source-2',
            algorithmAssessment: {
              ghostProbability: 72,
              modelConfidence: "Medium (78%)",
              assessmentText: "This job posting shows several warning signs including vague descriptions and prolonged posting duration."
            },
            riskFactorsAnalysis: {
              warningSignsCount: 3,
              warningSignsTotal: 8,
              riskFactors: [
                {
                  type: "description_quality",
                  description: "Job description lacks specific requirements",
                  impact: "High"
                },
                {
                  type: "posting_duration", 
                  description: "Posted for over 60 days",
                  impact: "Medium"
                }
              ],
              positiveIndicators: [
                {
                  type: "platform_reputation",
                  description: "Posted on reputable job platform",
                  impact: "Low"
                }
              ]
            },
            recommendation: {
              action: "Research Further",
              message: "Exercise caution with this posting. Research the company thoroughly and look for additional verification before applying.",
              confidence: "Medium"
            },
            analysisDetails: {
              analysisId: "mock-analysis-2",
              modelVersion: "v0.1.0", 
              processingTimeMs: 920,
              analysisDate: new Date(Date.now() - 172800000).toISOString(),
              algorithmType: "ensemble_classifier",
              platform: "greenhouse"
            }
          }
        }
      ]

      return {
        analyses: mockAnalyses,
        stats: {
          total: mockAnalyses.length,
          highRisk: mockAnalyses.filter(a => a.ghostProbability >= 0.67).length,
          mediumRisk: mockAnalyses.filter(a => a.ghostProbability >= 0.34 && a.ghostProbability < 0.67).length,
          lowRisk: mockAnalyses.filter(a => a.ghostProbability < 0.34).length
        }
      }
    }
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

  static async extractJobData(jobUrl: string): Promise<{title: string, company: string, location?: string, remoteFlag?: boolean, postedAt?: Date, parsingMetadata?: any}> {
    try {
      // Use the new parser registry system
      const parserRegistry = ParserRegistry.getInstance()
      const parsedJob = await parserRegistry.parseJob(jobUrl)
      
      return {
        title: parsedJob.title,
        company: parsedJob.company,
        location: parsedJob.location,
        remoteFlag: parsedJob.remoteFlag,
        postedAt: parsedJob.postedAt,
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
          location: undefined,
          remoteFlag: false,
          postedAt: undefined,
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
          company: 'Unknown Company',
          location: undefined,
          remoteFlag: false,
          postedAt: undefined
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
      let title = 'Unknown Position'
      let company = 'Unknown Company'
      
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
        
        // Enhanced fallback: try to extract from JSON-LD, meta tags, or hiring patterns
        if (company === 'Unknown Company') {
          // Try structured data patterns
          const structuredDataPatterns = [
            /"hiringOrganization"[^}]*"name"\s*:\s*"([^"]+)"/i,
            /property="og:site_name"[^>]*content="([^"]+)"/i,
            /"companyName"\s*:\s*"([^"]+)"/i,
            /"company"\s*:\s*"([^"]+)"/i
          ]
          
          for (const pattern of structuredDataPatterns) {
            const match = html.match(pattern)
            if (match && match[1] && match[1].trim() !== 'LinkedIn') {
              company = match[1].trim()
              break
            }
          }
          
          // Try hiring patterns if still no company found
          if (company === 'Unknown Company') {
            const hiringPatterns = [
              /(.+?)\s+(?:is\s+)?hiring\s+/i,
              /join\s+(.+?)\s+(?:team|as|and)/i,
              /careers?\s+at\s+(.+?)[\s<]/i
            ]
            
            for (const pattern of hiringPatterns) {
              const match = fullTitle.match(pattern)
              if (match && match[1] && match[1].trim().length > 2) {
                const potentialCompany = match[1].trim()
                // Avoid generic terms
                if (!['the', 'our', 'this', 'that', 'company', 'organization'].includes(potentialCompany.toLowerCase())) {
                  company = potentialCompany
                  break
                }
              }
            }
          }
        }
      }
      
      return { title, company }
    } catch (error) {
      return {
        title: 'Unknown Position', 
        company: 'Unknown Company'
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

  static async extractJobDataFromPDF(file: File): Promise<{title: string, company: string, content: string, sourceUrl?: string}> {
    try {
      // For demo purposes, we'll simulate PDF text extraction and URL detection
      // In production, this would use a proper PDF parsing library (PDF.js) or API
      const fileName = file.name.toLowerCase()
      
      // Simulate extracting URL from PDF header/footer
      // Based on the example PDF "Manager, Product Management - - 309048.pdf"
      let extractedUrl: string | undefined
      
      // Mock URL extraction from PDF (in production, this would parse actual PDF content)
      if (fileName.includes('309048')) {
        // This matches the example PDF
        extractedUrl = 'https://apply.deloitte.com/en_US/careers/InviteToApply?jobId=309048&source=LinkedIn'
      } else {
        // Simulate URL detection patterns based on filename or content
        const urlPatterns = [
          'https://apply.deloitte.com/en_US/careers/InviteToApply?jobId=123456&source=LinkedIn',
          'https://careers.google.com/jobs/results/123456789',
          'https://job-boards.greenhouse.io/surveymonkey/jobs/123456',
          'https://www.linkedin.com/jobs/view/4278369716',
          'https://careers.microsoft.com/us/en/job/123456'
        ]
        
        // Random selection for demo - in production, extract from actual PDF content
        extractedUrl = urlPatterns[Math.floor(Math.random() * urlPatterns.length)]
      }
      
      // Try to extract info from filename and detected URL
      let title = 'Position from PDF'
      let company = 'Unknown Company'
      
      // Extract title from filename
      if (fileName.includes('manager')) {
        title = 'Manager, Product Management'
      } else if (fileName.includes('engineer')) {
        title = 'Software Engineer'
      } else if (fileName.includes('analyst')) {
        title = 'Business Analyst'
      }
      
      // Extract company from detected URL
      if (extractedUrl) {
        try {
          const url = new URL(extractedUrl)
          const hostname = url.hostname.toLowerCase().replace('www.', '')
          
          if (hostname.includes('deloitte.com')) {
            company = 'Deloitte'
          } else if (hostname.includes('google.com')) {
            company = 'Google'
          } else if (hostname.includes('greenhouse.io')) {
            const pathParts = url.pathname.split('/').filter(p => p)
            if (pathParts.length > 0) {
              company = pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1)
            }
          } else if (hostname.includes('linkedin.com')) {
            company = 'LinkedIn Job Posting' // Would extract hiring company from content
          } else if (hostname.includes('microsoft.com')) {
            company = 'Microsoft'
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
          // Simulate PDF content with header/footer URL
          resolve(`
            ${extractedUrl ? `URL: ${extractedUrl}` : ''}
            
            Job Title: ${title}
            Company: ${company}
            
            Position Summary:
            We are seeking a qualified candidate for this position.
            
            Key Responsibilities:
            - Lead strategic initiatives
            - Collaborate with cross-functional teams
            - Drive business outcomes
            
            Requirements:
            - Bachelor's degree or equivalent experience
            - Strong communication skills
            - Team player with leadership potential
            
            This is a full-time position with competitive benefits.
            
            Footer: ${extractedUrl || 'No URL found in PDF'}
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
        content: fileContent,
        sourceUrl: extractedUrl
      }
    } catch (error) {
      console.error('PDF extraction error:', error)
      return {
        title: 'Position from PDF',
        company: 'Unknown Company',
        content: 'Could not extract content from PDF',
        sourceUrl: undefined
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
          riskLevel: Math.random() > 0.5 ? 'high' : 'low',
          riskFactors: [
            'Job has been posted for 45+ days',
            'Description contains minimal specific requirements',
            'Company has unusual posting frequency'
          ],
          keyFactors: [
            'LinkedIn posting',
            'Remote position'
          ],
          metadata: {
            storage: 'mock',
            version: 'v0.1.7',
            cached: false,
            analysisDate: new Date().toISOString()
          }
        })
      }, 1500)
    })
  }

  /**
   * Proactively trigger learning when parsing fails
   */
  private static async triggerLearningForFailure(
    jobUrl: string, 
    failedResult: { title: string, company: string, location?: string },
    originalError: Error
  ): Promise<void> {
    try {
      console.log(`🔄 Triggering proactive learning for failed parse: ${jobUrl}`)

      // Try to fetch HTML for learning analysis
      let html = ''
      try {
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(jobUrl)}`)
        const data = await response.json()
        html = data.contents || ''
      } catch (htmlError) {
        console.warn('Could not fetch HTML for learning analysis:', htmlError)
      }

      // Call our learning API endpoint (consolidated into parse-preview)
      const response = await fetch('/api/parse-preview?mode=learning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: jobUrl,
          html,
          failedResult,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
          originalError: {
            message: originalError.message,
            stack: originalError.stack
          }
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log(`✅ Proactive learning completed:`, result)
        
        if (result.hasImprovements) {
          console.log(`🎓 Learning found ${result.improvementsCount} improvements:`, result.improvements)
          
          // You could potentially update the UI here to show the improved results
          // This would require exposing a callback or event system
        }
      } else {
        console.warn('Learning API call failed:', response.status, response.statusText)
      }

    } catch (error) {
      console.error('Proactive learning trigger failed:', error)
      // Don't throw - we don't want learning failures to break the main flow
    }
  }

  /**
   * Check if parsing result indicates low quality and should trigger learning
   */
  private static shouldTriggerLearning(
    result: { title: string, company: string, location?: string }
  ): boolean {
    return (
      result.title === 'Unknown Position' ||
      result.company === 'Unknown Company' ||
      result.title.length < 5 ||
      result.company.length < 3
    )
  }

  /**
   * Enhanced extraction with proactive learning
   */
  static async extractJobDataWithLearning(jobUrl: string): Promise<{
    title: string, 
    company: string, 
    location?: string, 
    remoteFlag?: boolean, 
    postedAt?: Date, 
    parsingMetadata?: any,
    learningApplied?: boolean,
    improvements?: string[]
  }> {
    try {
      // First, try standard extraction
      const standardResult = await this.extractJobData(jobUrl)
      
      // Check if result is poor quality
      if (this.shouldTriggerLearning(standardResult)) {
        console.log('🔍 Poor quality parsing detected, applying real-time learning...')
        
        // Trigger learning and get improvements
        await this.triggerLearningForFailure(
          jobUrl, 
          {
            title: standardResult.title,
            company: standardResult.company,
            location: standardResult.location
          },
          new Error('Poor quality parsing result')
        )
        
        // Return enhanced result with learning metadata
        return {
          ...standardResult,
          learningApplied: true,
          improvements: [] // This would be populated by the learning service
        }
      }
      
      return {
        ...standardResult,
        learningApplied: false
      }
    } catch (error) {
      console.error('Enhanced extraction failed:', error)
      throw error
    }
  }
}