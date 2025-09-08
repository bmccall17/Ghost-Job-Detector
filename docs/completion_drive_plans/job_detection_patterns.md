# Job Listing Detection Patterns Plan - Ghost Job Detector
## Comprehensive Pattern Recognition for Job vs Non-Job Content Detection

### CONTEXT
Building on the established URL validation plan, this document defines specific detection patterns to accurately identify legitimate job postings versus company pages, career listings, and non-job content. This plan integrates with the existing URLValidationService and ContentClassificationService to provide enhanced pattern recognition capabilities.

### PROBLEM ANALYSIS

**Current State:**
- Basic URL validation exists with job keyword detection (URLValidationService)
- Content classification service provides ML-based content analysis
- Missing platform-specific pattern recognition
- Limited edge case handling for ambiguous content
- No comprehensive anti-pattern detection for non-job content

**Gap Identification:**
1. **Platform-Specific Intelligence**: Need detailed URL patterns for major platforms
2. **Content Indicators**: Advanced HTML/metadata detection beyond keywords
3. **Anti-Pattern Recognition**: Strong indicators of non-job content
4. **Edge Case Handling**: Ambiguous content classification
5. **Confidence Scoring**: Granular scoring for pattern matches

### SOLUTION ARCHITECTURE

#### Phase 1: Platform-Specific URL Pattern Enhancement

**1.1 LinkedIn Job Detection Patterns**
```typescript
const LINKEDIN_JOB_PATTERNS = {
  // Exact job posting patterns (High Confidence: 0.95-1.0)
  exact: [
    /linkedin\.com\/jobs\/view\/\d+/i,                           // /jobs/view/12345678
    /linkedin\.com\/jobs\/collections\/[^\/]+\/jobs\/\d+/i,      // /jobs/collections/recommended/jobs/12345
    /linkedin\.com\/comm\/jobs\/view\/\d+/i,                     // Mobile app links
  ],
  
  // Job search/listing patterns (Medium Confidence: 0.6-0.8)  
  listings: [
    /linkedin\.com\/jobs\/search/i,                              // Job search results
    /linkedin\.com\/jobs\/collections/i,                         // Job collections
    /linkedin\.com\/jobs\?/i,                                    // Jobs with query params
  ],
  
  // Anti-patterns (Reject: 0.0-0.2)
  antiPatterns: [
    /linkedin\.com\/in\//i,                                      // Profile pages
    /linkedin\.com\/company\//i,                                 // Company pages
    /linkedin\.com\/feed/i,                                      // Feed/home
    /linkedin\.com\/learning/i,                                  // LinkedIn Learning
    /linkedin\.com\/groups/i,                                    // Groups
  ]
};
```

**1.2 Indeed Job Detection Patterns**
```typescript
const INDEED_JOB_PATTERNS = {
  // Exact job posting patterns (High Confidence: 0.95-1.0)
  exact: [
    /indeed\.com\/viewjob\?jk=[\w\d]+/i,                        // /viewjob?jk=abc123def
    /indeed\.com\/.*\/jobs\/[\w\d-]+/i,                         // Regional jobs with ID
    /[a-z]{2}\.indeed\.com\/viewjob\?jk=[\w\d]+/i,              // International domains
  ],
  
  // Job search patterns (Medium Confidence: 0.6-0.8)
  listings: [
    /indeed\.com\/jobs/i,                                       // Job search results
    /indeed\.com\/q-.*-jobs/i,                                  // Query-based job search
  ],
  
  // Anti-patterns (Reject: 0.0-0.2)
  antiPatterns: [
    /indeed\.com\/career-advice/i,                              // Career advice articles
    /indeed\.com\/companies/i,                                  // Company reviews
    /indeed\.com\/hire/i,                                       // Employer tools
    /indeed\.com\/about/i,                                      // About pages
  ]
};
```

**1.3 Workday ATS Detection Patterns**
```typescript
const WORKDAY_JOB_PATTERNS = {
  // Company-specific Workday instances (High Confidence: 0.9-0.95)
  exact: [
    /[\w\-]+\.myworkdayjobs\.com\/[\w\-]+\/job\/[\w\-\/]+\/[\w\d-]+/i,    // Full job URL
    /[\w\-]+\.myworkdayjobs\.com\/[\w\-]+\/jobs\/[\w\d-]+/i,              // Alternative format
    /workday\.com\/.*\/job\//i,                                           // Direct workday jobs
  ],
  
  // Company career site detection
  domainPatterns: [
    /[\w\-]+\.myworkdayjobs\.com/i,                             // Standard Workday format
  ],
  
  // URL structure analysis for company extraction
  companyExtraction: {
    pattern: /^https?:\/\/([\w\-]+)\.myworkdayjobs\.com/i,
    group: 1  // Extract company name from subdomain
  },
  
  // Anti-patterns (Reject: 0.0-0.2)
  antiPatterns: [
    /workday\.com\/.*\/login/i,                                 // Login pages
    /workday\.com\/en-us\/applications/i,                       // Product pages
    /workday\.com\/en-us\/company/i,                           // Company info
  ]
};
```

