/**
 * Specialized WebLLM prompts for job parsing optimization
 * Designed to maximize extraction accuracy and consistency
 */

export interface JobParsingContext {
  url?: string;
  domain?: string;
  platform?: string;
  htmlContent?: string;
  contentLength?: number;
}

export interface JobParsingPrompt {
  systemPrompt: string;
  userPrompt: string;
  fewShotExamples?: Array<{
    input: string;
    expectedOutput: string;
  }>;
}

/**
 * Generate optimized system prompt for job field extraction
 */
export function generateJobParsingPrompt(context: JobParsingContext): JobParsingPrompt {
  const { url, domain, platform, contentLength } = context;

  const systemPrompt = `You are a professional job posting analyzer with expertise in extracting structured data from job listings. Your task is to analyze job posting content and extract key information with high accuracy.

CRITICAL INSTRUCTIONS:
1. Extract ONLY the information that is explicitly present in the content
2. Do NOT make assumptions or fill in missing information
3. Use exactly the format specified in the response schema
4. Be conservative with confidence scores - only use high confidence (>0.9) when completely certain
5. If information is ambiguous or unclear, use lower confidence scores (0.6-0.8)
6. For missing or unavailable information, return null values with 0.0 confidence

RESPONSE FORMAT (JSON only):
{
  "title": "exact job title from posting",
  "company": "exact company name",
  "location": "exact location (city, state/country)",
  "remote": boolean,
  "confidence": {
    "title": 0.0-1.0,
    "company": 0.0-1.0,
    "location": 0.0-1.0,
    "overall": 0.0-1.0
  },
  "extractionNotes": "brief notes about extraction quality or challenges"
}

${platform ? `PLATFORM CONTEXT: This is a ${platform} job posting` : ''}
${domain ? `DOMAIN CONTEXT: Source domain is ${domain}` : ''}
${contentLength ? `CONTENT LENGTH: ${contentLength} characters` : ''}

CONFIDENCE SCORING GUIDELINES:
- 0.95-1.0: Information is explicitly stated, clearly visible, no ambiguity
- 0.85-0.94: Information is present but may have minor formatting variations
- 0.70-0.84: Information is present but requires interpretation or has some ambiguity
- 0.50-0.69: Information is partially present or inferred from context
- 0.30-0.49: Information is unclear or potentially incorrect
- 0.0-0.29: Information is missing, unavailable, or highly uncertain`;

  const userPrompt = url 
    ? `Analyze this job posting content from ${url} and extract the required information:`
    : 'Analyze this job posting content and extract the required information:';

  // Add few-shot examples for better performance
  const fewShotExamples = generateFewShotExamples(platform);

  return {
    systemPrompt,
    userPrompt,
    fewShotExamples
  };
}

/**
 * Generate platform-specific few-shot examples
 */
function generateFewShotExamples(platform?: string): Array<{input: string; expectedOutput: string}> {
  const baseExamples = [
    {
      input: `<div class="job-title">Senior Software Engineer - React</div>
<div class="company-name">TechCorp Inc.</div>
<div class="location">San Francisco, CA</div>
<div class="remote-badge">Remote Friendly</div>`,
      expectedOutput: `{
  "title": "Senior Software Engineer - React",
  "company": "TechCorp Inc.",
  "location": "San Francisco, CA",
  "remote": true,
  "confidence": {
    "title": 0.95,
    "company": 0.95,
    "location": 0.95,
    "overall": 0.95
  },
  "extractionNotes": "Clear, well-structured job posting with explicit remote indication"
}`
    },
    {
      input: `Job Title: Data Analyst
Company: StartupXYZ
Location: New York, NY (On-site)
We are looking for a data analyst to join our team...`,
      expectedOutput: `{
  "title": "Data Analyst",
  "company": "StartupXYZ", 
  "location": "New York, NY",
  "remote": false,
  "confidence": {
    "title": 0.90,
    "company": 0.90,
    "location": 0.90,
    "overall": 0.90
  },
  "extractionNotes": "Clear job information with explicit on-site requirement"
}`
    }
  ];

  // Add platform-specific examples
  if (platform === 'linkedin') {
    baseExamples.push({
      input: `<h1 class="t-24 t-bold jobs-unified-top-card__job-title">Product Manager</h1>
<a class="jobs-unified-top-card__company-name">LinkedIn</a>
<span class="jobs-unified-top-card__subtitle-primary">Mountain View, CA</span>`,
      expectedOutput: `{
  "title": "Product Manager",
  "company": "LinkedIn",
  "location": "Mountain View, CA", 
  "remote": false,
  "confidence": {
    "title": 0.95,
    "company": 0.95,
    "location": 0.90,
    "overall": 0.93
  },
  "extractionNotes": "LinkedIn job posting with standard class structure"
}`
    });
  }

  if (platform === 'workday') {
    baseExamples.push({
      input: `<div data-automation-id="jobTitle">Software Development Engineer</div>
<div data-automation-id="jobCompany">Amazon</div>
<div data-automation-id="jobLocation">Seattle, WA, United States</div>`,
      expectedOutput: `{
  "title": "Software Development Engineer",
  "company": "Amazon",
  "location": "Seattle, WA, United States",
  "remote": false,
  "confidence": {
    "title": 0.95,
    "company": 0.95,
    "location": 0.95,
    "overall": 0.95
  },
  "extractionNotes": "Workday job posting with clear data-automation-id attributes"
}`
    });
  }

  return baseExamples;
}

