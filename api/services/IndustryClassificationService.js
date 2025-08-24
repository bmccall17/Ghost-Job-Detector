// Industry Classification Service
export class IndustryClassificationService {
    constructor() {
        this.industryDefinitions = {
            'technology': {
                keywords: [
                    'software', 'developer', 'engineer', 'programming', 'tech', 'startup',
                    'javascript', 'python', 'java', 'react', 'angular', 'vue', 'node',
                    'aws', 'cloud', 'devops', 'api', 'database', 'frontend', 'backend',
                    'fullstack', 'mobile', 'web', 'app', 'saas', 'platform', 'data scientist',
                    'machine learning', 'ai', 'artificial intelligence', 'blockchain'
                ],
                companyIndicators: [
                    'tech', 'software', 'digital', 'systems', 'solutions', 'technologies',
                    'labs', 'computing', 'data', 'analytics', 'platform', 'startup'
                ],
                ghostThresholds: { 
                    high: 0.70,    // Higher tolerance (tech culture accepts some uncertainty)
                    medium: 0.45 
                },
                commonLegitimatePatterns: [
                    'remote', 'equity', 'stock options', 'flexible hours', 'unlimited pto',
                    'startup environment', 'fast-paced', 'agile', 'scrum'
                ],
                suspiciousPatterns: [
                    'no experience required', 'work from home immediately', 
                    'make money fast', 'cryptocurrency opportunity'
                ],
                adjustments: {
                    remotePositive: true,   // Remote work is normal in tech
                    longDescriptions: true, // Technical roles often have detailed requirements
                    buzzwordTolerance: 0.15 // Higher tolerance for tech buzzwords
                }
            },
            'healthcare': {
                keywords: [
                    'nurse', 'medical', 'hospital', 'healthcare', 'clinical', 'physician',
                    'doctor', 'therapist', 'pharmacist', 'medical assistant', 'rn', 'lpn',
                    'cna', 'patient care', 'medical device', 'pharmaceutical', 'biotech',
                    'health services', 'radiology', 'surgery', 'emergency', 'icu'
                ],
                companyIndicators: [
                    'medical', 'hospital', 'health', 'clinic', 'healthcare', 'pharmaceutical',
                    'biotech', 'medical center', 'health system'
                ],
                ghostThresholds: { 
                    high: 0.55,    // Lower tolerance (regulated industry)
                    medium: 0.30 
                },
                commonLegitimatePatterns: [
                    'certification required', 'license', 'patient care', 'medical records',
                    'hipaa', 'compliance', 'accredited', 'ceu', 'continuing education'
                ],
                suspiciousPatterns: [
                    'work from home', 'no certification needed', 'easy money',
                    'part-time remote medical'
                ],
                adjustments: {
                    certificationRequired: true,  // Certifications are expected
                    regulatoryCompliance: true,   // Compliance mentions are positive
                    urgentHiringAcceptable: true, // Healthcare often has urgent needs
                    buzzwordTolerance: -0.10      // Lower tolerance for buzzwords
                }
            },
            'finance': {
                keywords: [
                    'financial', 'banking', 'investment', 'analyst', 'finance', 'accounting',
                    'cpa', 'cfa', 'financial advisor', 'loan', 'credit', 'insurance',
                    'wealth management', 'portfolio', 'trading', 'risk management',
                    'compliance', 'audit', 'tax', 'bookkeeping', 'payroll'
                ],
                companyIndicators: [
                    'bank', 'financial', 'capital', 'investment', 'credit', 'insurance',
                    'wealth', 'asset', 'fund', 'securities', 'trading'
                ],
                ghostThresholds: { 
                    high: 0.60,    // Medium tolerance
                    medium: 0.35 
                },
                commonLegitimatePatterns: [
                    'series 7', 'series 63', 'cfa', 'cpa', 'compliance', 'regulatory',
                    'fiduciary', 'sec', 'finra', 'sox', 'risk assessment', 'due diligence'
                ],
                suspiciousPatterns: [
                    'get rich quick', 'guaranteed returns', 'no experience financial',
                    'work from home trading', 'easy money finance'
                ],
                adjustments: {
                    compliancePositive: true,     // Compliance mentions are good
                    certificationImportant: true, // Professional certifications expected
                    conservativeLanguage: true,   // Professional, conservative language expected
                    buzzwordTolerance: -0.05      // Slightly lower tolerance
                }
            },
            'government': {
                keywords: [
                    'government', 'federal', 'state', 'county', 'city', 'municipal',
                    'public service', 'civil service', 'dod', 'fbi', 'cia', 'nsa',
                    'department of', 'agency', 'administration', 'bureau', 'commission',
                    'security clearance', 'public sector', 'contractor', 'defense'
                ],
                companyIndicators: [
                    'department', 'agency', 'bureau', 'administration', 'commission',
                    'government', 'federal', 'state', 'county', 'city', 'municipal'
                ],
                ghostThresholds: { 
                    high: 0.50,    // Lowest tolerance (most legitimate)
                    medium: 0.25 
                },
                commonLegitimatePatterns: [
                    'security clearance', 'background check', 'drug test', 'polygraph',
                    'public trust', 'gs pay scale', 'federal benefits', 'usajobs'
                ],
                suspiciousPatterns: [
                    'work from home government', 'no background check needed',
                    'immediate start government', 'cash payments'
                ],
                adjustments: {
                    longPostingPeriod: true,      // Government jobs stay posted longer
                    detailedRequirements: true,   // Detailed job requirements are normal
                    formalLanguage: true,         // Formal, bureaucratic language expected
                    clearanceRequired: true,      // Security clearance mentions are positive
                    extendedTimeline: 120         // 120 day posting tolerance vs 45
                }
            },
            'sales': {
                keywords: [
                    'sales', 'marketing', 'business development', 'account manager',
                    'sales representative', 'sales executive', 'lead generation',
                    'customer success', 'client relations', 'territory', 'quota',
                    'commission', 'b2b', 'b2c', 'crm', 'pipeline'
                ],
                companyIndicators: [
                    'marketing', 'advertising', 'media', 'agency', 'consulting'
                ],
                ghostThresholds: { 
                    high: 0.75,    // Highest tolerance (sales roles often have aggressive language)
                    medium: 0.50 
                },
                commonLegitimatePatterns: [
                    'commission', 'quota', 'territory', 'crm experience', 'sales targets',
                    'client relationships', 'lead generation', 'pipeline management'
                ],
                suspiciousPatterns: [
                    'no selling required', 'passive income', 'recruit others',
                    'make unlimited money', 'pyramid', 'mlm'
                ],
                adjustments: {
                    aggressiveLanguageOk: true,   // Sales language can be aggressive
                    commissionMentions: true,     // Commission structure mentions are positive
                    urgentHiringOk: true,         // Sales teams often hire urgently
                    buzzwordTolerance: 0.20       // High tolerance for sales buzzwords
                }
            }
        };
    }

