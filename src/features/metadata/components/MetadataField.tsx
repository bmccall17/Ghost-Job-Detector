// Live Metadata Display - Metadata Field Component
// Phase 2: Enhanced with Click-to-Edit & Auto-save

import React, { useState, useRef, useEffect } from 'react';
import { MetadataFieldProps } from '../types/metadata.types';

const MetadataField: React.FC<MetadataFieldProps> = ({
  field,
  value,
  confidence,
  isLoading,
  onUpdate,
  isEditable = false,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update edit value when prop value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value || '');
    }
  }, [value, isEditing]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing) {
      const ref = field.key === 'description' ? textareaRef : inputRef;
      if (ref.current) {
        ref.current.focus();
        ref.current.select();
      }
    }
  }, [isEditing, field.key]);

  const handleStartEdit = () => {
    if (!isEditable || isLoading || isSaving) return;
    setIsEditing(true);
    setEditValue(value || '');
  };

  const handleSave = async () => {
    if (!onUpdate || editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(editValue.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save field:', error);
      // Keep editing mode on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && field.key !== 'description') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const validateField = (val: string): string | null => {
    if (!field.validationRules) return null;
    
    for (const rule of field.validationRules) {
      switch (rule.type) {
        case 'required':
          if (!val.trim()) return rule.message;
          break;
        case 'minLength':
          if (val.length < rule.value) return rule.message;
          break;
        case 'maxLength':
          if (val.length > rule.value) return rule.message;
          break;
        case 'pattern':
          if (!rule.value.test(val)) return rule.message;
          break;
        case 'custom':
          if (rule.validator && !rule.validator(val)) return rule.message;
          break;
      }
    }
    return null;
  };

  const validationError = isEditing ? validateField(editValue) : null;

  const getConfidenceColor = (conf?: { value: number }) => {
    if (!conf) return 'text-gray-400';
    
    if (conf.value >= 0.9) return 'text-green-600';
    if (conf.value >= 0.7) return 'text-yellow-600';
    if (conf.value >= 0.5) return 'text-orange-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (conf?: { value: number }) => {
    if (!conf) return '○';
    
    if (conf.value >= 0.9) return '●';
    if (conf.value >= 0.7) return '◐';
    if (conf.value >= 0.5) return '◑';
    return '◒';
  };

  const displayValue = value || field.placeholder;
  const hasValue = Boolean(value);

  return (
    <div 
      className={`metadata-field ${className} ${isEditable && !isEditing ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors' : ''} p-2 -m-2`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start space-x-3">
        {/* Field Icon */}
        <span className="text-lg mt-1 flex-shrink-0" role="img" aria-label={field.label}>
          {field.icon}
        </span>
        
        {/* Field Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              {field.label} {field.isRequired && <span className="text-red-500">*</span>}
            </span>
            
            {/* Confidence Indicator & Actions */}
            <div className="flex items-center space-x-2">
              {confidence && (
                <div 
                  className={`text-xs ${getConfidenceColor(confidence)} flex items-center space-x-1`}
                  title={`Confidence: ${Math.round(confidence.value * 100)}% (${confidence.source})`}
                >
                  <span>{getConfidenceIcon(confidence)}</span>
                  <span className="hidden sm:inline">{Math.round(confidence.value * 100)}%</span>
                </div>
              )}
              
              {/* Edit/Save/Cancel buttons */}
              {isEditable && !isLoading && (
                <div className="flex items-center space-x-1">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={isSaving || !!validationError}
                        className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Save changes (Enter)"
                      >
                        {isSaving ? '...' : '✓'}
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 transition-colors"
                        title="Cancel (Escape)"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    isHovered && (
                      <button
                        onClick={handleStartEdit}
                        className="text-xs px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors"
                        title="Click to edit"
                      >
                        ✏️
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Field Value / Input */}
          <div className={`${hasValue ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 italic'}`}>
            {isLoading ? (
              <div className="loading-shimmer">
                <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-5 rounded w-3/4"></div>
              </div>
            ) : isEditing ? (
              <div className="space-y-2">
                {field.key === 'description' ? (
                  <textarea
                    ref={textareaRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSave}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 resize-none"
                    rows={3}
                    placeholder={field.placeholder}
                  />
                ) : (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSave}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    placeholder={field.placeholder}
                  />
                )}
                
                {/* Validation Error */}
                {validationError && (
                  <p className="text-xs text-red-500 dark:text-red-400">
                    {validationError}
                  </p>
                )}
                
                {/* Character count for description */}
                {field.key === 'description' && field.validationRules?.find(r => r.type === 'maxLength') && (
                  <p className="text-xs text-gray-400 text-right">
                    {editValue.length}/{field.validationRules.find(r => r.type === 'maxLength')?.value || 0}
                  </p>
                )}
              </div>
            ) : (
              <div 
                className={`text-sm ${isEditable ? 'hover:cursor-text' : ''} ${hasValue ? '' : 'opacity-60'}`}
                onClick={handleStartEdit}
              >
                {displayValue || (
                  <span className="text-gray-400 dark:text-gray-500">
                    {field.placeholder}
                    {isEditable && isHovered && (
                      <span className="ml-2 text-blue-500 dark:text-blue-400 text-xs">
                        Click to edit
                      </span>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Source Attribution & Last Updated */}
          {!isEditing && (
            <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
              {confidence && confidence.source !== 'user' && (
                <span>from {confidence.source}</span>
              )}
              {confidence && confidence.lastValidated && (
                <span className="text-xs">
                  {new Date(confidence.lastValidated).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Enhanced Field Border with Confidence Color */}
      <div className={`mt-3 h-px bg-gradient-to-r ${
        validationError 
          ? 'from-red-500 to-transparent' 
          : hasValue && confidence
            ? `${getConfidenceColor(confidence).replace('text-', 'from-')}-500 to-transparent`
            : hasValue 
              ? 'from-blue-500 to-transparent' 
              : 'from-gray-300 dark:from-gray-600 to-transparent'
      }`} />
    </div>
  );
};

export default MetadataField;