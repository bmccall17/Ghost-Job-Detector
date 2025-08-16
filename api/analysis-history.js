import { prisma } from '../lib/db.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Fetch all job listings with their latest analysis
        const jobListings = await prisma.jobListing.findMany({
            include: {
                analyses: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                },
                source: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Transform to frontend format
        const analyses = jobListings.map(job => {
            const analysis = job.analyses[0];
            return {
                id: analysis?.id || job.id,
                jobUrl: job.canonicalUrl || job.source.url,
                jobData: {
                    title: job.title,
                    company: job.company,
                    description: job.rawParsedJson?.originalDescription || '',
                    location: job.location,
                    remote: job.remoteFlag
                },
                ghostProbability: analysis ? Number(analysis.score) : 0,
                riskLevel: analysis?.verdict === 'likely_ghost' ? 'high' :
                          analysis?.verdict === 'likely_real' ? 'low' : 'medium',
                riskFactors: analysis?.reasonsJson?.riskFactors || [],
                keyFactors: analysis?.reasonsJson?.keyFactors || [],
                timestamp: job.createdAt,
                isNewContribution: false
            };
        });

        // Get summary stats
        const total = analyses.length;
        const highRisk = analyses.filter(a => a.ghostProbability >= 0.67).length;
        const mediumRisk = analyses.filter(a => a.ghostProbability >= 0.34 && a.ghostProbability < 0.67).length;
        const lowRisk = analyses.filter(a => a.ghostProbability < 0.34).length;

        return res.status(200).json({
            analyses,
            stats: { total, highRisk, mediumRisk, lowRisk }
        });

    } catch (error) {
        console.error('Analysis history fetch error:', error);
        return res.status(500).json({ 
            error: 'Failed to fetch analysis history',
            details: error.message 
        });
    }
}