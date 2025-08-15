import { get } from '@vercel/edge-config';

// Get analysis statistics from Edge Config
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get data from Edge Config
        const jobSearches = await get('job_searches') || {};
        const stats = await get('stats') || {};
        
        // Calculate statistics
        const analyses = Object.values(jobSearches);
        const totalAnalyses = analyses.length;
        
        // Calculate risk distribution
        const riskDistribution = {
            high: 0,
            medium: 0,
            low: 0
        };
        
        analyses.forEach(analysis => {
            const prob = analysis.ghostProbability || 0;
            if (prob >= 0.7) {
                riskDistribution.high++;
            } else if (prob >= 0.4) {
                riskDistribution.medium++;
            } else {
                riskDistribution.low++;
            }
        });
        
        // Calculate average ghost probability
        const avgGhostProbability = totalAnalyses > 0 
            ? analyses.reduce((sum, a) => sum + (a.ghostProbability || 0), 0) / totalAnalyses 
            : 0;
        
        // Get top companies
        const companyCounts = {};
        analyses.forEach(analysis => {
            const company = analysis.company || 'Unknown';
            companyCounts[company] = (companyCounts[company] || 0) + 1;
        });
        
        const topCompanies = Object.entries(companyCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([company, count]) => ({ company, count }));

        return res.status(200).json({
            total_analyses: totalAnalyses,
            avg_ghost_probability: avgGhostProbability,
            risk_distribution: riskDistribution,
            top_companies: topCompanies,
            last_updated: stats.last_updated || new Date().toISOString()
        });

    } catch (error) {
        console.error('Stats fetch error:', error);
        return res.status(500).json({ 
            error: 'Failed to fetch stats',
            details: error.message 
        });
    }
}