**1.4 Greenhouse ATS Detection Patterns**
```typescript
const GREENHOUSE_JOB_PATTERNS = {
  // Job posting patterns (High Confidence: 0.9-0.95)
  exact: [
    /boards\.greenhouse\.io\/[\w\-]+\/jobs\/\d+/i,              // /company/jobs/1234567
    /[\w\-]+\.greenhouse\.io\/jobs\/[\w\d-]+/i,                 // Custom domain jobs
    /greenhouse\.io\/[\w\-]+\/jobs\/\d+/i,                     // Alternative format
  ],
  
  // Company extraction patterns
  companyExtraction: {
    boardsPattern: /boards\.greenhouse\.io\/([\w\-]+)\/jobs/i,
    customDomainPattern: /^([\w\-]+)\.greenhouse\.io/i
  },
  
  // Anti-patterns (Reject: 0.0-0.2)
  antiPatterns: [
    /greenhouse\.io\/(?!.*jobs)/i,                             // Non-job Greenhouse pages
    /support\.greenhouse\.io/i,                                // Support documentation
    /app\.greenhouse\.io/i,                                    // Application interface
  ]
};
```

**1.5 Lever.co ATS Detection Patterns**
```typescript
const LEVER_JOB_PATTERNS = {
  // Job posting patterns (High Confidence: 0.9-0.95)
  exact: [
    /jobs\.lever\.co\/[\w\-]+\/[\w\d-]+/i,                     // /company/job-id-slug
    /[\w\-]+\.lever\.co\/jobs\/[\w\d-]+/i,                     // Custom domain format
  ],
  
  // Company extraction and title cleaning
  companyExtraction: {
    pattern: /jobs\.lever\.co\/([\w\-]+)\//i,
    group: 1
  },
  
  titleCleaning: {
    // Remove common Lever suffixes/prefixes
    patterns: [
      /\s*-\s*[\w\s]+$/i,                                      // Remove " - Company Name"
      /^\[\w+\]\s*/i,                                          // Remove "[Location]" prefix
    ]
  },
  
  // Anti-patterns (Reject: 0.0-0.2) 
  antiPatterns: [
    /lever\.co\/(?!jobs)/i,                                    // Non-jobs Lever pages
    /help\.lever\.co/i,                                        // Help documentation
    /hire\.lever\.co/i,                                        // Employer tools
  ]
};
```

**1.6 Generic Career Site Patterns**
```typescript
const GENERIC_CAREER_PATTERNS = {
  // Direct job posting indicators (High Confidence: 0.8-0.9)
  exact: [
    /\/careers?\/(?:openings?|positions?|jobs?)\/[\w\d-]+/i,   // /careers/jobs/software-engineer
    /\/jobs?\/[\w\d-]+/i,                                      // /jobs/data-scientist-remote
    /\/positions?\/[\w\d-]+/i,                                 // /positions/product-manager
    /\/openings?\/[\w\d-]+/i,                                  // /openings/senior-developer
    /\/apply\/[\w\d-]+/i,                                      // /apply/marketing-coordinator
    /\/job-details\/[\w\d-]+/i,                                // /job-details/financial-analyst
  ],
  
  // Query parameter job identifiers (High Confidence: 0.85-0.95)
  queryParams: [
    /[?&](?:job|position|role)(?:_?id)?=[\w\d-]+/i,           // ?jobId=abc-123
    /[?&]req(?:uisition)?(?:_?id)?=[\w\d-]+/i,                // ?reqId=REQ-2024-001
    /[?&]vacancy=[\w\d-]+/i,                                   // ?vacancy=senior-engineer
    /[?&]posting=[\w\d-]+/i,                                   // ?posting=product-lead
  ],
  
  // Career listing patterns (Medium Confidence: 0.4-0.6)
  listings: [
    /\/careers?\/?$/i,                                         // /careers (root)
    /\/jobs?\/?$/i,                                            // /jobs (root)
    /\/employment\/?$/i,                                       // /employment
    /\/opportunities\/?$/i,                                    // /opportunities
    /\/work-with-us\/?$/i,                                     // /work-with-us
    /\/join(?:-us)?\/?$/i,                                     // /join-us
  ]
};
```

**PLAN_UNCERTAINTY**: The confidence scores for generic career patterns may need adjustment based on real-world testing. Different companies use varying URL structures, so these patterns might need expansion after collecting data from actual implementations.

#### Phase 2: Content-Based Detection Enhancement

**2.1 HTML Structured Data Detection**
```typescript
const STRUCTURED_DATA_INDICATORS = {
  // Schema.org JobPosting (Highest Confidence: 0.95-1.0)
  schemaJobPosting: [
    { pattern: /"@type":\s*"JobPosting"/i, weight: 0.9, name: 'schema_job_posting' },
    { pattern: /"hiringOrganization"/i, weight: 0.8, name: 'hiring_organization' },
    { pattern: /"jobTitle"/i, weight: 0.7, name: 'job_title_schema' },
    { pattern: /"jobLocation"/i, weight: 0.7, name: 'job_location_schema' },
    { pattern: /"datePosted"/i, weight: 0.6, name: 'date_posted_schema' },
    { pattern: /"employmentType"/i, weight: 0.6, name: 'employment_type_schema' },
    { pattern: /"baseSalary"/i, weight: 0.5, name: 'salary_schema' },
  ],
  
  // Open Graph job metadata (High Confidence: 0.8-0.9)
  openGraph: [
    { pattern: /<meta\s+property="og:type"\s+content="job"/i, weight: 0.8, name: 'og_job_type' },
    { pattern: /<meta\s+property="job:title"/i, weight: 0.7, name: 'og_job_title' },
    { pattern: /<meta\s+property="job:company"/i, weight: 0.6, name: 'og_job_company' },
    { pattern: /<meta\s+property="job:location"/i, weight: 0.5, name: 'og_job_location' },
  ],
  
  // Microdata job indicators (Medium Confidence: 0.6-0.8)
  microdata: [
    { pattern: /itemtype="http:\/\/schema\.org\/JobPosting"/i, weight: 0.8, name: 'microdata_job' },
    { pattern: /itemprop="title"/i, weight: 0.4, name: 'microdata_title' },
    { pattern: /itemprop="hiringOrganization"/i, weight: 0.5, name: 'microdata_organization' },
  ]
};
```

