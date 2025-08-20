import { prisma } from '../lib/db.js';
import { QueueManager } from '../lib/queue.js';
import { BlobStorage } from '../lib/storage.js';
import { CompanyNormalizationService } from '../src/services/CompanyNormalizationService.js';
import crypto from 'crypto';

// Ghost Job Analysis Service for Vercel (Production)
export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { url, title, company, description, location, remoteFlag, postedAt, sourceType = 'url' } = req.body;

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

        // Check for duplicate jobs using intelligent detection
        const normalizationService = CompanyNormalizationService.getInstance();
        const duplicateJob = await detectDuplicateJob({
            url,
            title: title || 'Unknown Position',
            company: company || 'Unknown Company',
            location,
            postedAt,
            description
        }, normalizationService);

        if (duplicateJob) {
            console.log(`🔄 Duplicate job detected! Updating existing job listing ${duplicateJob.id} instead of creating new one`);
            console.log(`   Original: "${duplicateJob.title}" at "${duplicateJob.company}"`);
            console.log(`   New source: ${url}`);
            
            // Track source platforms for this job
            const existingSources = duplicateJob.rawParsedJson?.sources || [];
            const newSourcePlatform = extractSourcePlatform(url);
            
            if (!existingSources.some(s => s.url === url)) {
                existingSources.push({
                    url: url,
                    platform: newSourcePlatform,
                    addedAt: new Date().toISOString(),
                    postedAt: postedAt || null
                });
            }
            
            // Update the existing job listing with new source information
            await prisma.jobListing.update({
                where: { id: duplicateJob.id },
                data: {
                    rawParsedJson: {
                        ...duplicateJob.rawParsedJson,
                        sources: existingSources,
                        duplicateUrls: [
                            ...(duplicateJob.rawParsedJson.duplicateUrls || []),
                            url
                        ],
                        totalPositions: (duplicateJob.rawParsedJson.totalPositions || 1) + 1,
                        lastSeenAt: new Date().toISOString(),
                        // Update posting date if this source is more recent
                        latestPostedAt: postedAt && new Date(postedAt) > new Date(duplicateJob.postedAt || duplicateJob.createdAt) 
                            ? postedAt 
                            : duplicateJob.rawParsedJson.latestPostedAt || duplicateJob.postedAt
                    }
                }
            });

            // Return the existing analysis
            const existingAnalysis = await prisma.analysis.findFirst({
                where: { jobListingId: duplicateJob.id },
                orderBy: { createdAt: 'desc' }
            });

            return res.status(200).json({
                id: existingAnalysis?.id || duplicateJob.id,
                url,
                jobData: {
                    title: duplicateJob.title,
                    company: duplicateJob.company,
                    description: description || '',
                    location: duplicateJob.location,
                    remote: duplicateJob.remoteFlag
                },
                ghostProbability: existingAnalysis ? Number(existingAnalysis.score) : 0,
                riskLevel: existingAnalysis?.verdict || 'uncertain',
                riskFactors: existingAnalysis?.reasonsJson?.riskFactors || [],
                keyFactors: existingAnalysis?.reasonsJson?.keyFactors || [],
                metadata: {
                    storage: 'postgres',
                    version: '2.0',
                    cached: true,
                    duplicate: true,
                    totalPositions: (duplicateJob.rawParsedJson.totalPositions || 1) + 1,
                    sources: existingSources,
                    crossPlatform: existingSources.length > 1,
                    analysisDate: existingAnalysis?.createdAt,
                    
                    // Include detailed analyzer processing data if available
                    algorithmAssessment: existingAnalysis?.algorithmAssessment,
                    riskFactorsAnalysis: existingAnalysis?.riskFactorsAnalysis,
                    recommendation: existingAnalysis?.recommendation,
                    analysisDetails: existingAnalysis?.analysisDetails,
                    processingTimeMs: existingAnalysis?.processingTimeMs,
                    analysisId: existingAnalysis?.analysisId
                }
            });
        }

        // Generate normalized key for job listing (include URL for uniqueness)
        const normalizedKey = crypto.createHash('sha256')
            .update(`${url}:${(company || 'unknown').toLowerCase()}:${(title || 'unknown').toLowerCase()}`)
            .digest('hex');

        // Create job listing with enhanced fields
        const jobListing = await prisma.jobListing.create({
            data: {
                sourceId: source.id,
                title: title || 'Unknown Position',
                company: company || 'Unknown Company',
                location: location || null,
                remoteFlag: remoteFlag !== undefined ? Boolean(remoteFlag) : (description?.toLowerCase().includes('remote') || false),
                postedAt: postedAt ? new Date(postedAt) : null,
                canonicalUrl: url,
                rawParsedJson: {
                    originalTitle: title,
                    originalCompany: company,
                    originalDescription: description,
                    originalLocation: location,
                    originalRemoteFlag: remoteFlag,
                    originalPostedAt: postedAt,
                    extractedAt: new Date().toISOString(),
                    totalPositions: 1, // Initialize with 1 position
                    duplicateUrls: [], // Track duplicate URLs
                    sources: [{ // Initialize sources array
                        url: url,
                        platform: extractSourcePlatform(url),
                        addedAt: new Date().toISOString(),
                        postedAt: postedAt || null
                    }],
                    latestPostedAt: postedAt || new Date().toISOString()
                },
                normalizedKey
            }
        });

        // Perform detailed analysis with processing metadata
        const startTime = Date.now();
        const analysis = analyzeJob({ url, title, company, description, postedAt });
        const processingTime = Date.now() - startTime;
        
        // Generate unique analysis ID
        const analysisId = `cmehk7${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`;

        // Create analysis record with detailed processing data
        const analysisRecord = await prisma.analysis.create({
            data: {
                jobListingId: jobListing.id,
                score: analysis.ghostProbability,
                verdict: analysis.riskLevel === 'high' ? 'likely_ghost' : 
                         analysis.riskLevel === 'low' ? 'likely_real' : 'uncertain',
                reasonsJson: {
                    riskFactors: analysis.riskFactors,
                    keyFactors: analysis.keyFactors,
                    confidence: analysis.confidence
                },
                modelVersion: process.env.ML_MODEL_VERSION || 'v0.1.7',
                processingTimeMs: processingTime,
                
                // Detailed analyzer processing data
                ghostProbability: analysis.ghostProbability,
                modelConfidence: analysis.confidence,
                analysisId: analysisId,
                
                algorithmAssessment: {
                    ghostProbability: Math.round(analysis.ghostProbability * 100),
                    modelConfidence: `${analysis.riskLevel === 'high' ? 'High' : analysis.riskLevel === 'low' ? 'High' : 'Medium'} (${Math.round(analysis.confidence * 100)}%)`,
                    assessmentText: analysis.riskLevel === 'high' 
                        ? 'This job posting shows signs of being a ghost job with multiple red flags.'
                        : analysis.riskLevel === 'low'
                        ? 'This job posting appears legitimate with positive indicators. It\'s likely a real opportunity worth pursuing.'
                        : 'This job posting has mixed indicators. Exercise caution and additional research is recommended.'
                },
                
                riskFactorsAnalysis: {
                    warningSignsCount: analysis.riskFactors.length,
                    warningSignsTotal: analysis.riskFactors.length + analysis.keyFactors.length,
                    riskFactors: analysis.riskFactors.map(factor => ({
                        type: 'warning',
                        description: factor,
                        impact: 'medium'
                    })),
                    positiveIndicators: analysis.keyFactors.map(factor => ({
                        type: 'positive',
                        description: factor,
                        impact: 'low'
                    }))
                },
                
                recommendation: {
                    action: analysis.riskLevel === 'high' ? 'avoid' : 
                           analysis.riskLevel === 'low' ? 'proceed' : 'investigate',
                    message: analysis.riskLevel === 'high'
                        ? 'Consider avoiding this opportunity. Multiple risk factors suggest this may be a ghost job posting.'
                        : analysis.riskLevel === 'low'
                        ? 'This appears to be a legitimate opportunity. Consider applying if it matches your qualifications and career goals.'
                        : 'Exercise caution with this posting. Conduct additional research before applying.',
                    confidence: analysis.riskLevel === 'high' ? 'high' : 
                               analysis.riskLevel === 'low' ? 'high' : 'medium'
                },
                
                analysisDetails: {
                    analysisId: analysisId,
                    modelVersion: process.env.ML_MODEL_VERSION || 'v0.1.7',
                    processingTimeMs: processingTime,
                    analysisDate: new Date().toISOString(),
                    algorithmType: 'rule_based_v1.7',
                    dataSource: 'job_posting_analysis',
                    platform: extractSourcePlatform(url)
                }
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

        // Log event (use Source ID for foreign key relationship)
        await prisma.event.create({
            data: {
                kind: 'analysis_completed',
                refTable: 'job_listings',
                refId: source.id,
                meta: {
                    analysisId: analysisRecord.id,
                    jobListingId: jobListing.id,
                    score: Number(analysis.ghostProbability),
                    verdict: analysisRecord.verdict
                }
            }
        });

        // Return analysis result with detailed processing data
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
                analysisDate: analysisRecord.createdAt,
                
                // Detailed analyzer processing data
                algorithmAssessment: analysisRecord.algorithmAssessment,
                riskFactorsAnalysis: analysisRecord.riskFactorsAnalysis,
                recommendation: analysisRecord.recommendation,
                analysisDetails: analysisRecord.analysisDetails,
                processingTimeMs: processingTime,
                analysisId: analysisId
            }
        });

    } catch (error) {
        console.error('Analysis error:', error);
        
        // Skip error logging to avoid foreign key issues for now
        console.error('Skipping error event logging due to schema constraints');
        
        return res.status(500).json({ 
            error: 'Analysis failed',
            details: error.message 
        });
    }
}

