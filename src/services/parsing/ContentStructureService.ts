/**
 * Content Structure Recognition Service
 * Implements hierarchical document structure recognition for professional job parsing
 * Addresses the critical gap in current field-centric architecture
 */

import { 
  HierarchicalJobDocument, 
  JobDocumentSection, 
  JobBulletPoint, 
  JobSectionType, 
  JobMetadata,
  StructureQualityMetrics,
  ProcessingInfo
} from '@/types/HierarchicalJobDocument';

export class ContentStructureService {
  private static instance: ContentStructureService;

  private constructor() {}

  public static getInstance(): ContentStructureService {
    if (!ContentStructureService.instance) {
      ContentStructureService.instance = new ContentStructureService();
    }
    return ContentStructureService.instance;
  }

  /**
   * Main entry point: Transform raw content into hierarchical structure
   */
  public async processDocument(
    content: string,
    url: string,
    processingMethod: 'webllm' | 'fallback' | 'hybrid' = 'hybrid'
  ): Promise<HierarchicalJobDocument> {
    const startTime = Date.now();
    
    try {
      console.log('🏗️  Starting document structure processing...');
      
      // Step 1: Content preprocessing and noise removal
      const cleanedContent = this.preprocessContent(content);
      
      // Step 2: Section boundary detection
      const rawSections = this.detectSectionBoundaries(cleanedContent);
      
      // Step 3: Section classification and organization
      const classifiedSections = this.classifySections(rawSections);
      
      // Step 4: Bullet point processing and normalization
      const processedSections = await this.processBulletPoints(classifiedSections);
      
      // Step 5: Extract document-level metadata
      const jobMetadata = this.extractJobMetadata(cleanedContent, processedSections);
      
      // Step 6: Quality assessment
      const structureQuality = this.assessStructureQuality(processedSections, cleanedContent, content);
      
      // Step 7: Organize final hierarchical structure
      const organizedSections = this.organizeHierarchicalStructure(processedSections);
      
      const processingTime = Date.now() - startTime;
      
      const document: HierarchicalJobDocument = {
        documentId: this.generateDocumentId(url),
        originalUrl: url,
        processingTimestamp: new Date().toISOString(),
        originalContent: content,
        cleanedContent,
        sections: organizedSections,
        jobMetadata,
        structureQuality,
        processingInfo: {
          parsingMethod: processingMethod,
          processingTimeMs: processingTime,
          validationPassed: structureQuality.overallStructureScore > 0.6,
          contentLossDetected: this.detectContentLoss(content, cleanedContent)
        }
      };
      
      console.log(`✅ Document processing completed in ${processingTime}ms with ${(structureQuality.overallStructureScore * 100).toFixed(1)}% structure quality`);
      
      return document;
      
    } catch (error) {
      console.error('❌ Document structure processing failed:', error);
      throw new Error(`Document structure processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Step 1: Content preprocessing and noise removal
   */
  private preprocessContent(content: string): string {
    console.log('🧹 Preprocessing content and removing noise...');
    
    let cleaned = content;
    
    // Remove common noise patterns
    const noisePatterns = [
      // URLs and links
      /https?:\/\/[^\s]+/g,
      // Cookie consent and legal notices
      /(cookie consent|accept cookies|privacy policy|terms of service|legal disclaimer)[^\n]*/gi,
      // Navigation elements
      /(home|about|contact|careers|jobs|apply now|back to top)[|\s]*$/gim,
      // Social media links
      /(facebook|twitter|linkedin|instagram|youtube)\.com[^\s]*/gi,
      // Footer content
      /©\s*\d{4}[^\n]*/g,
      // Page numbers and timestamps
      /page\s+\d+\s+of\s+\d+/gi,
      /\d{1,2}\/\d{1,2}\/\d{2,4}[,\s]*\d{1,2}:\d{2}\s*(AM|PM)/gi,
      // Duplicate whitespace
      /\s{3,}/g
    ];
    
    for (const pattern of noisePatterns) {
      cleaned = cleaned.replace(pattern, ' ');
    }
    
    // Normalize whitespace
    cleaned = cleaned
      .replace(/\n{3,}/g, '\n\n') // Multiple newlines to double
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .trim();
    
    console.log(`📊 Content cleaned: ${content.length} → ${cleaned.length} chars (${((1 - cleaned.length/content.length) * 100).toFixed(1)}% reduction)`);
    
    return cleaned;
  }

  /**
   * Step 2: Section boundary detection using multiple strategies
   */
  private detectSectionBoundaries(content: string): RawSection[] {
    console.log('🔍 Detecting section boundaries...');
    
    const sections: RawSection[] = [];
    const lines = content.split('\n').filter(line => line.trim());
    
    let currentSection: RawSection | null = null;
    let currentContent: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (this.isSectionHeader(line, i, lines)) {
        // Save previous section if exists
        if (currentSection && currentContent.length > 0) {
          currentSection.content = currentContent.join('\n').trim();
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          id: `section_${sections.length}`,
          title: this.cleanSectionTitle(line),
          content: '',
          originalOrder: sections.length
        };
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      } else {
        // Content before first header - create implicit section
        if (sections.length === 0) {
          currentSection = {
            id: 'section_intro',
            title: 'Job Overview',
            content: '',
            originalOrder: 0
          };
        }
        currentContent.push(line);
      }
    }
    
    // Don't forget the last section
    if (currentSection && currentContent.length > 0) {
      currentSection.content = currentContent.join('\n').trim();
      sections.push(currentSection);
    }
    
    console.log(`📍 Detected ${sections.length} content sections`);
    return sections;
  }

  /**
   * Detect if a line is a section header
   */
  private isSectionHeader(line: string, index: number, allLines: string[]): boolean {
    // Format-based indicators
    const formatIndicators = [
      line.length < 100, // Headers are usually short
      line.endsWith(':'), // Colon ending
      line === line.toUpperCase() && line.length > 3, // ALL CAPS
      /^[A-Z][a-z\s]+:?$/.test(line), // Title case
      /^(about|key|main|primary|job|role|position|responsibilities|qualifications|requirements|skills|experience|what|benefits|compensation|salary|company|equal|apply)/i.test(line)
    ];
    
    // Content-based section keywords
    const sectionKeywords = [
      'about the role', 'role overview', 'job description', 'position summary',
      'key responsibilities', 'main duties', 'primary responsibilities', 'what you\'ll do',
      'qualifications', 'requirements', 'skills', 'experience', 'education',
      'what we offer', 'benefits', 'compensation', 'salary', 'package',
      'about us', 'about the company', 'company overview', 'our culture',
      'equal opportunity', 'diversity', 'inclusion', 'legal',
      'how to apply', 'application process', 'next steps'
    ];
    
    const matchesKeyword = sectionKeywords.some(keyword => 
      line.toLowerCase().includes(keyword.toLowerCase())
    );
    
    const formatScore = formatIndicators.filter(Boolean).length;
    
    // Header if it matches keywords OR has strong format indicators
    return matchesKeyword || formatScore >= 3;
  }

  /**
   * Clean and normalize section titles
   */
  private cleanSectionTitle(title: string): string {
    return title
      .replace(/[:\-_]+$/, '') // Remove trailing punctuation
      .replace(/^[•\-\*\+]+\s*/, '') // Remove bullet markers
      .trim()
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Step 3: Section classification using pattern matching
   */
  private classifySections(rawSections: RawSection[]): ClassifiedSection[] {
    console.log('🏷️  Classifying sections by type...');
    
    return rawSections.map(section => {
      const sectionType = this.determineSectionType(section.title, section.content);
      const confidence = this.calculateClassificationConfidence(section, sectionType);
      
      return {
        ...section,
        sectionType,
        confidence
      };
    });
  }

  /**
   * Determine section type based on title and content analysis
   */
  private determineSectionType(title: string, content: string): JobSectionType {
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();
    
    // Metadata indicators
    if (this.containsMetadataPatterns(titleLower, contentLower)) {
      return JobSectionType.METADATA;
    }
    
    // Role overview indicators
    if (this.containsRoleOverviewPatterns(titleLower, contentLower)) {
      return JobSectionType.ROLE_OVERVIEW;
    }
    
    // Responsibilities indicators
    if (this.containsResponsibilitiesPatterns(titleLower, contentLower)) {
      return JobSectionType.RESPONSIBILITIES;
    }
    
    // Qualifications indicators
    if (this.containsQualificationsPatterns(titleLower, contentLower)) {
      return JobSectionType.QUALIFICATIONS;
    }
    
    // Compensation indicators
    if (this.containsCompensationPatterns(titleLower, contentLower)) {
      return JobSectionType.COMPENSATION;
    }
    
    // Company info indicators
    if (this.containsCompanyInfoPatterns(titleLower, contentLower)) {
      return JobSectionType.COMPANY_INFO;
    }
    
    // Legal indicators
    if (this.containsLegalPatterns(titleLower, contentLower)) {
      return JobSectionType.LEGAL;
    }
    
    // Application indicators
    if (this.containsApplicationPatterns(titleLower, contentLower)) {
      return JobSectionType.APPLICATION;
    }
    
    return JobSectionType.UNKNOWN;
  }

  // Pattern detection methods
  private containsMetadataPatterns(title: string, content: string): boolean {
    const metadataKeywords = ['location', 'salary', 'date', 'requisition', 'id', 'posted', 'expires'];
    return metadataKeywords.some(keyword => title.includes(keyword) || content.includes(keyword));
  }

  private containsRoleOverviewPatterns(title: string, content: string): boolean {
    const overviewKeywords = ['about the role', 'overview', 'description', 'summary', 'position'];
    return overviewKeywords.some(keyword => title.includes(keyword));
  }

  private containsResponsibilitiesPatterns(title: string, content: string): boolean {
    const responsibilityKeywords = ['responsibilities', 'duties', 'what you', 'you will', 'role involves'];
    return responsibilityKeywords.some(keyword => title.includes(keyword) || content.includes(keyword));
  }

  private containsQualificationsPatterns(title: string, content: string): boolean {
    const qualificationKeywords = ['qualifications', 'requirements', 'skills', 'experience', 'education', 'must have'];
    return qualificationKeywords.some(keyword => title.includes(keyword));
  }

  private containsCompensationPatterns(title: string, content: string): boolean {
    const compensationKeywords = ['salary', 'compensation', 'benefits', 'package', 'offer', 'pay'];
    return compensationKeywords.some(keyword => title.includes(keyword));
  }

  private containsCompanyInfoPatterns(title: string, content: string): boolean {
    const companyKeywords = ['about us', 'company', 'our team', 'culture', 'mission', 'values'];
    return companyKeywords.some(keyword => title.includes(keyword));
  }

  private containsLegalPatterns(title: string, content: string): boolean {
    const legalKeywords = ['equal opportunity', 'diversity', 'inclusion', 'discrimination', 'accommodation'];
    return legalKeywords.some(keyword => title.includes(keyword) || content.includes(keyword));
  }

  private containsApplicationPatterns(title: string, content: string): boolean {
    const applicationKeywords = ['apply', 'application', 'how to', 'next steps', 'process'];
    return applicationKeywords.some(keyword => title.includes(keyword));
  }

  private calculateClassificationConfidence(section: RawSection, sectionType: JobSectionType): number {
    // Base confidence on keyword matches and content characteristics
    let confidence = 0.5;
    
    const titleMatches = this.countKeywordMatches(section.title.toLowerCase(), sectionType);
    const contentMatches = this.countKeywordMatches(section.content.toLowerCase(), sectionType);
    
    confidence += Math.min(titleMatches * 0.2, 0.3);
    confidence += Math.min(contentMatches * 0.1, 0.2);
    
    return Math.min(confidence, 1.0);
  }

  private countKeywordMatches(text: string, sectionType: JobSectionType): number {
    const keywordMap: Record<JobSectionType, string[]> = {
      [JobSectionType.METADATA]: ['location', 'salary', 'date', 'id'],
      [JobSectionType.ROLE_OVERVIEW]: ['about', 'overview', 'role', 'position'],
      [JobSectionType.RESPONSIBILITIES]: ['responsibilities', 'duties', 'manage', 'lead'],
      [JobSectionType.QUALIFICATIONS]: ['qualifications', 'requirements', 'skills', 'experience'],
      [JobSectionType.COMPENSATION]: ['salary', 'benefits', 'compensation', 'package'],
      [JobSectionType.COMPANY_INFO]: ['company', 'culture', 'team', 'mission'],
      [JobSectionType.LEGAL]: ['equal', 'diversity', 'discrimination', 'legal'],
      [JobSectionType.APPLICATION]: ['apply', 'application', 'contact', 'submit'],
      [JobSectionType.UNKNOWN]: []
    };
    
    const keywords = keywordMap[sectionType] || [];
    return keywords.filter(keyword => text.includes(keyword)).length;
  }

  /**
   * Step 4: Process bullet points with Label: Description pattern recognition
   */
  private async processBulletPoints(sections: ClassifiedSection[]): Promise<JobDocumentSection[]> {
    console.log('🔸 Processing bullet points and normalization...');
    
    return sections.map(section => {
      const bullets = this.extractBulletPoints(section.content);
      
      return {
        id: section.id,
        title: section.title,
        content: section.content,
        bullets,
        subsections: [], // TODO: Implement subsection detection if needed
        sectionType: section.sectionType,
        confidence: section.confidence,
        originalOrder: section.originalOrder
      };
    });
  }

  /**
   * Extract and normalize bullet points with Label: Description pattern
   */
  private extractBulletPoints(content: string): JobBulletPoint[] {
    const bullets: JobBulletPoint[] = [];
    const lines = content.split('\n').filter(line => line.trim());
    
    let bulletId = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines or very short content
      if (trimmed.length < 10) continue;
      
      // Detect bullet markers
      const bulletMarkerPattern = /^[•\-\*\+\d+\.]\s*(.+)$/;
      const colonPattern = /^([^:]+):\s*(.+)$/;
      
      let label: string | undefined;
      let description: string;
      let level = 0; // Basic level detection based on indentation
      
      // Count leading whitespace for nesting level
      const leadingSpaces = line.length - line.trimStart().length;
      level = Math.floor(leadingSpaces / 4); // 4 spaces per level
      
      if (bulletMarkerPattern.test(trimmed)) {
        // Standard bullet point
        const match = trimmed.match(bulletMarkerPattern);
        const bulletContent = match?.[1] || trimmed;
        
        // Check if bullet has Label: Description pattern
        const colonMatch = bulletContent.match(colonPattern);
        if (colonMatch) {
          label = colonMatch[1].trim();
          description = colonMatch[2].trim();
        } else {
          description = bulletContent;
        }
      } else if (colonPattern.test(trimmed)) {
        // Direct Label: Description pattern
        const match = trimmed.match(colonPattern);
        label = match?.[1].trim();
        description = match?.[2].trim() || '';
      } else {
        // Regular paragraph content - only include if substantial
        if (trimmed.length > 50) {
          description = trimmed;
        } else {
          continue; // Skip short non-bullet content
        }
      }
      
      bullets.push({
        id: `bullet_${bulletId++}`,
        label,
        description,
        level,
        originalText: line,
        confidence: this.calculateBulletConfidence(label, description)
      });
    }
    
    return bullets;
  }

  private calculateBulletConfidence(label: string | undefined, description: string): number {
    let confidence = 0.6; // Base confidence
    
    if (label && label.length > 0) confidence += 0.2; // Has clear label
    if (description.length > 20) confidence += 0.1; // Substantial description
    if (description.includes('manage') || description.includes('lead') || description.includes('develop')) {
      confidence += 0.1; // Action words
    }
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Step 5: Extract document-level metadata
   */
  private extractJobMetadata(content: string, sections: JobDocumentSection[]): JobMetadata {
    console.log('📊 Extracting job metadata...');
    
    // Find metadata section or extract from content
    const metadataSection = sections.find(s => s.sectionType === JobSectionType.METADATA);
    const searchText = metadataSection ? metadataSection.content : content;
    
    return {
      title: this.extractTitle(searchText, content),
      company: this.extractCompany(searchText, content),
      location: this.extractLocation(searchText, content),
      salary: this.extractSalary(searchText, content),
      date: this.extractDate(searchText, content),
      requisitionId: this.extractRequisitionId(searchText, content),
      jobType: this.extractJobType(searchText, content),
      experienceLevel: this.extractExperienceLevel(searchText, content),
      department: this.extractDepartment(searchText, content),
      industry: this.extractIndustry(searchText, content)
    };
  }

  // Metadata extraction methods
  private extractTitle(text: string, fullContent: string): string | null {
    // Look for title patterns
    const titlePatterns = [
      /(?:title|position|role):\s*([^\n]+)/i,
      /^([A-Z][^–-]*(?:manager|engineer|analyst|specialist|director|lead|senior|junior))/im
    ];
    
    for (const pattern of titlePatterns) {
      const match = text.match(pattern) || fullContent.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  private extractCompany(text: string, fullContent: string): string | null {
    const companyPatterns = [
      /(?:company|employer|organization):\s*([^\n]+)/i,
      /(?:about|at)\s+([A-Z][A-Za-z\s&]+)(?:,|\.|$)/
    ];
    
    for (const pattern of companyPatterns) {
      const match = text.match(pattern) || fullContent.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  private extractLocation(text: string, fullContent: string): string | null {
    const locationPatterns = [
      /(?:location|based in|office):\s*([^\n]+)/i,
      /(?:^|\s)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2,}|\w+,\s*\w+)/
    ];
    
    for (const pattern of locationPatterns) {
      const match = text.match(pattern) || fullContent.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  private extractSalary(text: string, fullContent: string): string | null {
    const salaryPatterns = [
      /(?:salary|compensation|pay|wage):\s*([^\n]+)/i,
      /\$[\d,]+(?:\.\d{2})?(?:\s*-\s*\$[\d,]+(?:\.\d{2})?)?/,
      /£[\d,]+(?:\.\d{2})?(?:\s*-\s*£[\d,]+(?:\.\d{2})?)?/
    ];
    
    for (const pattern of salaryPatterns) {
      const match = text.match(pattern) || fullContent.match(pattern);
      if (match) {
        return (match[1] || match[0]).trim();
      }
    }
    
    return null;
  }

  private extractDate(text: string, fullContent: string): string | null {
    const datePatterns = [
      /(?:date|posted|published):\s*([^\n]+)/i,
      /\d{1,2}\/\d{1,2}\/\d{2,4}/,
      /\d{4}-\d{2}-\d{2}/
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern) || fullContent.match(pattern);
      if (match) {
        return (match[1] || match[0]).trim();
      }
    }
    
    return null;
  }

  private extractRequisitionId(text: string, fullContent: string): string | null {
    const idPatterns = [
      /(?:requisition|req|job|reference)(?:\s+id)?:\s*([A-Za-z0-9-]+)/i,
      /(?:job|req|ref)#?\s*([A-Za-z0-9-]+)/i
    ];
    
    for (const pattern of idPatterns) {
      const match = text.match(pattern) || fullContent.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  private extractJobType(text: string, fullContent: string): string | null {
    const typePatterns = [
      /(?:employment|job)\s+type:\s*([^\n]+)/i,
      /\b(full-time|part-time|contract|temporary|permanent|remote|hybrid)\b/i
    ];
    
    for (const pattern of typePatterns) {
      const match = text.match(pattern) || fullContent.match(pattern);
      if (match) {
        return (match[1] || match[0]).trim();
      }
    }
    
    return null;
  }

  private extractExperienceLevel(text: string, fullContent: string): string | null {
    const experiencePatterns = [
      /(?:experience|level):\s*([^\n]+)/i,
      /\b(entry|junior|mid|senior|lead|principal|director|executive)\b.*\blevel\b/i,
      /\d+\+?\s*years?\s+(?:of\s+)?experience/i
    ];
    
    for (const pattern of experiencePatterns) {
      const match = text.match(pattern) || fullContent.match(pattern);
      if (match) {
        return (match[1] || match[0]).trim();
      }
    }
    
    return null;
  }

  private extractDepartment(text: string, fullContent: string): string | null {
    const departmentPatterns = [
      /(?:department|team|division):\s*([^\n]+)/i,
      /\b(engineering|marketing|sales|hr|finance|operations|it|technology)\b/i
    ];
    
    for (const pattern of departmentPatterns) {
      const match = text.match(pattern) || fullContent.match(pattern);
      if (match) {
        return (match[1] || match[0]).trim();
      }
    }
    
    return null;
  }

  private extractIndustry(text: string, fullContent: string): string | null {
    const industryPatterns = [
      /(?:industry|sector):\s*([^\n]+)/i,
      /\b(healthcare|finance|technology|retail|manufacturing|consulting|education)\b/i
    ];
    
    for (const pattern of industryPatterns) {
      const match = text.match(pattern) || fullContent.match(pattern);
      if (match) {
        return (match[1] || match[0]).trim();
      }
    }
    
    return null;
  }

  /**
   * Step 6: Assess structure quality
   */
  private assessStructureQuality(
    sections: JobDocumentSection[], 
    cleanedContent: string, 
    originalContent: string
  ): StructureQualityMetrics {
    console.log('📈 Assessing structure quality...');
    
    const sectionCompleteness = this.calculateSectionCompleteness(sections);
    const bulletPointQuality = this.calculateBulletPointQuality(sections);
    const hierarchicalConsistency = this.calculateHierarchicalConsistency(sections);
    const contentFidelity = this.calculateContentFidelity(cleanedContent, originalContent);
    
    const overallStructureScore = (
      sectionCompleteness * 0.3 +
      bulletPointQuality * 0.25 +
      hierarchicalConsistency * 0.25 +
      contentFidelity * 0.2
    );
    
    return {
      sectionCompleteness,
      bulletPointQuality,
      hierarchicalConsistency,
      contentFidelity,
      overallStructureScore
    };
  }

  private calculateSectionCompleteness(sections: JobDocumentSection[]): number {
    const expectedSections = [
      JobSectionType.ROLE_OVERVIEW,
      JobSectionType.RESPONSIBILITIES,
      JobSectionType.QUALIFICATIONS
    ];
    
    const foundSections = sections.map(s => s.sectionType);
    const completeness = expectedSections.filter(expected => 
      foundSections.includes(expected)
    ).length / expectedSections.length;
    
    return completeness;
  }

  private calculateBulletPointQuality(sections: JobDocumentSection[]): number {
    const allBullets = sections.flatMap(s => s.bullets);
    if (allBullets.length === 0) return 0.5; // Neutral if no bullets
    
    const averageConfidence = allBullets.reduce((sum, bullet) => 
      sum + bullet.confidence, 0) / allBullets.length;
    
    const labeledBullets = allBullets.filter(bullet => bullet.label).length;
    const labelRatio = labeledBullets / allBullets.length;
    
    return (averageConfidence * 0.7) + (labelRatio * 0.3);
  }

  private calculateHierarchicalConsistency(sections: JobDocumentSection[]): number {
    // Check if sections are in logical order
    const sectionOrder = sections.map(s => s.sectionType);
    const expectedOrder = [
      JobSectionType.METADATA,
      JobSectionType.ROLE_OVERVIEW,
      JobSectionType.RESPONSIBILITIES,
      JobSectionType.QUALIFICATIONS,
      JobSectionType.COMPENSATION,
      JobSectionType.COMPANY_INFO,
      JobSectionType.LEGAL
    ];
    
    let orderScore = 0.5; // Base score
    let lastExpectedIndex = -1;
    
    for (const sectionType of sectionOrder) {
      const expectedIndex = expectedOrder.indexOf(sectionType);
      if (expectedIndex > lastExpectedIndex) {
        orderScore += 0.05; // Bonus for correct order
        lastExpectedIndex = expectedIndex;
      }
    }
    
    return Math.min(orderScore, 1.0);
  }

  private calculateContentFidelity(cleanedContent: string, originalContent: string): number {
    // Simple fidelity check - more sophisticated validation in QualityValidationService
    const retentionRatio = cleanedContent.length / originalContent.length;
    
    // Good fidelity is 60-90% retention (removed noise but kept content)
    if (retentionRatio >= 0.6 && retentionRatio <= 0.9) {
      return 0.8 + (0.2 * (0.9 - Math.abs(retentionRatio - 0.75)) / 0.15);
    } else if (retentionRatio > 0.9) {
      return 0.7; // Might not have removed enough noise
    } else {
      return Math.max(0.2, retentionRatio); // Too much content lost
    }
  }

  /**
   * Step 7: Organize final hierarchical structure with professional ordering
   */
  private organizeHierarchicalStructure(sections: JobDocumentSection[]): JobDocumentSection[] {
    console.log('🗂️  Organizing hierarchical structure...');
    
    // Define professional section ordering
    const sectionPriority: Record<JobSectionType, number> = {
      [JobSectionType.METADATA]: 0,
      [JobSectionType.ROLE_OVERVIEW]: 1,
      [JobSectionType.RESPONSIBILITIES]: 2,
      [JobSectionType.QUALIFICATIONS]: 3,
      [JobSectionType.COMPENSATION]: 4,
      [JobSectionType.COMPANY_INFO]: 5,
      [JobSectionType.APPLICATION]: 6,
      [JobSectionType.LEGAL]: 7,
      [JobSectionType.UNKNOWN]: 8
    };
    
    // Sort sections by professional order
    const sortedSections = sections.sort((a, b) => {
      const aPriority = sectionPriority[a.sectionType];
      const bPriority = sectionPriority[b.sectionType];
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // If same type, maintain original order
      return a.originalOrder - b.originalOrder;
    });
    
    return sortedSections;
  }

  /**
   * Helper methods
   */
  private generateDocumentId(url: string): string {
    // Create consistent document ID based on URL
    return `doc_${btoa(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 12)}_${Date.now()}`;
  }

  private detectContentLoss(original: string, cleaned: string): boolean {
    // Simple heuristic - if more than 50% content lost, flag as potential loss
    return (cleaned.length / original.length) < 0.5;
  }
}

// Helper interfaces for internal processing
interface RawSection {
  id: string;
  title: string;
  content: string;
  originalOrder: number;
}

interface ClassifiedSection extends RawSection {
  sectionType: JobSectionType;
  confidence: number;
}