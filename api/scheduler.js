import { QueueManager } from '../lib/queue.js';
import { prisma } from '../lib/db.js';
import { BlobStorage } from '../lib/storage.js';

// Unified Scheduler - Process both ingest and analysis jobs
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🔄 Unified scheduler tick started');
        
        // Get batch size from environment
        const batchSize = parseInt(process.env.QUEUE_BATCH_SIZE) || 10;
        
        // Process both queues in parallel for efficiency
        const [ingestResults, analysisResults] = await Promise.all([
            processIngestQueue(batchSize),
            processAnalysisQueue(batchSize)
        ]);

        // Combine results
        const totalProcessed = ingestResults.processed + analysisResults.processed;
        const totalFailed = ingestResults.failed + analysisResults.failed;
        const totalJobs = ingestResults.total + analysisResults.total;

        // Log unified processing event
        await prisma.event.create({
            data: {
                kind: 'unified_queue_processed',
                meta: {
                    ingest: ingestResults,
                    analysis: analysisResults,
                    totalProcessed,
                    totalFailed,
                    batchSize: totalJobs
                }
            }
        });

        return res.status(200).json({
            message: 'Unified scheduler batch processed',
            ingest: ingestResults,
            analysis: analysisResults,
            summary: {
                totalProcessed,
                totalFailed,
                totalJobs
            }
        });

    } catch (error) {
        console.error('Unified scheduler error:', error);
        return res.status(500).json({
            error: 'Unified scheduler failed',
            details: error.message
        });
    }
}

// Process ingest queue
async function processIngestQueue(batchSize) {
    console.log('📋 Processing ingest queue...');
    
    try {
        const jobs = await QueueManager.popIngestJobs(batchSize);
        
        if (jobs.length === 0) {
            return { processed: 0, failed: 0, total: 0, message: 'No ingest jobs to process' };
        }

        console.log(`📋 Processing ${jobs.length} ingest jobs`);
        
        let processed = 0;
        let failed = 0;
        
        for (const job of jobs) {
            try {
                await processIngestJob(job);
                processed++;
                console.log(`✅ Processed ingest job ${job.id}`);
            } catch (error) {
                console.error(`❌ Failed to process ingest job ${job.id}:`, error);
                failed++;
                
                // Handle retry logic
                if (job.retryCount < (parseInt(process.env.QUEUE_RETRY_ATTEMPTS) || 3)) {
                    await QueueManager.enqueueIngest({
                        ...job,
                        retryCount: job.retryCount + 1
                    });
                    console.log(`🔄 Retrying ingest job ${job.id} (attempt ${job.retryCount + 2})`);
                } else {
                    await QueueManager.moveToDeadLetter(job, error.message);
                    console.log(`💀 Moved ingest job ${job.id} to dead letter queue`);
                }
            }
        }

        return {
            processed,
            failed,
            total: jobs.length,
            message: 'Ingest queue processed'
        };

    } catch (error) {
        console.error('Ingest queue processing error:', error);
        return {
            processed: 0,
            failed: 0,
            total: 0,
            error: error.message
        };
    }
}

// Process analysis queue
async function processAnalysisQueue(batchSize) {
    console.log('📊 Processing analysis queue...');
    
    try {
        const jobs = await QueueManager.popAnalysisJobs(batchSize);
        
        if (jobs.length === 0) {
            return { processed: 0, failed: 0, total: 0, message: 'No analysis jobs to process' };
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
                    await QueueManager.enqueueAnalysis({
                        ...job,
                        retryCount: job.retryCount + 1
                    });
                    console.log(`🔄 Retrying analysis ${job.id} (attempt ${job.retryCount + 2})`);
                } else {
                    await QueueManager.moveToDeadLetter(job, error.message);
                    console.log(`💀 Moved analysis ${job.id} to dead letter queue`);
                }
            }
        }

        // Run agent promotion if enabled (from analysis tick)
        let promotionResults = null;
        if (process.env.AGENT_ENABLED === 'true' && processed > 0) {
            try {
                console.log('🎓 Running agent promotion step');
                promotionResults = await promoteVerifiedAgentCorrections();
            } catch (promotionError) {
                console.error('❌ Agent promotion failed:', promotionError);
                // Don't fail the entire tick for promotion errors
            }
        }

        return {
            processed,
            failed,
            total: jobs.length,
            promotionResults,
            message: 'Analysis queue processed'
        };

    } catch (error) {
        console.error('Analysis queue processing error:', error);
        return {
            processed: 0,
            failed: 0,
            total: 0,
            error: error.message
        };
    }
}

// Process individual ingest job (from ingest/tick.js)
async function processIngestJob(job) {
    const { sourceId, url, blobUrl } = job;
    
    // Get source from database
    const source = await prisma.source.findUnique({
        where: { id: sourceId }
    });
    
    if (!source) {
        throw new Error(`Source ${sourceId} not found`);
    }

    let content = '';
    let mimeType = 'text/html';
    
    if (source.kind === 'url' && url) {
        // Fetch URL content
        console.log(`🌐 Fetching URL: ${url}`);
        
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; GhostJobDetector/1.0)'
                },
                timeout: 30000 // 30 second timeout
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            content = await response.text();
            mimeType = response.headers.get('content-type') || 'text/html';
            
            // Update source with HTTP status
            await prisma.source.update({
                where: { id: sourceId },
                data: { httpStatus: response.status }
            });
            
        } catch (fetchError) {
            console.error(`Failed to fetch ${url}:`, fetchError);
            // Update source with error status
            await prisma.source.update({
                where: { id: sourceId },
                data: { httpStatus: 0 } // Indicates fetch failure
            });
            throw fetchError;
        }
        
    } else if (source.kind === 'pdf' && blobUrl) {
        // Handle PDF processing (placeholder for now)
        console.log(`📄 Processing PDF: ${blobUrl}`);
        content = 'PDF content extraction not yet implemented';
        mimeType = 'application/pdf';
    }

    // Store content in Blob storage
    let storageUrl;
    if (source.kind === 'url') {
        const blob = await BlobStorage.storeHTML(content, url);
        storageUrl = blob.url;
    } else {
        storageUrl = blobUrl; // PDF already stored
    }

    // Create raw document record
    const textSha256 = BlobStorage.generateContentHash(content);
    
    await prisma.rawDocument.create({
        data: {
            sourceId,
            storageUrl,
            mimeType,
            textContent: content.substring(0, 100000), // Limit text content size
            textSha256
        }
    });

    // Parse job listing from content
    const jobListing = await parseJobListing(source, content);
    
    if (jobListing) {
        // Create job listing record
        const listing = await prisma.jobListing.create({
            data: jobListing
        });
        
        // Enqueue for analysis
        await QueueManager.enqueueAnalysis({
            id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            jobListingId: listing.id,
            sourceId,
            modelVersion: process.env.ML_MODEL_VERSION || 'v1.0.0',
            priority: 1
        });
        
        console.log(`📊 Enqueued analysis for job listing ${listing.id}`);
    }
}

// Process individual analysis job (from analysis/tick.js)
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

// Parse job listing from raw content (from ingest/tick.js)
async function parseJobListing(source, content) {
    try {
        // Simple extraction for demo
        const titleMatch = content.match(/<title[^>]*>([^<]+)</i);
        const title = titleMatch ? titleMatch[1].substring(0, 100) : 'Unknown Position';
        
        // Generate normalized key
        const crypto = await import('crypto');
        const normalizedKey = crypto.createHash('sha256')
            .update(`unknown:${title.toLowerCase()}`)
            .digest('hex');
        
        return {
            sourceId: source.id,
            title,
            company: 'Unknown Company', // TODO: Extract from content
            location: null,
            remoteFlag: content.toLowerCase().includes('remote'),
            canonicalUrl: source.url,
            rawParsedJson: {
                extractedAt: new Date().toISOString(),
                method: 'simple_title_extraction',
                confidence: 0.5
            },
            normalizedKey
        };
        
    } catch (error) {
        console.error('Failed to parse job listing:', error);
        return null;
    }
}

// Enhanced ghost job analysis algorithm (from analysis/tick.js)
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

// Update company statistics (from analysis/tick.js)
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

// Promote verified agent corrections to runtime rules (from analysis/tick.js)
async function promoteVerifiedAgentCorrections() {
    try {
        console.log('🔍 Looking for verified agent corrections to promote');
        
        // Find verified agent validation events that haven't been promoted yet
        const pendingPromotions = await prisma.event.findMany({
            where: {
                kind: 'agent_validate',
                AND: [
                    {
                        meta: {
                            path: ['verified'],
                            equals: true
                        }
                    },
                    {
                        meta: {
                            path: ['promotedAt'],
                            equals: null
                        }
                    }
                ]
            },
            take: 200, // Limit batch size
            orderBy: { createdAt: 'asc' }
        });

        console.log(`📋 Found ${pendingPromotions.length} verified corrections ready for promotion`);

        if (pendingPromotions.length === 0) {
            return { promoted: 0, message: 'No verified corrections found' };
        }

        let promoted = 0;
        const rulesDelta = [];

        for (const event of pendingPromotions) {
            try {
                const agentOutput = event.meta;
                const url = agentOutput.url || '';
                
                // Extract domain-specific rules from agent corrections
                if (agentOutput.fields) {
                    const hostname = url ? new URL(url).hostname : '';
                    
                    // Build promotion rules based on agent improvements
                    if (agentOutput.fields.title && agentOutput.fields.title.conf > 0.8) {
                        rulesDelta.push({
                            type: 'title_correction',
                            domain: hostname,
                            pattern: 'agent_verified',
                            correction: agentOutput.fields.title.value,
                            confidence: agentOutput.fields.title.conf,
                            source: 'agent_promotion'
                        });
                    }
                    
                    if (agentOutput.fields.company && agentOutput.fields.company.conf > 0.8) {
                        rulesDelta.push({
                            type: 'company_correction',
                            domain: hostname,
                            pattern: 'agent_verified',
                            correction: agentOutput.fields.company.value,
                            confidence: agentOutput.fields.company.conf,
                            source: 'agent_promotion'
                        });
                    }
                    
                    if (agentOutput.fields.location && agentOutput.fields.location.conf > 0.8) {
                        rulesDelta.push({
                            type: 'location_correction',
                            domain: hostname,
                            pattern: 'agent_verified',
                            correction: agentOutput.fields.location.value,
                            confidence: agentOutput.fields.location.conf,
                            source: 'agent_promotion'
                        });
                    }
                }

                // Mark as promoted
                await prisma.event.update({
                    where: { id: event.id },
                    data: {
                        meta: {
                            ...event.meta,
                            promotedAt: new Date().toISOString(),
                            promotionRulesGenerated: rulesDelta.length
                        }
                    }
                });

                promoted++;
                console.log(`✅ Promoted agent correction from event ${event.id}`);

            } catch (eventError) {
                console.error(`❌ Failed to promote event ${event.id}:`, eventError);
                continue;
            }
        }

        // Save rules dataset (in a real implementation, this would write to a file or table)
        if (rulesDelta.length > 0) {
            console.log(`💾 Generated ${rulesDelta.length} promotion rules`);
            
            // Log the promotion rules for now (in production, save to parser rules dataset)
            await prisma.event.create({
                data: {
                    kind: 'agent_promotion',
                    meta: {
                        rulesGenerated: rulesDelta.length,
                        promotedEvents: promoted,
                        rules: rulesDelta,
                        timestamp: new Date().toISOString()
                    }
                }
            });
        }

        console.log(`🎉 Agent promotion completed: ${promoted} events promoted, ${rulesDelta.length} rules generated`);

        return {
            promoted,
            rulesGenerated: rulesDelta.length,
            rules: rulesDelta
        };

    } catch (error) {
        console.error('💥 Agent promotion error:', error);
        throw error;
    }
}