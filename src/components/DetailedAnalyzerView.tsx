import React from 'react'
import { Clock, CheckCircle, AlertTriangle, Info, Copy, Eye, TrendingUp, Shield } from 'lucide-react'

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

  // Get impact weight display based on v0.1.7 algorithm
  const getImpactWeight = (description: string): string => {
    const lowerDesc = description.toLowerCase()
    if (lowerDesc.includes('pipeline') || lowerDesc.includes('always accepting')) return '+25%'
    if (lowerDesc.includes('urgent') || lowerDesc.includes('immediate')) return '+25%'
    if (lowerDesc.includes('stale') || lowerDesc.includes('days ago') && lowerDesc.includes('45')) return '+20%'
    if (lowerDesc.includes('anonymous') || lowerDesc.includes('confidential')) return '+20%'
    if (lowerDesc.includes('short') && lowerDesc.includes('description')) return '+20%'
    if (lowerDesc.includes('job board only')) return '+15%'
    if (lowerDesc.includes('staffing') || lowerDesc.includes('consulting')) return '+15%'
    if (lowerDesc.includes('vague salary')) return '+15%'
    if (lowerDesc.includes('buzzwords') || lowerDesc.includes('corporate')) return '+10%'
    if (lowerDesc.includes('long') && lowerDesc.includes('title')) return '+10%'
    if (lowerDesc.includes('generic') && lowerDesc.includes('title')) return '+5%'
    return '+10%' // default
  }

  const getPositiveWeight = (description: string): string => {
    const lowerDesc = description.toLowerCase()
    if (lowerDesc.includes('multiple positive')) return '-15%'
    if (lowerDesc.includes('recently posted')) return 'Strong+'
    if (lowerDesc.includes('company career') || lowerDesc.includes('ats')) return 'Strong+'
    if (lowerDesc.includes('concrete') || lowerDesc.includes('timeline')) return 'Strong+'
    if (lowerDesc.includes('technical') || lowerDesc.includes('specific')) return 'Strong+'
    return 'Good+'
  }

  const getFactorExplanation = (description: string): string => {
    const lowerDesc = description.toLowerCase()
    if (lowerDesc.includes('pipeline') || lowerDesc.includes('always accepting')) {
      return 'Indicates talent hoarding rather than active hiring'
    }
    if (lowerDesc.includes('urgent') || lowerDesc.includes('immediate')) {
      return 'Artificial urgency often used to pressure candidates'
    }
    if (lowerDesc.includes('stale') || lowerDesc.includes('days ago')) {
      return 'Jobs not updated recently suggest inactive hiring'
    }
    if (lowerDesc.includes('job board only')) {
      return 'Not mirrored on company career sites - lacks verification'
    }
    if (lowerDesc.includes('staffing') || lowerDesc.includes('consulting')) {
      return 'These companies often post speculative positions'
    }
    if (lowerDesc.includes('short') && lowerDesc.includes('description')) {
      return 'Lack of specific requirements indicates minimal effort'
    }
    if (lowerDesc.includes('anonymous') || lowerDesc.includes('confidential')) {
      return 'Anonymous employers lack transparency and accountability'
    }
    return 'Contributing factor to ghost job probability'
  }

  const getPositiveExplanation = (description: string): string => {
    const lowerDesc = description.toLowerCase()
    if (lowerDesc.includes('recently posted')) {
      return 'Recent postings indicate active, current hiring needs'
    }
    if (lowerDesc.includes('company career') || lowerDesc.includes('ats')) {
      return 'Direct company involvement suggests legitimate opportunity'
    }
    if (lowerDesc.includes('concrete') || lowerDesc.includes('timeline')) {
      return 'Specific deadlines and compensation show genuine intent'
    }
    if (lowerDesc.includes('technical') || lowerDesc.includes('specific')) {
      return 'Detailed requirements indicate well-defined role'
    }
    if (lowerDesc.includes('multiple positive')) {
      return 'Strong combined evidence of legitimate hiring activity'
    }
    return 'Positive indicator of legitimate job posting'
  }

  const getActionTitle = (action: string): string => {
    switch (action) {
      case 'proceed': return '✅ Proceed with Application'
      case 'avoid': return '⚠️ Avoid This Opportunity'
      default: return '🔍 Investigate Further'
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
      case 'proceed': return 'text-green-800 bg-gradient-to-br from-green-50 to-emerald-50 border-green-300'
      case 'avoid': return 'text-red-800 bg-gradient-to-br from-red-50 to-rose-50 border-red-300'
      default: return 'text-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300'
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span>Algorithm Assessment</span>
          </h3>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border">
            <div className="mb-4">
              <p className="text-gray-700 font-medium mb-2">
                {analysisData.algorithmAssessment.assessmentText}
              </p>
              <div className="text-sm text-gray-600">
                Based on Ghost Job Detection Algorithm v0.1.7 with enhanced criteria analysis
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-4 border shadow-sm">
                <span className="text-sm font-medium text-gray-600">Ghost Probability:</span>
                <div className="flex items-center space-x-3 mt-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {analysisData.algorithmAssessment.ghostProbability}%
                  </span>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    analysisData.algorithmAssessment.ghostProbability >= 60 ? 'bg-red-100 text-red-700' :
                    analysisData.algorithmAssessment.ghostProbability >= 35 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {analysisData.algorithmAssessment.ghostProbability >= 60 ? 'HIGH RISK' :
                     analysisData.algorithmAssessment.ghostProbability >= 35 ? 'MEDIUM RISK' : 'LOW RISK'}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Thresholds: High ≥60% • Medium ≥35% • Low &lt;35%
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border shadow-sm">
                <span className="text-sm font-medium text-gray-600">Model Confidence:</span>
                <div className="flex items-center space-x-3 mt-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {analysisData.algorithmAssessment.modelConfidence}
                  </span>
                  <Shield className="w-5 h-5 text-blue-500" />
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Algorithm certainty in assessment accuracy
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Risk Factors Analysis */}
      {analysisData.riskFactorsAnalysis && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span>Risk Factors Analysis</span>
            <span className="text-sm font-normal text-gray-500">— Enhanced v0.1.7 Criteria</span>
          </h3>
          
          {/* Warning Signs */}
          {analysisData.riskFactorsAnalysis.riskFactors.length > 0 && (
            <div className="mb-6">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span className="font-semibold text-amber-800">
                      Warning Signs ({analysisData.riskFactorsAnalysis.warningSignsCount})
                    </span>
                  </div>
                  <div className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                    Impact Weight Indicators
                  </div>
                </div>
                <ul className="space-y-3">
                  {analysisData.riskFactorsAnalysis.riskFactors.map((factor, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <div className={`w-2 h-2 rounded-full ${
                          factor.impact === 'high' ? 'bg-red-500' :
                          factor.impact === 'medium' ? 'bg-yellow-500' : 'bg-orange-400'
                        }`} />
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          factor.impact === 'high' ? 'bg-red-100 text-red-700' :
                          factor.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {getImpactWeight(factor.description)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <span className="text-amber-900 font-medium">{factor.description}</span>
                        <div className="text-xs text-amber-700 mt-1">
                          {getFactorExplanation(factor.description)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Positive Indicators */}
          {analysisData.riskFactorsAnalysis.positiveIndicators.length > 0 && (
            <div>
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span className="font-semibold text-emerald-800">
                      Positive Indicators ({analysisData.riskFactorsAnalysis.positiveIndicators.length})
                    </span>
                  </div>
                  <div className="text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                    Legitimacy Signals
                  </div>
                </div>
                <ul className="space-y-3">
                  {analysisData.riskFactorsAnalysis.positiveIndicators.map((indicator, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                        <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                          {getPositiveWeight(indicator.description)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <span className="text-emerald-900 font-medium">{indicator.description}</span>
                        <div className="text-xs text-emerald-700 mt-1">
                          {getPositiveExplanation(indicator.description)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                {analysisData.riskFactorsAnalysis.positiveIndicators.length >= 3 && (
                  <div className="mt-4 p-3 bg-emerald-100 rounded-lg border border-emerald-200">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">
                        Multiple Positive Indicators Bonus: -15% Ghost Score
                      </span>
                    </div>
                    <div className="text-xs text-emerald-700 mt-1">
                      Strong evidence of legitimate hiring activity detected
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommendation */}
      {analysisData.recommendation && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Info className="w-5 h-5 text-indigo-600" />
            <span>Recommendation</span>
          </h3>
          <div className={`border-2 rounded-xl p-5 shadow-sm ${getRecommendationColor(analysisData.recommendation.action)}`}>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 p-2 rounded-full bg-white bg-opacity-50">
                {getRecommendationIcon(analysisData.recommendation.action)}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg mb-3">
                  {getActionTitle(analysisData.recommendation.action)}
                </p>
                <p className="font-medium mb-3">
                  {analysisData.recommendation.message}
                </p>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    Confidence: <span className="font-semibold">{analysisData.recommendation.confidence}</span>
                  </div>
                  <div className="text-xs opacity-75">
                    Based on {analysisData.riskFactorsAnalysis ? 
                      `${analysisData.riskFactorsAnalysis.warningSignsCount} warning signs, ${analysisData.riskFactorsAnalysis.positiveIndicators.length} positive indicators` : 
                      'comprehensive analysis'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Details */}
      {analysisData.analysisDetails && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Eye className="w-5 h-5 text-gray-600" />
            <span>Analysis Details</span>
          </h3>
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 border rounded-xl p-5 shadow-sm space-y-4">
            
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-4 border">
                <span className="text-sm font-medium text-gray-600 flex items-center space-x-1">
                  <Copy className="w-3 h-3" />
                  <span>Analysis ID:</span>
                </span>
                <div className="flex items-center space-x-2 mt-2">
                  <code className="text-sm bg-gray-100 px-3 py-2 rounded-lg font-mono border text-gray-800 flex-1">
                    {analysisData.analysisDetails.analysisId}
                  </code>
                  <button
                    onClick={copyAnalysisId}
                    className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Copy Analysis ID"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border">
                <span className="text-sm font-medium text-gray-600">Algorithm Version:</span>
                <div className="mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {analysisData.analysisDetails.modelVersion}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">
                    Enhanced Detection Criteria
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-4 border">
                <span className="text-sm font-medium text-gray-600 flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Processing Time:</span>
                </span>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-lg font-semibold text-gray-900">
                    {analysisData.analysisDetails.processingTimeMs || 850}ms
                  </span>
                  <div className="text-xs text-gray-500">
                    Ultra-fast analysis
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border">
                <span className="text-sm font-medium text-gray-600">Analysis Date:</span>
                <div className="mt-2">
                  <span className="text-sm text-gray-900 font-medium">
                    {formatDate(analysisData.analysisDetails.analysisDate)}
                  </span>
                </div>
              </div>
            </div>

            {analysisData.analysisDetails.platform && (
              <div className="bg-white rounded-lg p-4 border">
                <span className="text-sm font-medium text-gray-600">Source Platform:</span>
                <div className="mt-2 flex items-center space-x-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 capitalize">
                    {analysisData.analysisDetails.platform}
                  </span>
                  {analysisData.analysisDetails.platform?.toLowerCase().includes('career') && (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      Company Site ✓
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}