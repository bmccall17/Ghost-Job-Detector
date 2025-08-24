// Company Reputation Scoring Service
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CompanyReputationService {
    constructor() {
        this.minimumSampleSize = 5; // Minimum analyses needed for reliable scoring
        this.reputationCache = new Map(); // Cache reputation scores
        this.cacheTimeout = 60 * 60 * 1000; // 1 hour cache
    }

    async analyzeCompanyReputation(company) {
        const startTime = Date.now();
        
        try {
            console.log(`🏢 Analyzing company reputation for: ${company}`);
            
            // Check cache first
            const cacheKey = `reputation_${company.toLowerCase()}`;
            const cached = this.reputationCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                return { ...cached.data, processingTime: Date.now() - startTime, cached: true };
            }
            
            // 1. Get historical analysis data for this company
            const historicalData = await this.getCompanyHistoricalData(company);
            
            // 2. Calculate reputation metrics
            const reputationMetrics = this.calculateReputationMetrics(historicalData);
            
            // 3. Analyze posting patterns and trends
            const postingPatterns = this.analyzePostingPatterns(historicalData);
            
            // 4. Calculate final reputation score
            const reputationScore = this.calculateOverallReputationScore(
                reputationMetrics, 
                postingPatterns
            );
            
            // 5. Generate reputation assessment
            const assessment = this.generateReputationAssessment(
                company,
                reputationScore,
                reputationMetrics,
                postingPatterns
            );
            
            console.log(`🏢 Company reputation analysis complete for ${company}: ${reputationScore.toFixed(2)}`);
            
            const result = {
                company,
                reputationScore,
                assessment,
                reputationMetrics,
                postingPatterns,
                sampleSize: historicalData.length,
                processingTime: Date.now() - startTime,
                cached: false
            };
            
            // Cache the result
            this.reputationCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
            
            return result;
            
        } catch (error) {
            console.error('Company reputation analysis error:', error);
            return {
                company,
                reputationScore: 0.5, // Neutral score on error
                assessment: 'unknown',
                error: error.message,
                processingTime: Date.now() - startTime
            };
        }
    }

    async getCompanyHistoricalData(company) {
        const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
        
        try {
            // Get all job listings and analyses for this company in the last 6 months
            const historicalData = await prisma.jobListing.findMany({
                where: {
                    company: {
                        contains: company,
                        mode: 'insensitive'
                    },
                    createdAt: { gte: sixMonthsAgo }
                },
                include: {
                    analyses: {
                        select: {
                            score: true,
                            verdict: true,
                            createdAt: true,
                            reasonsJson: true,
                            modelConfidence: true,
                            riskFactorCount: true,
                            positiveFactorCount: true
                        }
                    },
                    keyFactors: {
                        select: {
                            factorType: true,
                            factorDescription: true,
                            impactScore: true
                        }
                    },
                    source: {
                        select: {
                            url: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            
            return historicalData;
            
        } catch (error) {
            console.error('Database query error in getCompanyHistoricalData:', error);
            return []; // Return empty array on database error
        }
    }

    calculateReputationMetrics(historicalData) {
        if (historicalData.length === 0) {
            return {
                avgGhostScore: 0.5,
                ghostJobRate: 0.5,
                totalPostings: 0,
                analysisCount: 0,
                verdictDistribution: { likely_ghost: 0, uncertain: 0, likely_real: 0 },
                consistencyScore: 0,
                timelineTrend: 'stable'
            };
        }
        
        // Flatten all analyses
        const allAnalyses = historicalData.flatMap(job => 
            job.analyses.map(analysis => ({
                ...analysis,
                jobTitle: job.title,
                jobId: job.id,
                createdAt: job.createdAt
            }))
        );
        
        if (allAnalyses.length === 0) {
            return {
                avgGhostScore: 0.5,
                ghostJobRate: 0.5,
                totalPostings: historicalData.length,
                analysisCount: 0,
                verdictDistribution: { likely_ghost: 0, uncertain: 0, likely_real: 0 },
                consistencyScore: 0,
                timelineTrend: 'stable'
            };
        }
        
        // Calculate average ghost score
        const validScores = allAnalyses
            .map(a => Number(a.score))
            .filter(score => !isNaN(score) && score >= 0 && score <= 1);
        const avgGhostScore = validScores.length > 0 
            ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length 
            : 0.5;
        
        // Calculate verdict distribution
        const verdictDistribution = { likely_ghost: 0, uncertain: 0, likely_real: 0 };
        allAnalyses.forEach(analysis => {
            if (analysis.verdict && verdictDistribution.hasOwnProperty(analysis.verdict)) {
                verdictDistribution[analysis.verdict]++;
            }
        });
        
        // Calculate ghost job rate (percentage of likely_ghost + high scoring uncertain)
        const highGhostAnalyses = allAnalyses.filter(a => 
            a.verdict === 'likely_ghost' || 
            (a.verdict === 'uncertain' && Number(a.score) > 0.65)
        );
        const ghostJobRate = allAnalyses.length > 0 ? highGhostAnalyses.length / allAnalyses.length : 0.5;
        
        // Calculate consistency score (lower variance = higher consistency)
        const consistency = validScores.length > 1 
            ? this.calculateConsistencyScore(validScores) 
            : 0.5;
        
        // Calculate timeline trend
        const timelineTrend = this.calculateTimelineTrend(allAnalyses);
        
        return {
            avgGhostScore,
            ghostJobRate,
            totalPostings: historicalData.length,
            analysisCount: allAnalyses.length,
            verdictDistribution,
            consistencyScore: consistency,
            timelineTrend
        };
    }

    analyzePostingPatterns(historicalData) {
        if (historicalData.length === 0) {
            return {
                postingFrequency: 'unknown',
                titleDiversityScore: 0,
                platformDiversityScore: 0,
                repostingBehavior: 'none',
                suspiciousPatterns: []
            };
        }
        
        // Analyze posting frequency
        const daysBetweenPostings = this.calculatePostingFrequency(historicalData);
        const postingFrequency = this.categorizePostingFrequency(daysBetweenPostings);
        
        // Calculate title diversity
        const uniqueTitles = new Set(historicalData.map(job => job.title.toLowerCase().trim()));
        const titleDiversityScore = uniqueTitles.size / historicalData.length;
        
        // Calculate platform diversity
        const platforms = historicalData
            .map(job => this.extractPlatformFromUrl(job.source?.url))
            .filter(platform => platform !== 'unknown');
        const uniquePlatforms = new Set(platforms);
        const platformDiversityScore = platforms.length > 0 ? uniquePlatforms.size / platforms.length : 0;
        
        // Detect suspicious patterns
        const suspiciousPatterns = this.detectSuspiciousPatterns(historicalData);
        
        // Analyze reposting behavior
        const repostingBehavior = this.analyzeRepostingBehavior(historicalData);
        
        return {
            postingFrequency,
            titleDiversityScore,
            platformDiversityScore,
            repostingBehavior,
            suspiciousPatterns,
            avgDaysBetweenPostings: daysBetweenPostings
        };
    }

    calculateOverallReputationScore(metrics, patterns) {
        // Reputation score calculation (0-1, where 1 = excellent reputation, 0 = poor reputation)
        let score = 0.5; // Start neutral
        
        // Factor 1: Ghost job rate (40% weight)
        const ghostPenalty = metrics.ghostJobRate * 0.4;
        score -= ghostPenalty;
        
        // Factor 2: Consistency (20% weight)  
        const consistencyBonus = metrics.consistencyScore * 0.2;
        score += consistencyBonus;
        
        // Factor 3: Sample size reliability (15% weight)
        const sampleReliability = Math.min(1, metrics.analysisCount / 20) * 0.15;
        score += sampleReliability;
        
        // Factor 4: Title diversity (10% weight)
        const diversityBonus = patterns.titleDiversityScore * 0.1;
        score += diversityBonus;
        
        // Factor 5: Platform diversity (10% weight) 
        const platformBonus = patterns.platformDiversityScore * 0.1;
        score += platformBonus;
        
        // Factor 6: Suspicious pattern penalties (5% weight)
        const suspiciousPenalty = patterns.suspiciousPatterns.length * 0.02;
        score -= suspiciousPenalty;
        
        // Clamp to valid range
        return Math.max(0, Math.min(1, score));
    }

    generateReputationAssessment(company, score, metrics, patterns) {
        if (metrics.analysisCount < this.minimumSampleSize) {
            return {
                level: 'unrated',
                description: 'Insufficient data for reliable reputation assessment',
                confidence: 0.2,
                recommendations: ['More data needed for accurate assessment']
            };
        }
        
        let level, description, recommendations = [];
        
        if (score >= 0.8) {
            level = 'excellent';
            description = 'Strong reputation with consistently legitimate job postings';
            recommendations = ['Company shows excellent hiring practices', 'Low ghost job risk'];
        } else if (score >= 0.65) {
            level = 'good';
            description = 'Generally reputable with mostly legitimate postings';
            recommendations = ['Above average hiring practices', 'Moderate confidence in job listings'];
        } else if (score >= 0.4) {
            level = 'fair';
            description = 'Mixed reputation with some concerning patterns';
            recommendations = ['Exercise caution when applying', 'Verify job postings independently'];
        } else {
            level = 'poor';
            description = 'Concerning reputation with high ghost job rate';
            recommendations = ['High caution advised', 'Thoroughly verify all postings', 'Consider alternative employers'];
        }
        
        // Add specific recommendations based on patterns
        if (patterns.suspiciousPatterns.length > 0) {
            recommendations.push(`Detected ${patterns.suspiciousPatterns.length} suspicious patterns`);
        }
        
        if (metrics.ghostJobRate > 0.6) {
            recommendations.push('High ghost job rate detected');
        }
        
        return {
            level,
            description,
            confidence: Math.min(0.95, 0.5 + (metrics.analysisCount / 40)),
            recommendations
        };
    }

    // Helper methods
    calculateConsistencyScore(scores) {
        if (scores.length < 2) return 0.5;
        
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);
        
        // Convert to consistency score (lower std dev = higher consistency)
        return Math.max(0, 1 - (stdDev * 2)); // Multiply by 2 to make variance more impactful
    }

    calculateTimelineTrend(analyses) {
        if (analyses.length < 3) return 'stable';
        
        // Sort by creation date
        const sortedAnalyses = analyses
            .filter(a => a.createdAt && !isNaN(Number(a.score)))
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        if (sortedAnalyses.length < 3) return 'stable';
        
        // Simple trend analysis: compare first third vs last third
        const firstThird = sortedAnalyses.slice(0, Math.ceil(sortedAnalyses.length / 3));
        const lastThird = sortedAnalyses.slice(-Math.ceil(sortedAnalyses.length / 3));
        
        const firstAvg = firstThird.reduce((sum, a) => sum + Number(a.score), 0) / firstThird.length;
        const lastAvg = lastThird.reduce((sum, a) => sum + Number(a.score), 0) / lastThird.length;
        
        const difference = lastAvg - firstAvg;
        
        if (difference > 0.1) return 'improving'; // Ghost scores decreasing = improving reputation
        if (difference < -0.1) return 'declining'; // Ghost scores increasing = declining reputation
        return 'stable';
    }

    calculatePostingFrequency(historicalData) {
        if (historicalData.length < 2) return null;
        
        const dates = historicalData
            .map(job => new Date(job.createdAt))
            .sort((a, b) => a - b);
        
        const totalDays = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
        return totalDays / (historicalData.length - 1);
    }

    categorizePostingFrequency(daysBetween) {
        if (daysBetween === null) return 'unknown';
        if (daysBetween < 7) return 'very_high'; // More than once per week
        if (daysBetween < 14) return 'high';     // Every 1-2 weeks
        if (daysBetween < 30) return 'moderate'; // Every 2-4 weeks
        if (daysBetween < 60) return 'low';      // Every 1-2 months
        return 'very_low';                       // Less than every 2 months
    }

    extractPlatformFromUrl(url) {
        if (!url) return 'unknown';
        
        const urlLower = url.toLowerCase();
        if (urlLower.includes('linkedin.com')) return 'linkedin';
        if (urlLower.includes('indeed.com')) return 'indeed';
        if (urlLower.includes('glassdoor.com')) return 'glassdoor';
        if (urlLower.includes('monster.com')) return 'monster';
        if (urlLower.includes('ziprecruiter.com')) return 'ziprecruiter';
        if (urlLower.includes('careerbuilder.com')) return 'careerbuilder';
        if (urlLower.includes('dice.com')) return 'dice';
        if (urlLower.includes('greenhouse.io')) return 'greenhouse';
        if (urlLower.includes('lever.co')) return 'lever';
        if (urlLower.includes('workday.com')) return 'workday';
        
        return 'other';
    }

    detectSuspiciousPatterns(historicalData) {
        const patterns = [];
        
        // Pattern 1: Identical job descriptions
        const descriptions = historicalData
            .map(job => job.description?.toLowerCase().trim())
            .filter(desc => desc && desc.length > 50);
        const uniqueDescriptions = new Set(descriptions);
        if (descriptions.length > 2 && uniqueDescriptions.size < descriptions.length * 0.7) {
            patterns.push('repeated_identical_descriptions');
        }
        
        // Pattern 2: Rapid-fire posting
        const postingDates = historicalData.map(job => new Date(job.createdAt)).sort();
        let rapidPostings = 0;
        for (let i = 1; i < postingDates.length; i++) {
            const daysDiff = (postingDates[i] - postingDates[i-1]) / (1000 * 60 * 60 * 24);
            if (daysDiff < 1) rapidPostings++;
        }
        if (rapidPostings > historicalData.length * 0.3) {
            patterns.push('rapid_fire_posting');
        }
        
        // Pattern 3: Inconsistent company names
        const companyVariations = new Set(historicalData.map(job => job.company.toLowerCase().trim()));
        if (companyVariations.size > 2) {
            patterns.push('inconsistent_company_names');
        }
        
        return patterns;
    }

    analyzeRepostingBehavior(historicalData) {
        // Group jobs by similar titles
        const titleGroups = new Map();
        
        historicalData.forEach(job => {
            const normalizedTitle = job.title.toLowerCase()
                .replace(/\b(senior|sr|junior|jr|lead|principal|staff|i{1,3}|1|2|3)\b/g, '')
                .trim();
            
            if (!titleGroups.has(normalizedTitle)) {
                titleGroups.set(normalizedTitle, []);
            }
            titleGroups.get(normalizedTitle).push(job);
        });
        
        // Analyze reposting patterns
        let repostCount = 0;
        let totalUniqueJobs = titleGroups.size;
        
        for (const [title, jobs] of titleGroups) {
            if (jobs.length > 1) {
                repostCount += jobs.length - 1; // Count reposts
            }
        }
        
        const repostRate = historicalData.length > 0 ? repostCount / historicalData.length : 0;
        
        if (repostRate >= 0.5) return 'excessive';
        if (repostRate >= 0.3) return 'high';
        if (repostRate >= 0.1) return 'moderate';
        return 'low';
    }

    // Method to apply reputation adjustments to job analysis
    applyReputationAdjustment(baseResults, reputationAnalysis) {
        if (!reputationAnalysis || reputationAnalysis.assessment.level === 'unrated') {
            return {
                ...baseResults,
                reputationAdjustment: {
                    applied: false,
                    reason: 'Insufficient company reputation data'
                }
            };
        }
        
        let adjustedGhostProbability = baseResults.ghostProbability;
        const adjustments = [];
        
        // Apply reputation-based adjustments
        const reputation = reputationAnalysis.assessment.level;
        const reputationScore = reputationAnalysis.reputationScore;
        
        if (reputation === 'excellent') {
            adjustedGhostProbability *= 0.8; // Reduce by 20%
            adjustments.push('Excellent company reputation: -20% ghost probability');
            baseResults.keyFactors.push('Company has excellent hiring reputation');
        } else if (reputation === 'good') {
            adjustedGhostProbability *= 0.9; // Reduce by 10%
            adjustments.push('Good company reputation: -10% ghost probability');
            baseResults.keyFactors.push('Company has good hiring reputation');
        } else if (reputation === 'poor') {
            adjustedGhostProbability = Math.min(1.0, adjustedGhostProbability * 1.3); // Increase by 30%
            adjustments.push('Poor company reputation: +30% ghost probability');
            baseResults.riskFactors.push('Company has poor hiring reputation with high ghost job rate');
        } else if (reputation === 'fair') {
            adjustedGhostProbability = Math.min(1.0, adjustedGhostProbability * 1.1); // Increase by 10%
            adjustments.push('Fair company reputation: +10% ghost probability');
        }
        
        // Additional adjustments based on specific patterns
        if (reputationAnalysis.postingPatterns.suspiciousPatterns.length > 0) {
            const penalty = Math.min(0.2, reputationAnalysis.postingPatterns.suspiciousPatterns.length * 0.05);
            adjustedGhostProbability = Math.min(1.0, adjustedGhostProbability + penalty);
            adjustments.push(`Suspicious patterns detected: +${(penalty*100).toFixed(1)}% ghost probability`);
            baseResults.riskFactors.push(`Company shows ${reputationAnalysis.postingPatterns.suspiciousPatterns.length} suspicious posting patterns`);
        }
        
        // Clamp final probability
        adjustedGhostProbability = Math.max(0, Math.min(adjustedGhostProbability, 1.0));
        
        // Determine new risk level
        let newRiskLevel = 'low';
        if (adjustedGhostProbability >= 0.7) newRiskLevel = 'high';
        else if (adjustedGhostProbability >= 0.4) newRiskLevel = 'medium';
        
        return {
            ...baseResults,
            ghostProbability: adjustedGhostProbability,
            riskLevel: newRiskLevel,
            reputationAdjustment: {
                applied: true,
                company: reputationAnalysis.company,
                reputationScore: reputationScore,
                reputationLevel: reputation,
                originalGhostProbability: baseResults.ghostProbability,
                adjustedGhostProbability,
                adjustments,
                confidence: reputationAnalysis.assessment.confidence
            }
        };
    }
}