// Live Metadata Display - Metadata Field Component
// Phase 1: Core Infrastructure

import React, { useState } from 'react';
import { MetadataFieldProps } from '../types/metadata.types';

const MetadataField: React.FC<MetadataFieldProps> = ({
  field,
  value,
  confidence,
  isLoading,
  onUpdate,
  isEditable = false,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getConfidenceColor = (conf?: { value: number }) => {
    if (!conf) return 'text-gray-400';
    
    if (conf.value >= 0.9) return 'text-green-600';
    if (conf.value >= 0.7) return 'text-yellow-600';
    if (conf.value >= 0.5) return 'text-orange-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (conf?: { value: number }) => {
    if (!conf) return '○';
    
    if (conf.value >= 0.9) return '●';
    if (conf.value >= 0.7) return '◐';
    if (conf.value >= 0.5) return '◑';
    return '◒';
  };

  const displayValue = value || field.placeholder;
  const hasValue = Boolean(value);

  return (
    <div 
      className={`metadata-field ${className} ${isEditable ? 'cursor-pointer' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => isEditable && onUpdate && onUpdate('')}
    >
      <div className="flex items-center space-x-2">
        {/* Field Icon */}
        <span className="text-lg" role="img" aria-label={field.label}>
          {field.icon}
        </span>
        
        {/* Field Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              {field.label}
            </span>
            
            {/* Confidence Indicator */}
            {confidence && (
              <div 
                className={`text-xs ${getConfidenceColor(confidence)}`}
                title={`Confidence: ${Math.round(confidence.value * 100)}% (${confidence.source})`}
              >
                {getConfidenceIcon(confidence)}
              </div>
            )}
          </div>
          
          {/* Field Value */}
          <div className={`text-sm mt-1 ${hasValue ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 italic'}`}>
            {isLoading ? (
              <div className="loading-shimmer">
                <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-4 rounded w-3/4"></div>
              </div>
            ) : (
              <div className="relative">
                <span className={`${hasValue ? '' : 'opacity-60'}`}>
                  {displayValue}
                </span>
                
                {/* Edit Hint */}
                {isEditable && isHovered && (
                  <span className="absolute right-0 top-0 text-xs text-blue-600 dark:text-blue-400">
                    Click to edit
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Source Attribution */}
          {confidence && confidence.source !== 'user' && (
            <div className="text-xs text-gray-400 mt-1">
              from {confidence.source}
            </div>
          )}
        </div>
      </div>
      
      {/* Field Border */}
      <div className={`mt-2 h-px bg-gradient-to-r ${
        hasValue 
          ? 'from-blue-500 to-transparent' 
          : 'from-gray-300 dark:from-gray-600 to-transparent'
      }`} />
    </div>
  );
};

export default MetadataField;