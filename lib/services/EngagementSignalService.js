// Engagement Signal Analysis Service
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class EngagementSignalService {
    constructor() {
        this.signalWeights = {
            applicationOutcome: 0.30,    // Primary signal - actual hiring outcomes
            responseRate: 0.25,          // Company response rates to applications
            interviewConversion: 0.20,   // Interview conversion rates
            timeToResponse: 0.15,        // Speed of response to applications  
            postingDuration: 0.10        // How long jobs stay posted
        };
    }

    async analyzeEngagementSignals(jobData, url) {
        const startTime = Date.now();
        
        try {
            console.log(`📊 Analyzing engagement signals for: ${jobData.title} @ ${jobData.company}`);
            
            // 1. Analyze application outcomes for this company/role type
            const applicationOutcomes = await this.analyzeApplicationOutcomes(jobData);
            
            // 2. Calculate company response patterns
            const responsePatterns = await this.analyzeResponsePatterns(jobData.company);
            
            // 3. Analyze posting duration patterns
            const durationPatterns = await this.analyzePostingDurations(jobData, url);
            
            // 4. Calculate engagement score
            const engagementScore = this.calculateEngagementScore(
                applicationOutcomes,
                responsePatterns, 
                durationPatterns
            );
            
            // 5. Generate engagement assessment
            const assessment = this.generateEngagementAssessment(
                engagementScore,
                applicationOutcomes,
                responsePatterns,
                durationPatterns
            );
            
            console.log(`📊 Engagement analysis complete: ${engagementScore.toFixed(2)} engagement score`);
            
            return {
                engagementScore,
                assessment,
                signals: {
                    applicationOutcomes,
                    responsePatterns,
                    durationPatterns
                },
                processingTime: Date.now() - startTime
            };
            
        } catch (error) {
            console.error('Engagement signal analysis error:', error);
            return {
                engagementScore: 0.5, // Neutral score on error
                assessment: {
                    level: 'unknown',
                    description: 'Unable to analyze engagement signals',
                    confidence: 0.2
                },
                error: error.message,
                processingTime: Date.now() - startTime
            };
        }
    }

    async analyzeApplicationOutcomes(jobData) {
        try {
            // Look for application outcomes for similar roles at this company
            const company = jobData.company;
            const jobFamily = this.extractJobFamily(jobData.title);
            
            const outcomes = await prisma.applicationOutcome.findMany({
                where: {
                    jobListing: {
                        company: {
                            contains: company,
                            mode: 'insensitive'
                        }
                    },
                    // Filter for last 12 months
                    createdAt: {
                        gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
                    }
                },
                include: {
                    jobListing: {
                        select: {
                            title: true,
                            company: true
                        }
                    }
                }
            });

            if (outcomes.length === 0) {
                return {
                    totalApplications: 0,
                    hiringRate: null,
                    responseRate: null,
                    interviewRate: null,
                    avgTimeToResponse: null,
                    confidence: 0.1,
                    sampleSize: 0
                };
            }

            // Calculate key metrics
            const totalApplications = outcomes.length;
            const respondedApplications = outcomes.filter(o => o.outcome !== 'no_response').length;
            const interviewApplications = outcomes.filter(o => 
                ['phone_screen', 'interview_scheduled', 'interviewed', 'hired'].includes(o.outcome)
            ).length;
            const hiredApplications = outcomes.filter(o => o.outcome === 'hired').length;

            // Calculate response times (only for responses with responseTimeHours)
            const responseTimes = outcomes
                .filter(o => o.responseTimeHours !== null && o.responseTimeHours > 0)
                .map(o => o.responseTimeHours / 24); // Convert hours to days

            const avgTimeToResponse = responseTimes.length > 0 
                ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
                : null;

            return {
                totalApplications,
                hiringRate: hiredApplications / totalApplications,
                responseRate: respondedApplications / totalApplications,
                interviewRate: interviewApplications / totalApplications,
                avgTimeToResponse,
                confidence: Math.min(0.95, totalApplications / 50), // Higher confidence with more data
                sampleSize: totalApplications,
                outcomeDistribution: this.calculateOutcomeDistribution(outcomes)
            };

        } catch (error) {
            console.error('Application outcome analysis error:', error);
            return {
                totalApplications: 0,
                hiringRate: null,
                responseRate: null,
                interviewRate: null,
                avgTimeToResponse: null,
                confidence: 0.1,
                sampleSize: 0,
                error: error.message
            };
        }
    }

    async analyzeResponsePatterns(company) {
        try {
            // Get historical job postings and their engagement patterns
            const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
            
            const jobListings = await prisma.jobListing.findMany({
                where: {
                    company: {
                        contains: company,
                        mode: 'insensitive'
                    },
                    createdAt: { gte: sixMonthsAgo }
                },
                include: {
                    applicationOutcomes: true,
                    source: {
                        select: { url: true }
                    }
                }
            });

            if (jobListings.length === 0) {
                return {
                    avgApplicationsPerJob: null,
                    avgResponseTime: null,
                    responseConsistency: null,
                    engagementTrend: 'unknown',
                    confidence: 0.1
                };
            }

            // Calculate patterns across all job postings
            const allApplications = jobListings.flatMap(job => job.applicationOutcomes);
            
            if (allApplications.length === 0) {
                return {
                    avgApplicationsPerJob: 0,
                    avgResponseTime: null,
                    responseConsistency: null,
                    engagementTrend: 'no_data',
                    confidence: 0.2
                };
            }

            const avgApplicationsPerJob = allApplications.length / jobListings.length;
            
            // Response time analysis
            const responseTimes = allApplications
                .filter(app => app.responseTimeHours !== null && app.responseTimeHours > 0)
                .map(app => app.responseTimeHours / 24); // Convert hours to days

            const avgResponseTime = responseTimes.length > 0
                ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
                : null;

            // Response consistency (variance in response times)
            const responseConsistency = responseTimes.length > 1
                ? this.calculateConsistency(responseTimes)
                : null;

            // Engagement trend analysis
            const engagementTrend = this.calculateEngagementTrend(allApplications);

            return {
                avgApplicationsPerJob,
                avgResponseTime,
                responseConsistency,
                engagementTrend,
                confidence: Math.min(0.9, allApplications.length / 100),
                totalJobs: jobListings.length,
                totalApplications: allApplications.length
            };

        } catch (error) {
            console.error('Response pattern analysis error:', error);
            return {
                avgApplicationsPerJob: null,
                avgResponseTime: null,
                responseConsistency: null,
                engagementTrend: 'unknown',
                confidence: 0.1,
                error: error.message
            };
        }
    }

    async analyzePostingDurations(jobData, url) {
        try {
            // Analyze how long similar jobs stay posted
            const company = jobData.company;
            const jobFamily = this.extractJobFamily(jobData.title);
            
            // Get similar job postings from the last year
            const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
            
            const similarJobs = await prisma.jobListing.findMany({
                where: {
                    company: {
                        contains: company,
                        mode: 'insensitive'
                    },
                    createdAt: { gte: oneYearAgo }
                },
                include: {
                    applicationOutcomes: {
                        select: {
                            outcome: true,
                            createdAt: true
                        }
                    },
                    source: {
                        select: {
                            url: true,
                            lastSeenAt: true
                        }
                    }
                }
            });

            if (similarJobs.length === 0) {
                return {
                    avgPostingDuration: null,
                    postingPattern: 'unknown',
                    isCurrentlyPosted: true,
                    confidence: 0.1,
                    sampleSize: 0
                };
            }

            // Calculate posting durations
            const durations = [];
            for (const job of similarJobs) {
                const createdAt = new Date(job.createdAt);
                let endDate = null;
                
                // Try to determine when the posting ended
                if (job.source?.lastSeenAt) {
                    endDate = new Date(job.source.lastSeenAt);
                } else {
                    // If we don't have lastSeenAt, estimate based on application outcomes
                    const lastApplication = job.applicationOutcomes
                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
                    
                    if (lastApplication) {
                        // Assume posting ended ~30 days after last application
                        endDate = new Date(new Date(lastApplication.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
                    }
                }
                
                if (endDate) {
                    const duration = (endDate - createdAt) / (1000 * 60 * 60 * 24); // Days
                    if (duration > 0 && duration < 365) { // Sanity check
                        durations.push(duration);
                    }
                }
            }

            const avgPostingDuration = durations.length > 0
                ? durations.reduce((sum, d) => sum + d, 0) / durations.length
                : null;

            // Classify posting pattern
            const postingPattern = this.classifyPostingPattern(avgPostingDuration);

            return {
                avgPostingDuration,
                postingPattern,
                isCurrentlyPosted: true, // Assume current job is posted
                confidence: Math.min(0.9, durations.length / 20),
                sampleSize: durations.length,
                durationRange: durations.length > 0 ? {
                    min: Math.min(...durations),
                    max: Math.max(...durations),
                    median: this.calculateMedian(durations)
                } : null
            };

        } catch (error) {
            console.error('Posting duration analysis error:', error);
            return {
                avgPostingDuration: null,
                postingPattern: 'unknown',
                isCurrentlyPosted: true,
                confidence: 0.1,
                sampleSize: 0,
                error: error.message
            };
        }
    }

    calculateEngagementScore(applicationOutcomes, responsePatterns, durationPatterns) {
        let score = 0.5; // Start neutral
        const weights = this.signalWeights;
        
        // Factor 1: Application outcomes (30% weight)
        if (applicationOutcomes.hiringRate !== null) {
            // Higher hiring rate = higher engagement score
            const hiringContribution = applicationOutcomes.hiringRate * weights.applicationOutcome;
            score += hiringContribution;
            
            // Bonus for having any hiring data
            score += 0.1 * weights.applicationOutcome;
        }
        
        // Factor 2: Response rate (25% weight)
        if (applicationOutcomes.responseRate !== null) {
            const responseContribution = applicationOutcomes.responseRate * weights.responseRate;
            score += responseContribution;
        }
        
        // Factor 3: Interview conversion (20% weight)
        if (applicationOutcomes.interviewRate !== null) {
            const interviewContribution = applicationOutcomes.interviewRate * weights.interviewConversion;
            score += interviewContribution;
        }
        
        // Factor 4: Response time (15% weight)
        if (applicationOutcomes.avgTimeToResponse !== null) {
            // Faster response = higher score (inverse relationship)
            // Normalize: 1 day = 1.0, 14 days = 0.0
            const responseTimeScore = Math.max(0, (14 - applicationOutcomes.avgTimeToResponse) / 14);
            const timeContribution = responseTimeScore * weights.timeToResponse;
            score += timeContribution;
        }
        
        // Factor 5: Posting duration (10% weight)
        if (durationPatterns.avgPostingDuration !== null) {
            // Moderate posting duration is best (30-60 days)
            // Too short = rushed, too long = ghost job
            const duration = durationPatterns.avgPostingDuration;
            let durationScore = 0.5;
            
            if (duration >= 30 && duration <= 60) {
                durationScore = 1.0; // Optimal range
            } else if (duration >= 15 && duration <= 90) {
                durationScore = 0.7; // Acceptable range
            } else if (duration < 15) {
                durationScore = 0.3; // Too short
            } else {
                durationScore = 0.1; // Too long (likely ghost)
            }
            
            const durationContribution = durationScore * weights.postingDuration;
            score += durationContribution;
        }
        
        // Clamp to valid range
        return Math.max(0, Math.min(1, score));
    }

    generateEngagementAssessment(score, applicationOutcomes, responsePatterns, durationPatterns) {
        const sampleSize = applicationOutcomes.sampleSize || 0;
        const confidence = Math.min(0.95, (sampleSize / 100) + 0.3);
        
        let level, description, recommendations = [];
        
        if (sampleSize < 3) {
            return {
                level: 'insufficient_data',
                description: 'Not enough engagement data for reliable assessment',
                confidence: 0.2,
                recommendations: ['More application data needed for accurate assessment'],
                sampleSize
            };
        }
        
        if (score >= 0.8) {
            level = 'high_engagement';
            description = 'Strong engagement signals indicate active hiring';
            recommendations = [
                'Company shows strong hiring activity',
                'High probability of legitimate opportunity',
                'Good response rates and hiring outcomes'
            ];
        } else if (score >= 0.6) {
            level = 'moderate_engagement';
            description = 'Moderate engagement with mixed hiring signals';
            recommendations = [
                'Company shows some hiring activity',
                'Moderate confidence in opportunity legitimacy',
                'Consider applying with realistic expectations'
            ];
        } else if (score >= 0.4) {
            level = 'low_engagement';
            description = 'Low engagement signals suggest limited hiring activity';
            recommendations = [
                'Limited hiring activity detected',
                'Exercise caution when applying',
                'May be collecting resumes without active hiring'
            ];
        } else {
            level = 'very_low_engagement';
            description = 'Very low engagement suggests possible ghost job';
            recommendations = [
                'Minimal or no hiring activity detected',
                'High probability of ghost job posting',
                'Consider focusing efforts elsewhere'
            ];
        }
        
        // Add specific insights based on data
        if (applicationOutcomes.hiringRate !== null) {
            const hiringPercentage = Math.round(applicationOutcomes.hiringRate * 100);
            recommendations.push(`Historical hiring rate: ${hiringPercentage}% (${sampleSize} applications)`);
        }
        
        if (applicationOutcomes.avgTimeToResponse !== null) {
            const avgDays = Math.round(applicationOutcomes.avgTimeToResponse);
            recommendations.push(`Average response time: ${avgDays} days`);
        }
        
        return {
            level,
            description,
            confidence,
            recommendations,
            sampleSize,
            metrics: {
                hiringRate: applicationOutcomes.hiringRate,
                responseRate: applicationOutcomes.responseRate,
                interviewRate: applicationOutcomes.interviewRate,
                avgResponseTime: applicationOutcomes.avgTimeToResponse
            }
        };
    }

    // Method to apply engagement adjustments to job analysis
    applyEngagementAdjustment(baseResults, engagementAnalysis) {
        if (!engagementAnalysis || engagementAnalysis.assessment.level === 'insufficient_data') {
            return {
                ...baseResults,
                engagementAdjustment: {
                    applied: false,
                    reason: 'Insufficient engagement signal data'
                }
            };
        }
        
        let adjustedGhostProbability = baseResults.ghostProbability;
        const adjustments = [];
        
        // Apply engagement-based adjustments
        const engagementLevel = engagementAnalysis.assessment.level;
        const engagementScore = engagementAnalysis.engagementScore;
        
        if (engagementLevel === 'high_engagement') {
            adjustedGhostProbability *= 0.7; // Reduce by 30%
            adjustments.push('High engagement signals: -30% ghost probability');
            baseResults.keyFactors.push('Strong hiring engagement and activity detected');
        } else if (engagementLevel === 'moderate_engagement') {
            adjustedGhostProbability *= 0.85; // Reduce by 15%
            adjustments.push('Moderate engagement signals: -15% ghost probability');
            baseResults.keyFactors.push('Moderate hiring activity detected');
        } else if (engagementLevel === 'low_engagement') {
            adjustedGhostProbability = Math.min(1.0, adjustedGhostProbability * 1.2); // Increase by 20%
            adjustments.push('Low engagement signals: +20% ghost probability');
            baseResults.riskFactors.push('Limited hiring activity detected');
        } else if (engagementLevel === 'very_low_engagement') {
            adjustedGhostProbability = Math.min(1.0, adjustedGhostProbability * 1.4); // Increase by 40%
            adjustments.push('Very low engagement signals: +40% ghost probability');
            baseResults.riskFactors.push('Minimal hiring activity suggests ghost job');
        }
        
        // Additional specific adjustments
        const signals = engagementAnalysis.signals;
        
        // Hiring rate adjustments
        if (signals.applicationOutcomes.hiringRate !== null) {
            const hiringRate = signals.applicationOutcomes.hiringRate;
            if (hiringRate === 0 && signals.applicationOutcomes.sampleSize > 10) {
                adjustedGhostProbability = Math.min(1.0, adjustedGhostProbability + 0.2);
                adjustments.push('Zero hiring rate with large sample: +20% ghost probability');
                baseResults.riskFactors.push(`No hires from ${signals.applicationOutcomes.sampleSize} applications`);
            } else if (hiringRate > 0.1) {
                adjustedGhostProbability *= 0.9;
                adjustments.push(`Positive hiring rate (${Math.round(hiringRate * 100)}%): -10% ghost probability`);
            }
        }
        
        // Response time adjustments
        if (signals.applicationOutcomes.avgTimeToResponse !== null) {
            const avgResponseTime = signals.applicationOutcomes.avgTimeToResponse;
            if (avgResponseTime > 30) {
                adjustedGhostProbability = Math.min(1.0, adjustedGhostProbability + 0.1);
                adjustments.push(`Slow response time (${Math.round(avgResponseTime)} days): +10% ghost probability`);
            } else if (avgResponseTime <= 5) {
                adjustedGhostProbability *= 0.95;
                adjustments.push(`Fast response time (${Math.round(avgResponseTime)} days): -5% ghost probability`);
            }
        }
        
        // Posting duration adjustments
        if (signals.durationPatterns.avgPostingDuration !== null) {
            const duration = signals.durationPatterns.avgPostingDuration;
            if (duration > 90) {
                adjustedGhostProbability = Math.min(1.0, adjustedGhostProbability + 0.15);
                adjustments.push(`Very long posting duration (${Math.round(duration)} days): +15% ghost probability`);
                baseResults.riskFactors.push('Job postings typically remain open for extended periods');
            }
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
            engagementAdjustment: {
                applied: true,
                engagementScore: engagementScore,
                engagementLevel: engagementLevel,
                originalGhostProbability: baseResults.ghostProbability,
                adjustedGhostProbability,
                adjustments,
                confidence: engagementAnalysis.assessment.confidence,
                sampleSize: engagementAnalysis.signals.applicationOutcomes.sampleSize
            }
        };
    }

    // Helper methods
    extractJobFamily(title) {
        // Extract job family from title (e.g., "Senior Software Engineer" -> "Software Engineer")
        return title
            .replace(/\b(senior|sr|junior|jr|lead|principal|staff|i{1,3}|1|2|3)\b/gi, '')
            .trim();
    }

    calculateConsistency(values) {
        if (values.length < 2) return 0.5;
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        // Convert to consistency score (lower std dev = higher consistency)
        return Math.max(0, 1 - (stdDev / mean)); // Coefficient of variation approach
    }

    calculateEngagementTrend(applications) {
        if (applications.length < 6) return 'insufficient_data';
        
        // Sort applications by created date
        const sortedApps = applications
            .filter(app => app.createdAt)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        if (sortedApps.length < 6) return 'insufficient_data';
        
        // Compare first half vs second half response rates
        const midpoint = Math.floor(sortedApps.length / 2);
        const firstHalf = sortedApps.slice(0, midpoint);
        const secondHalf = sortedApps.slice(midpoint);
        
        const firstHalfResponseRate = firstHalf.filter(app => app.outcome !== 'no_response').length / firstHalf.length;
        const secondHalfResponseRate = secondHalf.filter(app => app.outcome !== 'no_response').length / secondHalf.length;
        
        const difference = secondHalfResponseRate - firstHalfResponseRate;
        
        if (difference > 0.2) return 'improving';
        if (difference < -0.2) return 'declining';
        return 'stable';
    }

    classifyPostingPattern(avgDuration) {
        if (avgDuration === null) return 'unknown';
        
        if (avgDuration < 7) return 'very_short'; // Less than a week
        if (avgDuration < 21) return 'short';     // 1-3 weeks
        if (avgDuration < 60) return 'normal';    // 3-8 weeks
        if (avgDuration < 120) return 'long';     // 2-4 months
        return 'very_long';                       // Over 4 months
    }

    calculateMedian(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 
            ? (sorted[mid - 1] + sorted[mid]) / 2 
            : sorted[mid];
    }

    calculateOutcomeDistribution(outcomes) {
        const distribution = {};
        outcomes.forEach(outcome => {
            distribution[outcome.outcome] = (distribution[outcome.outcome] || 0) + 1;
        });
        
        const total = outcomes.length;
        Object.keys(distribution).forEach(key => {
            distribution[key] = {
                count: distribution[key],
                percentage: Math.round((distribution[key] / total) * 100)
            };
        });
        
        return distribution;
    }
}