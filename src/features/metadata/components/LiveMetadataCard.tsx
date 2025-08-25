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