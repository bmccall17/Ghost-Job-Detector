// Security middleware for Ghost Job Detector
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

/**
 * Comprehensive security validation and sanitization middleware
 * Protects against XSS, injection attacks, and malicious input
 */
export class SecurityValidator {
  constructor() {
    this.ipRequestCounts = new Map();
    this.userRequestCounts = new Map();
    this.suspiciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi,
      /vbscript:/gi,
      /livescript:/gi,
      /mocha:/gi,
      /-moz-binding/gi,
      /behavior\s*:/gi
    ];
    
    // Rate limiting configuration
    this.rateLimits = {
      analysis: { max: 100, window: 3600000 }, // 100 requests per hour
      general: { max: 1000, window: 3600000 }, // 1000 requests per hour
      ip: { max: 2000, window: 3600000 } // 2000 requests per hour per IP
    };
  }

  /**
   * Validate and sanitize URL input
   */
  validateUrl(url) {
    if (!url || typeof url !== 'string') {
      throw new Error('URL is required and must be a string');
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousContent(url)) {
      throw new Error('URL contains potentially malicious content');
    }

    // Validate URL format
    if (!validator.isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true,
      allow_query_components: true,
      allow_fragments: true
    })) {
      throw new Error('Invalid URL format');
    }

    // Sanitize URL
    const sanitizedUrl = DOMPurify.sanitize(url);
    
    // Additional URL security checks
    const urlObj = new URL(sanitizedUrl);
    
    // Block localhost and internal IPs in production
    if (process.env.NODE_ENV === 'production') {
      if (urlObj.hostname === 'localhost' || 
          urlObj.hostname.startsWith('127.') ||
          urlObj.hostname.startsWith('10.') ||
          urlObj.hostname.startsWith('192.168.') ||
          (urlObj.hostname.startsWith('172.') && 
           parseInt(urlObj.hostname.split('.')[1]) >= 16 && 
           parseInt(urlObj.hostname.split('.')[1]) <= 31)) {
        throw new Error('Internal URLs are not allowed');
      }
    }

    return sanitizedUrl;
  }

  /**
   * Sanitize text input (title, company, description)
   */
  sanitizeText(text, maxLength = 1000) {
    if (!text) return '';
    
    if (typeof text !== 'string') {
      throw new Error('Text input must be a string');
    }

    if (text.length > maxLength) {
      throw new Error(`Text input exceeds maximum length of ${maxLength} characters`);
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousContent(text)) {
      throw new Error('Text contains potentially malicious content');
    }

    // Sanitize HTML and remove scripts
    let sanitized = DOMPurify.sanitize(text, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    });

    // Additional text sanitization
    sanitized = validator.escape(sanitized);
    
    return sanitized.trim();
  }

  /**
   * Check for suspicious content patterns
   */
  containsSuspiciousContent(input) {
    if (!input || typeof input !== 'string') return false;
    
    return this.suspiciousPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Rate limiting check
   */
  checkRateLimit(identifier, type = 'general') {
    const now = Date.now();
    const limits = this.rateLimits[type];
    
    if (!this.userRequestCounts.has(identifier)) {
      this.userRequestCounts.set(identifier, []);
    }
    
    const userRequests = this.userRequestCounts.get(identifier);
    
    // Remove old requests outside the time window
    const validRequests = userRequests.filter(timestamp => 
      now - timestamp < limits.window
    );
    
    // Check if rate limit exceeded
    if (validRequests.length >= limits.max) {
      return {
        allowed: false,
        retryAfter: Math.ceil((validRequests[0] + limits.window - now) / 1000),
        limit: limits.max,
        remaining: 0,
        resetTime: new Date(validRequests[0] + limits.window)
      };
    }
    
    // Add current request
    validRequests.push(now);
    this.userRequestCounts.set(identifier, validRequests);
    
    return {
      allowed: true,
      limit: limits.max,
      remaining: limits.max - validRequests.length,
      resetTime: new Date(now + limits.window)
    };
  }

  /**
   * IP-based rate limiting
   */
  checkIPRateLimit(ip) {
    return this.checkRateLimit(ip, 'ip');
  }

  /**
   * Validate request body structure
   */
  validateAnalysisRequest(body) {
    const errors = [];
    
    if (!body || typeof body !== 'object') {
      throw new Error('Request body must be a valid JSON object');
    }

    // Required fields validation
    if (!body.url) {
      errors.push('URL is required');
    }

    // Optional fields validation
    const optionalFields = ['title', 'company', 'description', 'location'];
    optionalFields.forEach(field => {
      if (body[field] && typeof body[field] !== 'string') {
        errors.push(`${field} must be a string`);
      }
    });

    if (errors.length > 0) {
      throw new Error(`Validation errors: ${errors.join(', ')}`);
    }

    // Sanitize all fields
    const sanitized = {
      url: this.validateUrl(body.url),
      title: this.sanitizeText(body.title, 200),
      company: this.sanitizeText(body.company, 100),
      description: this.sanitizeText(body.description, 5000),
      location: this.sanitizeText(body.location, 100)
    };

    return sanitized;
  }

  /**
   * Generate security headers
   */
  getSecurityHeaders() {
    return {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' https:; frame-ancestors 'none';",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
  }

  /**
   * Log security events for monitoring
   */
  logSecurityEvent(event, details = {}) {
    const securityLog = {
      timestamp: new Date().toISOString(),
      event: event,
      details: details,
      severity: this.getEventSeverity(event)
    };

    // In production, this would send to a logging service
    console.log('[SECURITY]', JSON.stringify(securityLog));
    
    return securityLog;
  }

  /**
   * Determine event severity level
   */
  getEventSeverity(event) {
    const highSeverityEvents = [
      'malicious_input_detected',
      'rate_limit_exceeded',
      'suspicious_pattern_found',
      'invalid_url_blocked'
    ];
    
    return highSeverityEvents.includes(event) ? 'HIGH' : 'MEDIUM';
  }

  /**
   * Clean up old rate limit data (should be called periodically)
   */
  cleanupRateLimitData() {
    const now = Date.now();
    const maxWindow = Math.max(...Object.values(this.rateLimits).map(limit => limit.window));
    
    for (const [identifier, requests] of this.userRequestCounts.entries()) {
      const validRequests = requests.filter(timestamp => now - timestamp < maxWindow);
      
      if (validRequests.length === 0) {
        this.userRequestCounts.delete(identifier);
      } else {
        this.userRequestCounts.set(identifier, validRequests);
      }
    }
  }
}

// Export singleton instance
export const securityValidator = new SecurityValidator();

// Security middleware function for API routes
export function securityMiddleware(req, res, next) {
  try {
    // Add security headers
    const headers = securityValidator.getSecurityHeaders();
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Get client IP
    const clientIP = req.headers['x-forwarded-for'] || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     (req.connection.socket ? req.connection.socket.remoteAddress : null);

    // Check IP rate limit
    const ipRateLimit = securityValidator.checkIPRateLimit(clientIP);
    if (!ipRateLimit.allowed) {
      securityValidator.logSecurityEvent('ip_rate_limit_exceeded', {
        ip: clientIP,
        endpoint: req.url
      });
      
      res.setHeader('Retry-After', ipRateLimit.retryAfter);
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: ipRateLimit.retryAfter,
        resetTime: ipRateLimit.resetTime
      });
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', ipRateLimit.limit);
    res.setHeader('X-RateLimit-Remaining', ipRateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', ipRateLimit.resetTime.toISOString());

    // Add security validator to request object
    req.security = securityValidator;
    req.clientIP = clientIP;

    next();
  } catch (error) {
    securityValidator.logSecurityEvent('middleware_error', {
      error: error.message,
      endpoint: req.url
    });
    
    return res.status(500).json({
      error: 'Security validation failed',
      message: 'Request could not be processed securely'
    });
  }
}

// Periodic cleanup (call this from a scheduled job)
setInterval(() => {
  securityValidator.cleanupRateLimitData();
}, 300000); // Clean up every 5 minutes