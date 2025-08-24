// Reposting Detection Service
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class RepostingDetectionService {
    async analyzeRepostingPatterns(jobData) {
        const { title, company, description } = jobData;
        const startTime = Date.now();
        
        try {
            console.log(`📊 Analyzing reposting patterns for: ${title} @ ${company}`);
            
            // 1. Generate content hash for exact duplicates
            const contentHash = this.generateJobContentHash(title, company, description);
            
            // 2. Search for similar postings in last 90 days
            const similarJobs = await this.findSimilarJobs(title, company, description, contentHash);
            
            // 3. Analyze reposting frequency and patterns
            const patterns = this.analyzeRepostingFrequency(similarJobs);
            
            console.log(`📊 Found ${similarJobs.length} similar jobs, pattern: ${patterns.pattern}`);
            
            return {
                ...patterns,
                processingTime: Date.now() - startTime,
                searchedJobs: similarJobs.length,
                contentHash
            };
            
        } catch (error) {
            console.error('Reposting detection error:', error);
            return {
                isRepost: false,
                repostCount: 0,
                pattern: 'unknown',
                error: error.message,
                processingTime: Date.now() - startTime
            };
        }
    }

    generateJobContentHash(title, company, description) {
        // Create a normalized content string
        const normalizedContent = [
            this.normalizeText(title),
            this.normalizeText(company),
            this.normalizeText(description || '')
        ].join('|');
        
        return crypto.createHash('md5').update(normalizedContent).digest('hex');
    }

    normalizeText(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    async findSimilarJobs(title, company, description, contentHash) {
        const now = new Date();
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        
        // Search strategy: exact hash OR similar title+company
        const titleRoot = this.getJobTitleRoot(title);
        const companyRoot = this.getCompanyRoot(company);
        
        try {
            return await prisma.jobListing.findMany({
                where: {
                    AND: [
                        { createdAt: { gte: ninetyDaysAgo } },
                        {
                            OR: [
                                // Exact content match
                                { contentHash },
                                // Similar title and company
                                {
                                    AND: [
                                        { title: { contains: titleRoot, mode: 'insensitive' } },
                                        { company: { contains: companyRoot, mode: 'insensitive' } }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                include: {
                    analyses: {
                        select: {
                            score: true,
                            verdict: true,
                            createdAt: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        } catch (error) {
            console.error('Database query error in findSimilarJobs:', error);
            return []; // Return empty array on database error
        }
    }

    getJobTitleRoot(title) {
        // Extract core job title (remove modifiers like "Senior", "Jr", etc.)
        return title
            .replace(/^(senior|sr|junior|jr|lead|principal|staff)\s+/i, '')
            .replace(/\s+(i{1,3}|1|2|3)$/i, '')
            .split(' ')
            .slice(0, 2) // Take first 2 words
            .join(' ');
    }

    getCompanyRoot(company) {
        // Remove corporate suffixes
        return company
            .replace(/\s+(inc|corp|corporation|llc|ltd|company).*$/i, '')
            .trim();
    }

    analyzeRepostingFrequency(similarJobs) {
        if (similarJobs.length === 0) {
            return {
                isRepost: false,
                repostCount: 0,
                pattern: 'first_posting',
                confidence: 0.9,
                ghostProbabilityAdjustment: 0 // No adjustment for first posting
            };
        }
        
        const repostCount = similarJobs.length;
        const dateSpread = this.calculateDateSpread(similarJobs);
        const avgGhostScore = this.calculateAverageGhostScore(similarJobs);
        
        // Determine reposting pattern
        let pattern, ghostAdjustment, confidence;
        
        if (repostCount >= 5) {
            pattern = 'excessive_reposting';
            ghostAdjustment = 0.30; // +30% ghost probability
            confidence = 0.95;
        } else if (repostCount >= 3) {
            pattern = 'frequent_reposting';
            ghostAdjustment = 0.20; // +20% ghost probability
            confidence = 0.85;
        } else if (repostCount === 2) {
            pattern = 'moderate_reposting';
            ghostAdjustment = 0.10; // +10% ghost probability
            confidence = 0.70;
        } else {
            pattern = 'minimal_reposting';
            ghostAdjustment = 0.05; // +5% ghost probability
            confidence = 0.60;
        }
        
        // Adjust for seasonal patterns (reduce penalty in Q4/Q1 hiring seasons)
        const currentMonth = new Date().getMonth();
        const isHiringSeason = [0, 1, 10, 11].includes(currentMonth); // Jan, Feb, Nov, Dec
        
        if (isHiringSeason && repostCount <= 3) {
            ghostAdjustment *= 0.5; // Reduce penalty during hiring seasons
            pattern += '_seasonal_adjusted';
        }
        
        return {
            isRepost: true,
            repostCount,
            pattern,
            confidence,
            ghostProbabilityAdjustment: ghostAdjustment,
            dateSpread,
            avgHistoricalGhostScore: avgGhostScore,
            seasonalAdjustment: isHiringSeason
        };
    }

    calculateDateSpread(jobs) {
        if (jobs.length <= 1) return 0;
        
        const dates = jobs.map(job => job.createdAt.getTime()).sort();
        return Math.ceil((dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24)); // Days
    }

    calculateAverageGhostScore(jobs) {
        const scores = jobs
            .flatMap(job => job.analyses.map(analysis => Number(analysis.score)))
            .filter(score => !isNaN(score));
        
        if (scores.length === 0) return null;
        
        return scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }
}