/**
 * PDF Manual Entry Modal - Fallback data entry form
 * Allows users to manually input job data when automatic parsing fails
 */

import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, CheckCircle, Edit3, Link } from 'lucide-react';
import { EnhancedPDFJobData } from '../../services/parsing/EnhancedPDFParsingService';

interface ManualJobData {
  title: string;
  company: string;
  location: string;
  description: string;
  sourceUrl: string;
  remoteFlag: boolean;
  postedAt?: string;
}

interface PDFManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ManualJobData) => void;
  initialData?: EnhancedPDFJobData;
  focusField?: string;
  missingFields?: string[];
}

export const PDFManualEntryModal: React.FC<PDFManualEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  focusField,
  missingFields = []
}) => {
  const [formData, setFormData] = useState<ManualJobData>({
    title: '',
    company: '',
    location: '',
    description: '',
    sourceUrl: '',
    remoteFlag: false,
    postedAt: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldStatuses, setFieldStatuses] = useState<Record<string, 'missing' | 'suggested' | 'provided' | 'complete'>>({});

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && initialData) {
      const newFormData: ManualJobData = {
        title: initialData.title === 'PARSING_FAILED' ? '' : initialData.title || '',
        company: initialData.company === 'EXTRACTION_ERROR' ? '' : initialData.company || '',
        location: initialData.location || '',
        description: initialData.description || '',
        sourceUrl: initialData.sourceUrl || '',
        remoteFlag: initialData.remoteFlag || false,
        postedAt: initialData.postedAt ? new Date(initialData.postedAt).toISOString().split('T')[0] : ''
      };
      
      setFormData(newFormData);
      
      // Set field statuses
      const statuses: Record<string, 'missing' | 'suggested' | 'provided' | 'complete'> = {};
      Object.keys(newFormData).forEach(field => {
        if (missingFields.includes(field)) {
          statuses[field] = 'missing';
        } else if (newFormData[field as keyof ManualJobData]) {
          statuses[field] = 'suggested';
        } else {
          statuses[field] = 'provided';
        }
      });
      setFieldStatuses(statuses);
    }
  }, [isOpen, initialData, missingFields]);

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'title':
        if (!value.trim()) return 'Job title is required';
        if (value.trim().length < 3) return 'Job title must be at least 3 characters';
        if (value.includes('PARSING_FAILED')) return 'Please enter a real job title';
        return '';
        
      case 'company':
        if (!value.trim()) return 'Company name is required';
        if (value.trim().length < 2) return 'Company name must be at least 2 characters';
        if (value.includes('EXTRACTION_ERROR') || value.includes('Unknown Company')) {
          return 'Please enter a real company name';
        }
        return '';
        
      case 'sourceUrl':
        if (value && !isValidUrl(value)) return 'Please enter a valid URL';
        return '';
        
      case 'description':
        if (value && value.length < 20) return 'Job description should be at least 20 characters for better analysis';
        return '';
        
      default:
        return '';
    }
  };

  const isValidUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleFieldChange = (field: keyof ManualJobData, value: string | boolean) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    // Update field status
    const newStatuses = { ...fieldStatuses };
    if (field !== 'remoteFlag') {
      if (value && String(value).trim()) {
        newStatuses[field] = 'complete';
      } else if (missingFields.includes(field)) {
        newStatuses[field] = 'missing';
      } else {
        newStatuses[field] = 'provided';
      }
    }
    setFieldStatuses(newStatuses);

    // Clear error for this field
    const fieldError = validateField(field, String(value));
    setErrors(prev => ({ ...prev, [field]: fieldError }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate all fields
    const newErrors: Record<string, string> = {};
    Object.entries(formData).forEach(([field, value]) => {
      if (field !== 'remoteFlag' && field !== 'postedAt') {
        const error = validateField(field, String(value));
        if (error) newErrors[field] = error;
      }
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        onSave(formData);
        onClose();
      } catch (error) {
        console.error('Error saving manual data:', error);
      }
    }

    setIsSubmitting(false);
  };

  const getFieldStatusIcon = (field: string) => {
    const status = fieldStatuses[field];
    switch (status) {
      case 'missing':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'suggested':
        return <Edit3 className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getFieldStatusMessage = (field: string) => {
    const status = fieldStatuses[field];
    switch (status) {
      case 'missing':
        return 'This field could not be extracted from the PDF';
      case 'suggested':
        return 'This is the extracted value - please verify accuracy';
      case 'complete':
        return 'Field completed';
      default:
        return '';
    }
  };

  const requiredFields = ['title', 'company'];
  const completedRequiredFields = requiredFields.filter(field => formData[field as keyof ManualJobData] && String(formData[field as keyof ManualJobData]).trim());
  const progressPercentage = (completedRequiredFields.length / requiredFields.length) * 100;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Manual Job Information Entry
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Enter job details to continue with analysis
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress indicator */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{completedRequiredFields.length}/{requiredFields.length} required fields</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Job Title */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Job Title *
                </label>
                {getFieldStatusIcon('title')}
              </div>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                } ${focusField === 'title' ? 'ring-2 ring-blue-500' : ''}`}
                placeholder="e.g., Senior Software Engineer"
                autoFocus={focusField === 'title'}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
              {getFieldStatusMessage('title') && (
                <p className="mt-1 text-xs text-gray-500">{getFieldStatusMessage('title')}</p>
              )}
            </div>

            {/* Company */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                  Company Name *
                </label>
                {getFieldStatusIcon('company')}
              </div>
              <input
                type="text"
                id="company"
                value={formData.company}
                onChange={(e) => handleFieldChange('company', e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                  errors.company ? 'border-red-300' : 'border-gray-300'
                } ${focusField === 'company' ? 'ring-2 ring-blue-500' : ''}`}
                placeholder="e.g., Google, Microsoft, Startup Inc"
                autoFocus={focusField === 'company'}
              />
              {errors.company && (
                <p className="mt-1 text-sm text-red-600">{errors.company}</p>
              )}
              {getFieldStatusMessage('company') && (
                <p className="mt-1 text-xs text-gray-500">{getFieldStatusMessage('company')}</p>
              )}
            </div>

            {/* Location */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                {getFieldStatusIcon('location')}
              </div>
              <input
                type="text"
                id="location"
                value={formData.location}
                onChange={(e) => handleFieldChange('location', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., San Francisco, CA or Remote"
                autoFocus={focusField === 'location'}
              />
              {getFieldStatusMessage('location') && (
                <p className="mt-1 text-xs text-gray-500">{getFieldStatusMessage('location')}</p>
              )}
            </div>

            {/* Source URL */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <label htmlFor="sourceUrl" className="block text-sm font-medium text-gray-700">
                  Original Job Posting URL
                </label>
                <Link className="w-4 h-4 text-blue-500" />
              </div>
              <input
                type="url"
                id="sourceUrl"
                value={formData.sourceUrl}
                onChange={(e) => handleFieldChange('sourceUrl', e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                  errors.sourceUrl ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="https://company.com/jobs/position-id"
                autoFocus={focusField === 'sourceUrl'}
              />
              {errors.sourceUrl && (
                <p className="mt-1 text-sm text-red-600">{errors.sourceUrl}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Optional but recommended - helps improve analysis accuracy
              </p>
            </div>

            {/* Remote work flag */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="remoteFlag"
                checked={formData.remoteFlag}
                onChange={(e) => handleFieldChange('remoteFlag', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remoteFlag" className="text-sm font-medium text-gray-700">
                This is a remote position
              </label>
            </div>

            {/* Job Description */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Job Description
                </label>
                {getFieldStatusIcon('description')}
              </div>
              <textarea
                id="description"
                rows={6}
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Paste the full job description here for best analysis results..."
                autoFocus={focusField === 'description'}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Include as much detail as possible for better ghost job detection
              </p>
            </div>

            {/* Posted date */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <label htmlFor="postedAt" className="block text-sm font-medium text-gray-700">
                  Posted Date
                </label>
              </div>
              <input
                type="date"
                id="postedAt"
                value={formData.postedAt}
                onChange={(e) => handleFieldChange('postedAt', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                max={new Date().toISOString().split('T')[0]}
              />
              <p className="mt-1 text-xs text-gray-500">
                Optional - when was this job posting first published?
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-6 border-t">
              <p className="text-sm text-gray-500">
                * Required fields for analysis
              </p>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || Object.keys(errors).length > 0 || completedRequiredFields.length < requiredFields.length}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Continue Analysis'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};