// Update company statistics with intelligent normalization
async function updateCompanyStats(companyName, ghostProbability) {
    try {
        // Clean and validate company name
        if (!companyName || companyName.trim().length === 0) {
            console.warn('Skipping company stats update: empty company name');
            return;
        }

        // Get normalization service instance
        const normalizationService = CompanyNormalizationService.getInstance();
        
        // Use intelligent normalization
        const normalizationResult = normalizationService.normalizeCompanyName(companyName);
        
        console.log(`🧠 Intelligent normalization result:`, {
            original: companyName,
            canonical: normalizationResult.canonical,
            normalized: normalizationResult.normalized,
            confidence: normalizationResult.confidence,
            isLearned: normalizationResult.isLearned
        });

        // Skip generic company names (handled by normalization service)
        if (normalizationResult.canonical === 'Unknown Company') {
            console.warn(`Skipping company stats update for generic name: ${companyName}`);
            return;
        }
        
        // Get or create company using canonical name
        const company = await prisma.company.upsert({
            where: { normalizedName: normalizationResult.normalized },
            update: {},
            create: {
                name: normalizationResult.canonical,
                normalizedName: normalizationResult.normalized
            }
        });

        console.log(`✅ Company upserted: ${company.id} - ${company.name} (canonical: ${normalizationResult.canonical})`);

        // Find all job listings that could belong to this company using intelligent matching
        const allJobListings = await prisma.jobListing.findMany({
            select: { company: true, id: true, title: true, postedAt: true },
            distinct: ['company']
        });
        
        // Find all company variations that should match this canonical company
        const matchingCompanyNames = [];
        
        for (const listing of allJobListings) {
            const listingNormalization = normalizationService.normalizeCompanyName(listing.company);
            if (listingNormalization.canonical === normalizationResult.canonical || 
                listingNormalization.normalized === normalizationResult.normalized) {
                matchingCompanyNames.push(listing.company);
                
                // Learn this variation if it's different from canonical
                if (listing.company !== normalizationResult.canonical) {
                    console.log(`🎓 Learning company variation: "${listing.company}" -> "${normalizationResult.canonical}"`);
                    normalizationService.learnCompanyVariation(
                        normalizationResult.canonical,
                        listing.company,
                        undefined, // no job title for learning context
                        undefined,
                        0.85 // high confidence for company name matching
                    );
                }
            }
        }
        
        console.log(`🔍 Found ${matchingCompanyNames.length} company name variations:`, matchingCompanyNames);
        
        // Get all job listings for any of the matching company names
        let companyListings = [];
        if (matchingCompanyNames.length > 0) {
            companyListings = await prisma.jobListing.findMany({
                where: { 
                    company: { in: matchingCompanyNames }
                },
                include: { analyses: { orderBy: { createdAt: 'desc' }, take: 1 } }
            });
        }

        console.log(`📊 Found ${companyListings.length} job listings for company: ${normalizationResult.canonical}`);

        const totalPostings = companyListings.length;
        
        if (totalPostings === 0) {
            console.warn(`No job listings found for company "${normalizationResult.canonical}" - skipping stats update`);
            return;
        }
        
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

        console.log(`Company stats updated: ${totalPostings} postings, ${avgGhostProbability.toFixed(4)} avg ghost probability`);
    } catch (error) {
        console.error('Failed to update company stats:', error);
        console.error('Company name was:', companyName);
        console.error('Ghost probability was:', ghostProbability);
    }
}

