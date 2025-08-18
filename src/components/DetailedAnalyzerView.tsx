import React from 'react'
import { Clock, CheckCircle, AlertTriangle, Target, Info, Copy } from 'lucide-react'

interface DetailedAnalyzerViewProps {
  analysisData: {
    algorithmAssessment?: {
      ghostProbability: number
      modelConfidence: string
      assessmentText: string
    }
    riskFactorsAnalysis?: {
      warningSignsCount: number
      warningSignsTotal: number
      riskFactors: Array<{
        type: string
        description: string
        impact: string
      }>
      positiveIndicators: Array<{
        type: string
        description: string
        impact: string
      }>
    }
    recommendation?: {
      action: string
      message: string
      confidence: string
    }
    analysisDetails?: {
      analysisId: string
      modelVersion: string
      processingTimeMs: number
      analysisDate: string
      algorithmType?: string
      platform?: string
    }
  }
  isVisible: boolean
}

export const DetailedAnalyzerView: React.FC<DetailedAnalyzerViewProps> = ({
  analysisData,
  isVisible
}) => {
  const copyAnalysisId = () => {
    if (analysisData.analysisDetails?.analysisId) {
      navigator.clipboard.writeText(analysisData.analysisDetails.analysisId)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  const getRecommendationColor = (action: string) => {
    switch (action) {
      case 'proceed': return 'text-green-700 bg-green-50 border-green-200'
      case 'avoid': return 'text-red-700 bg-red-50 border-red-200'
      default: return 'text-blue-700 bg-blue-50 border-blue-200'
    }
  }

  const getRecommendationIcon = (action: string) => {
    switch (action) {
      case 'proceed': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'avoid': return <AlertTriangle className="w-5 h-5 text-red-600" />
      default: return <Info className="w-5 h-5 text-blue-600" />
    }
  }

  if (!isVisible || !analysisData) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Algorithm Assessment */}
      {analysisData.algorithmAssessment && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Algorithm Assessment</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700 mb-4">
              {analysisData.algorithmAssessment.assessmentText}
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-600">Ghost Probability:</span>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-lg font-semibold text-gray-900">
                    {analysisData.algorithmAssessment.ghostProbability}%
                  </span>
                </div>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-600">Model Confidence:</span>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-lg font-semibold text-gray-900">
                    {analysisData.algorithmAssessment.modelConfidence}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Risk Factors Analysis */}
      {analysisData.riskFactorsAnalysis && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Factors Analysis</h3>
          
          {/* Warning Signs */}
          {analysisData.riskFactorsAnalysis.riskFactors.length > 0 && (
            <div className="mb-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-yellow-800">
                    Warning Signs ({analysisData.riskFactorsAnalysis.warningSignsCount})
                  </span>
                </div>
                <ul className="space-y-2">
                  {analysisData.riskFactorsAnalysis.riskFactors.map((factor, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-yellow-800">{factor.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Positive Indicators */}
          {analysisData.riskFactorsAnalysis.positiveIndicators.length > 0 && (
            <div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">
                    Positive Indicators ({analysisData.riskFactorsAnalysis.positiveIndicators.length})
                  </span>
                </div>
                <ul className="space-y-2">
                  {analysisData.riskFactorsAnalysis.positiveIndicators.map((indicator, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-green-800">{indicator.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommendation */}
      {analysisData.recommendation && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendation</h3>
          <div className={`border rounded-lg p-4 ${getRecommendationColor(analysisData.recommendation.action)}`}>
            <div className="flex items-start space-x-3">
              {getRecommendationIcon(analysisData.recommendation.action)}
              <div>
                <p className="font-medium mb-2">
                  {analysisData.recommendation.message}
                </p>
                <div className="text-sm opacity-75">
                  Confidence: <span className="font-medium">{analysisData.recommendation.confidence}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Details */}
      {analysisData.analysisDetails && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Details</h3>
          <div className="bg-white border rounded-lg p-4 space-y-3">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-600">Analysis ID:</span>
                <div className="flex items-center space-x-2 mt-1">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                    {analysisData.analysisDetails.analysisId}
                  </code>
                  <button
                    onClick={copyAnalysisId}
                    className="text-gray-400 hover:text-gray-600"
                    title="Copy Analysis ID"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-600">Model Version:</span>
                <div className="mt-1">
                  <span className="text-sm text-gray-900">
                    {analysisData.analysisDetails.modelVersion}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-600">Processing Time:</span>
                <div className="flex items-center space-x-1 mt-1">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-900">
                    ~{analysisData.analysisDetails.processingTimeMs || 850}ms
                  </span>
                </div>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-600">Analysis Date:</span>
                <div className="mt-1">
                  <span className="text-sm text-gray-900">
                    {formatDate(analysisData.analysisDetails.analysisDate)}
                  </span>
                </div>
              </div>
            </div>

            {analysisData.analysisDetails.platform && (
              <div>
                <span className="text-sm font-medium text-gray-600">Platform:</span>
                <div className="mt-1">
                  <span className="text-sm text-gray-900 capitalize">
                    {analysisData.analysisDetails.platform}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}