// Live Metadata Display - Demo Component for Testing
// Phase 1: Core Infrastructure

import React, { useState } from 'react';
import { 
  LiveMetadataCard, 
  MetadataToggle, 
  useMetadataStore, 
  useMetadataUpdates 
} from './components';

const MetadataDemo: React.FC = () => {
  const { 
    isCardVisible, 
    setCardVisible, 
    currentMetadata,
    resetMetadata 
  } = useMetadataStore();
  
  const { simulateExtraction, isExtracting } = useMetadataUpdates();
  const [showDemo, setShowDemo] = useState(false);

  const handleToggleCard = () => {
    setCardVisible(!isCardVisible);
  };

  const handleCloseCard = () => {
    setCardVisible(false);
  };

  const handleStartDemo = () => {
    resetMetadata();
    simulateExtraction();
  };

  if (!showDemo) {
    return (
      <div className="metadata-demo-trigger">
        <button
          onClick={() => setShowDemo(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          type="button"
        >
          <span>🔍</span>
          <span>Demo Live Metadata</span>
        </button>
      </div>
    );
  }

  return (
    <div className="metadata-demo-container">
      {/* Demo Controls */}
      <div className="flex items-center space-x-4 mb-4">
        <MetadataToggle
          isVisible={isCardVisible}
          onToggle={handleToggleCard}
          hasData={Boolean(currentMetadata)}
        />
        
        <button
          onClick={handleStartDemo}
          disabled={isExtracting}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
          type="button"
        >
          {isExtracting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Extracting...</span>
            </>
          ) : (
            <>
              <span>▶️</span>
              <span>Start Extraction</span>
            </>
          )}
        </button>

        <button
          onClick={() => setShowDemo(false)}
          className="text-gray-600 hover:text-gray-800 px-2 py-1"
          type="button"
        >
          Hide Demo
        </button>
      </div>

      {/* Demo Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          Live Metadata Display Demo
        </h4>
        <p className="text-blue-700 dark:text-blue-300 text-sm">
          This demonstrates real-time job metadata extraction and display. 
          Click "Start Extraction" to see the live metadata card populate with simulated data.
        </p>
        
        {currentMetadata && (
          <div className="mt-3 text-xs text-blue-600 dark:text-blue-400">
            <strong>Current Data:</strong> {JSON.stringify(currentMetadata, null, 2)}
          </div>
        )}
      </div>

      {/* Metadata Card */}
      <LiveMetadataCard
        isVisible={isCardVisible}
        metadata={currentMetadata}
        isLoading={isExtracting}
        onClose={handleCloseCard}
      />
    </div>
  );
};

export default MetadataDemo;