// Enhanced ghost job analysis logic v0.1.7 - Based on updated detection criteria
function analyzeJob({ url, title, company, description, postedAt }) {
    let ghostScore = 0; // Start with 0, accumulate positive scores for ghost indicators
    const riskFactors = [];
    const keyFactors = [];
    
    // Algorithm version and confidence tracking
    const algorithmVersion = 'v0.1.7';
    let confidence = 0.8; // Base confidence level

    // === 1. POSTING RECENCY ANALYSIS ===
    if (postedAt) {
        const postDate = new Date(postedAt);
        const now = new Date();
        const daysSincePosted = Math.floor((now - postDate) / (1000 * 60 * 60 * 24));
        
        if (daysSincePosted > 45) {
            // Jobs older than 45 days are suspicious unless exceptions apply
            const isException = checkExceptionRoles(title, company);
            if (!isException || daysSincePosted > 90) {
                ghostScore += 0.20;
                riskFactors.push(`Posted ${daysSincePosted} days ago (stale posting)`);
            } else if (isException && daysSincePosted > 60) {
                ghostScore += 0.10;
                riskFactors.push(`Posted ${daysSincePosted} days ago (long open for exception role)`);
            }
        } else if (daysSincePosted <= 30) {
            keyFactors.push(`Recently posted (${daysSincePosted} days ago)`);
        }
    }

    // === 2. COMPANY-SITE VERIFICATION ===
    // Note: This is a basic implementation. Full verification would require external API calls
    if (url) {
        const urlLower = url.toLowerCase();
        
        // Check if posted only on job boards vs company sites
        const isJobBoard = urlLower.includes('linkedin.com') || urlLower.includes('indeed.com') || 
                          urlLower.includes('glassdoor.com') || urlLower.includes('monster.com') ||
                          urlLower.includes('ziprecruiter.com');
        
        const isCompanySite = urlLower.includes('careers.') || urlLower.includes('jobs.') ||
                             urlLower.includes('greenhouse.io') || urlLower.includes('lever.co') ||
                             urlLower.includes('workday.com') || urlLower.includes('bamboohr.com');
        
        if (isJobBoard && !isCompanySite) {
            ghostScore += 0.15;
            riskFactors.push('Job board only posting (not on company site)');
        } else if (isCompanySite) {
            keyFactors.push('Posted on company career site/ATS');
        }
    }

    // === 3. LANGUAGE CUES ANALYSIS ===
    if (description) {
        const descLower = description.toLowerCase();
        
        // Ghost-positive language patterns
        if (descLower.includes('always accepting') || descLower.includes('building a pipeline') || 
            descLower.includes('express interest') || descLower.includes('talent pipeline')) {
            ghostScore += 0.25;
            riskFactors.push('Pipeline building language');
        }
        
        // Vague language without specifics
        if (descLower.includes('competitive salary') && !descLower.match(/\$[\d,]+/) && 
            !descLower.match(/\d+k/i)) {
            ghostScore += 0.15;
            riskFactors.push('Vague salary description');
        }
        
        // Generic corporate buzzwords
        const buzzwordCount = (descLower.match(/(fast-paced|dynamic|innovative|cutting-edge|world-class)/g) || []).length;
        if (buzzwordCount >= 2) {
            ghostScore += 0.10;
            riskFactors.push('Excessive corporate buzzwords');
        }
        
        // Very short descriptions lack specifics
        if (description.length < 200) {
            ghostScore += 0.20;
            riskFactors.push('Very short job description');
        }
        
        // Ghost-negative indicators (concrete details)
        if (descLower.match(/deadline|apply by|start date|timeline/) || 
            descLower.match(/\$\d+.*-.*\$\d+|salary.*range|compensation.*\$\d+/)) {
            keyFactors.push('Concrete timeline or compensation details');
        }
        
        // Technical stack/tools mentioned (positive indicator)
        if (descLower.match(/(javascript|python|java|react|angular|sql|aws|kubernetes|docker)/)) {
            keyFactors.push('Specific technical requirements mentioned');
        }
    }

    // === 4. TITLE ANALYSIS ===
    if (title) {
        const titleLower = title.toLowerCase();
        
        // Urgent language (high ghost indicator)
        if (titleLower.includes('urgent') || titleLower.includes('immediate') || 
            titleLower.includes('asap') || titleLower.includes('start immediately')) {
            ghostScore += 0.25;
            riskFactors.push('Urgent hiring language');
        }
        
        // Very long titles often indicate fake positions
        if (title.length > 60) {
            ghostScore += 0.10;
            riskFactors.push('Overly long job title');
        }
        
        // Generic titles
        if (titleLower.match(/^(developer|engineer|analyst|manager|specialist|coordinator)$/)) {
            ghostScore += 0.05;
            riskFactors.push('Very generic job title');
        }
    }

    // === 5. COMPANY ANALYSIS ===
    if (company) {
        const companyLower = company.toLowerCase();
        
        // Staffing/consulting companies often post speculative positions
        if (companyLower.includes('staffing') || companyLower.includes('consulting') ||
            companyLower.includes('solutions') || companyLower.includes('services') ||
            companyLower.includes('group') || companyLower.includes('associates')) {
            ghostScore += 0.15;
            riskFactors.push('Staffing/consulting company posting');
        }
        
        // Generic company names
        if (companyLower.includes('confidential') || companyLower.includes('fortune') ||
            companyLower.includes('leading') || companyLower.includes('major')) {
            ghostScore += 0.20;
            riskFactors.push('Anonymous or generic company name');
        }
    }

    // === 6. POSITIVE ADJUSTMENTS ===
    // Reduce ghost score for positive indicators
    if (keyFactors.length >= 3) {
        ghostScore -= 0.15; // Multiple positive indicators
        keyFactors.push('Multiple positive indicators found');
    }

    // === 7. FINAL SCORING ===
    // Cap probability between 0 and 1
    const ghostProbability = Math.max(0, Math.min(ghostScore, 1.0));
    
    // Determine risk level with updated thresholds
    let riskLevel;
    if (ghostProbability >= 0.6) {        // Lowered from 0.7 to be more sensitive
        riskLevel = 'high';
        confidence = 0.85;
    } else if (ghostProbability >= 0.35) { // Lowered from 0.4 for better granularity
        riskLevel = 'medium';
        confidence = 0.75;
    } else {
        riskLevel = 'low';
        confidence = 0.80;
    }

    return {
        ghostProbability,
        riskLevel,
        riskFactors,
        keyFactors,
        confidence,
        algorithmVersion,
        metadata: {
            totalRiskFactors: riskFactors.length,
            totalKeyFactors: keyFactors.length,
            scoringModel: 'weighted_accumulative_v1.7'
        }
    };
}