**2.2 Job Application Element Detection**
```typescript
const JOB_APPLICATION_ELEMENTS = {
  // Application buttons/forms (High Confidence: 0.8-0.9)
  applicationElements: [
    { pattern: /<button[^>]*>(?:[^<]*apply[^<]*)<\/button>/i, weight: 0.8, name: 'apply_button' },
    { pattern: /<a[^>]*href="[^"]*apply[^"]*"[^>]*>(?:[^<]*apply[^<]*)<\/a>/i, weight: 0.7, name: 'apply_link' },
    { pattern: /<form[^>]*(?:application|apply)[^>]*>/i, weight: 0.9, name: 'application_form' },
    { pattern: /<input[^>]*(?:resume|cv)[^>]*>/i, weight: 0.6, name: 'resume_upload' },
  ],
  
  // Job-specific form fields (Medium Confidence: 0.6-0.7)
  jobFormFields: [
    { pattern: /<input[^>]*name="[^"]*(?:cover.?letter|motivation)[^"]*"/i, weight: 0.5, name: 'cover_letter_field' },
    { pattern: /<select[^>]*name="[^"]*(?:experience.?level|years.?experience)[^"]*"/i, weight: 0.4, name: 'experience_field' },
    { pattern: /<input[^>]*name="[^"]*portfolio[^"]*"/i, weight: 0.3, name: 'portfolio_field' },
  ],
  
  // Application instructions (Medium Confidence: 0.5-0.6)
  applicationInstructions: [
    { pattern: /how to apply/i, weight: 0.5, name: 'application_instructions' },
    { pattern: /send (?:your )?(?:resume|cv)/i, weight: 0.4, name: 'resume_instructions' },
    { pattern: /email (?:your application|us)/i, weight: 0.4, name: 'email_instructions' },
  ]
};
```

**2.3 Job-Specific Content Patterns**
```typescript
const JOB_CONTENT_PATTERNS = {
  // Salary and compensation (High Confidence: 0.7-0.8)
  compensation: [
    { pattern: /\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*(?:per|\/)\s*(?:year|hour|month))?/i, weight: 0.7, name: 'salary_range' },
    { pattern: /\d+k\s*-?\s*\d*k?\s*(?:per\s*year|annually|\/year)/i, weight: 0.6, name: 'salary_k_format' },
    { pattern: /competitive\s+(?:salary|compensation|pay)/i, weight: 0.4, name: 'competitive_salary' },
    { pattern: /benefits?\s*(?:package|offered|include)/i, weight: 0.5, name: 'benefits_mention' },
  ],
  
  // Job requirements and qualifications (High Confidence: 0.6-0.8)
  requirements: [
    { pattern: /(?:requirements?|qualifications?):/i, weight: 0.7, name: 'requirements_section' },
    { pattern: /(?:\d+\+?\s*years?\s+(?:of\s+)?experience)/i, weight: 0.6, name: 'experience_requirement' },
    { pattern: /(?:bachelor'?s?|master'?s?|phd)\s+degree/i, weight: 0.5, name: 'degree_requirement' },
    { pattern: /(?:must\s+have|required|essential):/i, weight: 0.5, name: 'mandatory_requirements' },
  ],
  
  // Job responsibilities (Medium Confidence: 0.5-0.7)
  responsibilities: [
    { pattern: /(?:responsibilities?|duties?):/i, weight: 0.6, name: 'responsibilities_section' },
    { pattern: /you\s+will\s+(?:be\s+)?(?:responsible\s+for|lead|manage|develop)/i, weight: 0.5, name: 'responsibility_description' },
    { pattern: /(?:key\s+)?(?:tasks?|activities?)(?:\s+include)?:/i, weight: 0.4, name: 'tasks_section' },
  ],
  
  // Employment details (Medium Confidence: 0.4-0.6)
  employmentDetails: [
    { pattern: /(?:full.?time|part.?time|contract|temporary|permanent|remote|hybrid|on.?site)/i, weight: 0.4, name: 'employment_type' },
    { pattern: /(?:start\s+date|available\s+(?:from|on)|immediate\s+start)/i, weight: 0.3, name: 'start_date' },
    { pattern: /(?:location|based\s+in|office\s+located)/i, weight: 0.3, name: 'location_info' },
  ]
};
```

**PLAN_UNCERTAINTY**: The weight values for content patterns need to be calibrated against real job posting data. The current weights are estimates that should be refined through testing with actual job postings versus non-job content.

#### Phase 3: Anti-Pattern Detection (Non-Job Content)

