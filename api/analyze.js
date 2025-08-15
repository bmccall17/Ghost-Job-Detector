import { get, set, getAll } from '@vercel/edge-config';

// Ghost Job Analysis Service for Vercel
export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { url, title, company, description } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Simple ghost job analysis (placeholder logic)
        const analysis = analyzeJob({ url, title, company, description });
        
        // Generate unique ID
        const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Prepare job search data
        const jobSearchData = {
            id: analysisId,
            url,
            title: title || 'Unknown Position',
            company: company || 'Unknown Company',
            description: description || '',
            ghostProbability: analysis.ghostProbability,
            riskFactors: analysis.riskFactors,
            keyFactors: analysis.keyFactors,
            timestamp: new Date().toISOString(),
            metadata: {
                storage: 'vercel-edge-config',
                version: '1.0'
            }
        };

        // Store in Edge Config
        try {
            // Get existing job searches
            const existingSearches = await get('job_searches') || {};
            
            // Add new search
            existingSearches[analysisId] = jobSearchData;
            
            // Update job searches
            await set('job_searches', existingSearches);
            
            // Update stats
            const stats = await get('stats') || { total_analyses: 0 };
            stats.total_analyses = Object.keys(existingSearches).length;
            stats.last_updated = new Date().toISOString();
            await set('stats', stats);
            
            console.log(`✅ Stored analysis ${analysisId} in Edge Config`);
            
        } catch (storeError) {
            console.error('❌ Failed to store in Edge Config:', storeError);
            // Still return the analysis even if storage fails
        }

        // Return analysis result
        return res.status(200).json({
            id: analysisId,
            url,
            jobData: {
                title: jobSearchData.title,
                company: jobSearchData.company,
                description: jobSearchData.description
            },
            ghostProbability: analysis.ghostProbability,
            riskLevel: analysis.riskLevel,
            riskFactors: analysis.riskFactors,
            keyFactors: analysis.keyFactors,
            metadata: jobSearchData.metadata
        });

    } catch (error) {
        console.error('Analysis error:', error);
        return res.status(500).json({ 
            error: 'Analysis failed',
            details: error.message 
        });
    }
}

// Simple ghost job analysis logic
function analyzeJob({ url, title, company, description }) {
    let ghostProbability = 0;
    const riskFactors = [];
    const keyFactors = [];

    // URL analysis
    if (url && url.includes('linkedin.com')) {
        ghostProbability += 0.1;
        keyFactors.push('LinkedIn posting');
    }

    // Title analysis
    if (title) {
        const titleLower = title.toLowerCase();
        if (titleLower.includes('urgent') || titleLower.includes('immediate')) {
            ghostProbability += 0.3;
            riskFactors.push('Urgent hiring language');
        }
        if (titleLower.includes('remote') || titleLower.includes('work from home')) {
            ghostProbability += 0.2;
            keyFactors.push('Remote position');
        }
        if (titleLower.length > 50) {
            ghostProbability += 0.1;
            riskFactors.push('Very long job title');
        }
    }

    // Company analysis
    if (company) {
        if (company.toLowerCase().includes('consulting') || company.toLowerCase().includes('staffing')) {
            ghostProbability += 0.2;
            keyFactors.push('Consulting/staffing company');
        }
    }

    // Description analysis
    if (description) {
        const descLower = description.toLowerCase();
        if (descLower.includes('competitive salary') && !descLower.match(/\$[\d,]+/)) {
            ghostProbability += 0.2;
            riskFactors.push('Vague salary description');
        }
        if (descLower.includes('fast-paced') || descLower.includes('dynamic')) {
            ghostProbability += 0.1;
            riskFactors.push('Generic corporate language');
        }
        if (description.length < 100) {
            ghostProbability += 0.3;
            riskFactors.push('Very short job description');
        }
    }

    // Cap at 100%
    ghostProbability = Math.min(ghostProbability, 1.0);

    // Determine risk level
    let riskLevel;
    if (ghostProbability >= 0.7) {
        riskLevel = 'high';
    } else if (ghostProbability >= 0.4) {
        riskLevel = 'medium';
    } else {
        riskLevel = 'low';
    }

    return {
        ghostProbability,
        riskLevel,
        riskFactors,
        keyFactors
    };
}