// Helper function to check if a role qualifies for extended posting window
function checkExceptionRoles(title, company) {
    if (!title) return false;
    
    const titleLower = title.toLowerCase();
    const companyLower = (company || '').toLowerCase();
    
    // Government roles
    if (companyLower.includes('government') || companyLower.includes('federal') ||
        companyLower.includes('state') || companyLower.includes('county') ||
        companyLower.includes('city') || titleLower.includes('clearance')) {
        return true;
    }
    
    // Academic positions
    if (companyLower.includes('university') || companyLower.includes('college') ||
        companyLower.includes('institute') || titleLower.includes('professor') ||
        titleLower.includes('faculty') || titleLower.includes('researcher')) {
        return true;
    }
    
    // Executive roles
    if (titleLower.includes('director') || titleLower.includes('vp') ||
        titleLower.includes('vice president') || titleLower.includes('cto') ||
        titleLower.includes('ceo') || titleLower.includes('chief')) {
        return true;
    }
    
    return false;
}

// Duplicate job detection algorithm
async function detectDuplicateJob(newJob, normalizationService) {
    try {
        console.log(`🔍 Checking for duplicates of job: "${newJob.title}" at "${newJob.company}"`);
        
        // Normalize the company name
        const companyNormalization = normalizationService.normalizeCompanyName(newJob.company);
        
        // Find all job listings from the same canonical company
        const allJobListings = await prisma.jobListing.findMany({
            select: { 
                id: true, 
                title: true, 
                company: true, 
                location: true,
                postedAt: true,
                rawParsedJson: true,
                createdAt: true
            }
        });

        // Filter to potentially matching companies
        const candidateJobs = [];
        for (const job of allJobListings) {
            const jobCompanyNormalization = normalizationService.normalizeCompanyName(job.company);
            if (jobCompanyNormalization.canonical === companyNormalization.canonical) {
                candidateJobs.push(job);
            }
        }

        console.log(`📋 Found ${candidateJobs.length} jobs from same company group for duplicate checking`);

        // Check each candidate for similarity
        for (const candidateJob of candidateJobs) {
            const similarityScore = calculateJobSimilarity(newJob, candidateJob, normalizationService);
            
            console.log(`🎯 Similarity score for "${candidateJob.title}": ${similarityScore.toFixed(3)}`);
            
            // Use different thresholds based on similarity type
            const isExactMatch = isExactJobMatch(newJob, candidateJob, normalizationService);
            const threshold = isExactMatch ? 0.6 : 0.8; // Much lower threshold for exact matches
            
            if (similarityScore > threshold) {
                console.log(`✅ Found duplicate job! Score: ${similarityScore.toFixed(3)} (threshold: ${threshold}, exact match: ${isExactMatch})`);
                return candidateJob;
            }
        }

        console.log(`🆕 No duplicates found, this is a new job listing`);
        return null;
    } catch (error) {
        console.error('Error in duplicate detection:', error);
        return null; // Continue with job creation if duplicate detection fails
    }
}

