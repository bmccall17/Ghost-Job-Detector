import { prisma } from '../lib/db.js';

// Get analysis statistics from Postgres
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get total analyses count
        const totalAnalyses = await prisma.analysis.count();

        // Get verdict distribution
        const verdictDistribution = await prisma.analysis.groupBy({
            by: ['verdict'],
            _count: { verdict: true }
        });

        const riskDistribution = {
            likely_ghost: 0,
            uncertain: 0,
            likely_real: 0
        };

        verdictDistribution.forEach(group => {
            riskDistribution[group.verdict] = group._count.verdict;
        });

        // Calculate average ghost probability
        const avgResult = await prisma.analysis.aggregate({
            _avg: { score: true }
        });
        const avgGhostProbability = Number(avgResult._avg.score) || 0;

        // Get top companies by analysis count
        const topCompaniesData = await prisma.jobListing.groupBy({
            by: ['company'],
            _count: { company: true },
            orderBy: { _count: { company: 'desc' } },
            take: 5
        });

        const topCompanies = topCompaniesData.map(group => ({
            company: group.company,
            count: group._count.company
        }));

        // Get recent activity (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentAnalyses = await prisma.analysis.count({
            where: {
                createdAt: { gte: sevenDaysAgo }
            }
        });

        // Get company statistics
        const companyStats = await prisma.company.findMany({
            orderBy: { avgGhostProbability: 'desc' },
            take: 10
        });

        // Get latest analysis timestamp
        const latestAnalysis = await prisma.analysis.findFirst({
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true }
        });

        // Queue stats (if available)
        let queueStats = null;
        try {
            const { QueueManager } = await import('../lib/queue.js');
            queueStats = await QueueManager.getQueueStats();
        } catch (error) {
            console.log('Queue stats not available:', error.message);
        }

        return res.status(200).json({
            total_analyses: totalAnalyses,
            avg_ghost_probability: avgGhostProbability,
            risk_distribution: riskDistribution,
            top_companies: topCompanies,
            recent_analyses_7d: recentAnalyses,
            company_insights: companyStats.map(company => ({
                name: company.name,
                total_postings: company.totalPostings,
                avg_ghost_probability: Number(company.avgGhostProbability),
                last_analyzed: company.lastAnalyzedAt
            })),
            queue_health: queueStats,
            last_updated: latestAnalysis?.createdAt || new Date().toISOString(),
            system_info: {
                storage: 'postgres',
                version: '2.0',
                model_version: process.env.ML_MODEL_VERSION || 'v1.0.0'
            }
        });

    } catch (error) {
        console.error('Stats fetch error:', error);
        return res.status(500).json({ 
            error: 'Failed to fetch stats',
            details: error.message 
        });
    }
}