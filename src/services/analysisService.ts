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