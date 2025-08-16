import { QueueManager } from '../../lib/queue.js';
import { prisma } from '../../lib/db.js';

// Analysis Worker - Process job analysis
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🔄 Analysis worker tick started');
        
        // Get batch size from environment
        const batchSize = parseInt(process.env.QUEUE_BATCH_SIZE) || 10;
        
        // Pop jobs from analysis queue
        const jobs = await QueueManager.popAnalysisJobs(batchSize);
        
        if (jobs.length === 0) {
            return res.status(200).json({ 
                message: 'No jobs to process',
                processed: 0 
            });
        }

        console.log(`📊 Processing ${jobs.length} analysis jobs`);
        
        let processed = 0;
        let failed = 0;
        
        for (const job of jobs) {
            try {
                const startTime = Date.now();
                await processAnalysisJob(job);
                const processingTime = Date.now() - startTime;
                
                processed++;
                console.log(`✅ Processed analysis ${job.id} in ${processingTime}ms`);
            } catch (error) {
                console.error(`❌ Failed to process analysis ${job.id}:`, error);
                failed++;
                
                // Handle retry logic
                if (job.retryCount < (parseInt(process.env.QUEUE_RETRY_ATTEMPTS) || 3)) {
                    // Retry the job
                    await QueueManager.enqueueAnalysis({
                        ...job,
                        retryCount: job.retryCount + 1
                    });
                    console.log(`🔄 Retrying analysis ${job.id} (attempt ${job.retryCount + 2})`);
                } else {
                    // Move to dead letter queue
                    await QueueManager.moveToDeadLetter(job, error.message);
                    console.log(`💀 Moved analysis ${job.id} to dead letter queue`);
                }
            }
        }

        // Log processing event
        await prisma.event.create({
            data: {
                kind: 'queue_processed',
                meta: {
                    queue: 'analysis',
                    processed,
                    failed,
                    batchSize: jobs.length
                }
            }
        });

        return res.status(200).json({
            message: 'Analysis batch processed',
            processed,
            failed,
            total: jobs.length
        });

    } catch (error) {
        console.error('Analysis worker error:', error);
        return res.status(500).json({
            error: 'Analysis worker failed',
            details: error.message
        });
    }
}

// Process individual analysis job
async function processAnalysisJob(job) {
    const { jobListingId, modelVersion } = job;
    const startTime = Date.now();
    
    // Get job listing with related data
    const jobListing = await prisma.jobListing.findUnique({
        where: { id: jobListingId },
        include: {
            source: true,
            rawDocuments: true
        }
    });
    
    if (!jobListing) {
        throw new Error(`Job listing ${jobListingId} not found`);
    }

    console.log(`🔍 Analyzing job: ${jobListing.title} at ${jobListing.company}`);

    // Get text content for analysis
    const rawDocument = jobListing.rawDocuments[0];
    const content = rawDocument?.textContent || '';

    // Perform ghost job analysis
    const analysis = analyzeJobListing({
        title: jobListing.title,
        company: jobListing.company,
        description: content,
        url: jobListing.source.url,
        location: jobListing.location,
        remote: jobListing.remoteFlag
    });

    const processingTime = Date.now() - startTime;

    // Create analysis record
    const analysisRecord = await prisma.analysis.create({
        data: {
            jobListingId,
            score: analysis.ghostProbability,
            verdict: analysis.riskLevel === 'high' ? 'likely_ghost' : 
                     analysis.riskLevel === 'low' ? 'likely_real' : 'uncertain',
            reasonsJson: {
                riskFactors: analysis.riskFactors,
                keyFactors: analysis.keyFactors,
                confidence: analysis.confidence,
                analysisVersion: '2.0'
            },
            modelVersion,
            processingTimeMs: processingTime
        }
    });

    // Create key factors
    for (const factor of analysis.riskFactors) {
        await prisma.keyFactor.create({
            data: {
                jobListingId,
                factorType: 'risk',
                factorDescription: factor,
                impactScore: 0.2 // Default impact
            }
        });
    }

    for (const factor of analysis.keyFactors) {
        await prisma.keyFactor.create({
            data: {
                jobListingId,
                factorType: 'positive',
                factorDescription: factor,
                impactScore: 0.1 // Default impact
            }
        });
    }

    // Update company statistics
    await updateCompanyStats(jobListing.company, Number(analysis.ghostProbability));

    // Log analysis completion event
    await prisma.event.create({
        data: {
            kind: 'analysis_completed',
            refTable: 'job_listings',
            refId: jobListingId,
            meta: {
                analysisId: analysisRecord.id,
                score: Number(analysis.ghostProbability),
                verdict: analysisRecord.verdict,
                processingTimeMs: processingTime
            }
        }
    });

    console.log(`📊 Analysis complete: ${analysis.ghostProbability.toFixed(3)} ghost probability`);
}