// Calculate similarity between two job listings
function calculateJobSimilarity(job1, job2, normalizationService) {
    let totalScore = 0;
    let weightSum = 0;

    // Title similarity (40% weight)
    const titleSimilarity = normalizationService.calculateStringSimilarity(
        job1.title.toLowerCase(),
        job2.title.toLowerCase()
    );
    totalScore += titleSimilarity * 0.4;
    weightSum += 0.4;

    // Company similarity (30% weight) - should be high since we pre-filtered
    const companyNorm1 = normalizationService.normalizeCompanyName(job1.company);
    const companyNorm2 = normalizationService.normalizeCompanyName(job2.company);
    const companySimilarity = companyNorm1.canonical === companyNorm2.canonical ? 1.0 : 0.0;
    totalScore += companySimilarity * 0.3;
    weightSum += 0.3;

    // Location similarity (15% weight)
    if (job1.location && job2.location) {
        const locationSimilarity = normalizationService.calculateStringSimilarity(
            job1.location.toLowerCase(),
            job2.location.toLowerCase()
        );
        totalScore += locationSimilarity * 0.15;
        weightSum += 0.15;
    } else if (!job1.location && !job2.location) {
        // Both have no location - consider similar
        totalScore += 1.0 * 0.15;
        weightSum += 0.15;
    }

    // Posting date proximity (15% weight)
    if (job1.postedAt && job2.postedAt) {
        const date1 = new Date(job1.postedAt);
        const date2 = new Date(job2.postedAt);
        const daysDiff = Math.abs(date1 - date2) / (1000 * 60 * 60 * 24);
        
        // Jobs posted within 7 days are considered similar for this factor
        const dateSimilarity = Math.max(0, 1 - (daysDiff / 7));
        totalScore += dateSimilarity * 0.15;
        weightSum += 0.15;
    } else if (job2.createdAt) {
        // Compare new job posting time with existing job creation time
        const date1 = new Date();
        const date2 = new Date(job2.createdAt);
        const daysDiff = Math.abs(date1 - date2) / (1000 * 60 * 60 * 24);
        
        const dateSimilarity = Math.max(0, 1 - (daysDiff / 14)); // 14 day window
        totalScore += dateSimilarity * 0.15;
        weightSum += 0.15;
    }

    return weightSum > 0 ? totalScore / weightSum : 0;
}