**3.1 Company Homepage Anti-Patterns**
```typescript
const COMPANY_HOMEPAGE_ANTI_PATTERNS = {
  // Root domain patterns (Very High Rejection: 0.9-1.0)
  rootPages: [
    /^https?:\/\/(?:www\.)?[\w\-]+\.com\/?$/i,                 // company.com
    /^https?:\/\/(?:www\.)?[\w\-]+\.(?:org|net|io|co)\/?$/i,   // company.org/net/io/co
    /\/(?:index|home|default)\.(?:html?|php|asp)$/i,           // /index.html
  ],
  
  // About/company sections (High Rejection: 0.8-0.9)
  aboutPages: [
    /\/about(?:-us)?(?:\/|$)/i,                                // /about, /about-us
    /\/company(?:\/|$)/i,                                      // /company
    /\/who-we-are(?:\/|$)/i,                                   // /who-we-are
    /\/our-(?:story|mission|vision|values|team)(?:\/|$)/i,     // /our-story, etc.
    /\/leadership(?:\/|$)/i,                                   // /leadership
    /\/management(?:\/|$)/i,                                   // /management
  ],
  
  // Product/service pages (High Rejection: 0.8-0.9)
  productPages: [
    /\/(?:products?|services?|solutions?)(?:\/|$)/i,           // /products, /services
    /\/features?(?:\/|$)/i,                                    // /features
    /\/pricing(?:\/|$)/i,                                      // /pricing
    /\/plans?(?:\/|$)/i,                                       // /plans
    /\/demo(?:\/|$)/i,                                         // /demo
  ],
  
  // Support/contact pages (Medium Rejection: 0.7-0.8)
  supportPages: [
    /\/(?:contact|support|help)(?:\/|$)/i,                     // /contact, /support
    /\/faq(?:s)?(?:\/|$)/i,                                    // /faq, /faqs
    /\/documentation?(?:\/|$)/i,                               // /documentation
    /\/resources?(?:\/|$)/i,                                   // /resources
  ],
  
  // Legal/policy pages (High Rejection: 0.9-1.0)
  legalPages: [
    /\/(?:privacy|terms|legal|cookies?)(?:\/|$)/i,             // Privacy/legal pages
    /\/(?:terms-of-(?:service|use)|tos)(?:\/|$)/i,            // Terms of service
    /\/(?:gdpr|ccpa|data-protection)(?:\/|$)/i,               // Data protection
  ]
};
```

**3.2 Content-Based Anti-Patterns**
```typescript
const CONTENT_ANTI_PATTERNS = {
  // Blog/news content indicators (High Rejection: 0.8-0.9)
  blogContent: [
    { pattern: /(?:published|posted)\s+(?:on|by)/i, weight: 0.7, name: 'blog_post_meta' },
    { pattern: /(?:read\s+more|continue\s+reading)/i, weight: 0.6, name: 'blog_continuation' },
    { pattern: /(?:tags?|categories?):/i, weight: 0.5, name: 'blog_taxonomy' },
    { pattern: /(?:share\s+this|social\s+media)/i, weight: 0.4, name: 'social_sharing' },
    { pattern: /(?:comments?|leave\s+a\s+reply)/i, weight: 0.6, name: 'blog_comments' },
  ],
  
  // News article patterns (High Rejection: 0.8-0.9)
  newsContent: [
    { pattern: /(?:breaking\s+news|latest\s+news)/i, weight: 0.8, name: 'news_breaking' },
    { pattern: /(?:reporter|correspondent|editor):/i, weight: 0.7, name: 'news_byline' },
    { pattern: /(?:press\s+release|announcement)/i, weight: 0.6, name: 'press_release' },
    { pattern: /(?:subscribe\s+to\s+newsletter)/i, weight: 0.4, name: 'news_subscription' },
  ],
  
  // E-commerce patterns (High Rejection: 0.9-1.0)
  ecommerce: [
    { pattern: /(?:add\s+to\s+cart|buy\s+now|purchase)/i, weight: 0.9, name: 'ecommerce_cart' },
    { pattern: /(?:price|cost):\s*\$[\d,]+/i, weight: 0.8, name: 'product_price' },
    { pattern: /(?:in\s+stock|out\s+of\s+stock|inventory)/i, weight: 0.7, name: 'inventory_status' },
    { pattern: /(?:shipping|delivery|returns?)/i, weight: 0.5, name: 'shipping_info' },
  ],
  
  // Marketing/promotional content (Medium Rejection: 0.6-0.8)
  marketing: [
    { pattern: /(?:free\s+trial|sign\s+up\s+now|get\s+started)/i, weight: 0.6, name: 'marketing_cta' },
    { pattern: /(?:limited\s+time|special\s+offer|discount)/i, weight: 0.7, name: 'promotional_offer' },
    { pattern: /(?:testimonials?|customer\s+reviews)/i, weight: 0.4, name: 'customer_feedback' },
  ]
};
```

