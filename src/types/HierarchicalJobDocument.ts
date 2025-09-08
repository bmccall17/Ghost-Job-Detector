/**
 * Hierarchical Job Document Types - Enhanced Parsing System
 * Implements the document-structure-centric approach for professional job parsing
 * Part of the parsing quality improvement to achieve 80-90% target performance
 */

export interface JobDocumentSection {
  id: string;
  title: string;
  content: string;
  bullets: JobBulletPoint[];
  subsections: JobDocumentSection[];
  sectionType: JobSectionType;
  confidence: number;
  originalOrder: number;
}

export interface JobBulletPoint {
  id: string;
  label?: string; // Bold label part (e.g., "Portfolio Management")
  description: string; // Description part (e.g., "Manage the end-to-end lifecycle...")
  level: number; // Nesting level (0 = top level, 1 = nested, etc.)
  originalText: string; // Original text for fidelity validation
  confidence: number;
}

export enum JobSectionType {
  METADATA = 'metadata',
  ROLE_OVERVIEW = 'role_overview', 
  RESPONSIBILITIES = 'responsibilities',
  QUALIFICATIONS = 'qualifications',
  COMPENSATION = 'compensation',
  COMPANY_INFO = 'company_info',
  LEGAL = 'legal',
  APPLICATION = 'application',
  UNKNOWN = 'unknown'
}

export interface HierarchicalJobDocument {
  // Document metadata
  documentId: string;
  originalUrl: string;
  processingTimestamp: string;
  
  // Raw content preservation for fidelity validation
  originalContent: string;
  cleanedContent: string;
  
  // Hierarchical structure
  sections: JobDocumentSection[];
  
  // Document-level metadata
  jobMetadata: JobMetadata;
  
  // Quality metrics
  structureQuality: StructureQualityMetrics;
  
  // Processing information
  processingInfo: ProcessingInfo;
}

export interface JobMetadata {
  title: string | null;
  company: string | null;
  location: string | null;
  salary: string | null;
  date: string | null;
  requisitionId: string | null;
  jobType: string | null;
  experienceLevel: string | null;
  department: string | null;
  industry: string | null;
}

export interface StructureQualityMetrics {
  sectionCompleteness: number; // 0.0-1.0
  bulletPointQuality: number; // 0.0-1.0  
  hierarchicalConsistency: number; // 0.0-1.0
  contentFidelity: number; // 0.0-1.0
  overallStructureScore: number; // 0.0-1.0
}

export interface ProcessingInfo {
  parsingMethod: 'webllm' | 'fallback' | 'hybrid';
  processingTimeMs: number;
  webllmModel?: string;
  fallbackReason?: string;
  validationPassed: boolean;
  contentLossDetected: boolean;
}

// Enhanced field extraction interfaces
export interface EnhancedJobFields extends JobMetadata {
  // Advanced location analysis
  locationFlexibility: LocationFlexibility;
  remotePolicy: RemotePolicy;
  
  // Enhanced experience requirements  
  experienceRange: ExperienceRange;
  educationRequirements: EducationRequirement[];
  
  // Responsibility analysis
  responsibilitySpecificity: ResponsibilityAnalysis;
  
  // Requirement feasibility
  requirementFeasibility: RequirementFeasibility;
  
  // Application complexity
  applicationComplexity: ApplicationComplexity;
  
  // Company offering analysis
  companyOffering: CompanyOfferingAnalysis;
  
  // Ghost job detection indicators
  ghostJobRiskFactors: GhostJobRiskFactors;
}

export interface LocationFlexibility {
  primaryLocation: string | null;
  additionalLocations: string[];
  remoteAllowed: boolean;
  hybridOptions: boolean;
  relocationRequired: boolean;
  flexibility: 'fixed' | 'flexible' | 'remote' | 'hybrid';
  confidence: number;
}

export interface RemotePolicy {
  fullyRemote: boolean;
  partialRemote: boolean;
  remotePercentage: number | null; // e.g., 40-60%
  officeRequirements: string[];
  timezone: string | null;
}

export interface ExperienceRange {
  minimumYears: number | null;
  maximumYears: number | null;
  preferredYears: number | null;
  levelDescriptions: string[];
  seniorityLevel: 'entry' | 'mid' | 'senior' | 'executive' | 'unknown';
}

export interface EducationRequirement {
  level: 'high_school' | 'bachelors' | 'masters' | 'phd' | 'certification' | 'unknown';
  field: string | null;
  required: boolean;
  preferred: boolean;
  alternatives: string[];
}

