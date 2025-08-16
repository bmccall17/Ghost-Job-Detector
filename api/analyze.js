import { prisma } from '../lib/db.js';
import { QueueManager } from '../lib/queue.js';
import { BlobStorage } from '../lib/storage.js';
import crypto from 'crypto';

// Ghost Job Analysis Service for Vercel (Production)
export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { url, title, company, description, sourceType = 'url' } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Generate content hash for deduplication
        const contentString = `${url}${title || ''}${company || ''}${description || ''}`;
        const contentSha256 = crypto.createHash('sha256').update(contentString).digest('hex');

        // Check if we've already seen this source
        const existingSource = await prisma.source.findUnique({
            where: { contentSha256 },
            include: {
                jobListings: {
                    include: { analyses: { orderBy: { createdAt: 'desc' }, take: 1 } }
                }
            }
        });

        if (existingSource && existingSource.jobListings.length > 0) {
            // Return existing analysis
            const jobListing = existingSource.jobListings[0];
            const latestAnalysis = jobListing.analyses[0];
            
            return res.status(200).json({
                id: latestAnalysis?.id || jobListing.id,
                url: existingSource.url,
                jobData: {
                    title: jobListing.title,
                    company: jobListing.company,
                    description: jobListing.rawParsedJson?.description || '',
                    location: jobListing.location,
                    remote: jobListing.remoteFlag
                },
                ghostProbability: latestAnalysis ? Number(latestAnalysis.score) : 0,
                riskLevel: latestAnalysis?.verdict || 'uncertain',
                riskFactors: latestAnalysis?.reasonsJson?.riskFactors || [],
                keyFactors: latestAnalysis?.reasonsJson?.keyFactors || [],
                metadata: {
                    storage: 'postgres',
                    version: '2.0',
                    cached: true,
                    analysisDate: latestAnalysis?.createdAt
                }
            });
        }

        // Create new source record
        const source = await prisma.source.create({
            data: {
                kind: sourceType,
                url: sourceType === 'url' ? url : undefined,
                contentSha256,
                httpStatus: sourceType === 'url' ? 200 : undefined
            }
        });

        // Store HTML snapshot if URL source
        let storageUrl = null;
        if (sourceType === 'url' && description) {
            const blob = await BlobStorage.storeHTML(description, url);
            storageUrl = blob.url;
            
            // Create raw document record
            await prisma.rawDocument.create({
                data: {
                    sourceId: source.id,
                    storageUrl: blob.url,
                    mimeType: 'text/html',
                    textContent: description,
                    textSha256: BlobStorage.generateContentHash(description)
                }
            });
        }

        // Generate normalized key for job listing
        const normalizedKey = crypto.createHash('sha256')
            .update(`${(company || 'unknown').toLowerCase()}:${(title || 'unknown').toLowerCase()}`)
            .digest('hex');

        // Create job listing
        const jobListing = await prisma.jobListing.create({
            data: {
                sourceId: source.id,
                title: title || 'Unknown Position',
                company: company || 'Unknown Company',
                location: null, // TODO: Extract from description
                remoteFlag: description?.toLowerCase().includes('remote') || false,
                canonicalUrl: url,
                rawParsedJson: {
                    originalTitle: title,
                    originalCompany: company,
                    originalDescription: description,
                    extractedAt: new Date().toISOString()
                },
                normalizedKey
            }
        });

        // Perform simple analysis
        const analysis = analyzeJob({ url, title, company, description });

        // Create analysis record
        const analysisRecord = await prisma.analysis.create({
            data: {
                jobListingId: jobListing.id,
                score: analysis.ghostProbability,
                verdict: analysis.riskLevel === 'high' ? 'likely_ghost' : 
                         analysis.riskLevel === 'low' ? 'likely_real' : 'uncertain',
                reasonsJson: {
                    riskFactors: analysis.riskFactors,
                    keyFactors: analysis.keyFactors,
                    confidence: analysis.confidence || 0.8
                },
                modelVersion: process.env.ML_MODEL_VERSION || 'v1.0.0'
            }
        });

        // Create key factors
        for (const factor of analysis.riskFactors) {
            await prisma.keyFactor.create({
                data: {
                    jobListingId: jobListing.id,
                    factorType: 'risk',
                    factorDescription: factor,
                    impactScore: 0.2 // Default impact
                }
            });
        }

        for (const factor of analysis.keyFactors) {
            await prisma.keyFactor.create({
                data: {
                    jobListingId: jobListing.id,
                    factorType: 'positive',
                    factorDescription: factor,
                    impactScore: 0.1 // Default impact
                }
            });
        }

        // Update company statistics
        await updateCompanyStats(company || 'Unknown Company', Number(analysis.ghostProbability));

        // Log event
        await prisma.event.create({
            data: {
                kind: 'analysis_completed',
                refTable: 'job_listings',
                refId: jobListing.id,
                meta: {
                    analysisId: analysisRecord.id,
                    score: Number(analysis.ghostProbability),
                    verdict: analysisRecord.verdict
                }
            }
        });

        // Return analysis result
        return res.status(200).json({
            id: analysisRecord.id,
            url,
            jobData: {
                title: jobListing.title,
                company: jobListing.company,
                description: description || '',
                location: jobListing.location,
                remote: jobListing.remoteFlag
            },
            ghostProbability: Number(analysis.ghostProbability),
            riskLevel: analysis.riskLevel,
            riskFactors: analysis.riskFactors,
            keyFactors: analysis.keyFactors,
            metadata: {
                storage: 'postgres',
                version: '2.0',
                cached: false,
                analysisDate: analysisRecord.createdAt
            }
        });

    } catch (error) {
        console.error('Analysis error:', error);
        
        // Log error event
        try {
            await prisma.event.create({
                data: {
                    kind: 'analysis_failed',
                    meta: {
                        error: error.message,
                        url: req.body.url
                    }
                }
            });
        } catch (logError) {
            console.error('Failed to log error:', logError);
        }
        
        return res.status(500).json({ 
            error: 'Analysis failed',
            details: error.message 
        });
    }
}

// Update company statistics
async function updateCompanyStats(companyName, ghostProbability) {
    try {
        const normalizedName = companyName.toLowerCase().trim();
        
        // Get or create company
        const company = await prisma.company.upsert({
            where: { normalizedName },
            update: {},
            create: {
                name: companyName,
                normalizedName
            }
        });

        // Recalculate stats from job listings
        const companyListings = await prisma.jobListing.findMany({
            where: { company: companyName },
            include: { analyses: { orderBy: { createdAt: 'desc' }, take: 1 } }
        });

        const totalPostings = companyListings.length;
        const avgGhostProbability = companyListings.reduce((sum, listing) => {
            const latestAnalysis = listing.analyses[0];
            return sum + (latestAnalysis ? Number(latestAnalysis.score) : 0);
        }, 0) / totalPostings;

        await prisma.company.update({
            where: { id: company.id },
            data: {
                totalPostings,
                avgGhostProbability,
                lastAnalyzedAt: new Date()
            }
        });
    } catch (error) {
        console.error('Failed to update company stats:', error);
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