**3.3 Navigation and Layout Anti-Patterns**
```typescript
const NAVIGATION_ANTI_PATTERNS = {
  // Main navigation indicators (Medium Rejection: 0.6-0.7)
  mainNavigation: [
    { pattern: /<nav[^>]*>[\s\S]*?(?:home|about|products|services|contact)[\s\S]*?<\/nav>/i, weight: 0.6, name: 'main_nav_structure' },
    { pattern: /<(?:ul|ol)[^>]*(?:class|id)="[^"]*(?:nav|menu)[^"]*"[^>]*>[\s\S]*?<\/(?:ul|ol)>/i, weight: 0.5, name: 'navigation_list' },
    { pattern: /(?:header|nav)[^>]*>[\s\S]*?(?:logo|brand)[\s\S]*?<\/(?:header|nav)/i, weight: 0.4, name: 'header_branding' },
  ],
  
  // Homepage layout patterns (Medium Rejection: 0.5-0.7)
  homepageLayout: [
    { pattern: /<(?:section|div)[^>]*(?:class|id)="[^"]*(?:hero|banner|jumbotron)[^"]*"/i, weight: 0.6, name: 'hero_section' },
    { pattern: /(?:welcome\s+to|leading\s+provider|innovative\s+solutions)/i, weight: 0.5, name: 'homepage_copy' },
    { pattern: /<footer[\s\S]*?(?:copyright|©|\&copy;)[\s\S]*?<\/footer>/i, weight: 0.3, name: 'copyright_footer' },
  ]
};
```

#### Phase 4: Edge Case Handling

**4.1 Career Page Listings (Multiple Jobs)**
```typescript
const CAREER_LISTING_DETECTION = {
  // Multiple job indicators (Conditional Processing)
  multipleJobIndicators: [
    { pattern: /(?:view\s+all\s+(?:jobs?|positions?|openings?))/i, weight: 0.7, name: 'view_all_jobs' },
    { pattern: /(?:\d+\s+(?:jobs?|positions?|openings?)\s+(?:available|found))/i, weight: 0.8, name: 'job_count' },
    { pattern: /<(?:ul|ol)[^>]*>[\s\S]*?(?:(?:<li[^>]*>[\s\S]*?<\/li>\s*){3,})[\s\S]*?<\/(?:ul|ol)>/i, weight: 0.6, name: 'job_list_structure' },
    { pattern: /(?:filter\s+by|sort\s+by|search\s+jobs?)/i, weight: 0.5, name: 'job_filtering' },
  ],
  
  // Single job extraction from listings
  individualJobLinks: [
    { pattern: /<a[^>]*href="([^"]*(?:job|position|opening)[^"]*)"[^>]*>((?:(?!<\/a>).)*)<\/a>/gi, name: 'job_link_extraction' },
    { pattern: /<(?:div|section)[^>]*(?:class|id)="[^"]*job[^"]*"[^>]*>[\s\S]*?<\/(?:div|section)>/gi, name: 'job_card_structure' },
  ],
  
  // Classification thresholds
  thresholds: {
    SINGLE_JOB: 1,      // Exactly one job posting
    MULTIPLE_JOBS: 2,   // 2-10 job postings (manageable)
    JOB_BOARD: 10,      // 10+ job postings (requires filtering)
  }
};
```

**4.2 Expired/Removed Job Postings**
```typescript
const EXPIRED_JOB_DETECTION = {
  // Expiration indicators (Medium Confidence: 0.6-0.8)
  expirationPatterns: [
    { pattern: /(?:job\s+(?:has\s+)?expired|position\s+(?:is\s+)?no\s+longer\s+available)/i, weight: 0.9, name: 'explicit_expiration' },
    { pattern: /(?:application\s+deadline\s+(?:has\s+)?passed|applications?\s+closed)/i, weight: 0.8, name: 'deadline_passed' },
    { pattern: /(?:position\s+(?:has\s+been\s+)?filled|we\s+are\s+no\s+longer\s+accepting)/i, weight: 0.7, name: 'position_filled' },
    { pattern: /404|page\s+not\s+found|content\s+not\s+available/i, weight: 0.6, name: 'content_missing' },
  ],
  
  // Date-based expiration detection
  dateAnalysis: {
    // Check meta tags for posting dates
    metaDateExtraction: [
      /<meta[^>]*name="(?:date|published|created)"[^>]*content="([^"]+)"/gi,
      /<meta[^>]*property="(?:article:published_time|datePublished)"[^>]*content="([^"]+)"/gi,
    ],
    
    // Age thresholds (configurable)
    expirationThresholds: {
      HIGH_RISK: 6 * 30 * 24 * 60 * 60 * 1000,    // 6 months
      MEDIUM_RISK: 3 * 30 * 24 * 60 * 60 * 1000,  // 3 months
      LOW_RISK: 30 * 24 * 60 * 60 * 1000,         // 1 month
    }
  }
};
```

**4.3 Login-Protected Job Portals**
```typescript
const AUTH_REQUIRED_DETECTION = {
  // Authentication requirement patterns (Medium Confidence: 0.6-0.8)
  authPatterns: [
    { pattern: /(?:login\s+required|please\s+(?:log\s+in|sign\s+in))/i, weight: 0.8, name: 'login_required' },
    { pattern: /(?:unauthorized|access\s+denied|restricted\s+access)/i, weight: 0.7, name: 'access_denied' },
    { pattern: /(?:member\s+only|subscription\s+required)/i, weight: 0.6, name: 'membership_required' },
  ],
  
  // Login form detection
  loginFormIndicators: [
    { pattern: /<form[^>]*>[\s\S]*?(?:email|username)[\s\S]*?password[\s\S]*?<\/form>/i, weight: 0.7, name: 'login_form' },
    { pattern: /<input[^>]*type="password"/i, weight: 0.6, name: 'password_field' },
    { pattern: /(?:sign\s+in|log\s+in|login)\s+button/i, weight: 0.5, name: 'login_button' },
  ],
  
  // Handling strategies
  authHandlingStrategy: {
    BLOCK: 'Reject URLs that require authentication',
    DEGRADE: 'Process with reduced confidence and warn user',
    BYPASS: 'Attempt to extract visible content without authentication'
  }
};
```

