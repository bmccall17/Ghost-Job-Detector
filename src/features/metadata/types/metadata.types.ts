// Live Metadata Display Types
// Phase 1: Core Infrastructure

export interface JobMetadata {
  title: string | null;
  company: string | null;
  location: string | null;
  postedDate: string | null;
  source: string | null;
  description: string | null;
  lastUpdated: Date;
  extractionProgress: number; // 0-100
  error?: string | Error;
  warnings?: string[];
  platform?: string;
}

export interface MetadataField {
  key: keyof JobMetadata;
  label: string;
  icon: string;
  placeholder: string;
  isRequired: boolean;
  validationRules?: ValidationRule[];
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

export interface FieldConfidence {
  value: number; // 0.0 - 1.0
  source: 'webllm' | 'parsing' | 'user' | 'fallback' | 'cache' | 'api_error' | 'extraction_warning' | 'system_error' | 'fallback_warning';
  lastValidated: Date;
  validationMethod: string;
}

export interface MetadataUpdateEvent {
  field: keyof JobMetadata;
  value: any;
  confidence: FieldConfidence;
  timestamp: Date;
}

export interface ExtractionStep {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  progress: number; // 0-100
  duration?: number; // milliseconds
  details?: string;
}

export interface LiveMetadataCardProps {
  isVisible: boolean;
  metadata: JobMetadata | null;
  isLoading: boolean;
  onClose: () => void;
  onFieldUpdate?: (field: keyof JobMetadata, value: any) => void;
  className?: string;
}

export interface MetadataFieldProps {
  field: MetadataField;
  value: string | null;
  confidence?: FieldConfidence;
  isLoading: boolean;
  onUpdate?: (value: string) => void;
  isEditable?: boolean;
  className?: string;
}

export interface ProgressIndicatorProps {
  progress: number;
  steps?: ExtractionStep[];
  className?: string;
}

export interface MetadataToggleProps {
  isVisible: boolean;
  onToggle: () => void;
  hasData: boolean;
  className?: string;
}

// Predefined metadata fields
export const METADATA_FIELDS: MetadataField[] = [
  {
    key: 'title',
    label: 'Job Title',
    icon: '📝',
    placeholder: 'Job title...',
    isRequired: true,
    validationRules: [
      { type: 'required', message: 'Job title is required' },
      { type: 'minLength', value: 2, message: 'Title must be at least 2 characters' },
      { type: 'maxLength', value: 100, message: 'Title must be less than 100 characters' }
    ]
  },
  {
    key: 'company',
    label: 'Company',
    icon: '🏢',
    placeholder: 'Company name...',
    isRequired: true,
    validationRules: [
      { type: 'required', message: 'Company name is required' },
      { type: 'minLength', value: 2, message: 'Company name must be at least 2 characters' }
    ]
  },
  {
    key: 'location',
    label: 'Location',
    icon: '📍',
    placeholder: 'Location...',
    isRequired: false,
    validationRules: [
      { type: 'pattern', value: /^[A-Za-z\s,]+$/, message: 'Invalid location format' }
    ]
  },
  {
    key: 'postedDate',
    label: 'Posted Date',
    icon: '📅',
    placeholder: 'Posted date...',
    isRequired: false,
    validationRules: []
  },
  {
    key: 'source',
    label: 'Source URL',
    icon: '🔗',
    placeholder: 'Source URL...',
    isRequired: false,
    validationRules: [
      { type: 'pattern', value: /^https?:\/\//, message: 'Must be a valid URL' }
    ]
  },
  {
    key: 'description',
    label: 'Description',
    icon: '📄',
    placeholder: 'Job description...',
    isRequired: false,
    validationRules: [
      { type: 'maxLength', value: 500, message: 'Description preview limited to 500 characters' }
    ]
  }
];

// Default extraction steps
export const DEFAULT_EXTRACTION_STEPS: ExtractionStep[] = [
  { id: 'fetch', name: 'Fetching Content', status: 'pending', progress: 0 },
  { id: 'parse', name: 'Parsing Structure', status: 'pending', progress: 0 },
  { id: 'extract', name: 'Extracting Fields', status: 'pending', progress: 0 },
  { id: 'validate', name: 'Validating Data', status: 'pending', progress: 0 },
  { id: 'enhance', name: 'AI Enhancement', status: 'pending', progress: 0 }
];