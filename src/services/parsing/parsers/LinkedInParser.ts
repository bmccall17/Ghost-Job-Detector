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
          '.job-location'
        ]
      },
      structuredDataPaths: {
        title: ['title', 'name', 'jobTitle'],
        company: ['hiringOrganization.name', 'organization.name', 'company'],
        description: ['description', 'jobDescription']
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
    
    // Strategy 1: Extract from page title with "Company hiring Job Title" format
    const titleMatch = html.match(/<title[^>]*>([^<]+)</i)
    if (titleMatch) {
      const pageTitle = titleMatch[1].trim()
      const cleaned = pageTitle.replace(/\s*\|\s*LinkedIn.*$/i, '').trim()
      
      // Check for LinkedIn "Company hiring Job Title" format
      const hiringMatch = cleaned.match(/^(.+?)\s+(?:is\s+)?hiring\s+(.+?)(?:\s+in\s+.+)?$/i)
      if (hiringMatch && hiringMatch[1] && hiringMatch[1].trim().length > 1) {
        const company = hiringMatch[1].trim()
        if (!this.isGenericCompanyName(company)) {
          return company
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

    for (const pattern of enhancedPatterns) {
      const match = html.match(pattern)
      if (match && match[1] && match[1].trim().length > 1) {
        const company = match[1].trim()
        
        // Filter out LinkedIn and generic names
        if (!this.isGenericCompanyName(company)) {
          return this.cleanLinkedInCompany(company)
        }
      }
    }

    // Strategy 3: Look for company mentions in job description context
    const contextualCompany = this.extractCompanyFromContext(html)
    if (contextualCompany) {
      return contextualCompany
    }

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

  private extractCompanyFromContext(html: string): string | null {
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

    return null
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
}