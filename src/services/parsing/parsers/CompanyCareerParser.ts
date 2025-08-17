import { BaseParser } from '../BaseParser'
import { ParserConfig, ExtractionMethod } from '@/types/parsing'

export class CompanyCareerParser extends BaseParser {
  name = 'CompanyCareerParser'
  version = '2.0.0' // Enhanced version with domain intelligence

  constructor() {
    super(CompanyCareerParser.createConfig())
  }

  canHandle(url: string): boolean {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.toLowerCase()
      const pathname = urlObj.pathname.toLowerCase()
      
      return (
        hostname.includes('careers.') ||
        pathname.includes('/careers') ||
        pathname.includes('/jobs') ||
        pathname.includes('/job-openings') ||
        pathname.includes('/opportunities')
      )
    } catch {
      return false
    }
  }

  private static createConfig(): ParserConfig {
    return {
      name: 'CompanyCareer',
      urlPatterns: [
        /careers\./i,
        /\/careers/i,
        /\/jobs/i
      ],
      selectors: {
        title: [
          'h1.job-title',
          '.job-title h1',
          'h1[class*="job-title"]',
          'h1[class*="position"]',
          '.position-title h1',
          'h1.position-name',
          'h1'
        ],
        company: [
          '.company-name',
          '[data-company]',
          '.employer-name',
          '.organization-name'
        ]
      },
      structuredDataPaths: {
        title: ['title', 'name', 'jobTitle'],
        company: ['hiringOrganization.name', 'organization.name']
      },
      textPatterns: {
        title: [
          /<h1[^>]*>([^<]*(?:engineer|developer|manager|analyst|specialist|coordinator|director|lead)[^<]*)<\/h1>/i
        ],
        company: [
          /company["\s]*[:=]["\s]*"([^"]+)"/i
        ]
      },
      validationRules: []
    }
  }

  public async extract(url: string, html: string): Promise<any> {
    const result = await super.extract(url, html)
    
    // Enhanced company name detection for career sites
    if (!result.company || result.company === 'Unknown Company' || result.company.length < 3) {
      const domainCompany = this.extractCompanyFromDomainUrl(url)
      if (domainCompany) {
        result.company = domainCompany
        result.metadata.confidence.company = Math.max(result.metadata.confidence.company, 0.8)
        result.metadata.extractionMethod = ExtractionMethod.DOMAIN_INTELLIGENCE
      }
    }

    // Clean up artifacts from company name
    if (result.company) {
      result.company = this.cleanCompanyName(result.company)
    }

    return result
  }

  private extractCompanyFromDomainUrl(url: string): string | null {
    try {
      const domain = new URL(url).hostname.toLowerCase()
      
      // Known company domain mappings
      const domainMappings: Record<string, string> = {
        'apply.deloitte.com': 'Deloitte',
        'deloitte.com': 'Deloitte',
        'careers.google.com': 'Google',
        'jobs.apple.com': 'Apple', 
        'amazon.jobs': 'Amazon',
        'careers.microsoft.com': 'Microsoft',
        'jobs.netflix.com': 'Netflix',
        'careers.facebook.com': 'Meta',
        'careers.meta.com': 'Meta',
        'jobs.uber.com': 'Uber',
        'careers.airbnb.com': 'Airbnb',
        'careers.salesforce.com': 'Salesforce',
        'jobs.oracle.com': 'Oracle',
        'careers.adobe.com': 'Adobe',
        'careers.nvidia.com': 'NVIDIA',
        'jobs.vmware.com': 'VMware',
        'careers.cisco.com': 'Cisco',
        'jobs.tesla.com': 'Tesla',
        'careers.spotify.com': 'Spotify'
      }
      
      // Direct mapping first
      if (domainMappings[domain]) {
        return domainMappings[domain]
      }
      
      // Pattern-based extraction for careers.company.com format
      if (domain.startsWith('careers.') || domain.startsWith('jobs.')) {
        const mainDomain = domain.replace(/^(careers|jobs)\./, '')
        const company = mainDomain.split('.')[0]
        return this.formatCompanyName(company)
      }
      
      // Pattern-based extraction for apply.company.com format  
      if (domain.startsWith('apply.')) {
        const mainDomain = domain.replace(/^apply\./, '')
        const company = mainDomain.split('.')[0]
        return this.formatCompanyName(company)
      }
      
      // For direct company domains like company.com
      if (domain.split('.').length === 2 && !domain.includes('gov') && !domain.includes('edu')) {
        const company = domain.split('.')[0]
        // Filter out generic domains
        const genericDomains = ['www', 'mail', 'admin', 'blog', 'shop', 'store', 'support']
        if (!genericDomains.includes(company)) {
          return this.formatCompanyName(company)
        }
      }
      
      return null
    } catch {
      return null
    }
  }

  private formatCompanyName(name: string): string {
    // Known company name formatting
    const knownFormats: Record<string, string> = {
      'deloitte': 'Deloitte',
      'google': 'Google', 
      'microsoft': 'Microsoft',
      'apple': 'Apple',
      'amazon': 'Amazon',
      'netflix': 'Netflix',
      'uber': 'Uber',
      'airbnb': 'Airbnb',
      'facebook': 'Meta',
      'meta': 'Meta',
      'salesforce': 'Salesforce',
      'oracle': 'Oracle',
      'adobe': 'Adobe',
      'nvidia': 'NVIDIA',
      'vmware': 'VMware',
      'cisco': 'Cisco',
      'tesla': 'Tesla',
      'spotify': 'Spotify',
      'jpmorgan': 'JPMorgan Chase',
      'chase': 'JPMorgan Chase',
      'goldmansachs': 'Goldman Sachs',
      'morganstanley': 'Morgan Stanley'
    }
    
    const lowerName = name.toLowerCase()
    return knownFormats[lowerName] || 
           name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
  }

  private cleanCompanyName(company: string): string {
    return company
      .replace(/^[-\s]*/, '') // Remove leading dashes/spaces
      .replace(/[-\s]*$/, '') // Remove trailing dashes/spaces  
      .replace(/^\d+\s*[-\s]*/, '') // Remove leading numbers (like "309308 -")
      .replace(/\s*[-\s]*\d+$/, '') // Remove trailing numbers
      .replace(/\s*[-\s]*careers?\s*$/i, '') // Remove "careers" suffix
      .replace(/\s*[-\s]*jobs?\s*$/i, '') // Remove "jobs" suffix
      .trim()
  }
}