/**
 * ParsedJobConfirmationModal Component
 * Handles user confirmation workflow for extracted job data
 * Following Implementation Guide specifications
 */
import React, { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, Edit3, Save, RotateCcw, Loader2 } from 'lucide-react';
import { ParsePreviewResponse, ExtractedJobData, ParsedJobConfirmation } from '@/types';
import { ParsedJobDisplay } from './ParsedJobDisplay';

interface ParsedJobConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewData: ParsePreviewResponse;
  onConfirm: (confirmation: ParsedJobConfirmation) => void;
  onReject: () => void;
  isProcessing?: boolean;
}

export const ParsedJobConfirmationModal: React.FC<ParsedJobConfirmationModalProps> = ({
  isOpen,
  onClose,
  previewData,
  onConfirm,
  onReject,
  isProcessing = false
}) => {
  const [extractedData, setExtractedData] = useState<ExtractedJobData>(
    previewData.extractedData || {
      title: null,
      company: null,
      location: null,
      description: null,
      salary: null,
      jobType: null,
      postedAt: null,
      jobId: null,
      contactDetails: null,
      originalSource: previewData.url
    }
  );

  const [editedFields, setEditedFields] = useState<Set<keyof ExtractedJobData>>(new Set());
  const [userNotes, setUserNotes] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Reset state when modal opens with new data
  useEffect(() => {
    if (isOpen && previewData.extractedData) {
      setExtractedData({ ...previewData.extractedData });
      setEditedFields(new Set());
      setUserNotes('');
      setHasUnsavedChanges(false);
    }
  }, [isOpen, previewData]);

  const handleFieldEdit = (field: keyof ExtractedJobData, value: string) => {
    setExtractedData(prev => ({ ...prev, [field]: value }));
    setEditedFields(prev => new Set(prev).add(field));
    setHasUnsavedChanges(true);
  };

  const handleConfirm = () => {
    const confirmation: ParsedJobConfirmation = {
      url: previewData.url,
      extractedData,
      confidence: previewData.confidence,
      userConfirmed: true,
      editedFields: Object.fromEntries(
        Array.from(editedFields).map(field => [field, extractedData[field]])
      ),
      userNotes: userNotes.trim() || undefined
    };

    onConfirm(confirmation);
  };

  const handleReject = () => {
    onReject();
  };

  const handleReset = () => {
    if (previewData.extractedData) {
      setExtractedData({ ...previewData.extractedData });
      setEditedFields(new Set());
      setHasUnsavedChanges(false);
    }
  };

  const getRecommendationUI = () => {
    const { recommendedAction, confidence, duplicateCheck } = previewData;

    switch (recommendedAction) {
      case 'auto_proceed':
        return {
          icon: <Check className="h-5 w-5 text-green-600" />,
          title: 'High Confidence Extraction',
          message: 'The extracted data appears accurate and complete. You can proceed with analysis.',
          color: 'green',
          showConfirmButton: true,
          autoConfirmable: true
        };

      case 'user_confirm':
        return {
          icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
          title: 'Please Review Extracted Data',
          message: 'Some fields have lower confidence. Please review and edit as needed.',
          color: 'yellow',
          showConfirmButton: true,
          autoConfirmable: false
        };

      case 'duplicate_found':
        return {
          icon: <AlertTriangle className="h-5 w-5 text-orange-600" />,
          title: 'Similar Job Found',
          message: `A ${Math.round((duplicateCheck?.matchingScore || 0) * 100)}% similar job was found. This might be a duplicate.`,
          color: 'orange',
          showConfirmButton: true,
          autoConfirmable: false
        };

      case 'manual_entry':
      default:
        return {
          icon: <X className="h-5 w-5 text-red-600" />,
          title: 'Low Confidence Extraction',
          message: 'Automatic extraction was not reliable. Please enter job details manually.',
          color: 'red',
          showConfirmButton: false,
          autoConfirmable: false
        };
    }
  };

  const recommendationUI = getRecommendationUI();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              {recommendationUI.icon}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {recommendationUI.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {recommendationUI.message}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {hasUnsavedChanges && (
                <span className="px-2 py-1 text-xs font-medium text-orange-700 bg-orange-100 rounded-full">
                  Unsaved changes
                </span>
              )}
              
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                disabled={isProcessing}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-96 overflow-y-auto">
            <ParsedJobDisplay
              previewData={previewData}
              onEdit={handleFieldEdit}
              isEditable={true}
            />

            {/* Duplicate warning */}
            {previewData.duplicateCheck?.isDuplicate && (
              <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-orange-800">
                      Potential Duplicate Detected
                    </h4>
                    <p className="text-sm text-orange-700 mt-1">
                      {previewData.duplicateCheck.matchingFactors.join(', ')}
                    </p>
                    {previewData.duplicateCheck.matchedJobId && (
                      <p className="text-xs text-orange-600 mt-2">
                        Matched Job ID: {previewData.duplicateCheck.matchedJobId}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* User notes */}
            <div className="mt-6">
              <label htmlFor="userNotes" className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                id="userNotes"
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add any corrections, concerns, or additional context..."
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              {/* Reset button */}
              {hasUnsavedChanges && (
                <button
                  onClick={handleReset}
                  disabled={isProcessing}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Changes
                </button>
              )}

              {/* Processing indicator */}
              {isProcessing && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {/* Manual entry button */}
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Use Manual Entry
              </button>

              {/* Confirm button */}
              {recommendationUI.showConfirmButton && (
                <button
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    recommendationUI.color === 'green'
                      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                      : recommendationUI.color === 'yellow'
                      ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                      : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  }`}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  
                  {previewData.duplicateCheck?.isDuplicate 
                    ? 'Proceed Anyway'
                    : 'Confirm & Analyze'
                  }
                </button>
              )}
            </div>
          </div>

          {/* Extraction metadata */}
          <div className="px-6 py-3 bg-gray-100 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center space-x-4">
                <span>Method: {previewData.extractionMethod}</span>
                <span>Platform: {previewData.metadata?.platform}</span>
                <span>Processing: {previewData.processingTimeMs}ms</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span>Confidence: {Math.round(previewData.confidence * 100)}%</span>
                {editedFields.size > 0 && (
                  <span className="text-orange-600">
                    {editedFields.size} field{editedFields.size !== 1 ? 's' : ''} edited
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};