// Live Metadata Display Store
// Phase 1: Core Infrastructure - Zustand Store

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { JobMetadata, MetadataUpdateEvent, ExtractionStep, FieldConfidence, DEFAULT_EXTRACTION_STEPS } from '../types/metadata.types';

interface MetadataState {
  // Core state
  isCardVisible: boolean;
  currentMetadata: JobMetadata | null;
  isExtracting: boolean;
  extractionProgress: number;
  
  // Field-specific state
  fieldConfidences: Record<keyof JobMetadata, FieldConfidence | null>;
  extractionSteps: ExtractionStep[];
  
  // UI state
  isEditing: Record<keyof JobMetadata, boolean>;
  errors: Record<keyof JobMetadata, string | null>;
  
  // Loop prevention
  isUpdating: boolean;
  
  // Actions
  setCardVisible: (visible: boolean) => void;
  updateMetadata: (field: keyof JobMetadata, value: any, confidence?: FieldConfidence) => void;
  resetMetadata: () => void;
  startExtraction: (url?: string) => void;
  updateExtractionProgress: (progress: number) => void;
  updateExtractionStep: (stepId: string, updates: Partial<ExtractionStep>) => void;
  setFieldEditing: (field: keyof JobMetadata, editing: boolean) => void;
  setFieldError: (field: keyof JobMetadata, error: string | null) => void;
  setFieldConfidence: (field: keyof JobMetadata, confidence: FieldConfidence) => void;
}

// Create initial metadata object
const createEmptyMetadata = (): JobMetadata => ({
  title: null,
  company: null,
  location: null,
  postedDate: null,
  source: null,
  description: null,
  lastUpdated: new Date(),
  extractionProgress: 0
});

// Create initial field confidences
const createEmptyConfidences = (): Record<keyof JobMetadata, FieldConfidence | null> => ({
  title: null,
  company: null,
  location: null,
  postedDate: null,
  source: null,
  description: null,
  lastUpdated: null,
  extractionProgress: null,
  error: null,
  warnings: null,
  platform: null
});

// Create initial editing state
const createEmptyEditingState = (): Record<keyof JobMetadata, boolean> => ({
  title: false,
  company: false,
  location: false,
  postedDate: false,
  source: false,
  description: false,
  lastUpdated: false,
  extractionProgress: false,
  error: false,
  warnings: false,
  platform: false
});

// Create initial error state
const createEmptyErrorState = (): Record<keyof JobMetadata, string | null> => ({
  title: null,
  company: null,
  location: null,
  postedDate: null,
  source: null,
  description: null,
  lastUpdated: null,
  extractionProgress: null,
  error: null,
  warnings: null,
  platform: null
});