export interface ResponsibilityAnalysis {
  specificityScore: number; // 0.0-1.0, higher = more specific
  genericityScore: number; // 0.0-1.0, higher = more generic/template
  detailLevel: 'minimal' | 'basic' | 'detailed' | 'comprehensive';
  taskComplexity: 'low' | 'medium' | 'high';
  responsibilityCount: number;
  uniqueResponsibilities: number;
}

export interface RequirementFeasibility {
  overallFeasibility: number; // 0.0-1.0
  unicornJobRisk: number; // 0.0-1.0, higher = more unrealistic
  skillCombinationRealism: number; // 0.0-1.0
  experienceRequirementRealism: number; // 0.0-1.0
  unrealisticRequirements: string[];
  feasibilityWarnings: string[];
}

export interface ApplicationComplexity {
  complexityScore: number; // 0.0-1.0
  applicationSteps: number;
  documentsRequired: string[];
  timeInvestmentEstimate: string; // e.g., "30-45 minutes"
  interviewProcessComplexity: 'simple' | 'moderate' | 'complex' | 'unknown';
  responseProbability: number; // 0.0-1.0 based on complexity
}

export interface CompanyOfferingAnalysis {
  compensationCompleteness: number; // 0.0-1.0
  benefitsSpecificity: number; // 0.0-1.0
  cultureDescription: 'minimal' | 'basic' | 'detailed' | 'comprehensive';
  growthOpportunities: string[];
  workLifeBalance: string[];
  offeringQuality: number; // 0.0-1.0
}

export interface GhostJobRiskFactors {
  overallRiskScore: number; // 0.0-1.0
  urgencyPressure: number; // 0.0-1.0
  vagueDescription: number; // 0.0-1.0
  unrealisticRequirements: number; // 0.0-1.0
  poorApplicationProcess: number; // 0.0-1.0
  lackOfCompanyDetails: number; // 0.0-1.0
  genericContent: number; // 0.0-1.0
  riskIndicators: string[];
  confidenceAssessment: number; // 0.0-1.0
}

// Validation result interfaces
export interface ValidatedParsingResult {
  document: HierarchicalJobDocument;
  fields: EnhancedJobFields;
  quality: QualityAssessment;
  validation: ValidationResults;
}

export interface QualityAssessment {
  overallQuality: number; // 0.0-1.0
  contentFidelity: number; // 0.0-1.0
  structureQuality: number; // 0.0-1.0
  fieldCompleteness: number; // 0.0-1.0
  processingEfficiency: number; // 0.0-1.0
  qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  qualityReport: QualityReport;
}

export interface QualityReport {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  riskAssessment: string[];
  confidenceLevel: 'high' | 'medium' | 'low';
}

export interface ValidationResults {
  passed: boolean;
  contentFidelityCheck: ValidationCheck;
  structureQualityCheck: ValidationCheck;
  fieldExtractionCheck: ValidationCheck;
  performanceCheck: ValidationCheck;
  overallValidation: ValidationSummary;
}

export interface ValidationCheck {
  passed: boolean;
  score: number;
  issues: ValidationIssue[];
  warnings: string[];
  recommendations: string[];
}

export interface ValidationIssue {
  severity: 'critical' | 'warning' | 'info';
  category: 'content_loss' | 'structure_error' | 'field_missing' | 'performance_issue';
  description: string;
  location?: string;
  suggestion: string;
}

export interface ValidationSummary {
  overallScore: number; // 0.0-1.0
  criticalIssues: number;
  warnings: number;
  recommendations: number;
  validationTime: number;
  passedChecks: string[];
  failedChecks: string[];
}

// Backward compatibility interface - extends existing ParsedJob
export interface EnhancedParsedJob {
  // Original ParsedJob fields for backward compatibility
  title: string | null;
  company: string | null;
  location: string | null;
  description: string | null;
  requirements: string | null;
  benefits: string | null;
  salary: string | null;
  jobType: string | null;
  applicationUrl: string | null;
  postedAt: string | null;
  expiresAt: string | null;
  contactInfo: string | null;
  isRemote: boolean;
  experienceLevel: string | null;
  department: string | null;
  industry: string | null;
  qualityMetrics: {
    titleQuality: number;
    companyQuality: number;
    descriptionQuality: number;
    completeness: number;
    overall: number;
  };
  
  // Enhanced parsing results
  hierarchicalDocument?: HierarchicalJobDocument;
  enhancedFields?: EnhancedJobFields;
  qualityAssessment?: QualityAssessment;
  validationResults?: ValidationResults;
}