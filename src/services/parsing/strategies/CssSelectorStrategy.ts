import { ExtractionStrategy, ExtractionMethod, ParsedJob, ValidationResult, ParserConfig } from '@/types/parsing'

export class CssSelectorStrategy implements ExtractionStrategy {
  method = ExtractionMethod.CSS_SELECTORS
  priority = 2 // Second priority
  
  constructor(private config: ParserConfig) {}

  async extract(html: string, url: string): Promise<Partial<ParsedJob>> {
    const result: Partial<ParsedJob> = {}

    // Create a mock DOM parser for selector extraction
    const mockDoc = this.createMockDocument(html)

    // Extract using configured selectors with fallback chain
    result.title = this.extractWithSelectors(mockDoc, this.config.selectors.title)
    result.company = this.extractWithSelectors(mockDoc, this.config.selectors.company)
    
    if (this.config.selectors.description) {
      result.description = this.extractWithSelectors(mockDoc, this.config.selectors.description)
    }
    
    if (this.config.selectors.location) {
      result.location = this.extractWithSelectors(mockDoc, this.config.selectors.location)
    }
    
    if (this.config.selectors.salary) {
      result.salary = this.extractWithSelectors(mockDoc, this.config.selectors.salary)
    }

    return result
  }

  validate(data: Partial<ParsedJob>): ValidationResult[] {
    const results: ValidationResult[] = []

    if (data.title) {
      const isValid = data.title.length > 3 && !this.containsSelectors(data.title)
      results.push({
        field: 'title',
        passed: isValid,
        rule: 'css_selector_extraction',
        score: isValid ? 0.8 : 0.3,
        message: isValid ? 'Title extracted via CSS selectors' : 'Title may contain HTML artifacts'
      })
    }

    if (data.company) {
      const isValid = data.company.length > 1 && !this.containsSelectors(data.company)
      results.push({
        field: 'company',
        passed: isValid,
        rule: 'css_selector_extraction',
        score: isValid ? 0.8 : 0.3,
        message: isValid ? 'Company extracted via CSS selectors' : 'Company may contain HTML artifacts'
      })
    }

    return results
  }

  private createMockDocument(html: string): MockDocument {
    return new MockDocument(html)
  }

  private extractWithSelectors(doc: MockDocument, selectors: string[]): string | undefined {
    for (const selector of selectors) {
      try {
        const text = doc.querySelector(selector)
        if (text && text.trim().length > 0) {
          return this.cleanExtractedText(text.trim())
        }
      } catch (error) {
        console.warn(`Invalid selector ${selector}:`, error)
        continue
      }
    }
    return undefined
  }

  private cleanExtractedText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^[\s\n\r\t]+|[\s\n\r\t]+$/g, '') // Trim
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  }

  private containsSelectors(text: string): boolean {
    return /[<>{}[\]#.]/.test(text) || text.includes('class=') || text.includes('id=')
  }
}

// Simple mock document for selector-based extraction
class MockDocument {
  constructor(private html: string) {}

  querySelector(selector: string): string | null {
    try {
      // Handle common selector patterns
      if (selector.startsWith('.')) {
        return this.extractByClass(selector.slice(1))
      } else if (selector.startsWith('#')) {
        return this.extractById(selector.slice(1))
      } else if (selector.includes('[')) {
        return this.extractByAttribute(selector)
      } else {
        return this.extractByTag(selector)
      }
    } catch {
      return null
    }
  }

  private extractByClass(className: string): string | null {
    const regex = new RegExp(`class="[^"]*${className}[^"]*"[^>]*>([^<]+)`, 'i')
    const match = this.html.match(regex)
    return match ? match[1] : null
  }

  private extractById(id: string): string | null {
    const regex = new RegExp(`id="${id}"[^>]*>([^<]+)`, 'i')
    const match = this.html.match(regex)
    return match ? match[1] : null
  }

  private extractByAttribute(selector: string): string | null {
    // Parse attribute selector like div[data-testid="job-title"]
    const match = selector.match(/(\w+)?\[([^=]+)=?"?([^"\]]*)"?\]/)
    if (!match) return null

    const [, tag, attr, value] = match
    const tagPattern = tag || '\\w+'
    const regex = new RegExp(`<${tagPattern}[^>]*${attr}="[^"]*${value}[^"]*"[^>]*>([^<]+)`, 'i')
    const textMatch = this.html.match(regex)
    return textMatch ? textMatch[1] : null
  }

  private extractByTag(tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([^<]+)`, 'i')
    const match = this.html.match(regex)
    return match ? match[1] : null
  }
}