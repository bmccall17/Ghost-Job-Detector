// Live Metadata Display - Real-time Updates Hook
// Phase 1: Core Infrastructure

import { useEffect, useCallback, useRef } from 'react';
import { useMetadataStore } from '../stores/metadataStore';
import { JobMetadata, MetadataUpdateEvent, FieldConfidence } from '../types/metadata.types';

interface UseMetadataUpdatesOptions {
  enabled?: boolean;
  onUpdate?: (event: MetadataUpdateEvent) => void;
  pollingInterval?: number; // milliseconds, for polling fallback
}

interface MetadataUpdateHook {
  startExtraction: (url?: string) => void;
  updateField: (field: keyof JobMetadata, value: any, confidence?: FieldConfidence) => void;
  simulateExtraction: () => void; // For testing/demo purposes
  isExtracting: boolean;
}

export const useMetadataUpdates = (options: UseMetadataUpdatesOptions = {}): MetadataUpdateHook => {
  const {
    enabled = true,
    onUpdate
  } = options;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    startExtraction: storeStartExtraction,
    updateMetadata,
    updateExtractionStep,
    isExtracting
  } = useMetadataStore();

  // Handle metadata update events
  const handleMetadataUpdate = useCallback((event: CustomEvent<MetadataUpdateEvent>) => {
    const updateEvent = event.detail;
    
    // Update store
    updateMetadata(
      updateEvent.field, 
      updateEvent.value, 
      updateEvent.confidence
    );
    
    // Call external callback
    if (onUpdate) {
      onUpdate(updateEvent);
    }
  }, [updateMetadata, onUpdate]);

  // Setup event listeners for external updates
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('metadataUpdated', handleMetadataUpdate as EventListener);
    
    return () => {
      window.removeEventListener('metadataUpdated', handleMetadataUpdate as EventListener);
    };
  }, [enabled, handleMetadataUpdate]);

  // Start extraction process
  const startExtraction = useCallback((url?: string) => {
    if (!enabled) return;

    storeStartExtraction(url);
    
    // Simulate step-by-step extraction for demo
    setTimeout(() => updateExtractionStep('fetch', { status: 'active', progress: 0 }), 100);
    setTimeout(() => updateExtractionStep('fetch', { status: 'complete', progress: 100, duration: 200 }), 300);
    setTimeout(() => updateExtractionStep('parse', { status: 'active', progress: 0 }), 400);
    setTimeout(() => updateExtractionStep('parse', { status: 'complete', progress: 100, duration: 150 }), 600);
    setTimeout(() => updateExtractionStep('extract', { status: 'active', progress: 0 }), 700);
    setTimeout(() => updateExtractionStep('extract', { status: 'complete', progress: 100, duration: 300 }), 1000);
    setTimeout(() => updateExtractionStep('validate', { status: 'active', progress: 0 }), 1100);
    setTimeout(() => updateExtractionStep('validate', { status: 'complete', progress: 100, duration: 100 }), 1300);
    setTimeout(() => updateExtractionStep('enhance', { status: 'active', progress: 0 }), 1400);
    setTimeout(() => updateExtractionStep('enhance', { status: 'complete', progress: 100, duration: 250 }), 1700);
  }, [enabled, storeStartExtraction, updateExtractionStep]);

  // Update individual field
  const updateField = useCallback((
    field: keyof JobMetadata, 
    value: any, 
    confidence?: FieldConfidence
  ) => {
    if (!enabled) return;

    const defaultConfidence: FieldConfidence = {
      value: 0.8,
      source: 'user',
      lastValidated: new Date(),
      validationMethod: 'manual_entry'
    };

    updateMetadata(field, value, confidence || defaultConfidence);
  }, [enabled, updateMetadata]);

  // Simulate extraction process for testing
  const simulateExtraction = useCallback(() => {
    if (!enabled || isExtracting) return;

    startExtraction('https://example.com/job/123');

    // Simulate field updates during extraction
    const updates = [
      { field: 'title' as const, value: 'Software Engineer', delay: 500 },
      { field: 'company' as const, value: 'TechCorp Inc.', delay: 800 },
      { field: 'location' as const, value: 'San Francisco, CA', delay: 1200 },
      { field: 'postedDate' as const, value: '2025-01-20', delay: 1500 },
    ];

    updates.forEach(({ field, value, delay }) => {
      setTimeout(() => {
        updateField(field, value, {
          value: Math.random() * 0.3 + 0.7, // Random confidence 0.7-1.0
          source: 'webllm',
          lastValidated: new Date(),
          validationMethod: 'ai_extraction'
        });
      }, delay);
    });
  }, [enabled, isExtracting, startExtraction, updateField]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    startExtraction,
    updateField,
    simulateExtraction,
    isExtracting
  };
};

