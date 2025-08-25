// Live Metadata Display - Metadata Toggle Component
// Phase 1: Core Infrastructure

import React from 'react';
import { MetadataToggleProps } from '../types/metadata.types';

const MetadataToggle: React.FC<MetadataToggleProps> = ({
  isVisible,
  onToggle,
  hasData,
  className = ''
}) => {
  return (
    <button
      onClick={onToggle}
      className={`metadata-toggle ${className} inline-flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
        isVisible 
          ? 'bg-blue-600 text-white shadow-lg' 
          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
      }`}
      title={isVisible ? 'Hide metadata card' : 'Show metadata card'}
      type="button"
    >
      {/* Toggle Icon */}
      <svg 
        className={`w-4 h-4 transition-transform duration-200 ${isVisible ? 'rotate-180' : ''}`}
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
      
      {/* Toggle Text */}
      <span className="text-sm font-medium">
        {isVisible ? 'Hide Metadata' : 'Show Metadata'}
      </span>
      
      {/* Data Indicator */}
      {hasData && (
        <div className={`w-2 h-2 rounded-full ${
          isVisible ? 'bg-white' : 'bg-blue-600'
        }`} />
      )}
    </button>
  );
};

export default MetadataToggle;