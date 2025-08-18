import React, { useState } from 'react'
import { Download, ExternalLink, Calendar, Filter } from 'lucide-react'
import { JobAnalysis } from '@/types'
import { GhostJobBadge } from './GhostJobBadge'
import { RiskTooltip } from './RiskTooltip'
import { JobReportModal } from './JobReportModal'
import { CorrectionStatusBadge } from './CorrectionStatusBadge'
import { AnalysisService } from '@/services/analysisService'
import { CorrectionService } from '@/services/CorrectionService'

interface AnalysisResultsTableProps {
  results: JobAnalysis[]
}

export const AnalysisResultsTable: React.FC<AnalysisResultsTableProps> = ({
  results
}) => {
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'date' | 'probability' | 'company'>('date')
  const [filterBy, setFilterBy] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [selectedAnalysis, setSelectedAnalysis] = useState<JobAnalysis | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const openJobReport = (analysis: JobAnalysis) => {
    setSelectedAnalysis(analysis)
    setIsModalOpen(true)
  }

  const closeJobReport = () => {
    setSelectedAnalysis(null)
    setIsModalOpen(false)
  }

  const handleCorrection = async (jobId: string, corrections: any) => {
    try {
      console.log(`Processing correction for job ${jobId}:`, corrections)
      
      // Mock correction processing
      const correctionService = CorrectionService.getInstance()
      
      // Create correction record
      const correctionData = {
        jobId,
        originalData: {
          title: selectedAnalysis?.title || '',
          company: selectedAnalysis?.company || '',
          location: '',
          platform: selectedAnalysis?.parsingMetadata?.parserUsed || ''
        },
        correctedData: corrections,
        userVerified: true,
        algorithmVerified: !corrections.forceCommit,
        learningWeight: corrections.forceCommit ? 0.6 : 0.8,
        correctionReason: corrections.forceCommit ? 'Manual override by user' : 'User correction',
        forceCommit: corrections.forceCommit || false
      }
      
      await correctionService.saveCorrections(correctionData)
      
      // Refresh the analysis data (in a real app)
      console.log('✅ Correction saved successfully')
      
    } catch (error) {
      console.error('Failed to save correction:', error)
    }
  }

  const handleSelectAll = () => {
    if (selectedResults.size === results.length) {
      setSelectedResults(new Set())
    } else {
      setSelectedResults(new Set(results.map(r => r.id)))
    }
  }

  const handleSelectResult = (id: string) => {
    const newSelected = new Set(selectedResults)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedResults(newSelected)
  }

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (selectedResults.size === 0) return
    
    try {
      const blob = await AnalysisService.exportAnalysisResults(
        Array.from(selectedResults),
        format
      )
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ghost-job-analysis.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const filteredResults = results.filter(result => {
    if (filterBy === 'all') return true
    if (filterBy === 'high') return result.ghostProbability >= 0.67
    if (filterBy === 'medium') return result.ghostProbability >= 0.34 && result.ghostProbability < 0.67
    if (filterBy === 'low') return result.ghostProbability < 0.34
    return true
  })

  const sortedResults = [...filteredResults].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime()
      case 'probability':
        return b.ghostProbability - a.ghostProbability
      case 'company':
        return a.company.localeCompare(b.company)
      default:
        return 0
    }
  })

  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Filter className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>No analysis results yet</p>
        <p className="text-sm">Analyze some jobs to see results here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="date">Sort by Date</option>
            <option value="probability">Sort by Probability</option>
            <option value="company">Sort by Company</option>
          </select>
          
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Results</option>
            <option value="high">High Risk (67%+)</option>
            <option value="medium">Medium Risk (34-66%)</option>
            <option value="low">Low Risk (&lt;34%)</option>
          </select>
        </div>

        {selectedResults.size > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {selectedResults.size} selected
            </span>
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedResults.size === results.length && results.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="w-2/5 text-left px-4 py-3 text-sm font-medium text-gray-900">Job</th>
              <th className="w-1/5 text-left px-4 py-3 text-sm font-medium text-gray-900">Company</th>
              <th className="w-1/6 text-left px-4 py-3 text-sm font-medium text-gray-900">Ghost Risk</th>
              <th className="w-1/6 text-left px-4 py-3 text-sm font-medium text-gray-900">Analyzed</th>
              <th className="w-16 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedResults.map((result) => (
              <tr key={result.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedResults.has(result.id)}
                    onChange={() => handleSelectResult(result.id)}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="min-w-0 w-full">
                    <div className="flex items-start space-x-2 mb-1">
                      <button
                        onClick={() => openJobReport(result)}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left break-words leading-tight"
                        title="Click to view detailed analysis report"
                      >
                        {result.title}
                      </button>
                      {/* Mock correction status - in real app this would come from database */}
                      {Math.random() > 0.7 && (
                        <CorrectionStatusBadge 
                          status={Math.random() > 0.5 ? 'verified' : 'manual_override'} 
                          size="sm"
                        />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 break-all leading-tight">{result.jobUrl}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-900 break-words">{result.company}</span>
                </td>
                <td className="px-4 py-3">
                  <RiskTooltip 
                    factors={result.factors}
                    probability={result.ghostProbability}
                  >
                    <div>
                      <GhostJobBadge 
                        probability={result.ghostProbability}
                        confidence={result.confidence}
                        size="sm"
                      />
                    </div>
                  </RiskTooltip>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(result.analyzedAt).toLocaleDateString()}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={result.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-blue-600"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <JobReportModal 
        analysis={selectedAnalysis}
        isOpen={isModalOpen}
        onClose={closeJobReport}
        onCorrection={handleCorrection}
      />
    </div>
  )
}