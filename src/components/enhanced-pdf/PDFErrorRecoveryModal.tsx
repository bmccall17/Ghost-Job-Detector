/**
 * PDF Error Recovery Modal - User-friendly error handling with fallback options
 * Provides multiple recovery paths when PDF parsing fails or produces low-quality data
 */

import React, { useState } from 'react';
import { X, AlertTriangle, Upload, Edit3, Link, SkipForward, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { EnhancedPDFJobData, FallbackOption } from '../../services/parsing/EnhancedPDFParsingService';
import { ValidationError, ValidationWarning, DataQualityStatus } from '../../services/validation/DataIntegrityValidator';

interface PDFErrorRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  parsingResult: EnhancedPDFJobData;
  onRetryUpload: () => void;
  onManualInput: (field?: string) => void;
  onURLInput: () => void;
  onProceedWithPartialData: () => void;
  onSkip: () => void;
}

export const PDFErrorRecoveryModal: React.FC<PDFErrorRecoveryModalProps> = ({
  isOpen,
  onClose,
  parsingResult,
  onRetryUpload,
  onManualInput,
  onURLInput,
  onProceedWithPartialData,
  onSkip
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen) return null;

  const { validationResult, requiredActions, fallbackOptions, isAnalyzable } = parsingResult;
  
  const getStatusIcon = () => {
    if (isAnalyzable) return <CheckCircle className="w-6 h-6 text-green-500" />;
    if (validationResult.dataQualityStatus === DataQualityStatus.PLACEHOLDER) {
      return <AlertTriangle className="w-6 h-6 text-red-500" />;
    }
    return <AlertCircle className="w-6 h-6 text-yellow-500" />;
  };

  const getStatusMessage = () => {
    if (isAnalyzable) {
      return "PDF processed successfully with some warnings";
    }
    
    switch (validationResult.dataQualityStatus) {
      case DataQualityStatus.PLACEHOLDER:
        return "PDF parsing produced placeholder data";
      case DataQualityStatus.FAILED_PARSING:
        return "PDF parsing failed completely";
      case DataQualityStatus.SUSPECT:
        return "PDF data quality is below acceptable threshold";
      case DataQualityStatus.MANUAL_REVIEW:
        return "PDF data requires manual review";
      default:
        return "PDF processing encountered issues";
    }
  };

  const getStatusColor = () => {
    if (isAnalyzable) return "text-green-700 bg-green-50 border-green-200";
    if (validationResult.dataQualityStatus === DataQualityStatus.PLACEHOLDER) {
      return "text-red-700 bg-red-50 border-red-200";
    }
    return "text-yellow-700 bg-yellow-50 border-yellow-200";
  };

  const renderFallbackOption = (option: FallbackOption, index: number) => {
    const isSelected = selectedOption === `option-${index}`;
    
    const getOptionIcon = () => {
      switch (option.type) {
        case 'manual_input':
          return <Edit3 className="w-5 h-5" />;
        case 'retry_upload':
          return <Upload className="w-5 h-5" />;
        case 'url_input':
          return <Link className="w-5 h-5" />;
        case 'skip_field':
          return <SkipForward className="w-5 h-5" />;
        default:
          return <Info className="w-5 h-5" />;
      }
    };

    const getOptionColor = () => {
      switch (option.priority) {
        case 'high':
          return isSelected ? 'border-blue-500 bg-blue-50' : 'border-red-200 hover:border-red-300';
        case 'medium':
          return isSelected ? 'border-blue-500 bg-blue-50' : 'border-yellow-200 hover:border-yellow-300';
        case 'low':
          return isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300';
        default:
          return isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300';
      }
    };

    const getPriorityLabel = () => {
      switch (option.priority) {
        case 'high':
          return <span className="text-red-600 text-xs font-medium">Recommended</span>;
        case 'medium':
          return <span className="text-yellow-600 text-xs font-medium">Suggested</span>;
        case 'low':
          return <span className="text-gray-600 text-xs font-medium">Optional</span>;
        default:
          return null;
      }
    };

    const handleOptionClick = () => {
      setSelectedOption(`option-${index}`);
      
      switch (option.type) {
        case 'manual_input':
          onManualInput(option.field);
          break;
        case 'retry_upload':
          onRetryUpload();
          break;
        case 'url_input':
          onURLInput();
          break;
        case 'skip_field':
          onProceedWithPartialData();
          break;
      }
    };

    return (
      <div
        key={index}
        className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${getOptionColor()}`}
        onClick={handleOptionClick}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            {getOptionIcon()}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">{option.description}</h4>
              {getPriorityLabel()}
            </div>
            <p className="text-sm text-gray-600 mb-2">{option.userMessage}</p>
            {option.field && (
              <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">
                Field: {option.field}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderErrorsList = (errors: ValidationError[]) => {
    if (errors.length === 0) return null;

    return (
      <div className="space-y-2">
        {errors.map((error, index) => (
          <div key={index} className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">{error.userMessage}</p>
              {error.suggestion && (
                <p className="text-xs text-red-600 mt-1">💡 {error.suggestion}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderWarningsList = (warnings: ValidationWarning[]) => {
    if (warnings.length === 0) return null;

    return (
      <div className="space-y-2">
        {warnings.map((warning, index) => (
          <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-yellow-800">{warning.userMessage}</p>
              <span className="text-xs text-yellow-600">Impact: {warning.impact}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              {getStatusIcon()}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  PDF Processing Result
                </h3>
                <p className="text-sm text-gray-600">
                  {parsingResult.parsingMetadata.fileName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Status Summary */}
          <div className={`p-4 rounded-lg border mb-6 ${getStatusColor()}`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">{getStatusMessage()}</h4>
              <div className="text-sm">
                Quality: {(validationResult.qualityScore * 100).toFixed(1)}%
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Confidence:</span> {(parsingResult.confidence.overall * 100).toFixed(1)}%
              </div>
              <div>
                <span className="font-medium">Processing Time:</span> {validationResult.metadata.processingTimeMs}ms
              </div>
            </div>
          </div>

          {/* Required Actions */}
          {requiredActions.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Required Actions</h4>
              <div className="space-y-2">
                {requiredActions.map((action, index) => (
                  <div key={index} className="text-sm text-gray-700 flex items-start space-x-2">
                    <span className="flex-shrink-0 mt-0.5">•</span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recovery Options */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-4">Recovery Options</h4>
            <div className="space-y-3">
              {fallbackOptions.map((option, index) => renderFallbackOption(option, index))}
            </div>
          </div>

          {/* Extracted Data Preview */}
          {(parsingResult.title !== 'PARSING_FAILED' || parsingResult.company !== 'EXTRACTION_ERROR') && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Extracted Data Preview</h4>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                <div>
                  <span className="font-medium">Title:</span> {parsingResult.title}
                  <span className="text-xs text-gray-500 ml-2">
                    (Confidence: {(parsingResult.confidence.title * 100).toFixed(1)}%)
                  </span>
                </div>
                <div>
                  <span className="font-medium">Company:</span> {parsingResult.company}
                  <span className="text-xs text-gray-500 ml-2">
                    (Confidence: {(parsingResult.confidence.company * 100).toFixed(1)}%)
                  </span>
                </div>
                {parsingResult.location && (
                  <div>
                    <span className="font-medium">Location:</span> {parsingResult.location}
                  </div>
                )}
                {parsingResult.sourceUrl && (
                  <div>
                    <span className="font-medium">URL:</span> 
                    <span className="text-blue-600 text-xs ml-2">{parsingResult.sourceUrl}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Detailed Issues (Collapsible) */}
          {(validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
            <div className="mb-6">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
              >
                <span>{showDetails ? 'Hide' : 'Show'} detailed issues</span>
                <span>{showDetails ? '▼' : '▶'}</span>
              </button>
              
              {showDetails && (
                <div className="mt-4 space-y-4">
                  {validationResult.errors.length > 0 && (
                    <div>
                      <h5 className="font-medium text-red-800 mb-2">Errors</h5>
                      {renderErrorsList(validationResult.errors)}
                    </div>
                  )}
                  
                  {validationResult.warnings.length > 0 && (
                    <div>
                      <h5 className="font-medium text-yellow-800 mb-2">Warnings</h5>
                      {renderWarningsList(validationResult.warnings)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={onSkip}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Skip Analysis
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};