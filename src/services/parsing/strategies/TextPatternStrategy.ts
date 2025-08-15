import { ExtractionStrategy, ExtractionMethod, ParsedJob, ValidationResult, ParserConfig } from '@/types/parsing'

export class TextPatternStrategy implements ExtractionStrategy {
  method = ExtractionMethod.TEXT_PATTERNS
  priority = 3 // Third priority
  
  constructor(private config: ParserConfig) {}

  async extract(html: string, _url: string): Promise<Partial<ParsedJob>> {
    const result: Partial<ParsedJob> = {}

    // Extract title from HTML title tag first
    const htmlTitle = this.extractHtmlTitle(html)
    if (htmlTitle) {
      const parsedTitle = this.parseTitle(htmlTitle)
      if (parsedTitle.title) result.title = parsedTitle.title
      if (parsedTitle.company) result.company = parsedTitle.company
    }

    // Apply pattern-based extraction for remaining fields
    if (!result.title) {
      result.title = this.extractWithPatterns(html, this.config.textPatterns.title)
    }
    
    if (!result.company) {
      result.company = this.extractWithPatterns(html, this.config.textPatterns.company)
    }

    // Extract description from common patterns
    if (!result.description) {
      result.description = this.extractDescription(html)
    }

    return result
  }

  validate(data: Partial<ParsedJob>): ValidationResult[] {
    const results: ValidationResult[] = []

    if (data.title) {
      const score = this.scoreTitle(data.title)
      results.push({
        field: 'title',
        passed: score > 0.5,
        rule: 'text_pattern_quality',
        score,
        message: `Title extracted via text patterns (confidence: ${Math.round(score * 100)}%)`
      })
    }

    if (data.company) {
      const score = this.scoreCompany(data.company)
      results.push({
        field: 'company',
        passed: score > 0.5,
        rule: 'text_pattern_quality',
        score,
        message: `Company extracted via text patterns (confidence: ${Math.round(score * 100)}%)`
      })
    }

    return results
  }

  private extractHtmlTitle(html: string): string {
    const match = html.match(/<title[^>]*>([^<]+)/i)
    return match ? match[1].trim() : ''
  }

  private parseTitle(title: string): { title?: string; company?: string } {
    // Remove common suffixes first
    const cleaned = title
      .replace(/\s*\|\s*(LinkedIn|Indeed|Glassdoor|Monster|Jobs).*$/i, '')
      .replace(/\s*-\s*(LinkedIn|Indeed|Glassdoor|Monster|Jobs).*$/i, '')
      .replace(/\s*·\s*(LinkedIn|Indeed|Glassdoor|Monster|Jobs).*$/i, '')
      .trim()

    // Common title patterns
    const patterns = [
      // LinkedIn specific: "Company hiring Job Title in Location" - prioritize this to extract location properly
      { regex: /^(.+?)\s+hiring\s+(.+?)\s+in\s+.+$/i, titleIndex: 2, companyIndex: 1, cleanLocation: true },
      // LinkedIn specific: "Company hiring Job Title" or "Company is hiring for Job Title"
      { regex: /^(.+?)(?:\s+is)?\s+hiring(?:\s+for)?\s+(.+)$/i, titleIndex: 2, companyIndex: 1, cleanLocation: true },
      // "Job Title - Company Name"
      { regex: /^(.+?)\s+-\s+(.+)$/, titleIndex: 1, companyIndex: 2 },
      // "Job Title at Company Name"
      { regex: /^(.+?)\s+at\s+(.+)$/, titleIndex: 1, companyIndex: 2 },
      // "Company Name: Job Title"
      { regex: /^(.+?)\s*:\s*(.+)$/, titleIndex: 2, companyIndex: 1 },
      // "Job Title | Company Name"
      { regex: /^(.+?)\s*\|\s*(.+)$/, titleIndex: 1, companyIndex: 2 },
      // "Job Title · Company Name"
      { regex: /^(.+?)\s*·\s*(.+)$/, titleIndex: 1, companyIndex: 2 },
      // "Job Title, Company Name"
      { regex: /^(.+?)\s*,\s*(.+)$/, titleIndex: 1, companyIndex: 2 }
    ]

    for (const pattern of patterns) {
      const match = cleaned.match(pattern.regex)
      if (match && match[1] && match[2]) {
        let title = match[pattern.titleIndex].trim()
        const company = match[pattern.companyIndex].trim()
        
        // Clean location information if this pattern requires it
        if (pattern.cleanLocation) {
          title = this.cleanLocationFromTitle(title)
        }
        
        // Validate that we didn't just split a single entity
        if (title.length > 2 && company.length > 2 && title !== company) {
          return { title, company }
        }
      }
    }

    // If no pattern matched, return the whole thing as title
    return { title: cleaned || undefined }
  }

  private extractWithPatterns(html: string, patterns: RegExp[]): string | undefined {
    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match && match[1] && match[1].trim().length > 0) {
        return this.cleanText(match[1].trim())
      }
    }
    return undefined
  }

  private extractDescription(html: string): string | undefined {
    // Common description patterns
    const patterns = [
      /<meta[^>]+name="description"[^>]+content="([^"]+)"/i,
      /<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i,
      /<div[^>]*class="[^"]*description[^"]*"[^>]*>([^<]{50,})/i,
      /<div[^>]*class="[^"]*job-description[^"]*"[^>]*>([^<]{50,})/i,
      /<section[^>]*class="[^"]*description[^"]*"[^>]*>([^<]{50,})/i
    ]

    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match && match[1] && match[1].trim().length > 20) {
        return this.cleanText(match[1].trim()).substring(0, 500) // Limit length
      }
    }

    return undefined
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

  private cleanText(text: string): string {
    return text
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  private scoreTitle(title: string): number {
    let score = 0.5 // Base score

    // Length scoring
    if (title.length >= 10 && title.length <= 100) score += 0.2
    if (title.length >= 5 && title.length <= 150) score += 0.1

    // Content quality scoring
    if (/\b(engineer|developer|manager|analyst|specialist|coordinator|director|lead)\b/i.test(title)) {
      score += 0.2
    }

    // Penalty for suspicious content
    if (title.includes('http') || title.includes('<') || title.includes('{')) {
      score -= 0.3
    }

    if (/\b(unknown|position|job|posting)\b/i.test(title)) {
      score -= 0.2
    }

    return Math.max(0, Math.min(1, score))
  }

  private scoreCompany(company: string): number {
    let score = 0.5 // Base score

    // Length scoring  
    if (company.length >= 2 && company.length <= 50) score += 0.2
    if (company.length >= 3 && company.length <= 30) score += 0.1

    // Content quality scoring
    if (/\b(inc|corp|ltd|llc|company|technologies|solutions|systems)\b/i.test(company)) {
      score += 0.1
    }

    // Penalty for suspicious content
    if (company.includes('http') || company.includes('<') || company.includes('{')) {
      score -= 0.4
    }

    if (/\b(unknown|company|linkedin|indeed)\b/i.test(company)) {
      score -= 0.3
    }

    return Math.max(0, Math.min(1, score))
  }
}