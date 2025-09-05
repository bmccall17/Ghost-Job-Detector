/**
 * Specialized Few-Shot Learning Prompts for WebLLM - Phase 3 Implementation
 * Platform-specific prompts with curated examples for maximum accuracy
 */

export interface FewShotExample {
  input: string;
  expectedOutput: string;
  platform: string;
  confidence: number;
  notes?: string;
}

export interface SpecializedPromptConfig {
  systemPrompt: string;
  examples: FewShotExample[];
  extractionGuidance: string;
  validationRules: string[];
  confidenceThresholds: {
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * LinkedIn-specific job parsing prompts and examples
 */
const LINKEDIN_CONFIG: SpecializedPromptConfig = {
  systemPrompt: `You are a LinkedIn job posting specialist. Extract job information from LinkedIn pages with high precision.

LINKEDIN-SPECIFIC PATTERNS:
- Job titles: Usually in h1 with class "jobs-unified-top-card__job-title"
- Company names: In elements with "jobs-unified-top-card__company-name"
- Locations: In "jobs-unified-top-card__subtitle-primary" spans
- Remote indicators: Look for "Remote", "Hybrid", or location flexibility mentions
- Posted dates: Often in relative format ("2 days ago", "1 week ago")

EXTRACTION PRIORITIES:
1. Focus on structured data elements with LinkedIn-specific classes
2. Parse job descriptions for remote work indicators
3. Extract salary ranges from benefits sections
4. Identify application deadlines and urgency indicators`,

  examples: [
    {
      input: `<h1 class="t-24 t-bold jobs-unified-top-card__job-title">Senior Software Engineer - Full Stack</h1>
<a class="jobs-unified-top-card__company-name">TechCorp Inc</a>
<span class="jobs-unified-top-card__subtitle-primary">San Francisco, CA (Remote)</span>
<div class="jobs-details-top-card__job-insight">
  <span>$120,000 - $180,000/year</span>
</div>`,
      expectedOutput: `{
  "title": "Senior Software Engineer - Full Stack",
  "company": "TechCorp Inc", 
  "location": "San Francisco, CA",
  "remote": true,
  "confidence": {
    "title": 0.95,
    "company": 0.95,
    "location": 0.90,
    "overall": 0.93
  },
  "extractionNotes": "LinkedIn structured data with clear remote indicator"
}`,
      platform: 'linkedin',
      confidence: 0.95,
      notes: 'Perfect LinkedIn structure with all key elements'
    },
    {
      input: `<div class="job-details-jobs-unified-top-card__container">
<h1 class="jobs-unified-top-card__job-title">Product Manager</h1>
<div class="jobs-unified-top-card__company-name">Startup XYZ</div>
<span class="jobs-unified-top-card__subtitle">New York, NY · Posted 3 days ago</span>
</div>`,
      expectedOutput: `{
  "title": "Product Manager", 
  "company": "Startup XYZ",
  "location": "New York, NY",
  "remote": false,
  "confidence": {
    "title": 0.90,
    "company": 0.90,
    "location": 0.85,
    "overall": 0.88
  },
  "extractionNotes": "LinkedIn job with standard layout, no remote indication"
}`,
      platform: 'linkedin',
      confidence: 0.88,
      notes: 'Standard LinkedIn layout without explicit remote flag'
    }
  ],

  extractionGuidance: `
LINKEDIN EXTRACTION STRATEGY:
1. Prioritize elements with LinkedIn-specific CSS classes
2. Company names may be in <a> tags or <div> elements  
3. Location parsing: Handle "(Remote)" suffix and "·" separators
4. Remote detection: Look for "Remote", "Hybrid", "Work from home" in title or location
5. Salary extraction: Check job insights and description sections`,

  validationRules: [
    'Job title should not contain company name',
    'Company name should not contain "Inc.", "LLC" artifacts in title',
    'Remote flag should be true only if explicitly mentioned',
    'Location should be city, state format when possible'
  ],

  confidenceThresholds: {
    high: 0.90,
    medium: 0.75,
    low: 0.60
  }
};

/**
 * Workday-specific job parsing prompts and examples
 */
const WORKDAY_CONFIG: SpecializedPromptConfig = {
  systemPrompt: `You are a Workday job portal specialist. Extract job information from Workday-powered career sites with high precision.

WORKDAY-SPECIFIC PATTERNS:
- Job titles: Usually in elements with data-automation-id="jobTitle"
- Company names: In data-automation-id="jobCompany" or inferred from domain
- Locations: In data-automation-id="jobLocation"
- Posted dates: In data-automation-id="jobPostingDate"
- Job descriptions: In elements with data-automation-id="jobDescription"

EXTRACTION PRIORITIES:
1. Always prefer data-automation-id attributes for reliability
2. Handle multi-location postings (separated by semicolons or commas)
3. Parse job requisition IDs from data-automation-id="jobReqId"
4. Extract employment type from job details sections`,

  examples: [
    {
      input: `<div data-automation-id="jobTitle">Software Development Engineer II</div>
<div data-automation-id="jobCompany">Amazon</div>
<div data-automation-id="jobLocation">Seattle, WA, United States</div>
<div data-automation-id="jobPostingDate">Posted 5 days ago</div>
<div data-automation-id="jobReqId">JR12345</div>`,
      expectedOutput: `{
  "title": "Software Development Engineer II",
  "company": "Amazon",
  "location": "Seattle, WA, United States", 
  "remote": false,
  "confidence": {
    "title": 0.95,
    "company": 0.95,
    "location": 0.95,
    "overall": 0.95
  },
  "extractionNotes": "Workday job with perfect data-automation-id structure"
}`,
      platform: 'workday',
      confidence: 0.95,
      notes: 'Perfect Workday structure with all automation IDs'
    },
    {
      input: `<h1 data-automation-id="jobTitle">Data Scientist - Remote Eligible</h1>
<div class="company-info">Microsoft Corporation</div>
<span data-automation-id="jobLocation">Multiple Locations; Remote Work Available</span>`,
      expectedOutput: `{
  "title": "Data Scientist - Remote Eligible",
  "company": "Microsoft Corporation",
  "location": "Multiple Locations",
  "remote": true,
  "confidence": {
    "title": 0.90,
    "company": 0.85,
    "location": 0.80,
    "overall": 0.85
  },
  "extractionNotes": "Workday job with remote indication in title and location"
}`,
      platform: 'workday',
      confidence: 0.85,
      notes: 'Workday with mixed automation IDs and explicit remote indication'
    }
  ],

  extractionGuidance: `
WORKDAY EXTRACTION STRATEGY:
1. Always prefer data-automation-id attributes over generic classes
2. Company names may be in page title if not in specific element
3. Handle multi-location formats: "City1, State1; City2, State2"
4. Remote detection: Look for "Remote", "Work from Home", "Distributed" keywords
5. Job IDs: Extract from data-automation-id="jobReqId" for tracking`,

  validationRules: [
    'Prefer data-automation-id elements for highest accuracy',
    'Multi-location strings should be simplified to primary location',
    'Remote flag requires explicit remote work mention',
    'Company names should be clean without corporate suffixes in title'
  ],

  confidenceThresholds: {
    high: 0.90,
    medium: 0.75,
    low: 0.65
  }
};

/**
 * Greenhouse-specific job parsing prompts and examples
 */
const GREENHOUSE_CONFIG: SpecializedPromptConfig = {
  systemPrompt: `You are a Greenhouse job board specialist. Extract job information from Greenhouse-powered career pages.

GREENHOUSE-SPECIFIC PATTERNS:
- Job titles: Usually in h1 or heading elements in job header
- Company names: Often in navigation or header, sometimes inferred from domain
- Locations: In job details section, often with office names
- Departments: Usually specified in structured format
- Application instructions: Pay attention to custom application processes

EXTRACTION PRIORITIES:
1. Focus on clean job header structure
2. Parse office locations and remote work policies  
3. Extract department/team information
4. Identify application deadlines and requirements`,

  examples: [
    {
      input: `<div class="job-header">
<h1>Frontend Engineer</h1>
<div class="company">Stripe</div>
<div class="location">San Francisco, Remote OK</div>
<div class="department">Engineering</div>
</div>`,
      expectedOutput: `{
  "title": "Frontend Engineer",
  "company": "Stripe",
  "location": "San Francisco",
  "remote": true,
  "confidence": {
    "title": 0.90,
    "company": 0.90,
    "location": 0.85,
    "overall": 0.88
  },
  "extractionNotes": "Greenhouse job with clear structure and remote OK indication"
}`,
      platform: 'greenhouse',
      confidence: 0.88,
      notes: 'Clean Greenhouse structure with remote flexibility'
    }
  ],

  extractionGuidance: `
GREENHOUSE EXTRACTION STRATEGY:
1. Job titles are typically in h1 elements in job headers
2. Company names may be in header navigation or job details
3. Location parsing: Handle "Remote OK", "Remote First" indicators
4. Department information can help with job categorization`,

  validationRules: [
    'Job titles should be clean role names without company',
    'Remote flag should consider "Remote OK", "Remote First" language',
    'Location should focus on primary office location',
    'Company names should match official brand names'
  ],

  confidenceThresholds: {
    high: 0.85,
    medium: 0.70,
    low: 0.55
  }
};

/**
 * Generic/fallback job parsing configuration
 */
const GENERIC_CONFIG: SpecializedPromptConfig = {
  systemPrompt: `You are a general job posting parser. Extract job information from various career sites and job boards.

GENERAL EXTRACTION PATTERNS:
- Look for semantic HTML elements (h1, h2 for titles)
- Check meta tags for job structured data (JSON-LD, OpenGraph)
- Parse common job board layouts and class names
- Handle various date formats and location specifications

FALLBACK STRATEGIES:
1. Use heading hierarchy to identify job titles
2. Look for company information in navigation or headers
3. Parse address/location information from contact sections
4. Check for schema.org structured data markup`,

  examples: [
    {
      input: `<h1 class="job-title">Marketing Manager</h1>
<div class="company-name">TechStartup Inc.</div>
<span class="job-location">Austin, TX</span>
<div class="job-type">Full-time</div>`,
      expectedOutput: `{
  "title": "Marketing Manager",
  "company": "TechStartup Inc.",
  "location": "Austin, TX", 
  "remote": false,
  "confidence": {
    "title": 0.80,
    "company": 0.80,
    "location": 0.75,
    "overall": 0.78
  },
  "extractionNotes": "Generic job board with standard class names"
}`,
      platform: 'generic',
      confidence: 0.78,
      notes: 'Standard job board layout with semantic classes'
    }
  ],

  extractionGuidance: `
GENERIC EXTRACTION STRATEGY:
1. Prioritize semantic HTML elements (h1, h2, address)
2. Look for common class patterns (job-title, company-name, location)
3. Check JSON-LD structured data if available
4. Use content proximity and context for extraction`,

  validationRules: [
    'Validate against common job title patterns',
    'Company names should not include job-specific terms',
    'Locations should be geographic identifiers',
    'Remote work requires explicit mention'
  ],

  confidenceThresholds: {
    high: 0.75,
    medium: 0.60,
    low: 0.45
  }
};

/**
 * Get specialized prompt configuration for platform
 */
export function getSpecializedPromptConfig(platform?: string): SpecializedPromptConfig {
  switch (platform?.toLowerCase()) {
    case 'linkedin':
      return LINKEDIN_CONFIG;
    case 'workday':
      return WORKDAY_CONFIG;
    case 'greenhouse':
      return GREENHOUSE_CONFIG;
    default:
      return GENERIC_CONFIG;
  }
}

/**
 * Generate few-shot learning messages for WebLLM
 */
export function generateFewShotMessages(
  platform: string,
  htmlContent: string
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const config = getSpecializedPromptConfig(platform);
  
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
  
  // Add specialized system prompt
  messages.push({
    role: 'system',
    content: `${config.systemPrompt}

EXTRACTION GUIDANCE:
${config.extractionGuidance}

VALIDATION RULES:
${config.validationRules.map(rule => `- ${rule}`).join('\n')}

CONFIDENCE THRESHOLDS:
- High confidence (${config.confidenceThresholds.high}+): Use for clear, unambiguous extractions
- Medium confidence (${config.confidenceThresholds.medium}+): Use for mostly clear extractions with minor ambiguity
- Low confidence (${config.confidenceThresholds.low}+): Use for uncertain or incomplete extractions

OUTPUT FORMAT (JSON only):
{
  "title": "exact job title or null",
  "company": "exact company name or null",
  "location": "primary location or null",
  "remote": boolean,
  "confidence": {
    "title": 0.0-1.0,
    "company": 0.0-1.0, 
    "location": 0.0-1.0,
    "overall": 0.0-1.0
  },
  "extractionNotes": "brief extraction summary"
}`
  });

  // Add few-shot examples
  config.examples.forEach(example => {
    messages.push({
      role: 'user',
      content: `Extract job information from this ${example.platform} content:\n\n${example.input}`
    });
    
    messages.push({
      role: 'assistant',
      content: example.expectedOutput
    });
  });

  // Add the actual parsing request
  messages.push({
    role: 'user',
    content: `Extract job information from this ${platform} content:\n\n${htmlContent}`
  });

  return messages;
}

/**
 * Validate extraction result against platform-specific rules
 */
export function validateExtractionResult(
  result: any,
  platform: string
): {
  isValid: boolean;
  confidence: number;
  issues: string[];
  suggestions: string[];
} {
  const config = getSpecializedPromptConfig(platform);
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Basic structure validation
  if (!result.title && !result.company) {
    issues.push('Missing both title and company information');
    suggestions.push('Ensure extraction captured primary job information');
  }
  
  // Platform-specific validation
  if (platform === 'linkedin') {
    if (result.title && result.title.includes(result.company)) {
      issues.push('Job title contains company name (LinkedIn-specific issue)');
      suggestions.push('Clean job title to remove company name duplication');
    }
  }
  
  if (platform === 'workday') {
    if (!result.confidence || result.confidence.overall < 0.8) {
      suggestions.push('Workday sites have reliable data-automation-id attributes - check for missed elements');
    }
  }
  
  // Confidence validation
  const overallConfidence = result.confidence?.overall || 0;
  if (overallConfidence < config.confidenceThresholds.low) {
    issues.push(`Confidence below platform threshold (${config.confidenceThresholds.low})`);
    suggestions.push('Consider manual review or retry with different parsing strategy');
  }
  
  return {
    isValid: issues.length === 0 && overallConfidence >= config.confidenceThresholds.low,
    confidence: overallConfidence,
    issues,
    suggestions
  };
}

/**
 * Get learning examples for platform improvement
 */
export function getLearningExamples(platform: string): FewShotExample[] {
  const config = getSpecializedPromptConfig(platform);
  return config.examples.filter(ex => ex.confidence >= 0.85);
}

/**
 * Dynamically improve prompts based on success/failure patterns
 */
export function updatePromptWithLearning(
  platform: string,
  successfulExtractions: Array<{ input: string; output: string; confidence: number }>,
  failedExtractions: Array<{ input: string; error: string }>
): SpecializedPromptConfig {
  const baseConfig = getSpecializedPromptConfig(platform);
  
  // Add successful extractions as new examples
  const newExamples: FewShotExample[] = successfulExtractions
    .filter(extraction => extraction.confidence >= 0.9)
    .slice(0, 3) // Limit to top 3 to avoid prompt bloat
    .map(extraction => ({
      input: extraction.input,
      expectedOutput: extraction.output,
      platform,
      confidence: extraction.confidence,
      notes: 'Learned from successful parsing'
    }));
  
  // Analyze failures to improve validation rules
  const commonFailurePatterns = failedExtractions
    .map(failure => failure.error)
    .reduce((patterns, error) => {
      const key = error.toLowerCase();
      patterns[key] = (patterns[key] || 0) + 1;
      return patterns;
    }, {} as Record<string, number>);
  
  const newValidationRules = Object.entries(commonFailurePatterns)
    .filter(([_, count]) => count >= 2) // At least 2 occurrences
    .map(([pattern]) => `Avoid pattern that caused: ${pattern}`)
    .slice(0, 2); // Limit additions
  
  return {
    ...baseConfig,
    examples: [...baseConfig.examples, ...newExamples].slice(0, 5), // Max 5 examples
    validationRules: [...baseConfig.validationRules, ...newValidationRules]
  };
}