    classifyJobIndustry(title, company, description) {
        const combinedText = `${title} ${company} ${description || ''}`.toLowerCase();
        const industryScores = {};
        
        // Calculate scores for each industry
        for (const [industry, config] of Object.entries(this.industryDefinitions)) {
            let score = 0;
            
            // Title and description keyword matching
            const keywordMatches = config.keywords.filter(keyword => 
                combinedText.includes(keyword.toLowerCase())
            ).length;
            score += keywordMatches * 2; // Weight keyword matches heavily
            
            // Company name indicator matching
            const companyMatches = config.companyIndicators.filter(indicator =>
                company.toLowerCase().includes(indicator.toLowerCase())
            ).length;
            score += companyMatches * 3; // Weight company indicators very heavily
            
            industryScores[industry] = score;
        }
        
        // Find the highest scoring industry
        const sortedIndustries = Object.entries(industryScores)
            .sort(([,a], [,b]) => b - a);
        
        const [topIndustry, topScore] = sortedIndustries[0];
        
        // Require minimum confidence threshold
        if (topScore < 2) {
            return {
                industry: 'general',
                confidence: 0.3,
                alternativeIndustries: [],
                matchingKeywords: []
            };
        }
        
        // Calculate confidence based on score gap
        const [,secondScore] = sortedIndustries[1] || ['', 0];
        const confidence = Math.min(0.95, topScore / (topScore + secondScore + 1));
        
        return {
            industry: topIndustry,
            confidence,
            score: topScore,
            alternativeIndustries: sortedIndustries.slice(1, 3).map(([ind, score]) => ({ industry: ind, score })),
            config: this.industryDefinitions[topIndustry]
        };
    }

