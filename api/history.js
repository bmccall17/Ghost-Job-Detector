import { prisma } from '../lib/db.js';

// Get analysis history from Postgres
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get query parameters
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;
        const offset = req.query.offset ? parseInt(req.query.offset) : 0;
        const company = req.query.company;
        const verdict = req.query.verdict;

        // Build where clause
        const where = {};
        if (company) {
            where.jobListing = { company: { contains: company, mode: 'insensitive' } };
        }
        if (verdict) {
            where.verdict = verdict;
        }

        // Get analyses from database
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

        // Format for frontend
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
                    sourceId: source.id
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

    } catch (error) {
        console.error('History fetch error:', error);
        return res.status(500).json({ 
            error: 'Failed to fetch history',
            details: error.message 
        });
    }
}