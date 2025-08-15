import { ExtractionStrategy, ExtractionMethod, ParsedJob, ValidationResult, ParserConfig } from '@/types/parsing'

export class StructuredDataStrategy implements ExtractionStrategy {
  method = ExtractionMethod.STRUCTURED_DATA
  priority = 1 // Highest priority
  
  constructor(private config: ParserConfig) {}

  async extract(html: string, url: string): Promise<Partial<ParsedJob>> {
    const result: Partial<ParsedJob> = {}

    // Extract JSON-LD structured data
    const jsonLD = this.extractJsonLD(html)
    if (jsonLD) {
      result.title = this.extractFromJsonLD(jsonLD, this.config.structuredDataPaths.title)
      result.company = this.extractFromJsonLD(jsonLD, this.config.structuredDataPaths.company)
      result.description = this.extractFromJsonLD(jsonLD, this.config.structuredDataPaths.description || [])
    }

    // Extract OpenGraph and meta tags
    const metaTags = this.extractMetaTags(html)
    if (!result.title) {
      result.title = metaTags['og:title'] || metaTags['twitter:title']
    }
    if (!result.company) {
      result.company = metaTags['og:site_name'] || metaTags['application-name']
    }
    if (!result.description) {
      result.description = metaTags['og:description'] || metaTags['description']
    }

    // Extract from Schema.org microdata
    const microdata = this.extractMicrodata(html)
    if (microdata && !result.title) {
      result.title = microdata.title
      result.company = microdata.hiringOrganization?.name
    }

    return result
  }

  validate(data: Partial<ParsedJob>): ValidationResult[] {
    const results: ValidationResult[] = []

    if (data.title) {
      results.push({
        field: 'title',
        passed: data.title.length > 5 && !data.title.includes('{'),
        rule: 'structured_data_quality',
        score: data.title.length > 10 ? 0.9 : 0.7,
        message: 'Title extracted from structured data'
      })
    }

    if (data.company) {
      results.push({
        field: 'company',
        passed: data.company.length > 2 && !data.company.includes('{'),
        rule: 'structured_data_quality', 
        score: data.company.length > 3 ? 0.9 : 0.6,
        message: 'Company extracted from structured data'
      })
    }

    return results
  }

  private extractJsonLD(html: string): any {
    try {
      const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([^<]+)<\/script>/gi)
      
      for (const match of jsonLdMatches) {
        try {
          const data = JSON.parse(match[1])
          if (this.isJobPostingSchema(data)) {
            return data
          }
        } catch {
          continue
        }
      }
    } catch {
      // Ignore parsing errors
    }
    return null
  }

  private isJobPostingSchema(data: any): boolean {
    if (Array.isArray(data)) {
      return data.some(item => item['@type'] === 'JobPosting')
    }
    return data['@type'] === 'JobPosting' || data.type === 'JobPosting'
  }

  private extractFromJsonLD(jsonLD: any, paths: string[]): string | undefined {
    if (!jsonLD) return undefined

    // Handle arrays of structured data
    const data = Array.isArray(jsonLD) ? jsonLD.find(item => item['@type'] === 'JobPosting') : jsonLD

    for (const path of paths) {
      const value = this.getNestedValue(data, path)
      if (value && typeof value === 'string' && value.trim().length > 0) {
        return value.trim()
      }
    }

    return undefined
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private extractMetaTags(html: string): Record<string, string> {
    const metaTags: Record<string, string> = {}
    const metaMatches = html.matchAll(/<meta[^>]+>/gi)
    
    for (const match of metaMatches) {
      const metaTag = match[0]
      const nameMatch = metaTag.match(/(?:name|property)="([^"]+)"/i)
      const contentMatch = metaTag.match(/content="([^"]+)"/i)
      
      if (nameMatch && contentMatch) {
        metaTags[nameMatch[1]] = contentMatch[1]
      }
    }
    
    return metaTags
  }

  private extractMicrodata(html: string): any {
    try {
      // Look for JobPosting microdata
      const jobPostingMatch = html.match(/itemtype="[^"]*JobPosting[^"]*"[^>]*>(.*?)<\/[^>]+>/s)
      if (!jobPostingMatch) return null

      const microdataSection = jobPostingMatch[1]
      
      const title = this.extractItemprop(microdataSection, 'title')
      const hiringOrgMatch = microdataSection.match(/itemtype="[^"]*Organization[^"]*"[^>]*>(.*?)<\/[^>]+>/s)
      const hiringOrganization = hiringOrgMatch ? {
        name: this.extractItemprop(hiringOrgMatch[1], 'name')
      } : null

      return {
        title,
        hiringOrganization
      }
    } catch {
      return null
    }
  }

  private extractItemprop(html: string, prop: string): string | undefined {
    const match = html.match(new RegExp(`itemprop="${prop}"[^>]*>([^<]+)`, 'i'))
    return match ? match[1].trim() : undefined
  }
}