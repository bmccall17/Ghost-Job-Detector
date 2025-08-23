import { prisma } from '../lib/db.js';
import { securityValidator } from '../lib/security.js';

// Consolidated Analysis History API
// Supports both legacy /api/history and current /api/analysis-history functionality
export default async function handler(req, res) {
    const startTime = Date.now();
    
    // Apply security headers
    const securityHeaders = securityValidator.getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
    });

    // Get client IP
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.connection.remoteAddress || 
                    req.socket.remoteAddress ||
                    (req.connection.socket ? req.connection.socket.remoteAddress : null);

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Rate limiting check
        const rateLimit = securityValidator.checkRateLimit(clientIP, 'general');
        if (!rateLimit.allowed) {
            securityValidator.logSecurityEvent('history_rate_limit_exceeded', {
                ip: clientIP,
                endpoint: '/api/analysis-history'
            });
            
            return res.status(429).json({
                error: 'Rate limit exceeded',
                retryAfter: rateLimit.retryAfter
            });
        }
        console.log('Analysis History API called:', { method: req.method, query: req.query });
        
        // Get query parameters (for legacy history.js compatibility)
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;
        const offset = req.query.offset ? parseInt(req.query.offset) : 0;
        const company = req.query.company;
        const verdict = req.query.verdict;
        const format = req.query.format || 'default'; // 'legacy' for old history.js format

        // Build where clause for filtering
        const where = {};
        if (company) {
            where.jobListing = { company: { contains: company, mode: 'insensitive' } };
        }
        if (verdict) {
            where.verdict = verdict;
        }

        if (format === 'legacy') {
            // Legacy history.js format - query analyses directly
            const analyses = await prisma.analysis.findMany({
                where,
                include: {
                    jobListing: {
                        include: {
                            source: true,
                            keyFactors: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset
            });

            // Format for legacy frontend
            const formattedAnalyses = analyses.map(analysis => {
                const jobListing = analysis.jobListing;
                const source = jobListing.source;
                
                return {
                    id: analysis.id,
                    url: source.url,
                    title: jobListing.title,
                    company: jobListing.company,
                    location: jobListing.location,
                    remote: jobListing.remoteFlag,
                    ghostProbability: Number(analysis.score),
                    riskLevel: analysis.verdict,
                    timestamp: analysis.createdAt,
                    riskFactors: analysis.reasonsJson?.riskFactors || [],
                    keyFactors: analysis.reasonsJson?.keyFactors || [],
                    modelVersion: analysis.modelVersion,
                    processingTime: analysis.processingTimeMs,
                    metadata: {
                        storage: 'postgres',
                        version: '2.0',
                        sourceType: source.kind,
                        analysisDate: analysis.createdAt,
                        jobListingId: jobListing.id,
                        sourceId: source.id,
                        
                        // Include detailed analyzer processing data
                        algorithmAssessment: analysis.algorithmAssessment,
                        riskFactorsAnalysis: analysis.riskFactorsAnalysis,
                        recommendation: analysis.recommendation,
                        analysisDetails: analysis.analysisDetails,
                        processingTimeMs: analysis.processingTimeMs
                    }
                };
            });

            // Get total count for pagination
            const totalCount = await prisma.analysis.count({ where });

            return res.status(200).json({
                analyses: formattedAnalyses,
                pagination: {
                    total: totalCount,
                    limit,
                    offset,
                    hasMore: offset + limit < totalCount
                }
            });
        }

        // Default format - current analysis-history.js behavior
        // Apply filters to job listing query if specified
        const jobWhere = {};
        if (company) {
            jobWhere.company = { contains: company, mode: 'insensitive' };
        }

        // Fetch job listings with their latest analysis
        console.log('Fetching job listings from database...');
        const jobListings = await prisma.jobListing.findMany({
            where: jobWhere,
            include: {
                analyses: {
                    where: verdict ? { verdict } : {},
                    orderBy: { createdAt: 'desc' },
                    take: 1
                },
                source: true
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });
        
        console.log(`Found ${jobListings.length} job listings`);
        jobListings.forEach((job, index) => {
            console.log(`Job ${index + 1}:`, {
                id: job.id,
                title: job.title,
                company: job.company,
                analysesCount: job.analyses.length,
                sourceUrl: job.source?.url,
                canonicalUrl: job.canonicalUrl
            });
        });

        // Filter out job listings without analyses if verdict filter is applied
        const filteredJobListings = verdict 
            ? jobListings.filter(job => job.analyses.length > 0)
            : jobListings;

        // Transform to frontend format
        const analyses = filteredJobListings.map(job => {
            const analysis = job.analyses[0];
            return {
                id: analysis?.id || job.id,
                jobUrl: job.canonicalUrl || job.source?.url,
                url: job.canonicalUrl || job.source?.url, // Legacy compatibility
                jobData: {
                    title: job.title,
                    company: job.company,
                    description: job.rawParsedJson?.originalDescription || '',
                    location: job.location,
                    remote: job.remoteFlag
                },
                title: job.title, // Legacy compatibility
                company: job.company, // Legacy compatibility
                location: job.location, // Legacy compatibility
                remote: job.remoteFlag, // Legacy compatibility
                ghostProbability: analysis ? Number(analysis.score) : 0,
                riskLevel: analysis?.verdict === 'likely_ghost' ? 'high' :
                          analysis?.verdict === 'likely_real' ? 'low' : 'medium',
                riskFactors: analysis?.reasonsJson?.riskFactors || [],
                keyFactors: analysis?.reasonsJson?.keyFactors || [],
                timestamp: analysis?.createdAt || job.createdAt,
                isNewContribution: false,
                // WebLLM parsing fields
                extractionMethod: analysis?.reasonsJson?.extractionMethod || job.extractionMethod || 'manual',
                parsingConfidence: analysis?.reasonsJson?.parsingConfidence || job.parsingConfidence || 0,
                validationSources: job.validationSources || [],
                // Include detailed analyzer processing data
                metadata: {
                    storage: 'postgres',
                    version: '2.0',
                    sourceType: job.source?.kind,
                    analysisDate: analysis?.createdAt || job.createdAt,
                    jobListingId: job.id,
                    sourceId: job.source?.id,
                    
                    // Include detailed analyzer processing data
                    algorithmAssessment: analysis?.algorithmAssessment,
                    riskFactorsAnalysis: analysis?.riskFactorsAnalysis,
                    recommendation: analysis?.recommendation,
                    analysisDetails: analysis?.analysisDetails,
                    processingTimeMs: analysis?.processingTimeMs
                }
            };
        });

        // Get summary stats
        const total = analyses.length;
        const highRisk = analyses.filter(a => a.ghostProbability >= 0.67).length;
        const mediumRisk = analyses.filter(a => a.ghostProbability >= 0.34 && a.ghostProbability < 0.67).length;
        const lowRisk = analyses.filter(a => a.ghostProbability < 0.34).length;

        console.log('Returning response:', {
            analysesCount: analyses.length,
            stats: { total, highRisk, mediumRisk, lowRisk }
        });
        
        return res.status(200).json({
            analyses,
            stats: { total, highRisk, mediumRisk, lowRisk },
            // Legacy pagination support
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total
            }
        });

    } catch (error) {
        console.error('Analysis history fetch error:', error);
        return res.status(500).json({ 
            error: 'Failed to fetch analysis history',
            details: error.message 
        });
    }
}