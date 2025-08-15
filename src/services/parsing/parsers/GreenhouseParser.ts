import { BaseParser } from '../BaseParser'
import { ParserConfig } from '@/types/parsing'

export class GreenhouseParser extends BaseParser {
  name = 'GreenhouseParser'
  version = '1.0.0'

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
          '.job-post-title h1'
        ],
        company: [
          '.company-name',
          '[data-qa="company-name"]',
          '.header-company'
        ]
      },
      structuredDataPaths: {
        title: ['title', 'name'],
        company: ['hiringOrganization.name']
      },
      textPatterns: {
        title: [
          /app-title[^>]*>([^<]+)/i
        ],
        company: [
          /company-name[^>]*>([^<]+)/i
        ]
      },
      validationRules: []
    }
  }
}