**4.4 PDF Job Descriptions**
```typescript
const PDF_JOB_DETECTION = {
  // PDF link detection
  pdfPatterns: [
    { pattern: /\.pdf(?:\?[^"'\s]*)?$/i, weight: 1.0, name: 'pdf_extension' },
    { pattern: /(?:application|content-type):\s*application\/pdf/i, weight: 0.9, name: 'pdf_content_type' },
    { pattern: /(?:job\s+description|position\s+details).*\.pdf/i, weight: 0.8, name: 'job_pdf_title' },
  ],
  
  // PDF processing integration
  processingStrategy: {
    EXTRACT_TEXT: 'Use PDF text extraction for content analysis',
    METADATA_ONLY: 'Rely on URL patterns and filename analysis',
    SKIP: 'Reject PDF jobs (requires text extraction capability)'
  },
  
  // Filename analysis for job relevance
  filenamePatterns: [
    { pattern: /(?:job|position|role|career)[-_\s](?:description|posting|details)/i, weight: 0.7, name: 'job_filename' },
    { pattern: /(?:software|developer|engineer|manager|analyst)[-_\s]/i, weight: 0.5, name: 'job_title_filename' },
  ]
};
```

**PLAN_UNCERTAINTY**: PDF processing requires additional infrastructure (PDF parsing libraries, text extraction). The current system may not have PDF processing capabilities, so this would need to be implemented or jobs with PDF descriptions might need to be excluded initially.

### IMPLEMENTATION INTEGRATION

#### Phase 5: Enhanced ParserRegistry Integration

**5.1 Pattern-Based Pre-Validation**
```typescript
// Extend existing ParserRegistry with enhanced pattern detection
export class EnhancedParserRegistry extends ParserRegistry {
  private jobPatternDetector: JobPatternDetector;
  
  constructor() {
    super();
    this.jobPatternDetector = new JobPatternDetector();
  }
  
  public async parseJob(url: string, html?: string): Promise<ParsedJob> {
    // Phase 1: URL Pattern Analysis (Pre-validation)
    const patternAnalysis = await this.jobPatternDetector.analyzeURLPatterns(url);
    
    if (patternAnalysis.confidence < 0.3) {
      throw new URLValidationError({
        code: 'NOT_A_JOB_POSTING',
        message: `URL pattern analysis suggests non-job content (confidence: ${patternAnalysis.confidence})`,
        userMessage: this.generateUserMessage(patternAnalysis),
        suggestions: this.generateSuggestions(patternAnalysis),
        patternAnalysis
      });
    }
    
    // Phase 2: Enhanced Platform Detection
    const platformInfo = this.jobPatternDetector.detectPlatform(url);
    const parser = this.findBestParser(url, platformInfo);
    
    // Phase 3: Content-Aware Parsing
    if (patternAnalysis.requiresContentAnalysis || patternAnalysis.confidence < 0.7) {
      const contentAnalysis = await this.analyzeJobContent(url, html);
      
      if (contentAnalysis.contentType !== 'job_posting' && contentAnalysis.confidence > 0.6) {
        throw new URLValidationError({
          code: 'CONTENT_NOT_JOB_POSTING',
          message: `Content analysis suggests ${contentAnalysis.contentType} (confidence: ${contentAnalysis.confidence})`,
          userMessage: `This appears to be a ${contentAnalysis.contentType.replace('_', ' ')} rather than a job posting.`,
          contentAnalysis
        });
      }
    }
    
    // Continue with existing parsing logic
    return await parser.parseJob(url, html);
  }
}
```

