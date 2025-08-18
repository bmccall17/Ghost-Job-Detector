/**
 * Intelligent Company Normalization Service
 * Learns patterns and consolidates company names that refer to the same entity
 */

interface CompanyVariation {
  canonical: string;
  variations: string[];
  confidence: number;
  lastUpdated: Date;
}

interface NormalizationRule {
  pattern: RegExp;
  replacement: string;
  confidence: number;
}

export class CompanyNormalizationService {
  private static instance: CompanyNormalizationService;
  
  // Known company variations - this could be stored in database in production
  private companyVariations: Map<string, CompanyVariation> = new Map();
  
  // Normalization rules learned from patterns
  private normalizationRules: NormalizationRule[] = [];

  private constructor() {
    this.initializeKnownVariations();
    this.initializeNormalizationRules();
  }

  public static getInstance(): CompanyNormalizationService {
    if (!CompanyNormalizationService.instance) {
      CompanyNormalizationService.instance = new CompanyNormalizationService();
    }
    return CompanyNormalizationService.instance;
  }

  private initializeKnownVariations() {
    // Initialize with common company name variations
    const knownVariations: CompanyVariation[] = [
      {
        canonical: 'Red Ventures',
        variations: ['redventures', 'red ventures', 'red-ventures', 'redventure'],
        confidence: 0.95,
        lastUpdated: new Date()
      },
      {
        canonical: 'Google',
        variations: ['google inc', 'google llc', 'alphabet inc', 'alphabet', 'google.com'],
        confidence: 0.98,
        lastUpdated: new Date()
      },
      {
        canonical: 'Microsoft',
        variations: ['microsoft corp', 'microsoft corporation', 'msft', 'ms'],
        confidence: 0.96,
        lastUpdated: new Date()
      },
      {
        canonical: 'Amazon',
        variations: ['amazon.com', 'amazon web services', 'aws', 'amazon inc'],
        confidence: 0.97,
        lastUpdated: new Date()
      }
    ];

    knownVariations.forEach(variation => {
      const key = this.createNormalizedKey(variation.canonical);
      this.companyVariations.set(key, variation);
      
      // Also map each variation to the canonical form
      variation.variations.forEach(v => {
        const varKey = this.createNormalizedKey(v);
        this.companyVariations.set(varKey, variation);
      });
    });
  }

  private initializeNormalizationRules() {
    this.normalizationRules = [
      // Remove common suffixes
      { pattern: /\s+(inc|corp|corporation|llc|ltd|company|co)\s*$/i, replacement: '', confidence: 0.9 },
      
      // Standardize spacing
      { pattern: /([a-z])([A-Z])/g, replacement: '$1 $2', confidence: 0.85 }, // camelCase to spaced
      { pattern: /\s+/g, replacement: ' ', confidence: 0.95 }, // Multiple spaces to single
      { pattern: /[-_]+/g, replacement: ' ', confidence: 0.9 }, // Hyphens/underscores to spaces
      
      // Remove special characters
      { pattern: /[^\w\s&]/g, replacement: '', confidence: 0.8 },
      
      // Handle common abbreviations
      { pattern: /\b&\b/g, replacement: 'and', confidence: 0.85 },
      { pattern: /\bintl\b/gi, replacement: 'International', confidence: 0.9 }
    ];
  }

  /**
   * Normalize a company name and find its canonical form
   */
  public normalizeCompanyName(companyName: string): {
    canonical: string;
    normalized: string;
    confidence: number;
    isLearned: boolean;
  } {
    if (!companyName || companyName.trim().length === 0) {
      return {
        canonical: 'Unknown Company',
        normalized: 'unknown company',
        confidence: 0,
        isLearned: false
      };
    }

    const cleanName = companyName.trim();
    const normalizedKey = this.createNormalizedKey(cleanName);
    
    // Check if we have a known variation
    const knownVariation = this.companyVariations.get(normalizedKey);
    if (knownVariation) {
      return {
        canonical: knownVariation.canonical,
        normalized: this.createNormalizedKey(knownVariation.canonical),
        confidence: knownVariation.confidence,
        isLearned: true
      };
    }

    // Apply normalization rules
    let normalized = cleanName;
    let totalConfidence = 1.0;

    for (const rule of this.normalizationRules) {
      if (rule.pattern.test(normalized)) {
        normalized = normalized.replace(rule.pattern, rule.replacement);
        totalConfidence *= rule.confidence;
      }
    }

    normalized = normalized.trim();
    const finalNormalized = this.createNormalizedKey(normalized);

    // Check again after normalization
    const postNormalizationMatch = this.companyVariations.get(finalNormalized);
    if (postNormalizationMatch) {
      return {
        canonical: postNormalizationMatch.canonical,
        normalized: this.createNormalizedKey(postNormalizationMatch.canonical),
        confidence: postNormalizationMatch.confidence * totalConfidence,
        isLearned: true
      };
    }

    return {
      canonical: normalized || cleanName,
      normalized: finalNormalized,
      confidence: totalConfidence * 0.7, // Lower confidence for unlearned names
      isLearned: false
    };
  }