// Check if two jobs are exactly the same (title + company)
function isExactJobMatch(job1, job2, normalizationService) {
    // Normalize titles for comparison (remove special chars, extra spaces, etc.)
    const normalizedTitle1 = normalizeJobTitle(job1.title);
    const normalizedTitle2 = normalizeJobTitle(job2.title);
    
    // Normalize companies using the service
    const companyNorm1 = normalizationService.normalizeCompanyName(job1.company);
    const companyNorm2 = normalizationService.normalizeCompanyName(job2.company);
    
    // Exact match: same normalized title AND same canonical company
    const titleMatch = normalizedTitle1 === normalizedTitle2;
    const companyMatch = companyNorm1.canonical === companyNorm2.canonical;
    
    if (titleMatch && companyMatch) {
        console.log(`🎯 EXACT MATCH detected: "${job1.title}" at "${job1.company}"`);
        console.log(`   Normalized titles: "${normalizedTitle1}" === "${normalizedTitle2}"`);
        console.log(`   Canonical companies: "${companyNorm1.canonical}" === "${companyNorm2.canonical}"`);
        return true;
    }
    
    return false;
}

// Normalize job title for exact matching
function normalizeJobTitle(title) {
    return title
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ')    // Normalize whitespace
        .trim();
}

// Extract platform name from URL
function extractSourcePlatform(url) {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        
        if (hostname.includes('linkedin.com')) return 'LinkedIn';
        if (hostname.includes('indeed.com')) return 'Indeed';
        if (hostname.includes('glassdoor.com')) return 'Glassdoor';
        if (hostname.includes('monster.com')) return 'Monster';
        if (hostname.includes('ziprecruiter.com')) return 'ZipRecruiter';
        if (hostname.includes('greenhouse.io')) return 'Greenhouse';
        if (hostname.includes('lever.co')) return 'Lever';
        if (hostname.includes('careers.') || hostname.includes('jobs.')) return 'Company Career Site';
        
        // Extract company domain for career sites
        const domainParts = hostname.split('.');
        if (domainParts.length >= 2) {
            const mainDomain = domainParts[domainParts.length - 2];
            return `${mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1)} Career Site`;
        }
        
        return 'Other';
    } catch (error) {
        return 'Unknown';
    }
}