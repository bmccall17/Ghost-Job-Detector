/**
 * URL Validation Service - Direct ES Module Implementation
 * Validates URL accessibility, checks for job-related indicators, and handles authentication requirements
 */

class URLValidationService {
    constructor(config = {}) {
        this.config = {
            timeouts: {
                urlValidation: 8000,
                ...config.timeouts
            },
            thresholds: {
                minContentConfidence: 0.7,
                minParsingQuality: 0.6,
                minJobRelevanceScore: 0.8,
                ...config.thresholds
            },
            ...config
        };
        this.cache = new Map();
        this.CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Validate URL accessibility and job-related indicators
     */
    async validateURL(url) {
        const startTime = Date.now();

        try {
            // Check cache first
            const cached = this.getCachedResult(url);
            if (cached) {
                return cached;
            }

            console.log(`🔍 Tier 1: Validating URL accessibility for ${url}`);

            // Basic URL format validation
            const formatValidation = this.validateURLFormat(url);
            if (!formatValidation.isValid) {
                return this.createErrorResult(url, formatValidation.errors, startTime);
            }

            const normalizedUrl = this.normalizeURL(url);
            
            // Perform HTTP validation with timeout
            const httpValidation = await this.validateHTTPAccessibility(normalizedUrl);
            
            if (!httpValidation.isValid) {
                return this.createErrorResult(url, httpValidation.errors, startTime, httpValidation.analysis);
            }

            // Analyze content accessibility and job indicators
            const analysis = httpValidation.analysis;
            const jobIndicators = this.analyzeJobIndicators(analysis);
            
            // Check if URL appears to be a non-job posting and block if so
            if (!jobIndicators.hasJobIndicators) {
                const highImpactWarnings = jobIndicators.warnings.filter(w => w.impact === 'high');
                if (highImpactWarnings.length > 0) {
                    return this.createErrorResult(analysis.url, [{
                        code: 'URL_NOT_JOB_POSTING',
                        message: `URL does not appear to be a job posting: ${highImpactWarnings[0].message}`,
                        severity: 'blocking',
                        category: 'url',
                        userMessage: 'This URL does not appear to link to a specific job posting.',
                        suggestion: 'Please provide a direct link to a job posting rather than a company homepage or general career page.',
                        retryable: false
                    }], startTime, analysis);
                }
            }
            
            const result = {
                isValid: true,
                confidence: this.calculateURLConfidence(analysis, jobIndicators),
                data: {
                    ...analysis,
                    hasJobIndicators: jobIndicators.hasJobIndicators
                },
                errors: [],
                warnings: jobIndicators.warnings,
                metadata: {
                    tier: 1,
                    processingTimeMs: Date.now() - startTime,
                    validatedAt: new Date().toISOString(),
                    validationMethod: 'http_analysis',
                    source: 'URLValidationService'
                }
            };

            // Cache successful result
            this.cacheResult(url, result);
            
            console.log(`✅ Tier 1: URL validation completed with ${(result.confidence * 100).toFixed(1)}% confidence`);
            return result;

        } catch (error) {
            console.error(`❌ Tier 1: URL validation failed for ${url}:`, error);
            
            return this.createErrorResult(url, [{
                code: 'SYSTEM_ERROR',
                message: `URL validation system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                severity: 'blocking',
                category: 'system',
                userMessage: 'Unable to validate URL due to a system error. Please try again.',
                suggestion: 'Check your internet connection and try again in a few moments.',
                retryable: true
            }], startTime);
        }
    }

    /**
     * Validate basic URL format
     */
    validateURLFormat(url) {
        const errors = [];

        if (!url || typeof url !== 'string') {
            errors.push({
                code: 'URL_INVALID_FORMAT',
                message: 'URL is empty or not a string',
                severity: 'blocking',
                category: 'url',
                userMessage: 'Please provide a valid job posting URL.',
                suggestion: 'Enter a complete URL starting with http:// or https://',
                retryable: false
            });
            return { isValid: false, errors };
        }

        try {
            const parsedUrl = new URL(url);
            
            // Check protocol
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                errors.push({
                    code: 'URL_INVALID_FORMAT',
                    message: `Invalid protocol: ${parsedUrl.protocol}`,
                    severity: 'blocking',
                    category: 'url',
                    userMessage: 'Only HTTP and HTTPS URLs are supported.',
                    suggestion: 'Make sure your URL starts with http:// or https://',
                    retryable: false
                });
            }

            // Check for localhost or internal IPs (security)
            if (parsedUrl.hostname === 'localhost' || 
                parsedUrl.hostname.startsWith('127.') ||
                parsedUrl.hostname.startsWith('192.168.') ||
                parsedUrl.hostname.startsWith('10.') ||
                parsedUrl.hostname.match(/^172\.(1[6-9]|2\d|3[01])\./)) {
                errors.push({
                    code: 'URL_INVALID_FORMAT',
                    message: 'Local or internal URLs are not allowed',
                    severity: 'blocking',
                    category: 'url',
                    userMessage: 'Local or internal network URLs cannot be analyzed.',
                    suggestion: 'Please provide a public job posting URL.',
                    retryable: false
                });
            }

        } catch (urlError) {
            errors.push({
                code: 'URL_INVALID_FORMAT',
                message: `Invalid URL format: ${urlError instanceof Error ? urlError.message : 'Parse error'}`,
                severity: 'blocking',
                category: 'url',
                userMessage: 'The provided URL format is invalid.',
                suggestion: 'Double-check the URL and ensure it\'s complete (e.g., https://company.com/jobs/123)',
                retryable: false
            });
        }

        return { isValid: errors.length === 0, errors };
    }

    /**
     * Validate HTTP accessibility
     */
    async validateHTTPAccessibility(url) {
        const errors = [];

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeouts.urlValidation);

            const startTime = Date.now();
            const response = await fetch(url, {
                method: 'HEAD',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; GhostJobDetector/2.0; +https://ghostjobdetector.com/bot)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'DNT': '1',
                    'Upgrade-Insecure-Requests': '1'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;

            const analysis = {
                url,
                normalizedUrl: url,
                domain: new URL(url).hostname,
                platform: this.detectPlatform(url),
                isAccessible: response.ok,
                responseTime,
                httpStatus: response.status,
                contentType: response.headers.get('content-type') || 'unknown',
                finalUrl: response.url,
                requiresAuth: this.detectAuthRequired(response),
                isExpired: this.detectExpiredContent(response),
                lastModified: response.headers.get('last-modified') || undefined,
                hasJobIndicators: false // Will be set by analyzeJobIndicators
            };

            // Handle different HTTP status codes
            if (!response.ok) {
                if (response.status === 404) {
                    errors.push({
                        code: 'URL_NOT_FOUND',
                        message: 'URL not found (404)',
                        severity: 'blocking',
                        category: 'url',
                        userMessage: 'The job posting URL was not found.',
                        suggestion: 'Check if the job posting has been removed or if the URL is correct.',
                        retryable: false
                    });
                } else if (response.status === 403) {
                    errors.push({
                        code: 'URL_REQUIRES_AUTH',
                        message: 'Access forbidden (403)',
                        severity: 'degraded',
                        category: 'url',
                        userMessage: 'This job posting requires authentication to access.',
                        suggestion: 'Try accessing the URL directly in your browser first, then return here.',
                        retryable: true
                    });
                } else if (response.status >= 500) {
                    errors.push({
                        code: 'URL_SERVER_ERROR',
                        message: `Server error (${response.status})`,
                        severity: 'degraded',
                        category: 'url',
                        userMessage: 'The job posting website is experiencing technical difficulties.',
                        suggestion: 'Try again in a few minutes, or check if the website is accessible in your browser.',
                        retryable: true
                    });
                } else {
                    errors.push({
                        code: 'URL_NOT_ACCESSIBLE',
                        message: `HTTP error ${response.status}: ${response.statusText}`,
                        severity: 'blocking',
                        category: 'url',
                        userMessage: 'Unable to access the job posting URL.',
                        suggestion: 'Verify the URL is correct and try again.',
                        retryable: true
                    });
                }
            }

            return { isValid: response.ok, errors, analysis };

        } catch (fetchError) {
            if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                errors.push({
                    code: 'URL_TIMEOUT',
                    message: `Request timeout after ${this.config.timeouts.urlValidation}ms`,
                    severity: 'degraded',
                    category: 'url',
                    userMessage: 'The job posting URL is taking too long to respond.',
                    suggestion: 'Check your internet connection or try a different URL.',
                    retryable: true
                });
            } else {
                errors.push({
                    code: 'URL_NOT_ACCESSIBLE',
                    message: `Network error: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
                    severity: 'blocking',
                    category: 'url',
                    userMessage: 'Unable to connect to the job posting website.',
                    suggestion: 'Check your internet connection and verify the URL is correct.',
                    retryable: true
                });
            }

            return { isValid: false, errors };
        }
    }

    /**
     * Analyze job-related indicators in URL and response with enhanced detection
     */
    analyzeJobIndicators(analysis) {
        const warnings = [];
        let jobIndicatorScore = 0;
        const urlPath = new URL(analysis.url).pathname.toLowerCase();
        const urlParams = new URL(analysis.url).searchParams;
        const domain = analysis.domain.toLowerCase();

        // Enhanced URL pattern analysis
        const jobPathPatterns = [
            /\/jobs?\/\d+/,                    // /job/123, /jobs/456
            /\/jobs?\/view/,                   // /jobs/view/
            /\/jobs?\/apply/,                  // /jobs/apply/
            /\/careers?\/\d+/,                 // /career/123
            /\/positions?\/\d+/,               // /position/123
            /\/openings?\/\d+/,                // /opening/123
            /\/vacancy\/\d+/,                  // /vacancy/123
            /\/job-listing/,                   // /job-listing/
            /\/job-details/,                   // /job-details/
            /\/apply-now/,                     // /apply-now/
            /\/viewjob\?/,                     // Indeed style
            /\/job\/[a-zA-Z0-9-]+/,           // /job/software-engineer-abc123
            /\/jobs\/collections?/             // LinkedIn collections
        ];

        const hasJobPattern = jobPathPatterns.some(pattern => pattern.test(urlPath));
        if (hasJobPattern) {
            jobIndicatorScore += 0.6;
        }

        // URL parameter analysis  
        const jobParams = ['jobId', 'job_id', 'position_id', 'posting_id', 'req_id', 'vacancy_id'];
        const hasJobParams = jobParams.some(param => urlParams.has(param));
        if (hasJobParams) {
            jobIndicatorScore += 0.4;
        }

        // Basic keyword analysis (reduced weight)
        const jobKeywords = ['job', 'career', 'employment', 'position', 'opening', 'vacancy', 'hiring', 'apply', 'roles'];
        const foundKeywords = jobKeywords.filter(keyword => urlPath.includes(keyword));
        if (foundKeywords.length > 0) {
            jobIndicatorScore += 0.2; // Reduced from 0.4
        }

        // Platform-specific scoring
        const platformScoring = this.getPlatformJobScore(domain, urlPath);
        jobIndicatorScore += platformScoring.score;
        warnings.push(...platformScoring.warnings);

        // Anti-patterns that indicate NOT a job posting
        const antiPatterns = [
            { pattern: /\/(about|company|home|contact|blog|news|products|services)\/?$/, penalty: -0.8, message: 'Company page detected' },
            { pattern: /\/(careers?|jobs?)\/?$/, penalty: -0.5, message: 'General career page (not specific job)' }, 
            { pattern: /\/(login|signup|register)/, penalty: -0.6, message: 'Authentication page detected' },
            { pattern: /\.(pdf|doc|docx)$/, penalty: -0.3, message: 'Document URL detected' },
            { pattern: /^\/\s*$/, penalty: -0.7, message: 'Root/homepage URL detected' }
        ];

        for (const antiPattern of antiPatterns) {
            if (antiPattern.pattern.test(urlPath)) {
                jobIndicatorScore += antiPattern.penalty;
                warnings.push({
                    code: 'URL_ANTI_PATTERN_DETECTED',
                    message: antiPattern.message,
                    impact: 'high',
                    userMessage: 'This appears to be a company page rather than a specific job posting.'
                });
            }
        }

        const hasJobIndicators = jobIndicatorScore >= 0.4;

        if (!hasJobIndicators) {
            warnings.push({
                code: 'URL_LOW_JOB_RELEVANCE',
                message: `Low job relevance score: ${jobIndicatorScore.toFixed(2)}`,
                impact: 'high',
                userMessage: 'This URL does not appear to be a direct link to a job posting.'
            });
        }

        return { hasJobIndicators, warnings };
    }

    /**
     * Get platform-specific job scoring
     */
    getPlatformJobScore(domain, urlPath) {
        const warnings = [];
        
        // LinkedIn specific patterns
        if (domain.includes('linkedin')) {
            if (/\/jobs\/view\/\d+/.test(urlPath)) return { score: 0.8, warnings };
            if (/\/jobs\/collections/.test(urlPath)) return { score: 0.7, warnings };
            if (urlPath === '/jobs' || urlPath === '/jobs/') {
                warnings.push({ code: 'LINKEDIN_GENERAL_JOBS', message: 'LinkedIn general jobs page', impact: 'high', userMessage: 'This is LinkedIn\'s general jobs page, not a specific job posting.' });
                return { score: -0.6, warnings };
            }
            return { score: 0.5, warnings };
        }
        
        // Indeed specific patterns
        if (domain.includes('indeed')) {
            if (/\/viewjob\?/.test(urlPath)) return { score: 0.8, warnings };
            if (urlPath === '/' || urlPath === '/jobs') {
                warnings.push({ code: 'INDEED_GENERAL_PAGE', message: 'Indeed homepage or general jobs page', impact: 'high', userMessage: 'This is Indeed\'s general page, not a specific job posting.' });
                return { score: -0.7, warnings };
            }
            return { score: 0.4, warnings };
        }
        
        // Workday patterns
        if (domain.includes('workday') || domain.includes('myworkdayjobs')) {
            if (/\/job\/\d+/.test(urlPath) || /\/job\/[A-Z0-9_-]+/.test(urlPath)) return { score: 0.8, warnings };
            return { score: 0.3, warnings };
        }
        
        // Greenhouse patterns  
        if (domain.includes('greenhouse') || domain.includes('boards.greenhouse.io')) {
            if (/\/jobs\/\d+/.test(urlPath)) return { score: 0.8, warnings };
            return { score: 0.3, warnings };
        }
        
        // Lever patterns
        if (domain.includes('lever') || domain.includes('jobs.lever.co')) {
            if (/\/\d+/.test(urlPath)) return { score: 0.7, warnings };
            return { score: 0.3, warnings };
        }
        
        // Generic company domains - check for obvious non-job indicators
        if (!domain.includes('job') && !domain.includes('career') && !domain.includes('hiring')) {
            if (urlPath === '/' || urlPath === '' || /^\/$/.test(urlPath)) {
                warnings.push({ 
                    code: 'COMPANY_HOMEPAGE_DETECTED', 
                    message: 'Company homepage detected', 
                    impact: 'high', 
                    userMessage: 'This appears to be a company homepage rather than a job posting.' 
                });
                return { score: -0.8, warnings };
            }
        }
        
        return { score: 0, warnings };
    }

    /**
     * Calculate overall URL confidence score
     */
    calculateURLConfidence(analysis, jobIndicators) {
        let confidence = 0.5; // Base confidence

        // Accessibility confidence
        if (analysis.isAccessible) confidence += 0.2;
        
        // Response time confidence (faster is better)
        if (analysis.responseTime < 2000) confidence += 0.1;
        else if (analysis.responseTime > 10000) confidence -= 0.1;

        // Job indicators confidence
        if (jobIndicators.hasJobIndicators) confidence += 0.2;
        else confidence -= 0.1;

        // Platform confidence
        if (['linkedin', 'indeed', 'workday', 'greenhouse'].includes(analysis.platform)) {
            confidence += 0.1;
        }

        // Authentication penalty
        if (analysis.requiresAuth) confidence -= 0.1;

        // Expiration penalty
        if (analysis.isExpired) confidence -= 0.3;

        return Math.max(0, Math.min(1, confidence));
    }

    /**
     * Helper methods
     */
    normalizeURL(url) {
        try {
            const parsed = new URL(url);
            // Remove tracking parameters
            const cleanParams = new URLSearchParams(parsed.search);
            const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
            trackingParams.forEach(param => cleanParams.delete(param));
            parsed.search = cleanParams.toString();
            return parsed.toString();
        } catch {
            return url;
        }
    }

    detectPlatform(url) {
        const domain = new URL(url).hostname.toLowerCase();
        
        if (domain.includes('linkedin')) return 'linkedin';
        if (domain.includes('indeed')) return 'indeed';  
        if (domain.includes('workday')) return 'workday';
        if (domain.includes('greenhouse')) return 'greenhouse';
        if (domain.includes('lever')) return 'lever';
        if (domain.includes('glassdoor')) return 'glassdoor';
        if (domain.includes('monster')) return 'monster';
        if (domain.includes('ziprecruiter')) return 'ziprecruiter';
        
        return 'generic';
    }

    detectAuthRequired(response) {
        const authHeaders = ['www-authenticate', 'x-requires-login'];
        return authHeaders.some(header => response.headers.has(header)) ||
               response.status === 401 || 
               response.url.includes('login') ||
               response.url.includes('auth');
    }

    detectExpiredContent(response) {
        const lastModified = response.headers.get('last-modified');
        if (lastModified) {
            const modifiedDate = new Date(lastModified);
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            return modifiedDate < sixMonthsAgo;
        }
        return false;
    }

    createErrorResult(url, errors, startTime, analysis) {
        return {
            isValid: false,
            confidence: 0,
            data: analysis,
            errors,
            warnings: [],
            metadata: {
                tier: 1,
                processingTimeMs: Date.now() - startTime,
                validatedAt: new Date().toISOString(),
                validationMethod: 'error',
                source: 'URLValidationService'
            }
        };
    }

    getCachedResult(url) {
        const cached = this.cache.get(url);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
            return cached.result;
        }
        if (cached) {
            this.cache.delete(url);
        }
        return null;
    }

    cacheResult(url, result) {
        this.cache.set(url, {
            result,
            timestamp: Date.now()
        });
    }
}

export { URLValidationService };