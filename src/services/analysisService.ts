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
      // For demo purposes, we'll extract from common job board patterns
      const url = new URL(jobUrl)
      
      if (url.hostname.includes('greenhouse')) {
        // Extract from Greenhouse URLs like job-boards.greenhouse.io/contentful/jobs/6901692
        const pathParts = url.pathname.split('/').filter(part => part.length > 0)
        const company = pathParts[0] || 'Unknown Company'
        
        // Try to fetch the page and extract title
        try {
          const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(jobUrl)}`)
          const data = await response.json()
          const html = data.contents
          
          // Extract title from page content
          const titleMatch = html.match(/<title[^>]*>([^<]+)</i) || 
                           html.match(/<h1[^>]*>([^<]+)</i) ||
                           html.match(/class="[^"]*title[^"]*"[^>]*>([^<]+)/i)
          
          let title = titleMatch ? titleMatch[1].trim() : 'Unknown Position'
          
          // Clean up common suffixes from job board titles
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
      
      if (url.hostname.includes('linkedin')) {
        return {
          title: url.searchParams.get('title') || 'LinkedIn Position',
          company: 'LinkedIn Company'
        }
      }
      
      // Generic fallback
      return {
        title: 'Unknown Position',
        company: url.hostname.replace('www.', '').split('.')[0] || 'Unknown Company'
      }
    } catch (error) {
      return {
        title: 'Unknown Position',
        company: 'Unknown Company'
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