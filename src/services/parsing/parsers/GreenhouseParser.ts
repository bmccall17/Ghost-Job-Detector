import { BaseParser } from '../BaseParser'
import { ParserConfig, ExtractionMethod } from '@/types/parsing'

export class GreenhouseParser extends BaseParser {
  name = 'GreenhouseParser'
  version = '2.0.0' // Enhanced with contextual learning and better selectors

  constructor() {
    super(GreenhouseParser.createConfig())
  }

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase()
      return hostname.includes('greenhouse.io') || hostname.includes('boards.greenhouse.io')
    } catch {
      return false
    }
  }

  private static createConfig(): ParserConfig {
    return {
      name: 'Greenhouse',
      urlPatterns: [
        /greenhouse\.io/i,
        /boards\.greenhouse\.io/i
      ],
      selectors: {
        title: [
          'h1.app-title',
          '.header-title h1',
          'h1[data-qa="job-name"]',
          '.job-post-title h1',
          // Enhanced selectors for better title detection
          'h1',
          'h2.heading--medium',
          '.content h1',
          '[data-testid="job-title"]',
          '.job-details h1',
          '.position-title',
          'header h1',
          '.main-content h1'
        ],
        company: [
          '.company-name',
          '[data-qa="company-name"]',
          '.header-company',
          // Enhanced company selectors
          '[data-testid="company-name"]',
          '.company-info .name',
          'header .company',
          '.employer-name'
        ],
        location: [
          '.location',
          '[data-qa="job-location"]',
          '.job-location',
          '[data-testid="job-location"]',
          '.location-name',
          '.job-info .location',
          '.position-location'
        ],
        postedDate: [
          '.posted-date',
          '[data-qa="posted-date"]',
          '.job-posted-date',
          '[data-testid="posted-date"]',
          '.date-posted',
          '.job-info .date'
        ]
      },
      structuredDataPaths: {
        title: ['title', 'name'],
        company: ['hiringOrganization.name'],
        location: ['jobLocation.name', 'jobLocation', 'addressLocality', 'location'],
        postedDate: ['datePosted', 'publishedAt', 'createdAt']
      },
      textPatterns: {
        title: [
          /app-title[^>]*>([^<]+)/i,
          // Enhanced patterns for title extraction
          /<h1[^>]*>([^<]*(?:manager|lead|director|specialist|engineer|analyst|coordinator)[^<]*)</i,
          /<title>([^|]*)\s*[\|\-]/i, // Extract from page title before delimiter
          /job[_\s]*title[\"'\s]*[:=][\"'\s]*([^\"'<>\n]+)/i
        ],
        company: [
          /company-name[^>]*>([^<]+)/i,
          /company[\"'\s]*[:=][\"'\s]*([^\"'<>\n]+)/i
        ],
        location: [
          /location[^>]*>([^<]+)/i,
          /(?:location|jobLocation)[\"'\s]*[:=][\"'\s]*([^\"'<>\n]+)/i,
          /(?:addressLocality|city)[\"'\s]*[:=][\"'\s]*([^\"'<>\n]+)/i
        ],
        postedDate: [
          /(?:datePosted|publishedAt|createdAt)[\"'\s]*[:=][\"'\s]*([^\"'<>\n]+)/i,
          /posted\s+(\d+\s+(?:days?|weeks?|months?)\s+ago)/i,
          /(\d{1,2}\/\d{1,2}\/\d{4})/i,
          /(\d{4}-\d{2}-\d{2})/i
        ]
      },
      validationRules: []
    }
  }

  public async extract(url: string, html: string): Promise<any> {
    const result = await super.extract(url, html)
    
    // Enhanced title extraction with contextual learning
    if (!result.title || result.title === 'Unknown Position' || result.title.length < 3) {
      const enhancedTitle = this.extractTitleFromContext(html, url)
      if (enhancedTitle) {
        result.title = enhancedTitle
        result.metadata.confidence.title = Math.max(result.metadata.confidence.title, 0.75)
        result.metadata.extractionMethod = ExtractionMethod.DOMAIN_INTELLIGENCE
      }
    }

    // Enhanced company extraction from URL/domain
    if (!result.company || result.company === 'Unknown Company' || result.company.length < 3) {
      const companyFromUrl = this.extractCompanyFromGreenhouseUrl(url)
      if (companyFromUrl) {
        result.company = companyFromUrl
        result.metadata.confidence.company = Math.max(result.metadata.confidence.company, 0.8)
        result.metadata.extractionMethod = ExtractionMethod.DOMAIN_INTELLIGENCE
      }
    }

    // Extract location if not found
    if (!result.location) {
      result.location = this.extractLocationFromHtml(html)
    }

    // Extract posting date if not found
    if (!result.postedAt) {
      result.postedAt = this.extractPostedDateFromHtml(html)
    }

    // Determine remote status
    result.remoteFlag = this.detectRemoteStatus(result.location, result.title, html)

    return result
  }

  private extractTitleFromContext(html: string, _url: string): string | undefined {
    try {
      // Strategy 1: Extract from page title tag
      const titleMatch = html.match(/<title[^>]*>([^<]+)</i)
      if (titleMatch) {
        const pageTitle = titleMatch[1].trim()
        // Remove common suffixes like "| Company Name", "- Company Name", "at Company"
        const cleanTitle = pageTitle
          .replace(/\s*[\|\-]\s*.*$/i, '') // Remove everything after | or -
          .replace(/\s+at\s+\w+.*$/i, '') // Remove "at Company"
          .replace(/\s*\|\s*jobs.*$/i, '') // Remove "| Jobs"
          .trim()
        
        if (cleanTitle.length > 3 && !cleanTitle.toLowerCase().includes('job')) {
          return cleanTitle
        }
      }

      // Strategy 2: Look for structured data
      const jsonLdMatch = html.match(/<script[^>]*type=["\']application\/ld\+json["\'][^>]*>([^<]+)<\/script>/gi)
      if (jsonLdMatch) {
        for (const script of jsonLdMatch) {
          try {
            const json = JSON.parse(script.replace(/<script[^>]*>/, '').replace(/<\/script>/, ''))
            if (json.title || json.name) {
              return json.title || json.name
            }
            if (json.jobTitle) {
              return json.jobTitle
            }
          } catch {
            continue
          }
        }
      }

      // Strategy 3: Look for meta property tags
      const metaTitleMatch = html.match(/<meta[^>]*property=["\']og:title["\'][^>]*content=["\']([^"']+)["\'][^>]*>/i)
      if (metaTitleMatch) {
        const metaTitle = metaTitleMatch[1].trim()
        if (metaTitle.length > 3 && !metaTitle.toLowerCase().includes('greenhouse')) {
          return metaTitle
        }
      }

      // Strategy 4: Advanced text pattern matching
      const advancedPatterns = [
        /<h1[^>]*class=[^>]*title[^>]*>([^<]+)</i,
        /<div[^>]*class=[^>]*job[^>]*title[^>]*>[^<]*<[^>]*>([^<]+)/i,
        /position[\"'\s]*:[\"'\s]*([^\"',\n]+)/i
      ]

      for (const pattern of advancedPatterns) {
        const match = html.match(pattern)
        if (match && match[1] && match[1].trim().length > 3) {
          return match[1].trim()
        }
      }

      return undefined
    } catch {
      return undefined
    }
  }

  private extractCompanyFromGreenhouseUrl(url: string): string | undefined {
    try {
      // Extract company from greenhouse.io URL pattern
      // Format: https://job-boards.greenhouse.io/companyname/jobs/...
      const urlObj = new URL(url)
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0)
      
      if (pathParts.length > 0 && urlObj.hostname.includes('greenhouse.io')) {
        const companySlug = pathParts[0]
        return this.formatCompanyName(companySlug)
      }
      
      return undefined
    } catch {
      return undefined
    }
  }

  private formatCompanyName(slug: string): string {
    // Known company slug mappings for greenhouse
    const knownCompanies: Record<string, string> = {
      'surveymonkey': 'SurveyMonkey',
      'googlecloud': 'Google Cloud',
      'airbnb': 'Airbnb',
      'stripe': 'Stripe',
      'atlassian': 'Atlassian',
      'dropbox': 'Dropbox',
      'uber': 'Uber',
      'lyft': 'Lyft',
      'pinterest': 'Pinterest',
      'reddit': 'Reddit',
      'discord': 'Discord',
      'notion': 'Notion'
    }

    const lowerSlug = slug.toLowerCase()
    if (knownCompanies[lowerSlug]) {
      return knownCompanies[lowerSlug]
    }

    // Format generic company names
    return slug.split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  private extractLocationFromHtml(html: string): string | undefined {
    // Greenhouse location extraction patterns
    const locationPatterns = [
      // JSON-LD structured data
      /"jobLocation"\s*:\s*"([^"]+)"/i,
      /"addressLocality"\s*:\s*"([^"]+)"/i,
      /"location"\s*:\s*"([^"]+)"/i,
      
      // Greenhouse specific data attributes
      /data-location="([^"]+)"/i,
      /data-job-location="([^"]+)"/i,
      
      // Common greenhouse layout patterns
      /<div[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)/i,
      /<span[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)/i,
      
      // Text patterns in HTML
      /location[^:]*:\s*([^<\n]+)/i,
      /job.?location[^:]*:\s*([^<\n]+)/i
    ]

    for (const pattern of locationPatterns) {
      const match = html.match(pattern)
      if (match && match[1] && match[1].trim().length > 1) {
        const location = match[1].trim()
        
        // Clean up common artifacts
        const cleaned = location
          .replace(/\s*<[^>]*>.*$/i, '') // Remove HTML tags and everything after
          .replace(/\s*[\(\[\{].*$/, '') // Remove content in parentheses/brackets
          .trim()

        if (cleaned.length > 1 && !cleaned.toLowerCase().includes('unknown')) {
          return cleaned
        }
      }
    }

    return undefined
  }

  private extractPostedDateFromHtml(html: string): Date | undefined {
    // Greenhouse posting date extraction patterns
    const datePatterns = [
      // JSON-LD structured data
      /"datePosted"\s*:\s*"([^"]+)"/i,
      /"publishedAt"\s*:\s*"([^"]+)"/i,
      /"createdAt"\s*:\s*"([^"]+)"/i,
      
      // Greenhouse specific data attributes
      /data-posted-date="([^"]+)"/i,
      /data-job-posted="([^"]+)"/i,
      
      // Time ago patterns
      /posted\s+(\d+)\s+(days?|weeks?|months?)\s+ago/i,
      /(\d+)\s+(days?|weeks?|months?)\s+ago/i,
      
      // Date formats
      /(\d{4}-\d{2}-\d{2})/i,
      /(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /(\d{1,2}-\d{1,2}-\d{4})/i
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