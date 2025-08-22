/**
 * Parse Preview and Learning API Endpoint
 * 
 * Modes:
 * - preview (default): URL parsing preview with confidence scores before full analysis
 * - learning: Real-time learning from parsing failures (consolidated from /api/learning/ingest-failure)
 * 
 * Usage:
 * - POST /api/parse-preview (or ?mode=preview) - Standard parsing preview
 * - POST /api/parse-preview?mode=learning - Process parsing failures for learning improvements
 * 
 * Following Implementation Guide specifications
 */
import { WebLLMParsingService } from '../src/services/WebLLMParsingService.js';
import { CrossValidationService } from '../src/services/CrossValidationService.js';
import { EnhancedDuplicateDetection } from '../src/services/EnhancedDuplicateDetection.js';
import { ParsingAttemptsTracker } from '../src/services/ParsingAttemptsTracker.js';
import { ParsingErrorHandler } from '../src/utils/errorHandling.js';
import { ParsingLearningService } from '../src/services/parsing/ParsingLearningService.js';
import { prisma } from '../lib/db.js';
import { securityValidator } from '../lib/security.js';

export default async function handler(req, res) {
    const startTime = Date.now();
    let clientIP = null;
    
    // Security headers
    const securityHeaders = securityValidator.getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
    });
    
    // Handle both parse-preview (POST) and learning/ingest-failure (POST) modes
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Determine mode based on request body or query parameter
    const mode = req.query.mode || (req.body?.failedResult ? 'learning' : 'preview');

    try {
        // Get client IP for logging and rate limiting
        clientIP = req.headers['x-forwarded-for'] || 
                  req.connection.remoteAddress || 
                  req.socket.remoteAddress ||
                  (req.connection.socket ? req.connection.socket.remoteAddress : null);

        // Handle learning/ingest-failure mode
        if (mode === 'learning') {
            return await handleLearningMode(req, res, clientIP, startTime);
        }

        // Check rate limiting for parsing endpoints
        const parseRateLimit = securityValidator.checkRateLimit(clientIP, 'parsing');
        if (!parseRateLimit.allowed) {
            return res.status(429).json({
                error: 'Parsing rate limit exceeded',
                message: 'Maximum 50 parsing previews per hour. Please try again later.',
                retryAfter: parseRateLimit.retryAfter
            });
        }

        // Validate and sanitize input using security validator
        let validatedInput;
        try {
            validatedInput = securityValidator.validateParsingRequest(req.body);
        } catch (error) {
            securityValidator.logSecurityEvent('invalid_parsing_input', {
                ip: clientIP,
                input: req.body,
                error: error.message
            });
            
            return res.status(400).json({ 
                error: 'Invalid input', 
                message: error.message 
            });
        }

        const { url } = validatedInput;

        console.log(`🔍 Parse preview request for: ${url}`);

        // Check feature flags
        const isAutoParsingEnabled = process.env.ENABLE_AUTO_PARSING !== 'false';
        const isCrossValidationEnabled = process.env.ENABLE_CROSS_VALIDATION !== 'false';
        const isDuplicateDetectionEnabled = process.env.ENABLE_DUPLICATE_DETECTION !== 'false';
        
        if (!isAutoParsingEnabled) {
            return res.status(200).json({
                url,
                extractedData: null,
                confidence: 0,
                extractionMethod: 'manual',
                validationResult: null,
                duplicateCheck: null,
                processingTimeMs: Date.now() - startTime,
                message: 'Auto-parsing is disabled. Please use manual entry.',
                recommendedAction: 'manual_entry'
            });
        }

        // Initialize services
        const parsingService = new WebLLMParsingService();
        const validationService = isCrossValidationEnabled ? new CrossValidationService() : null;
        const duplicateDetector = isDuplicateDetectionEnabled ? new EnhancedDuplicateDetection() : null;
        const tracker = new ParsingAttemptsTracker();

        // Extract job data using WebLLM
        let parsingResult;
        try {
            parsingResult = await parsingService.extractJob(url);
        } catch (error) {
            // Use enhanced error handling
            ParsingErrorHandler.logError(error, 'webllm_extraction', { url, clientIP });
            
            // Log the failure
            try {
                await tracker.logParsingFailure(
                    url,
                    error.message || 'WebLLM extraction failed',
                    Date.now() - startTime,
                    'webllm_preview',
                    req.headers['user-agent'],
                    clientIP
                );
            } catch (logError) {
                console.warn('Failed to log parsing failure:', logError);
            }

            const errorResponse = ParsingErrorHandler.generateErrorResponse(error, 'webllm_extraction');
            const statusCode = ParsingErrorHandler.getHttpStatusCode(error);

            return res.status(statusCode).json({
                url,
                extractedData: null,
                confidence: 0,
                extractionMethod: 'fallback',
                validationResult: null,
                duplicateCheck: null,
                processingTimeMs: Date.now() - startTime,
                message: errorResponse.message,
                recommendedAction: errorResponse.retryable ? 'user_confirm' : 'manual_entry',
                ...errorResponse
            });
        }

        // Perform cross-validation if extraction was successful and enabled
        let validationResult = null;
        if (parsingResult.success && parsingResult.data && validationService) {
            try {
                validationResult = await validationService.validateJobData(parsingResult.data, url);
            } catch (error) {
                console.warn('Cross-validation failed:', error);
                // Continue without validation data
            }
        }

        // Check for duplicates if enabled
        let duplicateCheck = null;
        if (parsingResult.success && parsingResult.data && duplicateDetector) {
            try {
                // Get existing jobs for duplicate checking
                const existingJobs = await prisma.jobListing.findMany({
                    where: {
                        OR: [
                            { company: { contains: parsingResult.data.company || '', mode: 'insensitive' } },
                            { title: { contains: parsingResult.data.title || '', mode: 'insensitive' } }
                        ]
                    },
                    select: {
                        id: true,
                        title: true,
                        company: true,
                        location: true,
                        canonicalUrl: true,
                        rawParsedJson: true,
                        postedAt: true,
                        createdAt: true
                    },
                    take: 100 // Limit to prevent performance issues
                });

                // Convert to format expected by duplicate detector
                const formattedExistingJobs = existingJobs.map(job => ({
                    id: job.id,
                    title: job.title,
                    company: job.company,
                    location: job.location,
                    description: job.rawParsedJson?.originalDescription || '',
                    canonicalUrl: job.canonicalUrl || '',
                    contentHashes: duplicateDetector.generateContentHashes({
                        title: job.title,
                        company: job.company,
                        location: job.location,
                        description: job.rawParsedJson?.originalDescription || '',
                        originalSource: job.canonicalUrl || '',
                        salary: null,
                        jobType: null,
                        postedAt: job.postedAt?.toISOString() || null,
                        jobId: null,
                        contactDetails: null
                    }),
                    postedAt: job.postedAt,
                    createdAt: job.createdAt
                }));

                duplicateCheck = await duplicateDetector.checkForDuplicates(
                    parsingResult.data, 
                    formattedExistingJobs
                );
            } catch (error) {
                console.warn('Duplicate detection failed:', error);
                // Continue without duplicate check data
            }
        }

        // Determine recommended action based on results
        let recommendedAction = 'manual_entry';
        let message = 'Please review and confirm the extracted information';

        if (parsingResult.success && parsingResult.confidence > 0.8) {
            if (duplicateCheck?.isDuplicate) {
                recommendedAction = 'duplicate_found';
                message = 'Similar job posting found. Review for potential duplicate.';
            } else {
                recommendedAction = 'auto_proceed';
                message = 'High confidence extraction. Ready for automatic processing.';
            }
        } else if (parsingResult.success && parsingResult.confidence > 0.5) {
            recommendedAction = 'user_confirm';
            message = 'Moderate confidence extraction. Please review and confirm.';
        } else {
            recommendedAction = 'manual_entry';
            message = 'Low confidence extraction. Manual entry recommended.';
        }

        // Log the successful preview attempt
        if (parsingResult.success) {
            try {
                await tracker.logParsingAttempt(
                    url,
                    parsingResult,
                    validationResult,
                    req.headers['user-agent'],
                    clientIP
                );
            } catch (error) {
                console.warn('Failed to log parsing attempt:', error);
                // Continue anyway
            }
        }

        const processingTime = Date.now() - startTime;
        
        // Return preview result
        return res.status(200).json({
            url,
            extractedData: parsingResult.data,
            confidence: parsingResult.confidence,
            extractionMethod: parsingResult.extractionMethod,
            validationResult: validationResult ? {
                overallConfidence: validationResult.overallConfidence,
                companyValidation: {
                    isValid: validationResult.companyValidation.isValid,
                    confidence: validationResult.companyValidation.confidence,
                    legitimacyScore: validationResult.companyValidation.legitimacyScore
                },
                titleValidation: {
                    isValid: validationResult.titleValidation.isValid,
                    confidence: validationResult.titleValidation.confidence,
                    industryMatch: validationResult.titleValidation.industryMatch
                },
                issues: validationResult.issues,
                recommendations: validationResult.recommendations
            } : null,
            duplicateCheck: duplicateCheck ? {
                isDuplicate: duplicateCheck.isDuplicate,
                matchingScore: duplicateCheck.matchingScore,
                matchingFactors: duplicateCheck.matchingFactors,
                matchedJobId: duplicateCheck.matchedJobId,
                recommendedAction: duplicateCheck.recommendedAction
            } : null,
            processingTimeMs: processingTime,
            message,
            recommendedAction,
            metadata: {
                parsingEnabled: isAutoParsingEnabled,
                platform: extractPlatform(url),
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        // Use enhanced error handling for main catch block
        ParsingErrorHandler.logError(error, 'api_error', { 
            url: req.body?.url || 'unknown', 
            clientIP,
            userAgent: req.headers['user-agent']
        });
        
        // Log the error
        try {
            const tracker = new ParsingAttemptsTracker();
            await tracker.logParsingFailure(
                req.body?.url || 'unknown',
                error.message || 'Unknown error',
                Date.now() - startTime,
                'preview_error',
                req.headers['user-agent'],
                clientIP
            );
        } catch (logError) {
            console.error('Failed to log preview error:', logError);
        }
        
        const errorResponse = ParsingErrorHandler.generateErrorResponse(error, 'api_error');
        const statusCode = ParsingErrorHandler.getHttpStatusCode(error);
        
        return res.status(statusCode).json({
            ...errorResponse,
            processingTimeMs: Date.now() - startTime
        });
    }
}

// Helper function to extract platform name from URL
function extractPlatform(url) {
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
        
        return 'Other';
    } catch (error) {
        return 'Unknown';
    }
}

// Handle learning/ingest-failure mode (consolidated from /api/learning/ingest-failure)
async function handleLearningMode(req, res, clientIP, startTime) {
    try {
        const { url, html, failedResult, userAgent } = req.body;

        if (!url || !failedResult) {
            return res.status(400).json({ error: 'Missing required fields: url, failedResult' });
        }

        console.log(`📥 Ingesting parsing failure for: ${url}`);

        const learningService = ParsingLearningService.getInstance();
        
        // Trigger real-time learning from the failed parse
        const improvements = await learningService.learnFromFailedParse(
            url,
            html || '',
            {
                title: failedResult.title,
                company: failedResult.company,
                location: failedResult.location
            }
        );

        console.log(`🎓 Learning completed:`, improvements);

        // Return the improvements to be applied immediately
        return res.status(200).json({
            success: true,
            improvements: improvements.improvements,
            learnedData: {
                title: improvements.title || failedResult.title,
                company: improvements.company || failedResult.company,
                location: improvements.location || failedResult.location
            },
            metadata: {
                improvementsCount: improvements.improvements.length,
                hasImprovements: improvements.improvements.length > 0,
                userAgent,
                timestamp: new Date().toISOString(),
                processingTimeMs: Date.now() - startTime
            }
        });

    } catch (error) {
        console.error('Failed to process parsing failure:', error);
        return res.status(500).json({ 
            error: 'Failed to process parsing failure',
            details: error.message,
            processingTimeMs: Date.now() - startTime
        });
    }
}