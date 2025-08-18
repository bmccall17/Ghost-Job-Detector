import React, { useState, useEffect } from 'react'
import { Clock, TrendingUp, Loader2, Download } from 'lucide-react'
import { useAnalysisStore } from '@/stores/analysisStore'
import { AnalysisService } from '@/services/analysisService'
import { AnalysisResultsTable } from '@/components/AnalysisResultsTable'
import { JobAnalysis } from '@/types'

export const AnalysisHistory: React.FC = () => {
  const { analysisHistory, bulkJobs } = useAnalysisStore()
  const [databaseAnalyses, setDatabaseAnalyses] = useState<JobAnalysis[]>([])
  const [databaseStats, setDatabaseStats] = useState<{ total: number; highRisk: number; mediumRisk: number; lowRisk: number }>({ total: 0, highRisk: 0, mediumRisk: 0, lowRisk: 0 })
  const [isLoadingDatabase, setIsLoadingDatabase] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Load analysis history from database on component mount
  useEffect(() => {
    const loadDatabaseHistory = async () => {
      try {
        setIsLoadingDatabase(true)
        setLoadError(null)
        
        const result = await AnalysisService.getAnalysisHistory()
        
        // Convert API response to JobAnalysis format
        const convertedAnalyses: JobAnalysis[] = result.analyses.map(analysis => ({
          id: analysis.id,
          jobUrl: analysis.jobUrl || analysis.url, // Handle both formats
          title: analysis.jobData?.title || analysis.title, // Handle both formats
          company: analysis.jobData?.company || analysis.company, // Handle both formats
          ghostProbability: analysis.ghostProbability,
          confidence: 0.8, // Default confidence
          factors: [...(analysis.riskFactors || []), ...(analysis.keyFactors || [])],
          analyzedAt: new Date(analysis.timestamp),
          status: 'completed' as const,
          isNewContribution: analysis.isNewContribution || false,
          // Include metadata if available
          metadata: {
            algorithmAssessment: analysis.metadata?.algorithmAssessment,
            riskFactorsAnalysis: analysis.metadata?.riskFactorsAnalysis,
            recommendation: analysis.metadata?.recommendation,
            analysisDetails: analysis.metadata?.analysisDetails,
            processingTimeMs: analysis.metadata?.processingTimeMs,
            analysisId: analysis.metadata?.analysisId
          }
        }))
        
        setDatabaseAnalyses(convertedAnalyses)
        setDatabaseStats(result.stats)
      } catch (error) {
        console.error('Failed to load analysis history:', error)
        setLoadError('Failed to load analysis history from database')
      } finally {
        setIsLoadingDatabase(false)
      }
    }

    loadDatabaseHistory()
  }, [])

  // Combine local and database analyses, removing duplicates by URL
  const combinedAnalyses = React.useMemo(() => {
    const allAnalyses = [...databaseAnalyses]
    
    // Add local analyses that aren't in the database
    analysisHistory.forEach(localAnalysis => {
      const existsInDatabase = databaseAnalyses.some(dbAnalysis => 
        dbAnalysis.jobUrl === localAnalysis.jobUrl
      )
      if (!existsInDatabase) {
        allAnalyses.push(localAnalysis)
      }
    })
    
    // Sort by analyzedAt date, newest first
    return allAnalyses.sort((a, b) => 
      new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime()
    )
  }, [databaseAnalyses, analysisHistory])

  const getAnalysisStats = () => {
    // Use database stats if available, otherwise calculate from combined data
    if (!isLoadingDatabase && databaseStats.total > 0) {
      return databaseStats
    }
    
    const total = combinedAnalyses.length
    const highRisk = combinedAnalyses.filter(a => a.ghostProbability >= 0.67).length
    const mediumRisk = combinedAnalyses.filter(a => a.ghostProbability >= 0.34 && a.ghostProbability < 0.67).length
    const lowRisk = combinedAnalyses.filter(a => a.ghostProbability < 0.34).length

    return { total, highRisk, mediumRisk, lowRisk }
  }

  const stats = getAnalysisStats()

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analysis History</h1>
          <p className="text-gray-600">Track and export your job analysis results</p>
        </div>
      </div>

      {/* Loading State */}
      {isLoadingDatabase && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span className="text-gray-600">Loading analysis history...</span>
        </div>
      )}

      {/* Error State */}
      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{loadError}</p>
          <p className="text-sm text-red-600 mt-1">Showing local data only.</p>
        </div>
      )}

      {!isLoadingDatabase && combinedAnalyses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Analyzed</p>
                <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <div className="w-5 h-5 bg-red-600 rounded" />
              </div>
              <div>
                <p className="text-sm text-gray-600">High Risk</p>
                <p className="text-xl font-semibold text-gray-900">{stats.highRisk}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <div className="w-5 h-5 bg-yellow-600 rounded" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Medium Risk</p>
                <p className="text-xl font-semibold text-gray-900">{stats.mediumRisk}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <div className="w-5 h-5 bg-green-600 rounded" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Low Risk</p>
                <p className="text-xl font-semibold text-gray-900">{stats.lowRisk}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <AnalysisResultsTable results={combinedAnalyses} />

      {/* Bulk analysis section hidden for v0.1 */}
      {false && (
        <div className="bg-white rounded-lg shadow-sm border">
          {bulkJobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Download className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No bulk analysis jobs yet</p>
              <p className="text-sm">Upload CSV files to see bulk analysis history</p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-900">File Name</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-900">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-900">Progress</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-900">Created</th>
                    <th className="w-16 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bulkJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{job.fileName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          job.status === 'completed' ? 'bg-green-100 text-green-800' :
                          job.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          job.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: job.totalJobs > 0 ? `${(job.completedJobs / job.totalJobs) * 100}%` : '0%'
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {job.completedJobs}/{job.totalJobs}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {job.status === 'completed' && (
                          <button className="text-blue-600 hover:text-blue-800">
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* No Results State */}
      {!isLoadingDatabase && combinedAnalyses.length === 0 && bulkJobs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No analysis results yet</h3>
          <p className="text-gray-600">Analyze some jobs to see results here</p>
        </div>
      )}
    </div>
  )
}