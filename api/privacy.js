// Privacy and GDPR/CCPA Compliance API Endpoint
import { complianceManager } from '../lib/compliance.js';
import { securityValidator } from '../lib/security.js';

export default async function handler(req, res) {
    const startTime = Date.now();
    
    // Apply security headers
    const securityHeaders = securityValidator.getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
    });

    // Get client IP
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.connection.remoteAddress || 
                    req.socket.remoteAddress ||
                    (req.connection.socket ? req.connection.socket.remoteAddress : null);

    try {
        // Rate limiting for privacy requests
        const rateLimit = securityValidator.checkRateLimit(clientIP, 'general');
        if (!rateLimit.allowed) {
            return res.status(429).json({
                error: 'Rate limit exceeded',
                retryAfter: rateLimit.retryAfter
            });
        }

        const { action, identifier, identifierType = 'ip', format = 'json', scope = 'all' } = req.body || req.query;

        if (!action) {
            return res.status(400).json({
                error: 'Action parameter is required',
                supportedActions: ['access', 'delete', 'portability', 'consent-status', 'consent-record']
            });
        }

        // Use client IP as identifier if none provided
        const dataIdentifier = identifier || clientIP;

        let result;
        
        switch (action) {
            case 'access':
                // GDPR Article 15 - Right of Access
                // CCPA Right to Know
                if (req.method !== 'GET' && req.method !== 'POST') {
                    return res.status(405).json({ error: 'Method not allowed' });
                }
                
                result = await complianceManager.processAccessRequest(dataIdentifier, identifierType);
                
                securityValidator.logSecurityEvent('privacy_access_request', {
                    ip: clientIP,
                    identifier: dataIdentifier,
                    identifierType
                });
                
                return res.status(200).json({
                    request: 'data-access',
                    status: 'completed',
                    data: result,
                    processingTime: Date.now() - startTime
                });

            case 'delete':
                // GDPR Article 17 - Right to Erasure
                // CCPA Right to Delete
                if (req.method !== 'POST' && req.method !== 'DELETE') {
                    return res.status(405).json({ error: 'Method not allowed' });
                }
                
                result = await complianceManager.processDeleteRequest(dataIdentifier, identifierType, scope);
                
                securityValidator.logSecurityEvent('privacy_delete_request', {
                    ip: clientIP,
                    identifier: dataIdentifier,
                    scope
                });
                
                return res.status(200).json({
                    request: 'data-deletion',
                    status: 'completed',
                    result: result,
                    processingTime: Date.now() - startTime
                });

            case 'portability':
                // GDPR Article 20 - Right to Data Portability
                // CCPA Right to Portability
                if (req.method !== 'GET' && req.method !== 'POST') {
                    return res.status(405).json({ error: 'Method not allowed' });
                }
                
                result = await complianceManager.processPortabilityRequest(dataIdentifier, identifierType, format);
                
                securityValidator.logSecurityEvent('privacy_portability_request', {
                    ip: clientIP,
                    identifier: dataIdentifier,
                    format
                });

                if (format === 'csv') {
                    res.setHeader('Content-Type', 'text/csv');
                    res.setHeader('Content-Disposition', 'attachment; filename="my-data.csv"');
                    return res.status(200).send(result);
                }
                
                return res.status(200).json({
                    request: 'data-portability',
                    status: 'completed',
                    data: result,
                    processingTime: Date.now() - startTime
                });

            case 'consent-status':
                // Check current consent status
                if (req.method !== 'GET') {
                    return res.status(405).json({ error: 'Method not allowed' });
                }
                
                const { processingType = 'jobAnalysis' } = req.query;
                result = await complianceManager.checkConsentStatus(dataIdentifier, processingType);
                
                return res.status(200).json({
                    request: 'consent-status',
                    status: 'completed',
                    data: result,
                    processingTime: Date.now() - startTime
                });

            case 'consent-record':
                // Record user consent
                if (req.method !== 'POST') {
                    return res.status(405).json({ error: 'Method not allowed' });
                }
                
                const { processingTypes, consentGiven } = req.body;
                
                if (!processingTypes || consentGiven === undefined) {
                    return res.status(400).json({
                        error: 'processingTypes and consentGiven are required'
                    });
                }
                
                result = await complianceManager.recordConsent(dataIdentifier, processingTypes, consentGiven);
                
                securityValidator.logSecurityEvent('consent_recorded', {
                    ip: clientIP,
                    processingTypes,
                    consentGiven
                });
                
                return res.status(200).json({
                    request: 'consent-recording',
                    status: 'completed',
                    data: result,
                    processingTime: Date.now() - startTime
                });

            case 'privacy-info':
                // Get privacy policy and rights information
                if (req.method !== 'GET') {
                    return res.status(405).json({ error: 'Method not allowed' });
                }
                
                const processingActivities = await complianceManager.getProcessingActivities(dataIdentifier);
                const userRights = complianceManager.getUserRightsInformation();
                const retentionInfo = complianceManager.getDataRetentionInfo();
                
                return res.status(200).json({
                    request: 'privacy-information',
                    status: 'completed',
                    data: {
                        processingActivities,
                        userRights,
                        dataRetention: retentionInfo,
                        lastUpdated: '2025-08-19',
                        complianceFrameworks: ['GDPR', 'CCPA', 'PIPEDA']
                    },
                    processingTime: Date.now() - startTime
                });

            default:
                return res.status(400).json({
                    error: 'Unsupported action',
                    supportedActions: ['access', 'delete', 'portability', 'consent-status', 'consent-record', 'privacy-info'],
                    providedAction: action
                });
        }

    } catch (error) {
        console.error('Privacy API error:', error);
        
        securityValidator.logSecurityEvent('privacy_api_error', {
            ip: clientIP,
            error: error.message,
            action: req.body?.action || req.query?.action,
            processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
            error: 'Privacy request failed',
            message: 'Unable to process privacy request. Please try again or contact support.',
            requestId: Math.random().toString(36).substring(7)
        });
    }
}

// Export helper functions for scheduled cleanup
export async function scheduledDataCleanup() {
    try {
        console.log('Starting scheduled data retention cleanup...');
        const report = await complianceManager.performDataRetentionCleanup();
        console.log('Data retention cleanup completed:', report);
        return report;
    } catch (error) {
        console.error('Scheduled cleanup error:', error);
        throw error;
    }
}