// Enhanced ghost job analysis algorithm
function analyzeJobListing({ title, company, description, url, location, remote }) {
    let ghostProbability = 0;
    const riskFactors = [];
    const keyFactors = [];
    
    // URL analysis
    if (url) {
        if (url.includes('linkedin.com/jobs')) {
            ghostProbability += 0.05;
            keyFactors.push('LinkedIn posting');
        }
        if (url.includes('indeed.com')) {
            ghostProbability += 0.03;
            keyFactors.push('Indeed posting');
        }
    }

    // Title analysis
    if (title) {
        const titleLower = title.toLowerCase();
        
        // Urgency indicators
        if (titleLower.includes('urgent') || titleLower.includes('immediate')) {
            ghostProbability += 0.25;
            riskFactors.push('Urgent hiring language in title');
        }
        
        // Generic titles
        if (titleLower.includes('ninja') || titleLower.includes('rockstar') || titleLower.includes('guru')) {
            ghostProbability += 0.15;
            riskFactors.push('Generic "ninja/rockstar" title');
        }
        
        // Length indicators
        if (title.length > 80) {
            ghostProbability += 0.1;
            riskFactors.push('Exceptionally long job title');
        }
        
        if (title.length < 10) {
            ghostProbability += 0.2;
            riskFactors.push('Suspiciously short job title');
        }
        
        // Remote indicators
        if (titleLower.includes('remote') || titleLower.includes('work from home')) {
            ghostProbability += 0.1;
            keyFactors.push('Remote position indicated in title');
        }
    }

    // Company analysis
    if (company) {
        const companyLower = company.toLowerCase();
        
        // Staffing/consulting red flags
        if (companyLower.includes('consulting') || companyLower.includes('staffing') || 
            companyLower.includes('solutions') || companyLower.includes('services')) {
            ghostProbability += 0.2;
            riskFactors.push('Consulting/staffing company pattern');
        }
        
        // Generic company names
        if (companyLower.includes('unnamed') || companyLower.includes('confidential') ||
            companyLower === 'unknown company') {
            ghostProbability += 0.3;
            riskFactors.push('Anonymous or generic company name');
        }
    }

    // Description analysis
    if (description) {
        const descLower = description.toLowerCase();
        
        // Vague compensation
        if (descLower.includes('competitive salary') && !description.match(/\$[\d,]+/)) {
            ghostProbability += 0.15;
            riskFactors.push('Vague salary without specific range');
        }
        
        // Generic corporate language
        const genericPhrases = ['fast-paced', 'dynamic', 'synergy', 'disruptive', 'paradigm'];
        const genericCount = genericPhrases.filter(phrase => descLower.includes(phrase)).length;
        if (genericCount >= 2) {
            ghostProbability += 0.1 * genericCount;
            riskFactors.push(`Excessive corporate buzzwords (${genericCount} detected)`);
        }
        
        // Description length analysis
        if (description.length < 200) {
            ghostProbability += 0.25;
            riskFactors.push('Unusually short job description');
        } else if (description.length > 5000) {
            ghostProbability += 0.1;
            riskFactors.push('Excessively long job description');
        }
        
        // Qualification red flags
        if (descLower.includes('entry level') && descLower.includes('5+ years')) {
            ghostProbability += 0.2;
            riskFactors.push('Contradictory experience requirements');
        }
        
        // Positive indicators
        if (description.match(/\$[\d,]+-\$[\d,]+/) || description.match(/\$[\d,]+k-\$[\d,]+k/)) {
            ghostProbability -= 0.1;
            keyFactors.push('Specific salary range provided');
        }
        
        if (descLower.includes('benefits') || descLower.includes('401k') || descLower.includes('insurance')) {
            ghostProbability -= 0.05;
            keyFactors.push('Specific benefits mentioned');
        }
    }

    // Location/remote analysis
    if (remote) {
        ghostProbability += 0.05;
        keyFactors.push('Remote work option');
    }
    
    if (location && location.toLowerCase().includes('anywhere')) {
        ghostProbability += 0.1;
        riskFactors.push('Vague location specification');
    }

    // Cap probability between 0 and 1
    ghostProbability = Math.max(0, Math.min(1, ghostProbability));
    
    // Determine risk level
    let riskLevel;
    if (ghostProbability >= 0.7) {
        riskLevel = 'high';
    } else if (ghostProbability >= 0.4) {
        riskLevel = 'medium';
    } else {
        riskLevel = 'low';
    }

    // Calculate confidence based on available data
    let confidence = 0.5;
    if (title) confidence += 0.2;
    if (company && company !== 'Unknown Company') confidence += 0.15;
    if (description && description.length > 100) confidence += 0.15;
    confidence = Math.min(1, confidence);

    return {
        ghostProbability,
        riskLevel,
        riskFactors,
        keyFactors,
        confidence
    };
}

// Update company statistics (same as in analyze.js)
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