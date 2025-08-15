import { BaseParser } from '../BaseParser'
import { ParserConfig } from '@/types/parsing'

export class LinkedInParser extends BaseParser {
  name = 'LinkedInParser'
  version = '1.0.0'

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
          /data-job-title="([^"]+)"/i,
          /<h1[^>]*>([^<]*(?:engineer|developer|manager|analyst|specialist|coordinator|director|lead)[^<]*)<\/h1>/i,
          /job.?title["\s]*[:=]["\s]*([^"<\n]+)/i
        ],
        company: [
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
    // Try multiple LinkedIn-specific patterns
    const patterns = [
      // Modern LinkedIn structure
      /"companyName"\s*:\s*"([^"]+)"/i,
      /"hiringOrganization"[^}]*"name"\s*:\s*"([^"]+)"/i,
      // Embedded company data
      /"company"[^}]*"name"\s*:\s*"([^"]+)"/i,
      // Meta property
      /property="og:site_name"[^>]*content="([^"]+)"/i
    ]

    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match && match[1] && match[1].trim().length > 1) {
        const company = match[1].trim()
        if (!company.toLowerCase().includes('linkedin')) {
          return company
        }
      }
    }

    return 'Unknown Company'
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
}