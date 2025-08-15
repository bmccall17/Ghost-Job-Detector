import { get } from '@vercel/edge-config';

// Get analysis history from Edge Config
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get job searches from Edge Config
        const jobSearches = await get('job_searches') || {};
        
        // Convert to array and sort by timestamp (newest first)
        const analyses = Object.values(jobSearches)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Apply limit if specified
        const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
        const limitedAnalyses = limit ? analyses.slice(0, limit) : analyses;

        // Format for frontend
        const formattedAnalyses = limitedAnalyses.map(analysis => ({
            id: analysis.id,
            url: analysis.url,
            title: analysis.title,
            company: analysis.company,
            ghostProbability: analysis.ghostProbability,
            riskLevel: analysis.ghostProbability >= 0.7 ? 'high' : 
                      analysis.ghostProbability >= 0.4 ? 'medium' : 'low',
            timestamp: analysis.timestamp,
            riskFactors: analysis.riskFactors || [],
            keyFactors: analysis.keyFactors || []
        }));

        return res.status(200).json(formattedAnalyses);

    } catch (error) {
        console.error('History fetch error:', error);
        return res.status(500).json({ 
            error: 'Failed to fetch history',
            details: error.message 
        });
    }
}