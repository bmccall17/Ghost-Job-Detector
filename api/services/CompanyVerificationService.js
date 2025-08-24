// Company Site Verification Service
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CompanyVerificationService {
    constructor() {
        this.cache = new Map(); // In-memory cache for domain mappings
        this.rateLimits = new Map(); // Rate limiting per domain
    }

    async verifyJobOnCompanySite(jobData, originalUrl) {
        const { company, title } = jobData;
        const startTime = Date.now();
        
        try {
            console.log(`🔍 Starting company verification for: ${company}`);
            
            // 1. Extract/derive company domain
            const companyDomain = await this.extractCompanyDomain(company, originalUrl);
            if (!companyDomain) {
                return { verified: false, reason: 'Unable to determine company domain' };
            }
            
            // 2. Check rate limits
            if (this.isRateLimited(companyDomain)) {
                return { verified: null, reason: 'Rate limited', domain: companyDomain };
            }
            
            // 3. Generate career page URLs
            const careerUrls = this.generateCareerUrls(companyDomain);
            
            // 4. Check each URL for job presence (with timeout)
            for (const careerUrl of careerUrls) {
                try {
                    const verification = await this.checkJobPresence(careerUrl, title, company);
                    if (verification.found) {
                        console.log(`✅ Job verified on: ${careerUrl}`);
                        return {
                            verified: true,
                            source: careerUrl,
                            confidence: verification.confidence,
                            method: verification.method,
                            processingTime: Date.now() - startTime
                        };
                    }
                } catch (urlError) {
                    console.log(`⚠️ Failed to check ${careerUrl}:`, urlError.message);
                    continue; // Try next URL
                }
            }
            
            console.log(`❌ Job not found on company sites for: ${company}`);
            return {
                verified: false,
                searchedUrls: careerUrls,
                processingTime: Date.now() - startTime
            };
            
        } catch (error) {
            console.error('Company verification error:', error);
            return {
                verified: null,
                error: error.message,
                processingTime: Date.now() - startTime
            };
        }
    }

    async extractCompanyDomain(company, originalUrl) {
        const cacheKey = `domain_${company}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        let domain = null;
        
        // Strategy 1: Extract from original URL if it's from company site
        if (originalUrl) {
            const urlDomain = this.extractDomainFromUrl(originalUrl);
            if (urlDomain && !this.isJobBoard(urlDomain)) {
                domain = urlDomain;
            }
        }
        
        // Strategy 2: Common domain patterns
        if (!domain) {
            domain = this.generateDomainFromCompany(company);
        }
        
        // Cache the result
        if (domain) {
            this.cache.set(cacheKey, domain);
        }
        
        return domain;
    }

    extractDomainFromUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch {
            return null;
        }
    }

    isJobBoard(domain) {
        const jobBoards = [
            'linkedin.com', 'indeed.com', 'glassdoor.com', 'monster.com',
            'ziprecruiter.com', 'careerbuilder.com', 'dice.com'
        ];
        return jobBoards.some(board => domain.includes(board));
    }

    generateDomainFromCompany(company) {
        // Clean company name
        const cleanName = company
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+(inc|corp|corporation|llc|ltd|company).*$/i, '')
            .trim()
            .replace(/\s+/g, '');
        
        if (cleanName.length === 0) return null;
        
        return `${cleanName}.com`;
    }

    generateCareerUrls(domain) {
        return [
            `https://${domain}/careers`,
            `https://${domain}/jobs`,
            `https://careers.${domain}`,
            `https://${domain}/careers/jobs`,
            `https://${domain}/about/careers`,
            `https://${domain.replace('.com', '')}.greenhouse.io`,
            `https://${domain.replace('.com', '')}.workday.com`,
            `https://${domain.replace('.com', '')}.lever.co`
        ];
    }

    async checkJobPresence(url, title, company) {
        try {
            // Rate limiting check
            const domain = new URL(url).hostname;
            if (this.isRateLimited(domain)) {
                return { found: false, reason: 'Rate limited' };
            }
            
            // Update rate limit
            this.updateRateLimit(domain);
            
            // Fetch page with timeout and proper headers
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout
            
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; GhostJobDetector/1.0)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive'
                },
                redirect: 'follow',
                timeout: 8000
            });
            
            clearTimeout(timeout);
            
            if (!response.ok) {
                return { found: false, reason: `HTTP ${response.status}` };
            }
            
            // Get response text with size limit
            const html = await response.text();
            if (html.length > 500000) { // Limit to 500KB
                return { found: false, reason: 'Page too large' };
            }
            
            return this.analyzePageContent(html, title, company, url);
            
        } catch (error) {
            if (error.name === 'AbortError') {
                return { found: false, reason: 'Timeout' };
            }
            return { found: false, reason: error.message };
        }
    }

    analyzePageContent(html, title, company) {
        const htmlLower = html.toLowerCase();
        const titleWords = title.toLowerCase().split(' ').filter(word => word.length > 3);
        const companyLower = company.toLowerCase();
        
        // Check for job title matches (fuzzy)
        let titleMatches = 0;
        for (const word of titleWords) {
            if (htmlLower.includes(word)) {
                titleMatches++;
            }
        }
        
        const titleMatchRatio = titleWords.length > 0 ? titleMatches / titleWords.length : 0;
        
        // Check for company name
        const companyMatch = htmlLower.includes(companyLower);
        
        // Look for job-related content indicators
        const jobIndicators = [
            'apply now', 'job description', 'requirements', 'qualifications',
            'responsibilities', 'position', 'role', 'opportunity', 'career'
        ];
        const jobIndicatorCount = jobIndicators.filter(indicator => 
            htmlLower.includes(indicator)
        ).length;
        
        // Calculate confidence based on multiple factors
        let confidence = 0;
        
        // Title match contribution (40% weight)
        confidence += titleMatchRatio * 0.4;
        
        // Company match contribution (30% weight)  
        confidence += (companyMatch ? 1 : 0) * 0.3;
        
        // Job indicators contribution (30% weight)
        confidence += Math.min(1, jobIndicatorCount / 3) * 0.3;
        
        // Determine if job likely found
        const found = confidence >= 0.6; // 60% confidence threshold
        
        return {
            found,
            confidence,
            method: 'content_analysis',
            titleMatchRatio,
            companyMatch,
            jobIndicatorCount
        };
    }

    isRateLimited(domain) {
        const now = Date.now();
        const limit = this.rateLimits.get(domain);
        
        if (!limit) return false;
        
        // Allow 1 request per 15 seconds per domain
        return (now - limit.lastRequest) < 15000;
    }

    updateRateLimit(domain) {
        this.rateLimits.set(domain, {
            lastRequest: Date.now()
        });
    }
}