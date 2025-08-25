// Live Metadata Display - Integration Component
// Phase 1: Core Infrastructure - Integrates with existing JobAnalysisDashboard

import React, { useEffect } from 'react';
import { 
  LiveMetadataCard, 
  MetadataToggle, 
  useMetadataStore, 
  useAnalysisIntegration
} from './components';
import { MetadataErrorBoundary } from './components/ErrorBoundary';

interface MetadataIntegrationProps {
  isAnalyzing: boolean;
  currentJobUrl?: string;
  analysisResult?: any;
  className?: string;
}

const MetadataIntegration: React.FC<MetadataIntegrationProps> = ({
  isAnalyzing,
  currentJobUrl,
  analysisResult,
  className = ''
}) => {
  const { 
    isCardVisible, 
    setCardVisible, 
    currentMetadata 
  } = useMetadataStore();
  
  const {
    onAnalysisStart,
    onWebLLMUpdate,
    onAnalysisComplete
  } = useAnalysisIntegration();

  // Handle analysis lifecycle
  useEffect(() => {
    if (isAnalyzing && currentJobUrl) {
      // Analysis started
      onAnalysisStart(currentJobUrl);
    }
  }, [isAnalyzing, currentJobUrl, onAnalysisStart]);

  // Handle analysis completion
  useEffect(() => {
    if (!isAnalyzing && analysisResult && currentMetadata) {
      // Analysis completed - update with final results
      if (analysisResult.title) {
        onWebLLMUpdate('title', analysisResult.title, 0.95);
      }
      if (analysisResult.company) {
        onWebLLMUpdate('company', analysisResult.company, 0.95);
      }
      if (analysisResult.location) {
        onWebLLMUpdate('location', analysisResult.location, 0.9);
      }
      
      onAnalysisComplete();
    }
  }, [isAnalyzing, analysisResult, currentMetadata, onWebLLMUpdate, onAnalysisComplete]);

  const handleToggleCard = () => {
    setCardVisible(!isCardVisible);
  };

  const handleCloseCard = () => {
    setCardVisible(false);
  };

  return (
    <MetadataErrorBoundary>
      <div className={`metadata-integration ${className}`}>
        {/* Toggle Button */}
        <div className="mb-4">
          <MetadataToggle
            isVisible={isCardVisible}
            onToggle={handleToggleCard}
            hasData={Boolean(currentMetadata)}
          />
        </div>

        {/* Metadata Card */}
        <LiveMetadataCard
          isVisible={isCardVisible}
          metadata={currentMetadata}
          isLoading={isAnalyzing}
          onClose={handleCloseCard}
          onFieldUpdate={(field, value) => {
            // Handle user edits - will be implemented in Phase 2
            console.log(`Field ${field} updated to:`, value);
          }}
        />
      </div>
    </MetadataErrorBoundary>
  );
};

export default MetadataIntegration;