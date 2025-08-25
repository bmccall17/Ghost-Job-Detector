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
      {/* Card Container - Enhanced Mobile Responsive */}
      <div 
        className={`
          /* Desktop positioning */
          fixed top-4 right-4 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 transform transition-all duration-300 ease-out
          
          /* Mobile responsive overrides */
          sm:top-4 sm:right-4 sm:w-96 sm:max-w-[calc(100vw-2rem)] sm:rounded-lg sm:bottom-auto sm:left-auto sm:translate-y-0
          
          /* Mobile: slide up from bottom */
          max-sm:fixed max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:w-full max-sm:max-w-none max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:shadow-2xl
          ${isVisible 
            ? 'translate-x-0 opacity-100 scale-100 max-sm:translate-y-0' 
            : 'translate-x-full opacity-0 scale-95 max-sm:translate-y-full max-sm:translate-x-0'
          }
        `}
        style={{ 
          maxHeight: 'calc(100vh - 2rem)',
          // Mobile: Allow up to 70% of screen height
          ...(window.innerWidth < 640 ? { maxHeight: '70vh' } : {})
        }}
      >
        {/* Header with Mobile Drag Handle */}
        <div className="relative">
          {/* Mobile: Drag handle indicator */}
          <div className="sm:hidden flex justify-center pt-2 pb-1">
            <div className="w-8 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          </div>
          
          <div className="flex items-center justify-between p-4 pb-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                  Live Job Metadata
                </h3>
                
                {/* Status indicator */}
                <div className={`w-2 h-2 rounded-full ${
                  isExtracting 
                    ? 'bg-blue-500 animate-pulse' 
                    : metadata 
                      ? 'bg-green-500' 
                      : 'bg-gray-400'
                }`} />
              </div>
              
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {isExtracting ? 'Extracting data...' : extractionProgress > 0 && extractionProgress < 100 ? `Progress: ${extractionProgress}%` : 'Real-time analysis'}
                </p>
                
                {/* Quick stats */}
                {!isExtracting && metadata && (
                  <span className="text-xs text-gray-400">
                    {Object.values(metadata).filter(v => v && typeof v === 'string' && v.trim().length > 0).length} fields
                  </span>
                )}
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center space-x-2 ml-3">
              {/* Minimize button (mobile) */}
              <button
                onClick={() => {
                  // Could implement minimize functionality
                  console.log('Minimize requested');
                }}
                className="sm:hidden p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation"
                title="Minimize"
                type="button"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              
              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation"
                title="Close metadata card"
                type="button"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content - Enhanced Mobile Scrolling */}
        <div className="flex-1 overflow-hidden">
          <div className="p-4 h-full overflow-y-auto overscroll-contain touch-pan-y" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {/* Progress Indicator */}
            {(isExtracting || extractionProgress > 0) && (
              <div className="mb-4 sticky top-0 bg-white dark:bg-gray-800 z-10 pb-2 -mt-4 pt-4">
                <ProgressIndicator 
                  progress={extractionProgress}
                  steps={extractionSteps}
                />
              </div>
            )}

            {/* Metadata Fields */}
            <div className="space-y-3 pb-4">
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

            {/* Enhanced Error State with Recovery Options */}
            {!isLoading && !isExtracting && metadata?.error && (
              <div className="border border-red-200 dark:border-red-700 rounded-lg p-4 bg-red-50 dark:bg-red-900/20 mb-4">
                <div className="flex items-start space-x-3">
                  <div className="text-red-500 dark:text-red-400 text-xl flex-shrink-0">⚠️</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                          Metadata Extraction Failed
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                          {typeof metadata.error === 'string' ? metadata.error : 'Unknown error occurred'}
                        </p>
                      </div>
                      
                      {/* Error actions */}
                      <div className="flex flex-col space-y-1 ml-2">
                        <button
                          onClick={() => {
                            // Retry with different strategy
                            console.log('Retry extraction requested');
                            // Could trigger useAnalysisIntegration retry logic
                          }}
                          className="text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors touch-manipulation"
                          title="Retry metadata extraction"
                        >
                          🔄 Retry
                        </button>
                        
                        <button
                          onClick={() => {
                            // Manual entry mode
                            console.log('Manual entry mode requested');
                            // Could enable all fields for manual editing
                          }}
                          className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors touch-manipulation"
                          title="Enter data manually"
                        >
                          ✏️ Manual
                        </button>
                      </div>
                    </div>
                    
                    {/* Error details (collapsible) */}
                    <details className="mt-2">
                      <summary className="text-xs text-red-500 dark:text-red-400 cursor-pointer hover:text-red-700 dark:hover:text-red-300">
                        Technical Details
                      </summary>
                      <div className="mt-1 p-2 bg-red-100 dark:bg-red-800/30 rounded text-xs font-mono text-red-700 dark:text-red-300 overflow-x-auto">
                        Error Type: {metadata.error instanceof Error ? metadata.error.name : 'NetworkError'}<br/>
                        Message: {typeof metadata.error === 'string' ? metadata.error : metadata.error?.message || 'Unknown'}<br/>
                        Time: {new Date().toLocaleTimeString()}<br/>
                        Platform: {metadata.platform || 'Unknown'}
                      </div>
                    </details>
                    
                    {/* Common solutions */}
                    <div className="mt-2 text-xs text-red-600 dark:text-red-300">
                      <p className="font-medium">Common solutions:</p>
                      <ul className="list-disc list-inside mt-1 space-y-0.5 text-red-500 dark:text-red-400">
                        <li>Check your internet connection</li>
                        <li>Try a different job URL</li>
                        <li>Enter job details manually</li>
                        <li>Contact support if problem persists</li>
                      </ul>
                    </div>
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
        </div>

        {/* Enhanced Footer */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 sm:rounded-b-lg">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            {/* Left: Last updated */}
            <div className="flex items-center space-x-2">
              <span className="truncate">
                {metadata?.lastUpdated 
                  ? `Updated ${metadata.lastUpdated.toLocaleTimeString()}`
                  : isExtracting 
                    ? 'Updating...'
                    : 'No updates yet'
                }
              </span>
            </div>
            
            {/* Right: Status and actions */}
            <div className="flex items-center space-x-3">
              {/* Confidence summary */}
              {fieldConfidences && Object.keys(fieldConfidences).length > 0 && (
                <span className="hidden sm:inline text-xs">
                  Avg: {Math.round(
                    Object.values(fieldConfidences).reduce((sum, conf) => sum + (conf?.value || 0), 0) 
                    / Object.keys(fieldConfidences).length * 100
                  )}%
                </span>
              )}
              
              {/* Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  isExtracting 
                    ? 'bg-blue-500 animate-pulse' 
                    : metadata 
                      ? 'bg-green-500' 
                      : 'bg-gray-400'
                }`} />
                <span className="font-medium">
                  {isExtracting ? 'Extracting' : metadata ? 'Ready' : 'Idle'}
                </span>
              </div>

              {/* Quick action: Edit all */}
              {!isExtracting && metadata && (
                <button
                  onClick={() => {
                    console.log('Edit all fields requested');
                    // Could enable editing for all fields
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                  title="Edit all fields"
                >
                  ✏️
                </button>
              )}
            </div>
          </div>
          
          {/* Mobile: Swipe hint */}
          <div className="sm:hidden text-center mt-2 text-xs text-gray-400">
            Swipe down to close
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMetadataCard;