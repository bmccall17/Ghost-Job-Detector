/**
 * ParsedJobDisplay Component
 * Shows extracted job information with confidence indicators
 * Following Implementation Guide specifications
 */
import React from 'react';
import { Check, AlertTriangle, ExternalLink, MapPin, DollarSign, Calendar, Clock, Mail, User, Tag, Building } from 'lucide-react';
import { ExtractedJobData, ParsePreviewResponse } from '@/types';

interface ParsedJobDisplayProps {
  previewData: ParsePreviewResponse;
  onEdit?: (field: keyof ExtractedJobData, value: string) => void;
  isEditable?: boolean;
}

export const ParsedJobDisplay: React.FC<ParsedJobDisplayProps> = ({
  previewData,
  onEdit,
  isEditable = false
}) => {
  const { extractedData, confidence, extractionMethod, validationResult } = previewData;

  if (!extractedData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">No data could be extracted</span>
        </div>
        <p className="text-sm text-red-600 mt-2">
          Auto-parsing failed. Please enter job details manually below.
        </p>
      </div>
    );
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.5) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceIcon = (score: number) => {
    if (score >= 0.8) return <Check className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  const formatConfidence = (score: number) => `${Math.round(score * 100)}%`;

  const EditableField: React.FC<{
    label: string;
    value: string | null;
    field: keyof ExtractedJobData;
    icon: React.ReactNode;
    placeholder?: string;
  }> = ({ label, value, field, icon, placeholder }) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [editValue, setEditValue] = React.useState(value || '');

    const handleSave = () => {
      if (onEdit && editValue !== value) {
        onEdit(field, editValue);
      }
      setIsEditing(false);
    };

    const handleCancel = () => {
      setEditValue(value || '');
      setIsEditing(false);
    };

    return (
      <div className="flex items-start space-x-3 py-3">
        <div className="flex-shrink-0 text-gray-500 mt-1">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-700">{label}</p>
          {isEditing && isEditable ? (
            <div className="mt-1">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder={placeholder}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') handleCancel();
                }}
                autoFocus
              />
              <div className="flex space-x-2 mt-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div 
              className={`mt-1 ${isEditable ? 'cursor-pointer hover:bg-gray-50 rounded px-2 py-1 -mx-2' : ''}`}
              onClick={() => isEditable && setIsEditing(true)}
            >
              {value ? (
                <p className="text-sm text-gray-900">{value}</p>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  {isEditable ? 'Click to add...' : 'Not extracted'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      {/* Header with confidence score */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-900">Extracted Job Information</h3>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(confidence)}`}>
            {getConfidenceIcon(confidence)}
            <span className="ml-1">{formatConfidence(confidence)} confidence</span>
          </span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span className="capitalize">{extractionMethod}</span>
          <span>extraction</span>
        </div>
      </div>

      {/* Extracted fields */}
      <div className="space-y-1 divide-y divide-gray-100">
        <EditableField
          label="Job Title"
          value={extractedData.title}
          field="title"
          icon={<User className="h-4 w-4" />}
          placeholder="Enter job title..."
        />

        <EditableField
          label="Company"
          value={extractedData.company}
          field="company"
          icon={<Building className="h-4 w-4" />}
          placeholder="Enter company name..."
        />

        <EditableField
          label="Location"
          value={extractedData.location}
          field="location"
          icon={<MapPin className="h-4 w-4" />}
          placeholder="Enter location..."
        />

        <EditableField
          label="Salary"
          value={extractedData.salary}
          field="salary"
          icon={<DollarSign className="h-4 w-4" />}
          placeholder="Enter salary range..."
        />

        <EditableField
          label="Job Type"
          value={extractedData.jobType}
          field="jobType"
          icon={<Tag className="h-4 w-4" />}
          placeholder="Full-time, Part-time, Contract..."
        />

        <EditableField
          label="Posted Date"
          value={extractedData.postedAt}
          field="postedAt"
          icon={<Calendar className="h-4 w-4" />}
          placeholder="YYYY-MM-DD"
        />

        <EditableField
          label="Job ID"
          value={extractedData.jobId}
          field="jobId"
          icon={<Tag className="h-4 w-4" />}
          placeholder="Job posting ID..."
        />

        <EditableField
          label="Contact Details"
          value={extractedData.contactDetails}
          field="contactDetails"
          icon={<Mail className="h-4 w-4" />}
          placeholder="Contact email or phone..."
        />

        {/* Original source link */}
        <div className="flex items-start space-x-3 py-3">
          <div className="flex-shrink-0 text-gray-500 mt-1">
            <ExternalLink className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700">Original Source</p>
            <div className="mt-1">
              <a 
                href={extractedData.originalSource}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
              >
                {extractedData.originalSource}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Validation results */}
      {validationResult && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Validation Results</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Company validation */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Company</span>
                <span className={`text-sm font-medium ${validationResult.companyValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                  {validationResult.companyValidation.isValid ? 'Valid' : 'Invalid'}
                </span>
              </div>
              <div className="mt-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Confidence</span>
                  <span>{formatConfidence(validationResult.companyValidation.confidence)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Legitimacy</span>
                  <span>{formatConfidence(validationResult.companyValidation.legitimacyScore)}</span>
                </div>
              </div>
            </div>

            {/* Title validation */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Job Title</span>
                <span className={`text-sm font-medium ${validationResult.titleValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                  {validationResult.titleValidation.isValid ? 'Valid' : 'Invalid'}
                </span>
              </div>
              <div className="mt-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Confidence</span>
                  <span>{formatConfidence(validationResult.titleValidation.confidence)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Industry Match</span>
                  <span>{validationResult.titleValidation.industryMatch ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Issues and recommendations */}
          {(validationResult.issues.length > 0 || validationResult.recommendations.length > 0) && (
            <div className="mt-4 space-y-3">
              {validationResult.issues.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-red-700 mb-2">Issues Found</h5>
                  <ul className="text-sm text-red-600 space-y-1">
                    {validationResult.issues.map((issue, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.recommendations.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-blue-700 mb-2">Recommendations</h5>
                  <ul className="text-sm text-blue-600 space-y-1">
                    {validationResult.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <Check className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit instructions */}
      {isEditable && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>Click on any field above to edit the extracted information</span>
          </div>
        </div>
      )}
    </div>
  );
};