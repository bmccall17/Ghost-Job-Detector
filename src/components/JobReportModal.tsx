import React from 'react'
import { X, ExternalLink, Calendar, Building, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { JobAnalysis } from '@/types'
import { GhostJobBadge } from './GhostJobBadge'

interface JobReportModalProps {
  analysis: JobAnalysis | null
  isOpen: boolean
  onClose: () => void
}

export const JobReportModal: React.FC<JobReportModalProps> = ({ analysis, isOpen, onClose }) => {
  if (!isOpen || !analysis) return null

  const categorizeFactors = (factors: string[]) => {
    const redFlags: string[] = []
    const yellowFlags: string[] = []
    const greenFlags: string[] = []

    factors.forEach(factor => {
      const lowerFactor = factor.toLowerCase()
      if (lowerFactor.includes('45+ days') || 
          lowerFactor.includes('minimal') || 
          lowerFactor.includes('unusual') ||
          lowerFactor.includes('generic') ||
          lowerFactor.includes('vague')) {
        redFlags.push(factor)
      } else if (lowerFactor.includes('recent') || 
                 lowerFactor.includes('detailed') || 
                 lowerFactor.includes('specific') ||
                 lowerFactor.includes('clear')) {
        greenFlags.push(factor)
      } else {
        yellowFlags.push(factor)
      }
    })

    return { redFlags, yellowFlags, greenFlags }
  }

  const { redFlags, yellowFlags, greenFlags } = categorizeFactors(analysis.factors)

  const getRiskDescription = (probability: number) => {
    if (probability >= 0.67) {
      return "This job posting shows strong indicators of being a ghost job. Consider avoiding application unless you have specific insider knowledge."
    }
    if (probability >= 0.34) {
      return "This job posting shows mixed signals. Proceed with caution and research the company thoroughly before applying."
    }
    return "This job posting appears legitimate with positive indicators. It's likely a real opportunity worth pursuing."
  }

  const getConfidenceDescription = (confidence: number) => {
    if (confidence >= 0.9) return "Very High"
    if (confidence >= 0.8) return "High"
    if (confidence >= 0.7) return "Medium"
    if (confidence >= 0.6) return "Fair"
    return "Low"
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{analysis.title}</h2>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Building className="w-4 h-4" />
                <span>{analysis.company}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>Analyzed {analysis.analyzedAt.toLocaleDateString()}</span>
              </div>
              <a 
                href={analysis.jobUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="w-4 h-4" />
                <span>View Original</span>
              </a>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <GhostJobBadge 
              probability={analysis.ghostProbability}
              confidence={analysis.confidence}
            />
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* Algorithm Assessment */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Algorithm Assessment</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 mb-3">{getRiskDescription(analysis.ghostProbability)}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Ghost Probability:</span>
                    <span className="ml-2 font-semibold">{Math.round(analysis.ghostProbability * 100)}%</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Model Confidence:</span>
                    <span className="ml-2 font-semibold">{getConfidenceDescription(analysis.confidence)} ({Math.round(analysis.confidence * 100)}%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Factors Analysis */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Risk Factors Analysis</h3>
              <div className="space-y-4">
                {redFlags.length > 0 && (
                  <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <div className="flex items-center space-x-2 mb-3">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <h4 className="font-semibold text-red-800">Red Flags ({redFlags.length})</h4>
                    </div>
                    <ul className="space-y-2">
                      {redFlags.map((flag, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-red-700 text-sm">{flag}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {yellowFlags.length > 0 && (
                  <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                    <div className="flex items-center space-x-2 mb-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <h4 className="font-semibold text-yellow-800">Warning Signs ({yellowFlags.length})</h4>
                    </div>
                    <ul className="space-y-2">
                      {yellowFlags.map((flag, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-yellow-700 text-sm">{flag}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {greenFlags.length > 0 && (
                  <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                    <div className="flex items-center space-x-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <h4 className="font-semibold text-green-800">Positive Indicators ({greenFlags.length})</h4>
                    </div>
                    <ul className="space-y-2">
                      {greenFlags.map((flag, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-green-700 text-sm">{flag}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Recommendation */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Recommendation</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  {analysis.ghostProbability >= 0.67 
                    ? "⚠️ High risk of ghost job. We recommend avoiding this application unless you have inside information about the role's legitimacy."
                    : analysis.ghostProbability >= 0.34
                    ? "⚡ Mixed signals detected. Research the company thoroughly and consider reaching out to current employees before applying."
                    : "✅ This appears to be a legitimate opportunity. Consider applying if it matches your qualifications and career goals."
                  }
                </p>
              </div>
            </div>

            {/* Model Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Analysis Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Analysis ID:</span>
                  <span className="ml-2 font-mono">{analysis.id}</span>
                </div>
                <div>
                  <span className="font-medium">Model Version:</span>
                  <span className="ml-2">v1.2.3</span>
                </div>
                <div>
                  <span className="font-medium">Processing Time:</span>
                  <span className="ml-2">~850ms</span>
                </div>
                <div>
                  <span className="font-medium">Analysis Date:</span>
                  <span className="ml-2">{analysis.analyzedAt.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}