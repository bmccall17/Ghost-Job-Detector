// Live Metadata Display - Real-time Updates Hook
// Phase 1: Core Infrastructure

import { useEffect, useCallback, useRef } from 'react';
import { useMetadataStore } from '../stores/metadataStore';
import { JobMetadata, MetadataUpdateEvent, FieldConfidence } from '../types/metadata.types';
import { performanceMonitor } from '../utils/performance';

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

  // Real metadata extraction with enhanced loop prevention and retry mechanisms
  const startRealMetadataExtraction = useCallback(async (url: string, attempt: number = 1) => {
    console.log(`🚀 Starting real metadata extraction (attempt ${attempt}/3)`);
    console.log('🔧 Processing URL:', url);
    
    // Loop prevention check
    if (useMetadataStore.getState().isUpdating) {
      console.warn('⚠️ Metadata extraction already in progress, skipping to prevent loops');
      return;
    }
    
    const extractionTimeout = 15000 + (attempt * 5000); // Increase timeout on retry
    const timeoutController = new AbortController();
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      timeoutController.abort();
    }, extractionTimeout);

    try {
      // Start extraction in store and performance monitoring
      startExtraction(url);
      performanceMonitor.startExtraction();
      
      // Call the real API with metadata streaming - include user data for priority
      const response = await fetch('/api/analyze?stream=metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url, 
          stepUpdates: true,
          // Include any existing metadata to preserve user-provided data
          title: useMetadataStore.getState().currentMetadata?.title,
          company: useMetadataStore.getState().currentMetadata?.company,
          location: useMetadataStore.getState().currentMetadata?.location,
          description: useMetadataStore.getState().currentMetadata?.description
        }),
        signal: timeoutController.signal
      });

      if (!response.ok) {
        const errorMsg = `API request failed: ${response.status} ${response.statusText}`;
        
        // Retry logic for certain status codes
        if ((response.status >= 500 || response.status === 429) && attempt < 3) {
          console.warn(`⚠️ ${errorMsg}, retrying in ${attempt * 2}s...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          return startRealMetadataExtraction(url, attempt + 1);
        }
        
        throw new Error(errorMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Stream reader not available');
      }

      const decoder = new TextDecoder();

      // Process streaming response with loop prevention
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              
              // Check if still updating to prevent race conditions
              if (useMetadataStore.getState().isUpdating) {
                console.warn('⚠️ Update blocked during processing to prevent loops');
                continue;
              }
              
              if (data.type === 'metadata_update') {
                // Validate data before updating
                if (data.field && data.value !== undefined) {
                  updateMetadata(data.field as keyof JobMetadata, data.value, data.confidence);
                  performanceMonitor.recordFieldExtraction();
                }
              } else if (data.type === 'step_update') {
                updateExtractionStep(data.step.id, data.step);
              } else if (data.type === 'extraction_complete') {
                console.log('✅ Metadata extraction completed');
                performanceMonitor.completeExtraction();
              } else if (data.type === 'error') {
                console.error('❌ Metadata extraction error:', data.message);
                performanceMonitor.recordError();
                updateMetadata('error', data.message, {
                  value: 1.0,
                  source: 'api_error',
                  lastValidated: new Date(),
                  validationMethod: 'error_handling'
                });
              } else if (data.type === 'extraction_error') {
                console.warn('⚠️ Field extraction warning:', data.field, data.error);
                const currentWarnings = useMetadataStore.getState().currentMetadata?.warnings || [];
                updateMetadata('warnings', [...currentWarnings, `${data.field}: ${data.error}`], {
                  value: 0.5,
                  source: 'extraction_warning',
                  lastValidated: new Date(),
                  validationMethod: 'field_validation'
                });
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Real metadata extraction failed (attempt ${attempt}/3):`, error);
      
      // Handle specific error types and retry logic
      let errorMessage = 'Unknown error occurred';
      let shouldRetry = false;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = `Metadata extraction timed out (${extractionTimeout/1000}s)`;
          shouldRetry = attempt < 3; // Retry on timeout
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = 'Network connection failed';
          shouldRetry = attempt < 3; // Retry on network failure
        } else if (error.message.includes('API request failed: 500') || error.message.includes('API request failed: 502') || error.message.includes('API request failed: 503')) {
          errorMessage = `Server temporarily unavailable`;
          shouldRetry = attempt < 3; // Retry on server errors
        } else if (error.message.includes('API request failed')) {
          errorMessage = `Server error: ${error.message}`;
        } else {
          errorMessage = error.message;
        }
      }

      // Retry logic for recoverable errors
      if (shouldRetry) {
        const retryDelay = Math.min(attempt * 3000, 10000); // Max 10s delay
        console.warn(`⏳ Retrying metadata extraction in ${retryDelay/1000}s...`);
        
        // Update user with retry status using error field for status messages  
        updateMetadata('error', `Retrying extraction (attempt ${attempt + 1}/3)...`, {
          value: 0.5,
          source: 'system_error',
          lastValidated: new Date(),
          validationMethod: 'retry_notification'
        });
        
        setTimeout(() => {
          startRealMetadataExtraction(url, attempt + 1);
        }, retryDelay);
        
        return; // Don't show error yet, we're retrying
      }

      // Final error after all retries failed
      updateMetadata('error', `${errorMessage} (failed after ${attempt} attempts)`, {
        value: 1.0,
        source: 'system_error',
        lastValidated: new Date(),
        validationMethod: 'error_handling'
      });

      // Fallback to simulation after delay
      setTimeout(() => {
        console.log('🔄 Falling back to demo data after extraction failure');
        updateMetadata('title', 'Software Engineer', {
          value: 0.6, // Lower confidence for fallback data
          source: 'fallback',
          lastValidated: new Date(),
          validationMethod: 'demo_data'
        });
        updateMetadata('company', 'TechCorp Inc.', {
          value: 0.6,
          source: 'fallback',
          lastValidated: new Date(),
          validationMethod: 'demo_data'
        });
        
        // Add warning about fallback data
        updateMetadata('warnings', ['Using demo data - real extraction failed'], {
          value: 0.3,
          source: 'fallback_warning',
          lastValidated: new Date(),
          validationMethod: 'fallback_notification'
        });
      }, 1000);
    } finally {
      // Clear timeout
      clearTimeout(timeoutId);
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