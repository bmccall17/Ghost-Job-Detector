import React, { useState } from 'react'
import { X, AlertTriangle, CheckCircle } from 'lucide-react'

interface ParsingFeedbackModalProps {
  isVisible: boolean
  onClose: () => void
  originalData: {
    title: string
    company: string
    location?: string
    url: string
  }
  onSubmitFeedback: (feedback: {
    correctTitle?: string
    correctCompany?: string
    correctLocation?: string
    feedbackType: 'correction' | 'confirmation'
    notes?: string
  }) => Promise<void>
}

export const ParsingFeedbackModal: React.FC<ParsingFeedbackModalProps> = ({
  isVisible,
  onClose,
  originalData,
  onSubmitFeedback
}) => {
  const [feedbackType, setFeedbackType] = useState<'correction' | 'confirmation'>('correction')
  const [correctTitle, setCorrectTitle] = useState(originalData.title || '')
  const [correctCompany, setCorrectCompany] = useState(originalData.company || '')
  const [correctLocation, setCorrectLocation] = useState(originalData.location || '')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onSubmitFeedback({
        correctTitle: feedbackType === 'correction' && correctTitle ? correctTitle : undefined,
        correctCompany: feedbackType === 'correction' && correctCompany ? correctCompany : undefined,
        correctLocation: feedbackType === 'correction' && correctLocation ? correctLocation : undefined,
        feedbackType,
        notes
      })
      onClose()
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasCorrections = feedbackType === 'correction' && (correctTitle || correctCompany || correctLocation)

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Help Improve Parsing Accuracy
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Parsed Information</h3>
            <div className="space-y-2 text-sm text-gray-800 dark:text-gray-200">
              <div><strong>Title:</strong> {originalData.title}</div>
              <div><strong>Company:</strong> {originalData.company}</div>
              <div><strong>Location:</strong> {originalData.location || 'Not detected'}</div>
              <div className="text-xs text-blue-600 dark:text-blue-400">Source: {originalData.url}</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="confirmation"
                  checked={feedbackType === 'confirmation'}
                  onChange={(e) => setFeedbackType(e.target.value as 'confirmation')}
                  className="w-4 h-4 text-blue-600"
                />
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">This information is correct</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="correction"
                  checked={feedbackType === 'correction'}
                  onChange={(e) => setFeedbackType(e.target.value as 'correction')}
                  className="w-4 h-4 text-blue-600"
                />
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">I need to make corrections</span>
              </label>
            </div>

            {feedbackType === 'correction' && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4 space-y-4">
                <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
                  Please provide the correct information (leave blank if the original is correct):
                </p>
                
                <div>
                  <label htmlFor="correctTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Correct Job Title
                  </label>
                  <input
                    id="correctTitle"
                    type="text"
                    value={correctTitle}
                    onChange={(e) => setCorrectTitle(e.target.value)}
                    placeholder={originalData.title}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="correctCompany" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Correct Company Name
                  </label>
                  <input
                    id="correctCompany"
                    type="text"
                    value={correctCompany}
                    onChange={(e) => setCorrectCompany(e.target.value)}
                    placeholder={originalData.company}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="correctLocation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Correct Location
                  </label>
                  <input
                    id="correctLocation"
                    type="text"
                    value={correctLocation}
                    onChange={(e) => setCorrectLocation(e.target.value)}
                    placeholder={originalData.location || 'Enter location if known'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Additional Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any additional context about the job posting or parsing issues..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">How This Helps</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Your feedback trains our AI to recognize patterns on this website</li>
              <li>• Similar job postings will be parsed more accurately in the future</li>
              <li>• All users benefit from improved parsing on this domain</li>
              <li>• No personal information is stored, only parsing improvements</li>
            </ul>
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={isSubmitting || (feedbackType === 'correction' && !hasCorrections)}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}