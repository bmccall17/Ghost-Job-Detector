import React, { useState } from 'react'
import { Clock, TrendingUp, Download, Trash2 } from 'lucide-react'
import { useAnalysisStore } from '@/stores/analysisStore'
import { AnalysisResultsTable } from '@/components/AnalysisResultsTable'

export const AnalysisHistory: React.FC = () => {
  const { analysisHistory, bulkJobs, clearHistory } = useAnalysisStore()
  const [activeTab, setActiveTab] = useState<'individual' | 'bulk'>('individual')

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all analysis history? This action cannot be undone.')) {
      clearHistory()
    }
  }

  const getAnalysisStats = () => {
    const total = analysisHistory.length
    const highRisk = analysisHistory.filter(a => a.ghostProbability >= 0.67).length
    const mediumRisk = analysisHistory.filter(a => a.ghostProbability >= 0.34 && a.ghostProbability < 0.67).length
    const lowRisk = analysisHistory.filter(a => a.ghostProbability < 0.34).length

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
        
        {(analysisHistory.length > 0 || bulkJobs.length > 0) && (
          <button
            onClick={handleClearHistory}
            className="flex items-center space-x-2 px-4 py-2 text-red-600 border border-red-200 rounded-md hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {analysisHistory.length > 0 && (
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

      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('individual')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'individual'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Individual Analysis ({analysisHistory.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('bulk')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'bulk'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Bulk Analysis ({bulkJobs.length})</span>
        </button>
      </div>

      {activeTab === 'individual' && (
        <AnalysisResultsTable results={analysisHistory} />
      )}

      {activeTab === 'bulk' && (
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
    </div>
  )
}