export const useMetadataStore = create<MetadataState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    isCardVisible: false,
    currentMetadata: null,
    isExtracting: false,
    extractionProgress: 0,
    fieldConfidences: createEmptyConfidences(),
    extractionSteps: [...DEFAULT_EXTRACTION_STEPS],
    isEditing: createEmptyEditingState(),
    errors: createEmptyErrorState(),
    isUpdating: false,

    // Actions
    setCardVisible: (visible: boolean) => {
      set({ isCardVisible: visible });
      
      // If hiding card, also reset extraction state
      if (!visible) {
        set({
          isExtracting: false,
          extractionProgress: 0,
          extractionSteps: [...DEFAULT_EXTRACTION_STEPS]
        });
      }
    },

    updateMetadata: (field: keyof JobMetadata, value: any, confidence?: FieldConfidence) => {
      try {
        // Defensive validation
        if (!field || typeof field !== 'string') {
          console.warn('Invalid field passed to updateMetadata:', field);
          return;
        }

        // Prevent infinite loops by checking if we're already updating
        const state = get();
        if (state.isUpdating) {
          console.warn('UpdateMetadata blocked: already updating to prevent infinite loop');
          return;
        }

        // Set updating flag to prevent recursion
        set({ isUpdating: true });

        const currentMetadata = state.currentMetadata || createEmptyMetadata();
        
        // Check if value actually changed to prevent unnecessary updates
        if (currentMetadata[field] === value) {
          set({ isUpdating: false });
          return;
        }
        
        // Calculate overall progress based on filled fields
        const fields = ['title', 'company', 'location'] as (keyof JobMetadata)[];
        const filledFields = fields.filter(f => 
          f === field ? value : currentMetadata[f]
        ).length;
        const progress = Math.round((filledFields / fields.length) * 100);
        
        const updatedMetadata: JobMetadata = {
          ...currentMetadata,
          [field]: value,
          lastUpdated: new Date(),
          extractionProgress: progress
        };

        set({
          currentMetadata: updatedMetadata,
          fieldConfidences: confidence ? {
            ...state.fieldConfidences,
            [field]: confidence
          } : state.fieldConfidences,
          errors: {
            ...state.errors,
            [field]: null // Clear error when field is updated
          },
          isUpdating: false // Clear the updating flag
        });

        // Emit update event for external listeners (only in browser)
        // DO NOT emit if this might cause recursion
        if (typeof window !== 'undefined' && !(window as any).metadataUpdateInProgress) {
          try {
            (window as any).metadataUpdateInProgress = true;
            
            const event: MetadataUpdateEvent = {
              field,
              value,
              confidence: confidence || {
                value: 0.5,
                source: 'user',
                lastValidated: new Date(),
                validationMethod: 'manual'
              },
              timestamp: new Date()
            };
            
            // Custom event for external integration
            window.dispatchEvent(new CustomEvent('metadataUpdated', { detail: event }));
          } finally {
            // Always clear the flag
            setTimeout(() => {
              delete (window as any).metadataUpdateInProgress;
            }, 100);
          }
        }
      } catch (error) {
        // Always clear the updating flag on error
        set({ isUpdating: false });
        console.error('Error in updateMetadata (loop prevented):', error);
        // Don't crash the app, just log the error
      }
    },

    resetMetadata: () => {
      set({
        currentMetadata: createEmptyMetadata(),
        fieldConfidences: createEmptyConfidences(),
        isEditing: createEmptyEditingState(),
        errors: createEmptyErrorState(),
        extractionProgress: 0,
        extractionSteps: [...DEFAULT_EXTRACTION_STEPS]
      });
    },

    startExtraction: (url?: string) => {
      const metadata = createEmptyMetadata();
      if (url) {
        metadata.source = url;
      }

      set({
        isExtracting: true,
        extractionProgress: 0,
        currentMetadata: metadata,
        extractionSteps: [...DEFAULT_EXTRACTION_STEPS],
        isCardVisible: true
      });
    },

    updateExtractionProgress: (progress: number) => {
      set({ extractionProgress: Math.max(0, Math.min(100, progress)) });
    },

    updateExtractionStep: (stepId: string, updates: Partial<ExtractionStep>) => {
      set((state) => ({
        extractionSteps: state.extractionSteps.map(step =>
          step.id === stepId ? { ...step, ...updates } : step
        )
      }));

      // Auto-calculate overall progress from steps
      const steps = get().extractionSteps;
      const totalProgress = steps.reduce((sum, step) => sum + step.progress, 0) / steps.length;
      get().updateExtractionProgress(totalProgress);
    },

    setFieldEditing: (field: keyof JobMetadata, editing: boolean) => {
      set((state) => ({
        isEditing: {
          ...state.isEditing,
          [field]: editing
        }
      }));
    },

    setFieldError: (field: keyof JobMetadata, error: string | null) => {
      set((state) => ({
        errors: {
          ...state.errors,
          [field]: error
        }
      }));
    },

    setFieldConfidence: (field: keyof JobMetadata, confidence: FieldConfidence) => {
      set((state) => ({
        fieldConfidences: {
          ...state.fieldConfidences,
          [field]: confidence
        }
      }));
    }
  }))
);

// Hooks for specific data
export const useMetadataCard = () => {
  const { isCardVisible, setCardVisible } = useMetadataStore();
  return { isCardVisible, setCardVisible };
};

export const useMetadataFields = () => {
  const { currentMetadata, fieldConfidences, isEditing, errors } = useMetadataStore();
  return { currentMetadata, fieldConfidences, isEditing, errors };
};

export const useMetadataExtraction = () => {
  const { 
    isExtracting, 
    extractionProgress, 
    extractionSteps, 
    startExtraction, 
    updateExtractionStep 
  } = useMetadataStore();
  
  return { 
    isExtracting, 
    extractionProgress, 
    extractionSteps, 
    startExtraction, 
    updateExtractionStep 
  };
};

// Selector hooks for performance
export const useCurrentMetadata = () => useMetadataStore((state) => state.currentMetadata);
export const useIsCardVisible = () => useMetadataStore((state) => state.isCardVisible);
export const useExtractionProgress = () => useMetadataStore((state) => state.extractionProgress);