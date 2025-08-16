import { prisma } from '../../lib/db.js';
import { QueueManager } from '../../lib/queue.js';

// Admin Dashboard API
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get dashboard data
        const [
            totalAnalyses,
            recentAnalyses,
            queueStats,
            topCompanies,
            verdictDistribution,
            recentEvents
        ] = await Promise.all([
            // Total analyses count
            prisma.analysis.count(),
            
            // Recent analyses (last 24 hours)
            prisma.analysis.findMany({
                where: {
                    createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                },
                include: { jobListing: true },
                orderBy: { createdAt: 'desc' },
                take: 20
            }),
            
            // Queue health
            QueueManager.getQueueStats(),
            
            // Top companies by analysis count
            prisma.jobListing.groupBy({
                by: ['company'],
                _count: { company: true },
                orderBy: { _count: { company: 'desc' } },
                take: 10
            }),
            
            // Verdict distribution
            prisma.analysis.groupBy({
                by: ['verdict'],
                _count: { verdict: true }
            }),
            
            // Recent system events
            prisma.event.findMany({
                orderBy: { createdAt: 'desc' },
                take: 50
            })
        ]);

        // Calculate averages and trends
        const avgGhostProb = await prisma.analysis.aggregate({
            _avg: { score: true }
        });

        // Format response
        return res.status(200).json({
            overview: {
                total_analyses: totalAnalyses,
                avg_ghost_probability: Number(avgGhostProb._avg.score) || 0,
                analyses_last_24h: recentAnalyses.length
            },
            queue_health: {
                ingest_queue: queueStats.ingestLength,
                analysis_queue: queueStats.analysisLength,
                dead_letter_ingest: queueStats.deadLetterIngest,
                dead_letter_analysis: queueStats.deadLetterAnalysis
            },
            verdict_distribution: verdictDistribution.reduce((acc, item) => {
                acc[item.verdict] = item._count.verdict;
                return acc;
            }, {}),
            top_companies: topCompanies.map(item => ({
                company: item.company,
                analysis_count: item._count.company
            })),
            recent_analyses: recentAnalyses.map(analysis => ({
                id: analysis.id,
                title: analysis.jobListing.title,
                company: analysis.jobListing.company,
                score: Number(analysis.score),
                verdict: analysis.verdict,
                created_at: analysis.createdAt
            })),
            recent_events: recentEvents.map(event => ({
                id: event.id,
                kind: event.kind,
                ref_table: event.refTable,
                ref_id: event.refId,
                meta: event.meta,
                created_at: event.createdAt
            })),
            system_info: {
                timestamp: new Date().toISOString(),
                version: '2.0',
                model_version: process.env.ML_MODEL_VERSION || 'v1.0.0',
                storage: 'postgres'
            }
        });

    } catch (error) {
        console.error('Admin dashboard error:', error);
        return res.status(500).json({
            error: 'Failed to load dashboard',
            details: error.message
        });
    }
}