  /**
   * Learn a new company variation pattern
   */
  public learnCompanyVariation(
    companyName1: string,
    companyName2: string,
    jobTitle1?: string,
    jobTitle2?: string,
    confidence: number = 0.8
  ): boolean {
    const norm1 = this.normalizeCompanyName(companyName1);
    const norm2 = this.normalizeCompanyName(companyName2);

    // If they already normalize to the same thing, no learning needed
    if (norm1.normalized === norm2.normalized) {
      return false;
    }

    // Determine which should be canonical (prefer the more detailed/professional one)
    const canonical = this.selectCanonicalName(companyName1, companyName2);
    const variation = canonical === companyName1 ? companyName2 : companyName1;

    console.log(`🧠 Learning company variation: "${variation}" -> "${canonical}" (confidence: ${confidence})`);

    // Additional confidence boost if job titles are similar
    if (jobTitle1 && jobTitle2) {
      const titleSimilarity = this.calculateStringSimilarity(jobTitle1, jobTitle2);
      if (titleSimilarity > 0.7) {
        confidence = Math.min(0.95, confidence + (titleSimilarity * 0.2));
        console.log(`📈 Confidence boosted to ${confidence} due to similar job titles`);
      }
    }

    const canonicalKey = this.createNormalizedKey(canonical);
    const variationKey = this.createNormalizedKey(variation);

    // Get or create the canonical variation entry
    let companyVariation = this.companyVariations.get(canonicalKey);
    if (!companyVariation) {
      companyVariation = {
        canonical,
        variations: [],
        confidence,
        lastUpdated: new Date()
      };
      this.companyVariations.set(canonicalKey, companyVariation);
    }

    // Add the variation if not already present
    const normalizedVariation = variation.toLowerCase().trim();
    if (!companyVariation.variations.map(v => v.toLowerCase()).includes(normalizedVariation)) {
      companyVariation.variations.push(variation);
      companyVariation.lastUpdated = new Date();
    }

    // Map the variation key to the canonical entry
    this.companyVariations.set(variationKey, companyVariation);

    return true;
  }

  /**
   * Detect potential company duplicates in existing data
   */
  public async detectCompanyDuplicates(companies: Array<{ name: string; id: string; totalPostings: number }>): Promise<Array<{
    canonical: string;
    duplicates: Array<{ name: string; id: string; totalPostings: number }>;
    confidence: number;
  }>> {
    const duplicateGroups: Array<{
      canonical: string;
      duplicates: Array<{ name: string; id: string; totalPostings: number }>;
      confidence: number;
    }> = [];

    const processed = new Set<string>();

    for (const company of companies) {
      if (processed.has(company.id)) continue;

      const normalized = this.normalizeCompanyName(company.name);
      const potentialDuplicates = companies.filter(c => 
        c.id !== company.id && 
        !processed.has(c.id) &&
        this.areCompaniesSimilar(company.name, c.name)
      );

      if (potentialDuplicates.length > 0) {
        const group = {
          canonical: normalized.canonical,
          duplicates: [company, ...potentialDuplicates],
          confidence: normalized.confidence
        };

        duplicateGroups.push(group);
        
        // Mark all as processed
        processed.add(company.id);
        potentialDuplicates.forEach(d => processed.add(d.id));
      }
    }

    return duplicateGroups;
  }

  private areCompaniesSimilar(name1: string, name2: string): boolean {
    const norm1 = this.normalizeCompanyName(name1);
    const norm2 = this.normalizeCompanyName(name2);

    // If they normalize to the same thing, they're similar
    if (norm1.normalized === norm2.normalized) {
      return true;
    }

    // Check string similarity
    const similarity = this.calculateStringSimilarity(norm1.normalized, norm2.normalized);
    return similarity > 0.85;
  }

  private selectCanonicalName(name1: string, name2: string): string {
    // Prefer the name with proper capitalization
    const hasProperCase1 = /[A-Z]/.test(name1) && /[a-z]/.test(name1);
    const hasProperCase2 = /[A-Z]/.test(name2) && /[a-z]/.test(name2);

    if (hasProperCase1 && !hasProperCase2) return name1;
    if (hasProperCase2 && !hasProperCase1) return name2;

    // Prefer the name with spaces (more readable)
    const hasSpaces1 = name1.includes(' ');
    const hasSpaces2 = name2.includes(' ');

    if (hasSpaces1 && !hasSpaces2) return name1;
    if (hasSpaces2 && !hasSpaces1) return name2;

    // Prefer the longer name (more descriptive)
    return name1.length >= name2.length ? name1 : name2;
  }

  private createNormalizedKey(name: string): string {
    return name.toLowerCase()
      .replace(/[^\w]/g, '')
      .trim();
  }

  public calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }
}