**5.2 JobPatternDetector Implementation**
```typescript
export class JobPatternDetector {
  private platformPatterns: Map<string, PlatformPatterns>;
  private contentClassifier: ContentClassificationService;
  
  constructor() {
    this.initializePlatformPatterns();
    this.contentClassifier = new ContentClassificationService();
  }
  
  public async analyzeURLPatterns(url: string): Promise<PatternAnalysisResult> {
    const results: PatternMatch[] = [];
    let highestConfidence = 0;
    let detectedType = 'unknown';
    
    // Check each platform's patterns
    for (const [platform, patterns] of this.platformPatterns) {
      const platformResult = this.matchPlatformPatterns(url, platform, patterns);
      results.push(...platformResult.matches);
      
      if (platformResult.confidence > highestConfidence) {
        highestConfidence = platformResult.confidence;
        detectedType = platformResult.type;
      }
    }
    
    // Apply anti-pattern penalties
    const antiPatternPenalty = this.calculateAntiPatternPenalty(url);
    const finalConfidence = Math.max(0, highestConfidence - antiPatternPenalty);
    
    return {
      url,
      confidence: finalConfidence,
      detectedType,
      platform: this.detectPlatform(url),
      matches: results,
      requiresContentAnalysis: finalConfidence < 0.7,
      antiPatterns: antiPatternPenalty > 0,
      recommendations: this.generateRecommendations(finalConfidence, detectedType)
    };
  }
  
  private matchPlatformPatterns(url: string, platform: string, patterns: PlatformPatterns): PatternMatchResult {
    let confidence = 0;
    let type = 'unknown';
    const matches: PatternMatch[] = [];
    
    // Check exact job patterns (highest confidence)
    for (const pattern of patterns.exact) {
      if (pattern.test(url)) {
        confidence = Math.max(confidence, 0.95);
        type = 'job_posting';
        matches.push({
          pattern: pattern.source,
          type: 'exact_job',
          confidence: 0.95,
          platform
        });
      }
    }
    
    // Check listing patterns (medium confidence)
    if (confidence < 0.8) {
      for (const pattern of patterns.listings || []) {
        if (pattern.test(url)) {
          confidence = Math.max(confidence, 0.6);
          type = 'job_listing';
          matches.push({
            pattern: pattern.source,
            type: 'job_listing',
            confidence: 0.6,
            platform
          });
        }
      }
    }
    
    // Check anti-patterns (rejection)
    for (const pattern of patterns.antiPatterns || []) {
      if (pattern.test(url)) {
        confidence = 0.1; // Heavy penalty
        type = 'non_job';
        matches.push({
          pattern: pattern.source,
          type: 'anti_pattern',
          confidence: 0.1,
          platform
        });
        break; // Stop on first anti-pattern match
      }
    }
    
    return { confidence, type, matches };
  }
}
```

#### Phase 6: Frontend Integration Enhancements

**6.1 Real-Time Pattern Validation**
```typescript
// Enhanced URL input component with pattern-based validation
export const EnhancedURLInput: React.FC<URLInputProps> = ({ onURLChange, onValidationResult }) => {
  const [url, setUrl] = useState('');
  const [validationState, setValidationState] = useState<ValidationState>('idle');
  const [patternAnalysis, setPatternAnalysis] = useState<PatternAnalysisResult | null>(null);
  
  const validateURLPatterns = useDebouncedCallback(async (inputUrl: string) => {
    if (!inputUrl || !isValidURL(inputUrl)) {
      setValidationState('idle');
      return;
    }
    
    setValidationState('validating');
    
    try {
      const detector = new JobPatternDetector();
      const analysis = await detector.analyzeURLPatterns(inputUrl);
      
      setPatternAnalysis(analysis);
      
      if (analysis.confidence >= 0.8) {
        setValidationState('high_confidence');
      } else if (analysis.confidence >= 0.5) {
        setValidationState('medium_confidence');
      } else if (analysis.confidence >= 0.3) {
        setValidationState('low_confidence');
      } else {
        setValidationState('rejected');
      }
      
      onValidationResult?.(analysis);
      
    } catch (error) {
      console.error('Pattern validation failed:', error);
      setValidationState('error');
    }
  }, 1000);
  
  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type="url"
          value={url}
          onChange={(e) => {
            const value = e.target.value;
            setUrl(value);
            onURLChange(value);
            validateURLPatterns(value);
          }}
          className={`w-full px-4 py-3 border-2 rounded-lg transition-all ${getValidationStyles(validationState)}`}
          placeholder="Enter job posting URL..."
        />
        
        {validationState !== 'idle' && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <ValidationIndicator state={validationState} />
          </div>
        )}
      </div>
      
      {patternAnalysis && (
        <PatternAnalysisDisplay analysis={patternAnalysis} />
      )}
    </div>
  );
};
```

**6.2 Pattern Analysis Display Component**
```typescript
const PatternAnalysisDisplay: React.FC<{ analysis: PatternAnalysisResult }> = ({ analysis }) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.5) return 'text-yellow-600';
    if (confidence >= 0.3) return 'text-orange-600';
    return 'text-red-600';
  };
  
  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High Confidence Job Posting';
    if (confidence >= 0.5) return 'Likely Job Posting';
    if (confidence >= 0.3) return 'Possibly Job Related';
    return 'Not a Job Posting';
  };
  
  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Pattern Analysis</span>
        <span className={`text-sm font-medium ${getConfidenceColor(analysis.confidence)}`}>
          {getConfidenceLabel(analysis.confidence)} ({Math.round(analysis.confidence * 100)}%)
        </span>
      </div>
      
      {analysis.platform && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">Platform:</span> {analysis.platform}
        </div>
      )}
      
      {analysis.matches.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm font-medium text-gray-700">Detected Patterns:</span>
          <div className="space-y-1">
            {analysis.matches.slice(0, 3).map((match, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{match.type.replace('_', ' ')}</span>
                <span className={`font-medium ${getConfidenceColor(match.confidence)}`}>
                  {Math.round(match.confidence * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {analysis.recommendations.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <span className="text-sm font-medium text-gray-700">Recommendations:</span>
          <ul className="space-y-1 text-xs text-gray-600">
            {analysis.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-blue-500">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
```

### CONFIDENCE SCORING FRAMEWORK