    applyIndustryAdjustments(baseResults, industryAnalysis, jobData) {
        if (industryAnalysis.industry === 'general' || industryAnalysis.confidence < 0.6) {
            // Low confidence in industry classification - no adjustments
            return {
                ...baseResults,
                industryAdjustments: {
                    applied: false,
                    reason: 'Industry classification confidence too low'
                }
            };
        }
        
        const industry = industryAnalysis.industry;
        const config = industryAnalysis.config;
        let adjustedGhostProbability = baseResults.ghostProbability;
        const adjustments = [];
        
        // Apply industry-specific threshold adjustments
        const originalRiskLevel = baseResults.riskLevel;
        let newRiskLevel = originalRiskLevel;
        
        if (adjustedGhostProbability >= config.ghostThresholds.high) {
            newRiskLevel = 'high';
        } else if (adjustedGhostProbability >= config.ghostThresholds.medium) {
            newRiskLevel = 'medium';
        } else {
            newRiskLevel = 'low';
        }
        
        // Apply industry-specific pattern adjustments
        const description = jobData.description || '';
        const title = jobData.title || '';
        const descLower = description.toLowerCase();
        const titleLower = title.toLowerCase();
        
        // Check for positive patterns
        for (const pattern of config.commonLegitimatePatterns) {
            if (descLower.includes(pattern.toLowerCase())) {
                adjustedGhostProbability -= 0.05; // Small positive adjustment
                adjustments.push(`Positive ${industry} indicator: ${pattern}`);
                baseResults.keyFactors.push(`Industry-appropriate language: ${pattern}`);
            }
        }
        
        // Check for suspicious patterns
        for (const pattern of config.suspiciousPatterns) {
            if (descLower.includes(pattern.toLowerCase())) {
                adjustedGhostProbability += 0.15; // Larger negative adjustment
                adjustments.push(`Suspicious ${industry} pattern: ${pattern}`);
                baseResults.riskFactors.push(`Industry-inappropriate language: ${pattern}`);
            }
        }
        
        // Apply specific industry adjustments
        if (config.adjustments) {
            const adj = config.adjustments;
            
            // Remote work adjustments
            if (adj.remotePositive && (descLower.includes('remote') || descLower.includes('work from home'))) {
                if (industry === 'technology') {
                    // Remove any penalty for remote work in tech
                    adjustedGhostProbability -= 0.05;
                    adjustments.push('Remote work normal in technology industry');
                }
            }
            
            // Buzzword tolerance adjustments
            if (adj.buzzwordTolerance) {
                const buzzwordCount = (descLower.match(/(fast-paced|dynamic|innovative|cutting-edge)/g) || []).length;
                if (buzzwordCount > 0) {
                    const adjustment = buzzwordCount * adj.buzzwordTolerance;
                    adjustedGhostProbability += adjustment;
                    adjustments.push(`Industry buzzword tolerance: ${adjustment > 0 ? '+' : ''}${adjustment.toFixed(2)}`);
                }
            }
            
            // Extended timeline for government jobs
            if (adj.extendedTimeline && jobData.postedAt) {
                const daysSincePosted = Math.floor((Date.now() - new Date(jobData.postedAt)) / (1000 * 60 * 60 * 24));
                if (daysSincePosted > 45 && daysSincePosted <= adj.extendedTimeline) {
                    adjustedGhostProbability -= 0.15; // Remove stale posting penalty
                    adjustments.push(`Government posting timeline extended to ${adj.extendedTimeline} days`);
                }
            }
            
            // Certification requirements
            if (adj.certificationRequired || adj.certificationImportant) {
                const hasCertMention = descLower.includes('certification') || 
                                     descLower.includes('license') ||
                                     descLower.includes('cpa') ||
                                     descLower.includes('cfa');
                if (hasCertMention) {
                    adjustedGhostProbability -= 0.08;
                    adjustments.push('Professional certification requirements mentioned');
                    baseResults.keyFactors.push('Professional certification requirements');
                }
            }
        }
        
        // Clamp final probability
        adjustedGhostProbability = Math.max(0, Math.min(adjustedGhostProbability, 1.0));
        
        // Recalculate risk level with adjusted probability
        if (adjustedGhostProbability >= config.ghostThresholds.high) {
            newRiskLevel = 'high';
        } else if (adjustedGhostProbability >= config.ghostThresholds.medium) {
            newRiskLevel = 'medium';
        } else {
            newRiskLevel = 'low';
        }
        
        return {
            ...baseResults,
            ghostProbability: adjustedGhostProbability,
            riskLevel: newRiskLevel,
            industryAdjustments: {
                applied: true,
                industry: industry,
                confidence: industryAnalysis.confidence,
                originalGhostProbability: baseResults.ghostProbability,
                adjustedGhostProbability,
                originalRiskLevel,
                adjustedRiskLevel: newRiskLevel,
                adjustments,
                industryThresholds: config.ghostThresholds
            }
        };
    }
}