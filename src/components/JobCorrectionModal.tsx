import React, { useState, useEffect } from 'react'
import { X, AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react'

interface JobData {
  id: string
  title: string
  company: string
  location?: string
  postedAt?: string
  url: string
  platform?: string
}

interface CorrectionResult {
  verified: boolean
  confidence: number
  algorithmData?: JobData
  discrepancies?: string[]
}

interface JobCorrectionModalProps {
  isOpen: boolean
  onClose: () => void
  jobData: JobData
  onCorrect: (corrections: Partial<JobData>) => Promise<CorrectionResult>
  onSave: (corrections: Partial<JobData>, forceCommit?: boolean) => Promise<void>
}

const platformOptions = [
  'LinkedIn',
  'Greenhouse', 
  'Company Career Page',
  'Indeed',
  'AngelList',
  'Glassdoor',
  'ZipRecruiter',
  'Other'
]

export function JobCorrectionModal({ 
  isOpen, 
  onClose, 
  jobData, 
  onCorrect, 
  onSave 
}: JobCorrectionModalProps) {
  const [formData, setFormData] = useState<Partial<JobData>>({})
  const [validationResult, setValidationResult] = useState<CorrectionResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [userConfirmed, setUserConfirmed] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: jobData.title,
        company: jobData.company,
        location: jobData.location || '',
        postedAt: jobData.postedAt ? jobData.postedAt.split('T')[0] : '',
        platform: jobData.platform || ''
      })
      setValidationResult(null)
      setShowConfirmation(false)
      setUserConfirmed(false)
    }
  }, [isOpen, jobData])

  const handleInputChange = (field: keyof JobData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setValidationResult(null) // Reset validation when user changes data
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsValidating(true)
    try {
      const result = await onCorrect(formData)
      setValidationResult(result)
      
      if (result.verified && result.confidence > 0.8) {
        // High confidence - auto-save
        await onSave(formData)
        onClose()
      }
    } catch (error) {
      console.error('Validation failed:', error)
    } finally {
      setIsValidating(false)
    }
  }

  const handleForceCommit = () => {
    if (!userConfirmed) {
      setShowConfirmation(true)
      return
    }
    
    handleConfirmCommit()
  }

  const handleConfirmCommit = async () => {
    try {
      await onSave(formData, true) // Force commit
      onClose()
    } catch (error) {
      console.error('Force commit failed:', error)
    }
  }

  const hasChanges = Object.keys(formData).some(key => 
    formData[key as keyof JobData] !== jobData[key as keyof JobData]
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Correct Job Information
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Job Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Job Title *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title || ''}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Company Name */}
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                id="company"
                value={formData.company || ''}
                onChange={(e) => handleInputChange('company', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Platform */}
            <div>
              <label htmlFor="platform" className="block text-sm font-medium text-gray-700 mb-1">
                Platform
              </label>
              <select
                id="platform"
                value={formData.platform || ''}
                onChange={(e) => handleInputChange('platform', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select platform...</option>
                {platformOptions.map(platform => (
                  <option key={platform} value={platform}>{platform}</option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                id="location"
                value={formData.location || ''}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., New York, NY (Remote)"
              />
            </div>

            {/* Posted Date */}
            <div>
              <label htmlFor="postedAt" className="block text-sm font-medium text-gray-700 mb-1">
                Posted Date
              </label>
              <input
                type="date"
                id="postedAt"
                value={formData.postedAt || ''}
                onChange={(e) => handleInputChange('postedAt', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Validation Results */}
          {validationResult && (
            <div className="mt-6 p-4 rounded-lg border">
              {validationResult.verified ? (
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-green-800 font-medium">
                      ✅ Verified - Algorithm confirmed your corrections
                    </p>
                    <p className="text-green-600 text-sm mt-1">
                      Confidence: {(validationResult.confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-amber-800 font-medium">
                        ⚠️ Algorithm cannot verify these corrections
                      </p>
                      <p className="text-amber-600 text-sm mt-1">
                        Confidence: {(validationResult.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {validationResult.algorithmData && (
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Algorithm found:
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Your Input:</span>
                          <div className="mt-1 space-y-1">
                            <div>Title: {formData.title}</div>
                            <div>Company: {formData.company}</div>
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">Algorithm Result:</span>
                          <div className="mt-1 space-y-1">
                            <div>Title: {validationResult.algorithmData.title}</div>
                            <div>Company: {validationResult.algorithmData.company}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {validationResult.discrepancies && (
                    <div className="bg-red-50 p-3 rounded">
                      <p className="text-sm font-medium text-red-700 mb-2">
                        Discrepancies found:
                      </p>
                      <ul className="text-sm text-red-600 space-y-1">
                        {validationResult.discrepancies.map((discrepancy, index) => (
                          <li key={index}>• {discrepancy}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Force Commit Confirmation */}
          {showConfirmation && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium mb-3">
                Are you sure? This will override the algorithm.
              </p>
              <label className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  checked={userConfirmed}
                  onChange={(e) => setUserConfirmed(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm text-red-700">
                  I have manually verified this information is correct
                </span>
              </label>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>

            {validationResult && !validationResult.verified && (
              <button
                type="button"
                onClick={handleForceCommit}
                disabled={showConfirmation && !userConfirmed}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white rounded-md transition-colors"
              >
                {showConfirmation ? 'Confirm Override' : 'Double-check and Force Commit'}
              </button>
            )}

            <button
              type="submit"
              disabled={!hasChanges || isValidating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-md transition-colors flex items-center space-x-2"
            >
              {isValidating && <RotateCcw className="w-4 h-4 animate-spin" />}
              <span>{isValidating ? 'Validating...' : 'Validate & Save'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}