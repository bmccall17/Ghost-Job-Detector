import { ValidationResult, ValidationRule } from '@/types/parsing'

export class DataValidator {
  private rules: ValidationRule[] = []

  constructor() {
    this.initializeDefaultRules()
  }

  private initializeDefaultRules(): void {
    this.rules = [
      {
        field: 'title',
        rule: 'length_check',
        validate: (value: string) => {
          const length = value?.length || 0
          const passed = length >= 3 && length <= 200
          const score = this.calculateLengthScore(length, 10, 100)
          return {
            passed,
            score,
            message: passed ? 'Title length is appropriate' : `Title length (${length}) is outside normal range`
          }
        }
      },
      {
        field: 'title',
        rule: 'content_quality',
        validate: (value: string) => {
          if (!value) return { passed: false, score: 0 }
          
          let score = 0.5
          
          // Positive indicators
          if (/\b(engineer|developer|manager|analyst|specialist|coordinator|director|lead|architect|consultant|administrator|executive|officer|assistant|representative|supervisor|technician)\b/i.test(value)) {
            score += 0.3
          }
          
          // Professional terms
          if (/\b(senior|junior|lead|principal|staff|associate|entry.level|mid.level)\b/i.test(value)) {
            score += 0.1
          }
          
          // Negative indicators
          if (/\b(unknown|position|job|posting|title|lorem|ipsum|placeholder|test)\b/i.test(value)) {
            score -= 0.4
          }
          
          if (value.includes('<') || value.includes('{') || value.includes('http')) {
            score -= 0.3
          }
          
          score = Math.max(0, Math.min(1, score))
          
          return {
            passed: score > 0.5,
            score,
            message: score > 0.7 ? 'High quality job title' : score > 0.5 ? 'Acceptable job title' : 'Low quality job title detected'
          }
        }
      },
      {
        field: 'company',
        rule: 'length_check',
        validate: (value: string) => {
          const length = value?.length || 0
          const passed = length >= 2 && length <= 100
          const score = this.calculateLengthScore(length, 3, 50)
          return {
            passed,
            score,
            message: passed ? 'Company name length is appropriate' : `Company name length (${length}) is outside normal range`
          }
        }
      },
      {
        field: 'company',
        rule: 'content_quality',
        validate: (value: string) => {
          if (!value) return { passed: false, score: 0 }
          
          let score = 0.5
          
          // Positive indicators
          if (/\b(inc|corp|corporation|ltd|limited|llc|company|technologies|tech|solutions|systems|consulting|services|group|enterprises|industries)\b/i.test(value)) {
            score += 0.2
          }
          
          // Well-known company patterns
          if (/^[A-Z][a-z]+(\s+[A-Z][a-z]*)*$/.test(value)) {
            score += 0.1
          }
          
          // Negative indicators
          if (/\b(unknown|company|linkedin|indeed|glassdoor|monster|job.?board|careers?)\b/i.test(value)) {
            score -= 0.4
          }
          
          if (value.includes('<') || value.includes('{') || value.includes('http')) {
            score -= 0.3
          }
          
          score = Math.max(0, Math.min(1, score))
          
          return {
            passed: score > 0.5,
            score,
            message: score > 0.7 ? 'High quality company name' : score > 0.5 ? 'Acceptable company name' : 'Low quality company name detected'
          }
        }
      },
      {
        field: 'description',
        rule: 'content_check',
        validate: (value: string) => {
          if (!value) return { passed: true, score: 0.5, message: 'No description provided' }
          
          const length = value.length
          let score = 0.3
          
          // Length scoring
          if (length >= 50 && length <= 5000) score += 0.3
          if (length >= 100 && length <= 2000) score += 0.2
          
          // Content quality
          if (/\b(responsibilities|requirements|qualifications|experience|skills|benefits)\b/i.test(value)) {
            score += 0.2
          }
          
          return {
            passed: score > 0.4,
            score,
            message: `Description quality score: ${Math.round(score * 100)}%`
          }
        }
      }
    ]
  }

  public validateField(field: string, value: string): ValidationResult[] {
    const fieldRules = this.rules.filter(rule => rule.field === field)
    return fieldRules.map(rule => ({
      field,
      rule: rule.rule,
      ...rule.validate(value)
    }))
  }

  public validateAllFields(data: { title?: string; company?: string; description?: string; location?: string; salary?: string }): ValidationResult[] {
    const allResults: ValidationResult[] = []

    Object.entries(data).forEach(([field, value]) => {
      if (value) {
        allResults.push(...this.validateField(field, value))
      }
    })

    return allResults
  }

  public addRule(rule: ValidationRule): void {
    this.rules.push(rule)
  }

  public removeRule(field: string, ruleName: string): void {
    this.rules = this.rules.filter(rule => !(rule.field === field && rule.rule === ruleName))
  }

  private calculateLengthScore(length: number, idealMin: number, idealMax: number): number {
    if (length === 0) return 0
    if (length >= idealMin && length <= idealMax) return 1
    
    // Calculate distance from ideal range
    let distance = 0
    if (length < idealMin) {
      distance = idealMin - length
    } else {
      distance = length - idealMax
    }
    
    // Convert distance to score (further = lower score)
    const maxPenalty = Math.max(idealMin, idealMax - idealMin)
    const penalty = Math.min(distance / maxPenalty, 1)
    
    return Math.max(0, 1 - penalty)
  }

  public getOverallScore(results: ValidationResult[]): number {
    if (results.length === 0) return 0
    
    const totalScore = results.reduce((sum, result) => sum + result.score, 0)
    return totalScore / results.length
  }
}