// Live Metadata Display - Progress Indicator Component
// Phase 1: Core Infrastructure

import React from 'react';
import { ProgressIndicatorProps, ExtractionStep } from '../types/metadata.types';

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  steps = [],
  className = ''
}) => {
  const getStepIcon = (step: ExtractionStep) => {
    switch (step.status) {
      case 'complete':
        return '✓';
      case 'active':
        return '⟳';
      case 'error':
        return '⚠';
      default:
        return '○';
    }
  };

  const getStepColor = (step: ExtractionStep) => {
    switch (step.status) {
      case 'complete':
        return 'text-green-600';
      case 'active':
        return 'text-blue-600 animate-spin';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className={`progress-indicator ${className}`}>
      {/* Overall Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Extraction Progress
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Detailed Steps (if provided) */}
      {steps.length > 0 && (
        <div className="space-y-2">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center space-x-3">
              <div className={`text-sm ${getStepColor(step)}`}>
                {getStepIcon(step)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {step.name}
                </div>
                {step.details && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {step.details}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {step.status === 'complete' && step.duration && (
                  `${step.duration}ms`
                )}
                {step.status === 'active' && (
                  `${step.progress}%`
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;