#### Confidence Score Calculation
```typescript
interface ConfidenceScoring {
  // Platform-specific base confidence
  platformConfidence: {
    linkedin: 0.8,      // Well-structured job URLs
    indeed: 0.85,       // Clear job ID patterns
    workday: 0.9,       // Company-specific ATS
    greenhouse: 0.9,    // Structured ATS
    lever: 0.85,        // Clean URL patterns
    generic: 0.6,       // Unknown platforms
  };
  
  // Pattern match bonuses/penalties
  patternModifiers: {
    exactJobPattern: +0.15,        // Direct job posting URL
    queryParameterJob: +0.1,       // Job ID in query params
    jobKeywordInPath: +0.05,       // Job-related keywords
    antiPatternMatch: -0.8,        // Strong non-job indicator
    expiredContent: -0.3,          // Expired/removed content
    authRequired: -0.2,            // Login required
  };
  
  // Content analysis integration
  contentAnalysisWeight: 0.3;     // Weight given to content classification
  
  // Final confidence thresholds
  thresholds: {
    IMMEDIATE_ACCEPT: 0.9,         // Process without content analysis
    CONTENT_ANALYSIS: 0.4,         // Requires content verification  
    IMMEDIATE_REJECT: 0.2,         // Block processing
  };
}
```

### VALIDATION CHECKPOINTS & SUCCESS METRICS

#### Pattern Detection Accuracy
- [ ] **LinkedIn Jobs**: 95%+ accuracy on /jobs/view/ patterns
- [ ] **Indeed Jobs**: 90%+ accuracy on /viewjob?jk= patterns  
- [ ] **Workday Sites**: 85%+ accuracy on company extraction
- [ ] **Generic Career Sites**: 80%+ accuracy on job vs listing pages
- [ ] **Anti-Pattern Rejection**: 95%+ accuracy on company homepages

#### Content Analysis Performance
- [ ] **Structured Data Detection**: 98%+ accuracy on Schema.org JobPosting
- [ ] **Application Element Detection**: 90%+ accuracy on apply buttons/forms
- [ ] **Content Type Classification**: 85%+ accuracy on job vs non-job content
- [ ] **False Positive Rate**: <5% legitimate job postings rejected

#### Edge Case Handling
- [ ] **Career Listing Pages**: Correctly identify multiple job listings
- [ ] **Expired Job Detection**: 90%+ accuracy on expired/removed postings
- [ ] **PDF Job Descriptions**: Proper handling or graceful rejection
- [ ] **Auth-Protected Sites**: Appropriate confidence reduction

#### Integration Performance
- [ ] **Processing Speed**: Pattern analysis adds <200ms overhead
- [ ] **Memory Usage**: Minimal impact on existing ParserRegistry
- [ ] **Error Handling**: Graceful degradation on pattern detection failures
- [ ] **Cache Effectiveness**: 80%+ cache hit rate for repeated URL patterns

### DEPLOYMENT STRATEGY

#### Phase 1: Core Pattern Implementation (Week 1-2)
1. **JobPatternDetector Development**: Implement core pattern matching engine
2. **Platform Pattern Configuration**: Define all platform-specific patterns  
3. **Anti-Pattern Detection**: Implement non-job content rejection
4. **Unit Testing**: Comprehensive test coverage for pattern matching

#### Phase 2: Integration & Testing (Week 2-3)
1. **ParserRegistry Integration**: Enhance existing parser with pattern detection
2. **ContentClassificationService Enhancement**: Improve content analysis
3. **Frontend Components**: Real-time validation UI components
4. **Integration Testing**: End-to-end testing with real job URLs

#### Phase 3: Calibration & Optimization (Week 3-4)  
1. **Pattern Weight Calibration**: Optimize confidence scoring based on test data
2. **Performance Optimization**: Minimize processing overhead
3. **Edge Case Refinement**: Handle corner cases and ambiguous content
4. **User Experience Testing**: Validate error messages and suggestions

#### Phase 4: Gradual Rollout (Week 4-5)
1. **Feature Flag Deployment**: Deploy behind configuration flag
2. **A/B Testing**: Compare with existing validation system
3. **Monitoring & Analytics**: Track pattern detection accuracy
4. **Full Production Release**: Complete rollout after validation

**PLAN_UNCERTAINTY**: The deployment timeline assumes existing system architecture can accommodate the pattern detection enhancements. If significant refactoring is required, timeline may extend by 1-2 weeks.

### INTEGRATION WITH URL VALIDATION PLAN

This job detection patterns plan directly extends the URL validation plan by:

1. **Enhancing Phase 1**: Providing detailed platform-specific patterns beyond basic keyword detection
2. **Strengthening Phase 2**: Advanced content analysis with structured data and application element detection  
3. **Expanding Phase 3**: Comprehensive anti-pattern recognition for non-job content
4. **Improving Phase 4**: Better integration points with existing ParserRegistry
5. **Adding Phase 5**: New content analysis capabilities with HTML structure recognition

The combined system provides a comprehensive URL validation → pattern detection → content classification pipeline that can accurately distinguish job postings from other content types while maintaining high performance and user experience.

---

**Implementation Priority**: High (Core functionality improvement)
**Estimated Development Time**: 4-5 weeks  
**Dependencies**: URLValidationService, ContentClassificationService, ParserRegistry
**Success Criteria**: 90%+ accuracy in job vs non-job classification, <300ms processing overhead

This plan provides the detailed detection patterns needed to implement robust job posting identification that builds on the existing URL validation framework while adding sophisticated pattern recognition capabilities.