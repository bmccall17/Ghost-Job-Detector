import { BaseParser } from '../BaseParser'
import { ParserConfig } from '@/types/parsing'

export class LinkedInParser extends BaseParser {
  name = 'LinkedInParser'  
  version = '2.0.0' // Enhanced version with better company extraction

  constructor() {
    super(LinkedInParser.createConfig())
  }

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase()
      return hostname.includes('linkedin.com')
    } catch {
      return false
    }
  }

  getConfidence(): number {
    return 0.9 // High confidence for LinkedIn-specific parser
  }

  private static createConfig(): ParserConfig {
    return {
      name: 'LinkedIn',
      urlPatterns: [
        /linkedin\.com\/jobs\/view\/\d+/i,
        /linkedin\.com\/jobs\/collections\/\d+/i
      ],
      selectors: {
        title: [
          'h1[data-test-id="job-title"]',
          '.job-details-jobs-unified-top-card__job-title h1',
          '.jobs-unified-top-card__job-title a',
          '.job-details__job-title',
          'h1.jobs-top-card__job-title',
          'h1[class*="job-title"]',
          '.job-title h1',
          'h1.t-24'
        ],
        company: [
          '[data-test-id="job-details-company-name"]',
          '.job-details-jobs-unified-top-card__company-name a',
          '.jobs-unified-top-card__subtitle-primary a',
          '.job-details__company-name',
          '.jobs-top-card__company-name',
          'a[class*="company-name"]',
          '.company-name a',
          '.jobs-unified-top-card__subtitle-primary'
        ],
        description: [
          '[data-test-id="job-details-description"]',
          '.job-details-description-content__text',
          '.jobs-description__content',
          '.job-description'
        ],
        location: [
          '[data-test-id="job-details-location"]',
          '.job-details-jobs-unified-top-card__primary-description',
          '.jobs-unified-top-card__subtitle-secondary',
          '.job-location',
          '.jobs-unified-top-card__subtitle-secondary .jobs-unified-top-card__bullet',
          '.job-details-jobs-unified-top-card__primary-description-container',
          // Enhanced LinkedIn location selectors
          '.job-details-jobs-unified-top-card__primary-description-text',
          '.jobs-unified-top-card__subtitle-secondary-grouping',
          '.jobs-poster__location',
          '.job-details__location',
          '.jobs-top-card__job-details .tvm__text',
          '.jobs-details__main-content .jobs-details__location',
          'span[class*="job-location"]',
          'span[class*="location"]',
          '.jobs-unified-top-card__job-insight span:last-child',
          '.jobs-details-top-card__location',
          '.job-details-jobs-unified-top-card__job-insight-text'
        ],
        postedDate: [
          '[data-test-id="job-posted-date"]',
          '.job-details-jobs-unified-top-card__posted-date',
          '.jobs-unified-top-card__posted-date',
          '.posted-time-ago'
        ]
      },
      structuredDataPaths: {
        title: ['title', 'name', 'jobTitle'],
        company: ['hiringOrganization.name', 'organization.name', 'company'],
        description: ['description', 'jobDescription'],
        location: ['jobLocation.name', 'jobLocation', 'addressLocality', 'location'],
        postedDate: ['datePosted', 'publishedAt', 'createdAt']
      },
      textPatterns: {
        title: [
          // LinkedIn specific title patterns
          /(.+?)\s+hiring\s+(.+?)\s+in\s+.+/i, // "Company hiring Job Title in Location" -> extract job title part
          /(.+?)\s+(?:is\s+)?hiring(?:\s+for)?\s+(.+)/i, // "Company hiring Job Title" -> extract job title part
          /data-job-title="([^"]+)"/i,
          /<h1[^>]*>([^<]*(?:engineer|developer|manager|analyst|specialist|coordinator|director|lead)[^<]*)<\/h1>/i,
          /job.?title["\s]*[:=]["\s]*([^"<\n]+)/i
        ],
        company: [
          // LinkedIn specific company patterns
          /(.+?)\s+hiring\s+.+/i, // "Company hiring Job Title" -> extract company part
          /data-company[^=]*="([^"]+)"/i,
          /company["\s]*[:=]["\s]*"([^"]+)"/i,
          /hiringOrganization[^}]*name["\s]*[:=]["\s]*"([^"]+)"/i
        ],
        location: [
          // Enhanced LinkedIn location patterns
          /(?:location|jobLocation)["\s]*[:=]["\s]*"([^"]+)"/i,
          /(?:addressLocality|city)["\s]*[:=]["\s]*"([^"]+)"/i,
          /posting.?location["\s]*[:=]["\s]*"([^"]+)"/i,
          /"location"\s*:\s*"([^"]+)"/i,
          // Location from job posting structured data
          /"jobLocation"[^}]*"name"["\s]*[:=]["\s]*"([^"]+)"/i,
          /"jobLocation"[^}]*"addressLocality"["\s]*[:=]["\s]*"([^"]+)"/i,
          /"workLocation"["\s]*[:=]["\s]*"([^"]+)"/i,
          // Location in meta tags
          /<meta[^>]*property="job:location"[^>]*content="([^"]+)"/i,
          /<meta[^>]*name="location"[^>]*content="([^"]+)"/i,
          // LinkedIn breadcrumb/header patterns
          /(?:·|•|\|)\s*([A-Z][A-Za-z\s]+,\s*[A-Z]{2,3})\s*(?:·|•|\||$)/i,
          /(?:·|•|\|)\s*([A-Z][A-Za-z\s]+ [A-Z]{2,3})\s*(?:·|•|\||$)/i,
          // Location near job details
          /job.?details[^<]*<[^>]*>([^<]*(?:[A-Z]{2,3}|City|State|Province)[^<]*)</i
        ],
        postedDate: [
          // LinkedIn posting date patterns
          /(?:datePosted|publishedAt|createdAt)["\s]*[:=]["\s]*"([^"]+)"/i,
          /posted\s+(\d+\s+(?:days?|weeks?|months?)\s+ago)/i,
          /(\d{1,2}\/\d{1,2}\/\d{4})/i,
          /(\d{4}-\d{2}-\d{2})/i
        ]
      },
      validationRules: []
    }
  }

  protected applyFallbacks(result: any, html: string, url: string): any {
    const enhanced = super.applyFallbacks(result, html, url)

    // LinkedIn-specific fallbacks
    if (!enhanced.title || enhanced.title === 'Unknown Position') {
      enhanced.title = this.extractLinkedInTitleFromHtml(html)
    }

    if (!enhanced.company || enhanced.company === 'Unknown Company') {
      enhanced.company = this.extractLinkedInCompanyFromHtml(html)
    }

    // Clean LinkedIn-specific artifacts
    if (enhanced.title) {
      enhanced.title = this.cleanLinkedInTitle(enhanced.title)
    }

    if (enhanced.company) {
      enhanced.company = this.cleanLinkedInCompany(enhanced.company)
    }

    // Extract location if not found
    if (!enhanced.location) {
      enhanced.location = this.extractLinkedInLocationFromHtml(html)
    }

    // Extract posting date if not found
    if (!enhanced.postedAt) {
      enhanced.postedAt = this.extractLinkedInPostedDateFromHtml(html)
    }

    // Determine remote status
    enhanced.remoteFlag = this.detectRemoteStatus(enhanced.location, enhanced.title, html)

    return enhanced
  }

  private extractLinkedInTitleFromHtml(html: string): string {
    // First try to extract from page title which often has "Company hiring Job Title" format
    const titleMatch = html.match(/<title[^>]*>([^<]+)</i)
    if (titleMatch) {
      const pageTitle = titleMatch[1].trim()
      const cleaned = pageTitle.replace(/\s*\|\s*LinkedIn.*$/i, '').trim()
      
      // Check for LinkedIn "Company hiring Job Title" format
      const hiringMatch = cleaned.match(/^(.+?)\s+hiring\s+(.+?)(?:\s+in\s+.+)?$/i)
      if (hiringMatch && hiringMatch[2]) {
        let jobTitle = hiringMatch[2].trim()
        // Clean location information from the title
        jobTitle = this.cleanLocationFromTitle(jobTitle)
        return jobTitle
      }
    }
    
    // Try multiple LinkedIn-specific patterns
    const patterns = [
      // Modern LinkedIn job pages
      /"jobTitle"\s*:\s*"([^"]+)"/i,
      /"title"\s*:\s*"([^"]+job[^"]*|[^"]*engineer[^"]*|[^"]*developer[^"]*|[^"]*manager[^"]*|[^"]*analyst[^"]*|[^"]*specialist[^"]*|[^"]*coordinator[^"]*|[^"]*director[^"]*|[^"]*lead[^"]*)/i,
      // Embedded JSON data
      /"jobPosting"[^}]*"title"\s*:\s*"([^"]+)"/i,
      // Meta property
      /property="og:title"[^>]*content="([^"]*(?:engineer|developer|manager|analyst|specialist|coordinator|director|lead)[^"]*)"/i
    ]

    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match && match[1] && match[1].trim().length > 3) {
        return match[1].trim()
      }
    }

    return 'Unknown Position'
  }

  private extractLinkedInCompanyFromHtml(html: string): string {
    // Enhanced company extraction with multiple strategies
    
    console.log('LinkedIn Company Extraction: Starting extraction...')
    
    // Strategy 1: Extract from page title with "Company hiring Job Title" format
    const titleMatch = html.match(/<title[^>]*>([^<]+)</i)
    if (titleMatch) {
      const pageTitle = titleMatch[1].trim()
      console.log('LinkedIn Company Extraction: Page title found:', pageTitle)
      const cleaned = pageTitle.replace(/\s*\|\s*LinkedIn.*$/i, '').trim()
      
      // Check for LinkedIn "Company hiring Job Title" format
      const hiringMatch = cleaned.match(/^(.+?)\s+(?:is\s+)?hiring\s+(.+?)(?:\s+in\s+.+)?$/i)
      if (hiringMatch && hiringMatch[1] && hiringMatch[1].trim().length > 1) {
        const company = hiringMatch[1].trim()
        console.log('LinkedIn Company Extraction: Hiring pattern matched:', company)
        if (!this.isGenericCompanyName(company)) {
          console.log('LinkedIn Company Extraction: Valid company from title:', company)
          return company
        } else {
          console.log('LinkedIn Company Extraction: Company from title rejected as generic:', company)
        }
      }
    }
    
    // Strategy 2: Enhanced JSON-LD and structured data patterns
    const enhancedPatterns = [
      // Modern LinkedIn API responses
      /"companyName"\s*:\s*"([^"]+)"/i,
      /"hiringOrganization"[^}]*"name"\s*:\s*"([^"]+)"/i,
      /"company"[^}]*"name"\s*:\s*"([^"]+)"/i,
      
      // LinkedIn-specific data attributes
      /data-company-name="([^"]+)"/i,
      /data-test-company-name="([^"]+)"/i,
      
      // JSON-LD structured data
      /@type[":\s]*"JobPosting"[^}]*"hiringOrganization"[^}]*"name"[:\s]*"([^"]+)"/i,
      
      // Meta properties
      /property="og:site_name"[^>]*content="([^"]+)"/i,
      /<meta[^>]*name="company"[^>]*content="([^"]+)"/i,
      
      // LinkedIn specific selectors in text
      /company-name[^>]*>([^<]+)</i,
      /employer-name[^>]*>([^<]+)</i,
      
      // Alternative patterns for different LinkedIn layouts
      /"jobTitle"[^}]*"hiringOrganization"[^}]*"name"[:\s]*"([^"]+)"/i,
      /hiring organization[^:]*:\s*"([^"]+)"/i
    ]

    console.log('LinkedIn Company Extraction: Trying enhanced patterns...')
    for (const pattern of enhancedPatterns) {
      const match = html.match(pattern)
      if (match && match[1] && match[1].trim().length > 1) {
        const company = match[1].trim()
        console.log('LinkedIn Company Extraction: Pattern matched company:', company)
        
        // Filter out LinkedIn and generic names
        if (!this.isGenericCompanyName(company)) {
          const cleanedCompany = this.cleanLinkedInCompany(company)
          console.log('LinkedIn Company Extraction: Valid company from pattern:', cleanedCompany)
          return cleanedCompany
        } else {
          console.log('LinkedIn Company Extraction: Company from pattern rejected as generic:', company)
        }
      }
    }

    // Strategy 3: Look for company mentions in job description context
    console.log('LinkedIn Company Extraction: Trying contextual extraction...')
    const contextualCompany = this.extractCompanyFromContext(html)
    if (contextualCompany) {
      console.log('LinkedIn Company Extraction: Valid company from context:', contextualCompany)
      return contextualCompany
    }

    console.log('LinkedIn Company Extraction: No valid company found, returning Unknown Company')
    return 'Unknown Company'
  }

  private isGenericCompanyName(company: string): boolean {
    const generic = company.toLowerCase()
    const genericNames = [
      'linkedin', 'unknown', 'company', 'employer', 'organization',
      'hiring', 'careers', 'jobs', 'recruitment', 'staffing'
    ]
    
    return genericNames.some(name => generic.includes(name)) || generic.length < 2
  }

  private extractCompanyFromContext(html: string): string | undefined {
    // Look for company mentions near job-related keywords
    const contextPatterns = [
      // Look for "at Company" patterns
      /(?:working|position|role|job)\s+at\s+([A-Z][A-Za-z\s&.,'-]+?)(?:\s|<|$)/gi,
      
      // Look for "Company is hiring" patterns  
      /([A-Z][A-Za-z\s&.,'-]+?)\s+(?:is\s+)?(?:currently\s+)?hiring/gi,
      
      // Look for "Join Company" patterns
      /join\s+([A-Z][A-Za-z\s&.,'-]+?)(?:\s|<|$)/gi,
      
      // Look for company descriptions
      /about\s+([A-Z][A-Za-z\s&.,'-]+?)[\s:]/gi
    ]

    for (const pattern of contextPatterns) {
      const matches = html.matchAll(pattern)
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 2) {
          const company = match[1].trim()
          
          // Clean and validate the extracted company name
          const cleaned = company
            .replace(/\s*[,.;:!?]\s*$/, '') // Remove trailing punctuation
            .replace(/\s+$/, '') // Remove trailing spaces
            .trim()
          
          if (cleaned.length > 2 && !this.isGenericCompanyName(cleaned)) {
            return cleaned
          }
        }
      }
    }

    return undefined
  }

  private cleanLinkedInTitle(title: string): string {
    return title
      .replace(/\s*[-–|]\s*LinkedIn.*$/i, '')
      .replace(/\s*\|\s*LinkedIn.*$/i, '')
      .replace(/\s*·\s*LinkedIn.*$/i, '')
      .replace(/\s*at\s+LinkedIn$/i, '')
      .replace(/^LinkedIn\s*[-–|:]\s*/i, '')
      .trim()
  }

  private cleanLinkedInCompany(company: string): string {
    return company
      .replace(/^LinkedIn\s*[-–|:]\s*/i, '')
      .replace(/\s*[-–|]\s*LinkedIn.*$/i, '')
      .replace(/\s*\|\s*LinkedIn.*$/i, '')
      .replace(/\s*on\s+LinkedIn$/i, '')
      .trim()
  }

  private cleanLocationFromTitle(title: string): string {
    // Remove common location patterns from job titles
    return title
      .replace(/\s+in\s+[A-Z]{2,}$/i, '') // Remove "in NAMER", "in USA", "in UK", etc.
      .replace(/\s+in\s+[A-Z][a-z]+(?:\s*,\s*[A-Z]{2})?$/i, '') // Remove "in London", "in New York, NY"
      .replace(/\s+in\s+.+$/i, '') // Remove any remaining "in Location" patterns
      .replace(/\s+-\s+[A-Z][a-z]+(?:\s*,\s*[A-Z]{2})?$/i, '') // Remove "- Location" patterns
      .replace(/\s*\([^)]*(?:remote|hybrid|onsite|location)[^)]*\)$/i, '') // Remove location parentheticals
      .trim()
  }

  private extractLinkedInLocationFromHtml(html: string): string | undefined {
    console.log('LinkedIn Location Extraction: Starting location extraction...')
    
    // Strategy 1: Enhanced JSON-LD and structured data patterns
    const structuredDataPatterns = [
      // Modern LinkedIn JSON structures
      /"jobLocation"\s*:\s*"([^"]+)"/i,
      /"addressLocality"\s*:\s*"([^"]+)"/i,
      /"location"\s*:\s*"([^"]+)"/i,
      /"workLocation"\s*:\s*"([^"]+)"/i,
      /"jobLocation"[^}]*"name"["\s]*[:=]["\s]*"([^"]+)"/i,
      /"jobLocation"[^}]*"addressLocality"["\s]*[:=]["\s]*"([^"]+)"/i,
      /"geoLocationName"\s*:\s*"([^"]+)"/i,
      
      // LinkedIn API response patterns
      /"locationName"\s*:\s*"([^"]+)"/i,
      /"primaryLocation"\s*:\s*"([^"]+)"/i,
      /"companyLocation"\s*:\s*"([^"]+)"/i
    ]

    console.log('LinkedIn Location Extraction: Trying structured data patterns...')
    for (const pattern of structuredDataPatterns) {
      const match = html.match(pattern)
      if (match && match[1] && match[1].trim().length > 1) {
        const location = this.cleanLocationText(match[1])
        console.log('LinkedIn Location Extraction: Found in structured data:', location)
        if (this.isValidLocation(location)) {
          return location
        }
      }
    }

    // Strategy 2: LinkedIn header/breadcrumb patterns (where "Seattle, WA" would appear)
    const headerPatterns = [
      // Common LinkedIn job header patterns with separators
      /(?:·|•|\|)\s*([A-Z][A-Za-z\s]+,\s*[A-Z]{2,3})\s*(?:·|•|\||<|$)/i,
      /(?:·|•|\|)\s*([A-Z][A-Za-z\s]+ [A-Z]{2,3})\s*(?:·|•|\||<|$)/i,
      /(?:·|•|\|)\s*([A-Z][A-Za-z\s]+\s+[A-Z][A-Za-z]+)\s*(?:·|•|\||<|$)/i,
      
      // Location in job details area (common pattern)
      />([A-Z][A-Za-z\s]+,\s*[A-Z]{2,3})<\/[^>]*>\s*(?:·|•|\||$)/i,
      /<[^>]*>([A-Z][A-Za-z\s]+,\s*[A-Z]{2,3})<\/[^>]*>/i,
      
      // Location with time zone or additional info
      /([A-Z][A-Za-z\s]+,\s*[A-Z]{2,3})\s*(?:\([^)]*\))?(?:\s*·|\s*\||$)/i,
      
      // Location in span or div elements
      /<(?:span|div)[^>]*>([A-Z][A-Za-z\s]+,\s*[A-Z]{2,3})<\/(?:span|div)>/i,
      
      // Location patterns for international locations
      /(?:·|•|\|)\s*([A-Z][A-Za-z\s]+,\s*[A-Z][A-Za-z\s]+)\s*(?:·|•|\||<|$)/i
    ]

    console.log('LinkedIn Location Extraction: Trying header/breadcrumb patterns...')
    for (const pattern of headerPatterns) {
      const match = html.match(pattern)
      if (match && match[1] && match[1].trim().length > 1) {
        const location = this.cleanLocationText(match[1])
        console.log('LinkedIn Location Extraction: Found in header:', location)
        if (this.isValidLocation(location)) {
          return location
        }
      }
    }

    // Strategy 3: Look for location in specific LinkedIn layout areas
    const layoutPatterns = [
      // Location in job posting meta area
      /job.?details[^<]*<[^>]*>([^<]*(?:[A-Z]{2,3}|City|State|Province)[^<]*)</i,
      /job.?info[^<]*<[^>]*>([^<]*(?:[A-Z]{2,3}|City|State|Province)[^<]*)</i,
      
      // Location in job header/title area
      /(?:posted|located|position)\s+in\s+([A-Z][A-Za-z\s,]+(?:[A-Z]{2,3}|[A-Z][A-Za-z]+))/i,
      /(?:based|located)\s+in\s+([A-Z][A-Za-z\s,]+(?:[A-Z]{2,3}|[A-Z][A-Za-z]+))/i,
      
      // Meta tags and data attributes
      /<meta[^>]*(?:property|name)="(?:job:)?location"[^>]*content="([^"]+)"/i,
      /data-(?:job-)?location="([^"]+)"/i,
      /data-(?:geo-)?location="([^"]+)"/i,
      
      // Common location keywords followed by city/state
      /(?:office|headquarters|location|workplace)(?:\s+in)?\s*[:]\s*([A-Z][A-Za-z\s,]+(?:[A-Z]{2,3}|[A-Z][A-Za-z]+))/i
    ]

    console.log('LinkedIn Location Extraction: Trying layout-specific patterns...')
    for (const pattern of layoutPatterns) {
      const match = html.match(pattern)
      if (match && match[1] && match[1].trim().length > 1) {
        const location = this.cleanLocationText(match[1])
        console.log('LinkedIn Location Extraction: Found in layout:', location)
        if (this.isValidLocation(location)) {
          return location
        }
      }
    }

    // Strategy 4: Extract from page title (e.g., "Job Title - Company - Location")
    const titleMatch = html.match(/<title[^>]*>([^<]+)</i)
    if (titleMatch) {
      const pageTitle = titleMatch[1].trim()
      console.log('LinkedIn Location Extraction: Checking page title:', pageTitle)
      
      // Look for location patterns in title
      const titleLocationPatterns = [
        /\s+-\s+([A-Z][A-Za-z\s]+,\s*[A-Z]{2,3})\s*(?:\||$)/i,
        /\s+in\s+([A-Z][A-Za-z\s]+,\s*[A-Z]{2,3})\s*(?:\||$)/i,
        /,\s*([A-Z][A-Za-z\s]+,\s*[A-Z]{2,3})\s*(?:\||$)/i
      ]
      
      for (const pattern of titleLocationPatterns) {
        const match = pageTitle.match(pattern)
        if (match && match[1]) {
          const location = this.cleanLocationText(match[1])
          console.log('LinkedIn Location Extraction: Found in title:', location)
          if (this.isValidLocation(location)) {
            return location
          }
        }
      }
    }

    console.log('LinkedIn Location Extraction: No valid location found')
    return undefined
  }

  private cleanLocationText(location: string): string {
    return location
      .replace(/\s*\|\s*LinkedIn.*$/i, '')
      .replace(/\s*·\s*LinkedIn.*$/i, '')
      .replace(/\s*-\s*LinkedIn.*$/i, '')
      .replace(/\s*<[^>]*>.*$/i, '') // Remove HTML tags and everything after
      .replace(/\s*[\(\[\{].*$/, '') // Remove content in parentheses/brackets
      .replace(/\s*[,;:]\s*$/, '') // Remove trailing punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  private isValidLocation(location: string): boolean {
    if (!location || location.length < 2) return false
    
    // Reject HTML content (common issue with current parser)
    if (location.includes('<') || location.includes('>') || 
        location.includes('class=') || location.includes('data-') ||
        location.includes('placeholder') || location.includes('input') ||
        location.includes('role=') || location.includes('maxlength')) {
      console.log('LinkedIn Location Extraction: Rejected HTML content:', location.substring(0, 100));
      return false;
    }
    
    const invalidKeywords = [
      'unknown', 'linkedin', 'company', 'job', 'position', 'hiring',
      'career', 'opportunity', 'apply', 'remote only', 'not specified',
      'search', 'filter', 'button', 'control', 'tracking'
    ]
    
    const locationLower = location.toLowerCase()
    if (invalidKeywords.some(keyword => locationLower.includes(keyword))) {
      console.log('LinkedIn Location Extraction: Rejected invalid keyword:', location);
      return false
    }
    
    // Valid location should have at least one pattern:
    // - City, State (e.g., "Seattle, WA")
    // - City State (e.g., "New York NY") 
    // - International city (e.g., "London", "Toronto")
    // - Has geographic indicators
    const validPatterns = [
      /^[A-Z][A-Za-z\s]+,\s*[A-Z]{2,3}$/, // City, State/Country abbreviation
      /^[A-Z][A-Za-z\s]+ [A-Z]{2,3}$/, // City State
      /^[A-Z][A-Za-z\s]+,\s*[A-Z][A-Za-z\s]+$/, // City, Country/State
      /^[A-Z][A-Za-z\s]{3,}$/ // Simple city name (minimum 3 chars after first letter)
    ]
    
    const isValid = validPatterns.some(pattern => pattern.test(location))
    
    if (!isValid) {
      console.log('LinkedIn Location Extraction: Rejected invalid format:', location);
    }
    
    return isValid
  }

  private extractLinkedInPostedDateFromHtml(html: string): Date | undefined {
    // LinkedIn posting date extraction patterns
    const datePatterns = [
      // JSON-LD structured data
      /"datePosted"\s*:\s*"([^"]+)"/i,
      /"publishedAt"\s*:\s*"([^"]+)"/i,
      /"createdAt"\s*:\s*"([^"]+)"/i,
      
      // LinkedIn specific data attributes
      /data-posted-date="([^"]+)"/i,
      /data-job-posted="([^"]+)"/i,
      
      // Time ago patterns
      /posted\s+(\d+)\s+(days?|weeks?|months?)\s+ago/i,
      /(\d+)\s+(days?|weeks?|months?)\s+ago/i,
      
      // Date formats
      /(\d{4}-\d{2}-\d{2})/i,
      /(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /(\d{1,2}-\d{1,2}-\d{4})/i,
      
      // Meta properties
      /property="og:updated_time"[^>]*content="([^"]+)"/i,
      /<meta[^>]*name="publish_date"[^>]*content="([^"]+)"/i
    ]

    for (const pattern of datePatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        try {
          const dateStr = match[1].trim()
          
          // Handle "X days ago" format
          if (match[2]) { // Has time unit (days, weeks, months)
            const amount = parseInt(match[1])
            const unit = match[2].toLowerCase()
            const now = new Date()
            
            if (unit.startsWith('day')) {
              now.setDate(now.getDate() - amount)
            } else if (unit.startsWith('week')) {
              now.setDate(now.getDate() - (amount * 7))
            } else if (unit.startsWith('month')) {
              now.setMonth(now.getMonth() - amount)
            }
            
            return now
          }
          
          // Handle standard date formats
          const parsed = new Date(dateStr)
          if (!isNaN(parsed.getTime())) {
            return parsed
          }
        } catch (error) {
          // Continue to next pattern
        }
      }
    }

    return undefined
  }

  private detectRemoteStatus(location: string | undefined, title: string | undefined, html: string): boolean {
    // Keywords that indicate remote work
    const remoteKeywords = [
      'remote', 'work from home', 'wfh', 'telecommute', 'virtual',
      'distributed', 'anywhere', 'home-based', 'telework'
    ]
    
    // Check location
    if (location) {
      const locationLower = location.toLowerCase()
      if (remoteKeywords.some(keyword => locationLower.includes(keyword))) {
        return true
      }
    }
    
    // Check title
    if (title) {
      const titleLower = title.toLowerCase()
      if (remoteKeywords.some(keyword => titleLower.includes(keyword))) {
        return true
      }
    }
    
    // Check HTML content for remote indicators
    const htmlLower = html.toLowerCase()
    const remotePatterns = [
      /work.?from.?home/i,
      /100%.?remote/i,
      /fully.?remote/i,
      /remote.?position/i,
      /remote.?role/i,
      /remote.?job/i,
      /telecommute/i,
      /work.?remotely/i
    ]
    
    return remotePatterns.some(pattern => pattern.test(htmlLower))
  }
}