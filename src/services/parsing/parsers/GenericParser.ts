import { BaseParser } from '../BaseParser'
import { ParserConfig } from '@/types/parsing'

export class GenericParser extends BaseParser {
  name = 'GenericParser'
  version = '1.0.0'

  constructor() {
    super(GenericParser.createConfig())
  }

  canHandle(url: string): boolean {
    // Generic parser can handle any URL as fallback
    return true
  }

  getConfidence(): number {
    return 0.3 // Low confidence as fallback parser
  }

  private static createConfig(): ParserConfig {
    return {
      name: 'Generic',
      urlPatterns: [/.*/],
      selectors: {
        title: [
          'h1',
          '.job-title',
          '.position-title',
          '.title',
          '[class*="job-title"]',
          '[class*="title"]'
        ],
        company: [
          '.company',
          '.company-name',
          '.employer',
          '[class*="company"]',
          '[class*="employer"]'
        ]
      },
      structuredDataPaths: {
        title: ['title', 'name', 'jobTitle'],
        company: ['hiringOrganization.name', 'organization.name', 'company']
      },
      textPatterns: {
        title: [
          /<h1[^>]*>([^<]+(?:engineer|developer|manager|analyst|specialist|coordinator|director|lead)[^<]*)<\/h1>/i,
          /<title[^>]*>([^<]+(?:engineer|developer|manager|analyst|specialist|coordinator|director|lead)[^<]*)<\/title>/i
        ],
        company: [
          /company["\s]*[:=]["\s]*"([^"]+)"/i,
          /employer["\s]*[:=]["\s]*"([^"]+)"/i
        ]
      },
      validationRules: []
    }
  }
}