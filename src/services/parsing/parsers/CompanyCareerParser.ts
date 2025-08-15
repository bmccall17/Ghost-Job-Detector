import { BaseParser } from '../BaseParser'
import { ParserConfig } from '@/types/parsing'

export class CompanyCareerParser extends BaseParser {
  name = 'CompanyCareerParser'
  version = '1.0.0'

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
}