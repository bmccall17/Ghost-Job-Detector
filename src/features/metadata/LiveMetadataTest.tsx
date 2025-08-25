// Live Metadata Display - Test Component
// Phase 1: Core Infrastructure - Verification

import React, { useState } from 'react';
import MetadataDemo from './MetadataDemo';
import MetadataIntegration from './MetadataIntegration';
import { useMetadataStore } from './stores/metadataStore';

const LiveMetadataTest: React.FC = () => {
  const [testMode, setTestMode] = useState<'demo' | 'integration'>('demo');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { currentMetadata, isCardVisible } = useMetadataStore();

  const simulateAnalysis = () => {
    setIsAnalyzing(true);
    
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 3000);
  };

  return (
    <div className="live-metadata-test p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            🔍 Live Metadata Display - Phase 1 Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Testing the core infrastructure for real-time job metadata display
          </p>
        </div>

        {/* Test Mode Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Test Mode
          </h2>
          
          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => setTestMode('demo')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                testMode === 'demo'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Demo Mode
            </button>
            
            <button
              onClick={() => setTestMode('integration')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                testMode === 'integration'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Integration Mode
            </button>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            {testMode === 'demo' 
              ? 'Demo mode shows the standalone metadata display with simulated data extraction.'
              : 'Integration mode shows how the metadata display integrates with job analysis workflow.'
            }
          </p>
        </div>

        {/* Status Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Current State
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Card Visible:</span>
              <span className={`ml-2 px-2 py-1 text-xs rounded ${
                isCardVisible 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              }`}>
                {isCardVisible ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Has Data:</span>
              <span className={`ml-2 px-2 py-1 text-xs rounded ${
                currentMetadata 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              }`}>
                {currentMetadata ? 'Yes' : 'No'}
              </span>
            </div>
          </div>

          {currentMetadata && (
            <div className="mt-4">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Metadata:</span>
              <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-auto">
                {JSON.stringify(currentMetadata, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Test Component */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          {testMode === 'demo' ? (
            <MetadataDemo />
          ) : (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Integration Test
              </h2>
              
              <button
                onClick={simulateAnalysis}
                className="mb-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                disabled={isAnalyzing}
              >
                {isAnalyzing ? 'Analyzing...' : 'Simulate Job Analysis'}
              </button>
              
              <MetadataIntegration
                isAnalyzing={isAnalyzing}
                currentJobUrl="https://example.com/job/123"
                analysisResult={isAnalyzing ? null : {
                  title: 'Software Engineer',
                  company: 'Test Company',
                  location: 'San Francisco, CA'
                }}
              />
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mt-6">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            📋 Phase 1 Test Instructions
          </h2>
          
          <ol className="list-decimal list-inside space-y-2 text-blue-800 dark:text-blue-200 text-sm">
            <li>Use the "Demo Mode" to test the standalone metadata card functionality</li>
            <li>Click "Start Extraction" to see real-time field population</li>
            <li>Test the "Show/Hide Metadata" toggle functionality</li>
            <li>Switch to "Integration Mode" to test workflow integration</li>
            <li>Verify the metadata card appears during simulated analysis</li>
            <li>Check responsive design by resizing the browser window</li>
            <li>Test dark/light theme compatibility</li>
          </ol>

          <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-800/50 rounded">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Phase 1 Features:</strong> Basic metadata card, real-time updates, 
              responsive design, Zustand state management, and API integration preparation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMetadataTest;