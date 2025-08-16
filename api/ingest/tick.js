import { QueueManager } from '../../lib/queue.js';
import { prisma } from '../../lib/db.js';
import { BlobStorage } from '../../lib/storage.js';

// Ingest Worker - Process URL/PDF sources
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🔄 Ingest worker tick started');
        
        // Get batch size from environment
        const batchSize = parseInt(process.env.QUEUE_BATCH_SIZE) || 10;
        
        // Pop jobs from ingest queue
        const jobs = await QueueManager.popIngestJobs(batchSize);
        
        if (jobs.length === 0) {
            return res.status(200).json({ 
                message: 'No jobs to process',
                processed: 0 
            });
        }

        console.log(`📋 Processing ${jobs.length} ingest jobs`);
        
        let processed = 0;
        let failed = 0;
        
        for (const job of jobs) {
            try {
                await processIngestJob(job);
                processed++;
                console.log(`✅ Processed job ${job.id}`);
            } catch (error) {
                console.error(`❌ Failed to process job ${job.id}:`, error);
                failed++;
                
                // Handle retry logic
                if (job.retryCount < (parseInt(process.env.QUEUE_RETRY_ATTEMPTS) || 3)) {
                    // Retry the job
                    await QueueManager.enqueueIngest({
                        ...job,
                        retryCount: job.retryCount + 1
                    });
                    console.log(`🔄 Retrying job ${job.id} (attempt ${job.retryCount + 2})`);
                } else {
                    // Move to dead letter queue
                    await QueueManager.moveToDeadLetter(job, error.message);
                    console.log(`💀 Moved job ${job.id} to dead letter queue`);
                }
            }
        }

        // Log processing event
        await prisma.event.create({
            data: {
                kind: 'queue_processed',
                meta: {
                    queue: 'ingest',
                    processed,
                    failed,
                    batchSize: jobs.length
                }
            }
        });

        return res.status(200).json({
            message: 'Ingest batch processed',
            processed,
            failed,
            total: jobs.length
        });

    } catch (error) {
        console.error('Ingest worker error:', error);
        return res.status(500).json({
            error: 'Ingest worker failed',
            details: error.message
        });
    }
}

// Process individual ingest job
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

// Parse job listing from raw content
async function parseJobListing(source, content) {
    // Placeholder parsing logic
    // In production, this would use the parsing system from the PRD
    
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