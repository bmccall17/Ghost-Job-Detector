import { prisma } from '../lib/db.js';

export default async function handler(req, res) {
    try {
        // Get all sources
        const sources = await prisma.source.findMany({
            include: {
                jobListings: {
                    include: {
                        analyses: true
                    }
                }
            }
        });

        // Get total counts
        const counts = {
            sources: await prisma.source.count(),
            jobListings: await prisma.jobListing.count(),
            analyses: await prisma.analysis.count(),
            events: await prisma.event.count()
        };

        return res.status(200).json({
            counts,
            sources: sources.map(source => ({
                id: source.id,
                url: source.url,
                contentSha256: source.contentSha256.substring(0, 12) + '...',
                jobListings: source.jobListings.map(job => ({
                    id: job.id,
                    title: job.title,
                    company: job.company,
                    normalizedKey: job.normalizedKey.substring(0, 12) + '...',
                    analysisCount: job.analyses.length
                }))
            }))
        });
    } catch (error) {
        return res.status(500).json({ 
            error: 'Database check failed',
            details: error.message 
        });
    }
}