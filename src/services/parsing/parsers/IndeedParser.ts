import { BaseParser } from '../BaseParser'
import { ParserConfig } from '@/types/parsing'

export class IndeedParser extends BaseParser {
  name = 'IndeedParser'
  version = '1.0.0'

  constructor() {
    super(IndeedParser.createConfig())
  }

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase()
      return hostname.includes('indeed.com')
    } catch {
      return false
    }
  }

  private static createConfig(): ParserConfig {
    return {
      name: 'Indeed',
      urlPatterns: [/indeed\.com\/viewjob/i],
      selectors: {
        title: [
          '[data-testid="jobsearch-JobInfoHeader-title"]',
          'h1[data-testid="job-title"]',
          '.jobsearch-JobInfoHeader-title',
          'h1.jobsearch-JobInfoHeader-title',
          '.icl-u-xs-mb--xs.icl-u-xs-mt--none.jobsearch-JobInfoHeader-title'
        ],
        company: [
          '[data-testid="inlineHeader-companyName"]',
          '[data-testid="company-name"]',
          '.icl-u-lg-mr--sm.icl-u-xs-mr--xs',
          'div[data-testid="inlineHeader-companyName"] a',
          'span[title] a'
        ]
      },
      structuredDataPaths: {
        title: ['title', 'name'],
        company: ['hiringOrganization.name', 'company']
      },
      textPatterns: {
        title: [
          /jobTitle["\s]*[:=]["\s]*([^"<\n]+)/i
        ],
        company: [
          /companyName["\s]*[:=]["\s]*([^"<\n]+)/i
        ]
      },
      validationRules: []
    }
  }
}