/**
 * Generate validation prompt for cross-checking extracted data
 */
export function generateValidationPrompt(
  extractedData: any,
  _originalContent: string,
  context: JobParsingContext
): JobParsingPrompt {
  const systemPrompt = `You are a job posting validation expert. Your task is to verify the accuracy of extracted job information against the original content.

VALIDATION CRITERIA:
1. Check if the extracted title matches what's in the content
2. Verify the company name is accurate and complete
3. Confirm the location information is correct
4. Validate the remote work classification
5. Assess overall extraction quality

RESPONSE FORMAT (JSON only):
{
  "validationResults": {
    "title": {
      "isAccurate": boolean,
      "confidence": 0.0-1.0,
      "issues": ["list of any issues found"]
    },
    "company": {
      "isAccurate": boolean, 
      "confidence": 0.0-1.0,
      "issues": ["list of any issues found"]
    },
    "location": {
      "isAccurate": boolean,
      "confidence": 0.0-1.0,
      "issues": ["list of any issues found"]
    },
    "remote": {
      "isAccurate": boolean,
      "confidence": 0.0-1.0,
      "issues": ["list of any issues found"]
    }
  },
  "overallValidation": {
    "isAccurate": boolean,
    "confidence": 0.0-1.0,
    "recommendedAction": "accept" | "review" | "reject",
    "validationNotes": "summary of validation findings"
  }
}

EXTRACTED DATA TO VALIDATE:
${JSON.stringify(extractedData, null, 2)}

${context.platform ? `PLATFORM CONTEXT: ${context.platform}` : ''}
${context.domain ? `DOMAIN CONTEXT: ${context.domain}` : ''}`;

  const userPrompt = 'Please validate the extracted job information against this original content:';

  return {
    systemPrompt,
    userPrompt
  };
}

/**
 * Generate enhanced parsing prompt with context awareness
 */
export function generateContextAwarePrompt(
  context: JobParsingContext,
  previousAttempts?: Array<{error: string; extractedData?: any}>
): JobParsingPrompt {
  let contextualInstructions = '';

  // Add domain-specific guidance
  if (context.domain?.includes('workday')) {
    contextualInstructions += `
WORKDAY PLATFORM GUIDANCE:
- Look for data-automation-id attributes for reliable data
- Job titles are typically in elements with data-automation-id="jobTitle"  
- Company names in data-automation-id="jobCompany"
- Locations in data-automation-id="jobLocation"`;
  }

  if (context.domain?.includes('linkedin')) {
    contextualInstructions += `
LINKEDIN PLATFORM GUIDANCE:
- Job titles often in h1 elements with jobs-unified-top-card__job-title class
- Company names in jobs-unified-top-card__company-name class
- Locations in jobs-unified-top-card__subtitle-primary class`;
  }

  if (context.domain?.includes('greenhouse')) {
    contextualInstructions += `
GREENHOUSE PLATFORM GUIDANCE:
- Look for structured data in job posting headers
- Company names often in page title or header elements
- Locations may be in subtitle or metadata sections`;
  }

  // Add guidance based on previous failures
  if (previousAttempts && previousAttempts.length > 0) {
    contextualInstructions += `
PREVIOUS ATTEMPT ANALYSIS:
Based on ${previousAttempts.length} previous attempt(s), pay special attention to:`;
    
    previousAttempts.forEach((attempt, index) => {
      contextualInstructions += `
- Attempt ${index + 1} failed with: ${attempt.error}`;
      if (attempt.extractedData) {
        contextualInstructions += ` (extracted: ${JSON.stringify(attempt.extractedData)})`;
      }
    });
    
    contextualInstructions += `
Please address these previous issues in your analysis.`;
  }

  const basePrompt = generateJobParsingPrompt(context);
  
  return {
    systemPrompt: basePrompt.systemPrompt + contextualInstructions,
    userPrompt: basePrompt.userPrompt,
    fewShotExamples: basePrompt.fewShotExamples
  };
}

/**
 * Create complete message array for WebLLM
 */
export function createJobParsingMessages(
  prompt: JobParsingPrompt,
  htmlContent: string
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: prompt.systemPrompt }
  ];

  // Add few-shot examples if available
  if (prompt.fewShotExamples && prompt.fewShotExamples.length > 0) {
    prompt.fewShotExamples.forEach(example => {
      messages.push(
        { role: 'user', content: `Example content:\n${example.input}` },
        { role: 'assistant', content: example.expectedOutput }
      );
    });
  }

  // Add the actual parsing request
  messages.push({
    role: 'user',
    content: `${prompt.userPrompt}\n\n${htmlContent}`
  });

  return messages;
}