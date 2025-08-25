// Live Metadata Display - Main Card Component
// Phase 1: Core Infrastructure

import React, { useEffect, useState } from 'react';
import { LiveMetadataCardProps, METADATA_FIELDS } from '../types/metadata.types';
import { useMetadataStore } from '../stores/metadataStore';
import MetadataField from './MetadataField';
import ProgressIndicator from './ProgressIndicator';

const LiveMetadataCard: React.FC<LiveMetadataCardProps> = ({
  isVisible,
  metadata,
  isLoading,
  onClose,
  onFieldUpdate,
  className = ''
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const { 
    fieldConfidences, 
    extractionProgress, 
    extractionSteps,
    isExtracting,
    updateMetadata,
    setFieldEditing 
  } = useMetadataStore();

  // Handle card visibility animation
  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
    } else {
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const handleFieldUpdate = (fieldKey: string, value: string) => {
    if (onFieldUpdate) {
      onFieldUpdate(fieldKey as keyof import('../types/metadata.types').JobMetadata, value);
    }
    
    // Update store
    updateMetadata(fieldKey as keyof import('../types/metadata.types').JobMetadata, value);
    
    // Clear editing state
    setFieldEditing(fieldKey as keyof import('../types/metadata.types').JobMetadata, false);
  };

  // Don't render if not visible and not animating
  if (!isVisible && !isAnimating) {
    return null;
  }

  return (
    <div className={`live-metadata-card ${className}`}>
      {/* Card Container */}
      <div 
        className={`fixed top-4 right-4 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 transform transition-all duration-300 ease-out ${
          isVisible 
            ? 'translate-x-0 opacity-100 scale-100' 
            : 'translate-x-full opacity-0 scale-95'
        }`}
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Live Job Metadata
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isExtracting ? 'Extracting...' : 'Real-time analysis'}
            </p>
          </div>
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Close metadata card"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {/* Progress Indicator */}
          {(isExtracting || extractionProgress > 0) && (
            <div className="mb-4">
              <ProgressIndicator 
                progress={extractionProgress}
                steps={extractionSteps}
              />
            </div>
          )}

          {/* Metadata Fields */}
          <div className="space-y-4">
            {METADATA_FIELDS.map(field => {
              const fieldValue = metadata?.[field.key] as string | null;
              const fieldConfidence = fieldConfidences[field.key] || undefined;
              const isFieldLoading = isLoading || (isExtracting && !fieldValue);

              return (
                <MetadataField
                  key={field.key}
                  field={field}
                  value={fieldValue || null}
                  confidence={fieldConfidence}
                  isLoading={isFieldLoading}
                  onUpdate={(value) => handleFieldUpdate(field.key, value)}
                  isEditable={!isExtracting}
                />
              );
            })}
          </div>

          {/* Empty State */}
          {!metadata && !isLoading && !isExtracting && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-sm">No metadata available</p>
              <p className="text-xs mt-1">Start a job analysis to see live data</p>
            </div>
          )}

          {/* Error State */}
          {!isLoading && !isExtracting && metadata?.error && (
            <div className="border border-red-200 dark:border-red-700 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-start space-x-2">
                <div className="text-red-500 dark:text-red-400 text-lg">⚠️</div>
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Metadata Extraction Failed
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                    {typeof metadata.error === 'string' ? metadata.error : 'Unknown error occurred'}
                  </p>
                  <button
                    onClick={() => {
                      // Retry extraction functionality could be added here
                      console.log('Retry extraction requested');
                    }}
                    className="mt-2 text-xs px-2 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Warning State */}
          {metadata?.warnings && metadata.warnings.length > 0 && (
            <div className="border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 bg-yellow-50 dark:bg-yellow-900/20 mb-4">
              <div className="flex items-start space-x-2">
                <div className="text-yellow-500 dark:text-yellow-400 text-sm">⚠️</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Extraction Warnings
                  </p>
                  <ul className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 space-y-1">
                    {metadata.warnings.map((warning, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && !metadata && (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    <div className="w-20 h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  </div>
                  <div className="w-full h-4 bg-gray-300 dark:bg-gray-600 rounded ml-8"></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-b-lg border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              {metadata?.lastUpdated 
                ? `Updated ${metadata.lastUpdated.toLocaleTimeString()}`
                : 'No updates yet'
              }
            </span>
            
            {/* Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isExtracting 
                  ? 'bg-blue-500 animate-pulse' 
                  : metadata 
                    ? 'bg-green-500' 
                    : 'bg-gray-400'
              }`} />
              <span>
                {isExtracting ? 'Extracting' : metadata ? 'Ready' : 'Idle'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Responsive CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media (max-width: 640px) {
          .live-metadata-card > div {
            position: fixed !important;
            top: 0 !important;
            right: 0 !important;
            left: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            max-width: none !important;
            height: 100% !important;
            max-height: none !important;
            border-radius: 0 !important;
            z-index: 9999 !important;
          }
          
          .live-metadata-card .max-h-96 {
            max-height: calc(100vh - 140px) !important;
          }
        }
        `
      }} />
    </div>
  );
};

export default LiveMetadataCard;