// Hook for integrating with existing analysis pipeline
export const useAnalysisIntegration = () => {
  const { setCardVisible, resetMetadata, updateMetadata, updateExtractionStep, startExtraction } = useMetadataStore();

  // Real metadata extraction using API streaming
  const startRealMetadataExtraction = useCallback(async (url: string) => {
    try {
      // Start extraction in store
      startExtraction(url);
      
      // Call the real API with metadata streaming
      const response = await fetch('/api/analyze?stream=metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url, 
          stepUpdates: true 
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Stream reader not available');
      }

      const decoder = new TextDecoder();

      // Process streaming response
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              
              if (data.type === 'metadata_update') {
                updateMetadata(data.field as keyof JobMetadata, data.value, data.confidence);
              } else if (data.type === 'step_update') {
                updateExtractionStep(data.step.id, data.step);
              } else if (data.type === 'extraction_complete') {
                console.log('✅ Metadata extraction completed');
              } else if (data.type === 'error') {
                console.error('❌ Metadata extraction error:', data.message);
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Real metadata extraction failed:', error);
      // Fallback to simulation - trigger demo data
      setTimeout(() => {
        updateMetadata('title', 'Software Engineer', {
          value: 0.8,
          source: 'fallback',
          lastValidated: new Date(),
          validationMethod: 'demo_data'
        });
        updateMetadata('company', 'TechCorp Inc.', {
          value: 0.8,
          source: 'fallback',
          lastValidated: new Date(),
          validationMethod: 'demo_data'
        });
      }, 1000);
    }
  }, [startExtraction, updateMetadata, updateExtractionStep]);

  // Called when analysis starts
  const onAnalysisStart = useCallback((url?: string) => {
    resetMetadata();
    setCardVisible(true);
    
    if (url) {
      // Start metadata extraction with real API streaming
      startRealMetadataExtraction(url);
    }
  }, [setCardVisible, resetMetadata, startRealMetadataExtraction]);

  // Called when parsing data is extracted
  const onParsingUpdate = useCallback((field: keyof JobMetadata, value: any, confidence = 0.8) => {
    updateMetadata(field, value, {
      value: confidence,
      source: 'parsing',
      lastValidated: new Date(),
      validationMethod: 'html_extraction'
    });
  }, [updateMetadata]);

  // Called when WebLLM provides enhanced data
  const onWebLLMUpdate = useCallback((field: keyof JobMetadata, value: any, confidence = 0.9) => {
    updateMetadata(field, value, {
      value: confidence,
      source: 'webllm',
      lastValidated: new Date(),
      validationMethod: 'ai_enhancement'
    });
  }, [updateMetadata]);

  // Called when analysis completes
  const onAnalysisComplete = useCallback(() => {
    updateExtractionStep('enhance', { 
      status: 'complete', 
      progress: 100,
      details: 'Analysis complete'
    });
  }, [updateExtractionStep]);

  return {
    onAnalysisStart,
    onParsingUpdate,
    onWebLLMUpdate,
    onAnalysisComplete
  };
};