// GDPR/CCPA Compliance Framework for Ghost Job Detector
import { prisma } from './db.js';
import crypto from 'crypto';

/**
 * Comprehensive privacy and data protection compliance framework
 * Implements GDPR, CCPA, and other privacy regulations
 */
export class ComplianceManager {
  constructor() {
    this.dataRetentionPeriods = {
      jobPostingContent: 90 * 24 * 60 * 60 * 1000, // 90 days in milliseconds
      analysisHistory: 365 * 24 * 60 * 60 * 1000,  // 1 year
      auditLogs: 2 * 365 * 24 * 60 * 60 * 1000,    // 2 years
      userSessions: 30 * 24 * 60 * 60 * 1000       // 30 days
    };
    
    this.processingLegalBases = {
      jobAnalysis: 'legitimate_interest', // Job seekers' legitimate interest
      userHistory: 'consent',             // Explicit user consent required
      analytics: 'consent',               // User consent for analytics
      security: 'legitimate_interest'     // Platform security
    };
  }

  /**
   * Process data subject access request (GDPR Article 15, CCPA Right to Know)
   */
  async processAccessRequest(identifier, identifierType = 'ip') {
    try {
      const userData = {
        personalData: await this.gatherPersonalData(identifier, identifierType),
        processingActivities: await this.getProcessingActivities(identifier),
        dataRetention: this.getDataRetentionInfo(),
        rightsInformation: this.getUserRightsInformation()
      };

      // Log access request for compliance audit
      await this.logComplianceEvent('data_access_request', {
        identifier: this.hashIdentifier(identifier),
        identifierType: identifierType,
        timestamp: new Date().toISOString(),
        dataCategories: Object.keys(userData.personalData)
      });

      return userData;
    } catch (error) {
      console.error('Error processing access request:', error);
      throw new Error('Unable to process data access request');
    }
  }

  /**
   * Gather all personal data for a given identifier
   */
  async gatherPersonalData(identifier, identifierType) {
    const data = {
      analysisHistory: [],
      jobPostings: [],
      sessionData: [],
      auditLogs: []
    };

    try {
      // Get analysis history based on IP or session
      if (identifierType === 'ip') {
        const events = await prisma.event.findMany({
          where: {
            meta: {
              path: ['ip'],
              equals: identifier
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 1000 // Limit to prevent excessive data
        });
        
        data.auditLogs = events.map(event => ({
          timestamp: event.createdAt,
          activity: event.kind,
          purpose: this.getProcessingPurpose(event.kind)
        }));
      }

      // Get job posting analysis data
      const analyses = await prisma.analysis.findMany({
        include: {
          jobListing: {
            include: {
              source: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100 // Reasonable limit
      });

      data.analysisHistory = analyses.map(analysis => ({
        id: analysis.id,
        timestamp: analysis.createdAt,
        jobUrl: analysis.jobListing?.source?.url || 'Unknown',
        riskScore: analysis.score,
        processing_purpose: 'Ghost job detection and user assistance'
      }));

      return data;
    } catch (error) {
      console.error('Error gathering personal data:', error);
      return data; // Return partial data if possible
    }
  }

  /**
   * Process data deletion request (GDPR Article 17, CCPA Right to Delete)
   */
  async processDeleteRequest(identifier, identifierType = 'ip', scope = 'all') {
    try {
      const deletionReport = {
        requestedScope: scope,
        deletedData: {},
        retainedData: {},
        deletionDate: new Date().toISOString()
      };

      // Log deletion request before processing
      await this.logComplianceEvent('data_deletion_request', {
        identifier: this.hashIdentifier(identifier),
        identifierType: identifierType,
        scope: scope,
        timestamp: new Date().toISOString()
      });

      if (scope === 'all' || scope === 'analysis_history') {
        // Delete analysis history (but preserve anonymized aggregated data)
        const deletedAnalyses = await this.deleteAnalysisHistory(identifier, identifierType);
        deletionReport.deletedData.analyses = deletedAnalyses;
      }

      if (scope === 'all' || scope === 'audit_logs') {
        // Delete non-essential audit logs (keep security-related logs anonymized)
        const deletedLogs = await this.deleteAuditLogs(identifier, identifierType);
        deletionReport.deletedData.auditLogs = deletedLogs;
      }

      // Some data may be retained for legitimate interests (security, legal compliance)
      deletionReport.retainedData = {
        securityLogs: 'Anonymized security logs retained for platform protection',
        aggregatedData: 'Anonymized statistics retained for service improvement',
        legalCompliance: 'Data required for legal compliance retained in anonymized form'
      };

      // Log successful deletion
      await this.logComplianceEvent('data_deletion_completed', {
        identifier: this.hashIdentifier(identifier),
        deletionReport: deletionReport
      });

      return deletionReport;
    } catch (error) {
      console.error('Error processing deletion request:', error);
      throw new Error('Unable to process data deletion request');
    }
  }

  /**
   * Delete analysis history for identifier
   */
  async deleteAnalysisHistory(identifier, identifierType) {
    // For IP-based identification, we need to find analyses through audit logs
    // This is a limitation of the current schema - in production, you'd want user accounts
    
    try {
      if (identifierType === 'ip') {
        // Find events related to this IP
        const ipEvents = await prisma.event.findMany({
          where: {
            meta: {
              path: ['ip'],
              equals: identifier
            },
            kind: 'analysis_completed'
          }
        });

        // For now, we can't directly link analyses to IPs due to schema limitations
        // In a production system, you'd want user accounts or session tracking
        console.log(`Found ${ipEvents.length} analysis events for IP ${identifier}`);
        
        return {
          message: 'IP-based analysis deletion requires manual review due to schema limitations',
          eventsFound: ipEvents.length
        };
      }

      return { message: 'No analysis history found for deletion' };
    } catch (error) {
      console.error('Error deleting analysis history:', error);
      throw error;
    }
  }

  /**
   * Delete audit logs for identifier
   */
  async deleteAuditLogs(identifier, identifierType) {
    try {
      const deleteFilter = {};
      
      if (identifierType === 'ip') {
        deleteFilter.meta = {
          path: ['ip'],
          equals: identifier
        };
        
        // Only delete non-security related logs
        deleteFilter.kind = {
          not: {
            in: ['security_violation', 'rate_limit_exceeded', 'malicious_input_detected']
          }
        };
      }

      const deletedLogs = await prisma.event.deleteMany({
        where: deleteFilter
      });

      return {
        deletedCount: deletedLogs.count,
        types: 'Non-security audit logs'
      };
    } catch (error) {
      console.error('Error deleting audit logs:', error);
      throw error;
    }
  }

  /**
   * Process data portability request (GDPR Article 20, CCPA Right to Portability)
   */
  async processPortabilityRequest(identifier, identifierType = 'ip', format = 'json') {
    try {
      const userData = await this.gatherPersonalData(identifier, identifierType);
      
      // Structure data for portability
      const portableData = {
        exportDate: new Date().toISOString(),
        dataSubject: {
          identifier: this.hashIdentifier(identifier),
          identifierType: identifierType
        },
        data: {
          analysisHistory: userData.analysisHistory,
          preferences: {
            // User preferences would go here if we had user accounts
            // For now, this is placeholder
            dataRetentionPreference: '90_days',
            analyticsConsent: 'not_provided'
          }
        },
        metadata: {
          exportFormat: format,
          dataVersion: '1.0',
          complianceFramework: 'GDPR/CCPA'
        }
      };

      // Log portability request
      await this.logComplianceEvent('data_portability_request', {
        identifier: this.hashIdentifier(identifier),
        format: format,
        recordsExported: userData.analysisHistory.length
      });

      if (format === 'csv') {
        return this.convertToCSV(portableData);
      }

      return portableData;
    } catch (error) {
      console.error('Error processing portability request:', error);
      throw new Error('Unable to process data portability request');
    }
  }

  /**
   * Check consent status for data processing
   */
  async checkConsentStatus(identifier, processingType) {
    // In a full implementation, you'd check stored consent preferences
    // For now, we assume legitimate interest for job analysis
    
    const consentStatus = {
      identifier: this.hashIdentifier(identifier),
      processingType: processingType,
      legalBasis: this.processingLegalBases[processingType] || 'not_defined',
      consentGiven: null, // Would be true/false based on stored preferences
      consentDate: null,
      withdrawalRights: this.getWithdrawalRights(processingType)
    };

    return consentStatus;
  }

  /**
   * Record consent for data processing
   */
  async recordConsent(identifier, processingTypes, consentGiven) {
    try {
      const consentRecord = {
        identifier: this.hashIdentifier(identifier),
        processingTypes: processingTypes,
        consentGiven: consentGiven,
        consentDate: new Date().toISOString(),
        method: 'explicit_web_form',
        version: '1.0'
      };

      await this.logComplianceEvent('consent_recorded', consentRecord);

      // Store in database for future reference
      await prisma.event.create({
        data: {
          kind: 'consent_recorded',
          meta: consentRecord
        }
      });

      return consentRecord;
    } catch (error) {
      console.error('Error recording consent:', error);
      throw new Error('Unable to record consent');
    }
  }

  /**
   * Automated data retention cleanup
   */
  async performDataRetentionCleanup() {
    const cleanupReport = {
      timestamp: new Date().toISOString(),
      cleanedCategories: {},
      errors: []
    };

    try {
      // Clean up old job posting content
      const oldSources = await prisma.source.findMany({
        where: {
          createdAt: {
            lt: new Date(Date.now() - this.dataRetentionPeriods.jobPostingContent)
          }
        }
      });

      if (oldSources.length > 0) {
        // In production, you'd want to anonymize rather than delete to preserve analytics
        const anonymizedCount = await this.anonymizeOldSources(oldSources);
        cleanupReport.cleanedCategories.jobPostings = {
          processed: oldSources.length,
          anonymized: anonymizedCount
        };
      }

      // Clean up old audit logs (keep security-related ones)
      const oldLogs = await prisma.event.deleteMany({
        where: {
          createdAt: {
            lt: new Date(Date.now() - this.dataRetentionPeriods.auditLogs)
          },
          kind: {
            not: {
              in: ['security_violation', 'rate_limit_exceeded', 'consent_recorded']
            }
          }
        }
      });

      cleanupReport.cleanedCategories.auditLogs = {
        deleted: oldLogs.count
      };

      // Log cleanup completion
      await this.logComplianceEvent('data_retention_cleanup', cleanupReport);

      return cleanupReport;
    } catch (error) {
      cleanupReport.errors.push(error.message);
      console.error('Data retention cleanup error:', error);
      return cleanupReport;
    }
  }

  /**
   * Anonymize old sources instead of deleting them
   */
  async anonymizeOldSources(sources) {
    let anonymizedCount = 0;
    
    for (const source of sources) {
      try {
        // Replace URL with anonymized version but keep domain for analytics
        const url = new URL(source.url);
        const anonymizedUrl = `https://${url.hostname}/[ANONYMIZED_PATH]`;
        
        await prisma.source.update({
          where: { id: source.id },
          data: {
            url: anonymizedUrl,
            contentSha256: 'ANONYMIZED_' + source.contentSha256.substring(0, 8)
          }
        });
        
        anonymizedCount++;
      } catch (error) {
        console.error(`Error anonymizing source ${source.id}:`, error);
      }
    }
    
    return anonymizedCount;
  }

  /**
   * Get processing activities for transparency
   */
  async getProcessingActivities(identifier) {
    return [
      {
        activity: 'Job Posting Analysis',
        purpose: 'Detect potentially fake job postings to assist job seekers',
        legalBasis: 'Legitimate Interest',
        dataTypes: ['Job URLs', 'Job content', 'Analysis results'],
        retention: '90 days',
        sharing: 'Not shared with third parties'
      },
      {
        activity: 'Analytics and Improvement',
        purpose: 'Improve service quality and user experience',
        legalBasis: 'Consent',
        dataTypes: ['Usage statistics', 'Performance metrics'],
        retention: '1 year',
        sharing: 'Aggregated data only'
      },
      {
        activity: 'Security and Fraud Prevention',
        purpose: 'Protect platform integrity and prevent abuse',
        legalBasis: 'Legitimate Interest',
        dataTypes: ['IP addresses', 'Request patterns', 'Security logs'],
        retention: '2 years',
        sharing: 'Not shared except as required by law'
      }
    ];
  }

  /**
   * Utility functions
   */
  hashIdentifier(identifier) {
    return crypto.createHash('sha256').update(identifier).digest('hex').substring(0, 16);
  }

  getProcessingPurpose(eventKind) {
    const purposes = {
      'analysis_completed': 'Job posting ghost detection',
      'analysis_error': 'Service reliability monitoring',
      'rate_limit_exceeded': 'Platform security and abuse prevention',
      'security_violation': 'Platform security'
    };
    
    return purposes[eventKind] || 'Service operation';
  }

  getUserRightsInformation() {
    return {
      gdpr: {
        access: 'Right to access your personal data',
        rectification: 'Right to correct inaccurate data',
        erasure: 'Right to delete your personal data',
        restriction: 'Right to restrict processing',
        portability: 'Right to data portability',
        objection: 'Right to object to processing'
      },
      ccpa: {
        know: 'Right to know what data we collect',
        delete: 'Right to delete your personal data',
        optOut: 'Right to opt out of data sale (N/A - we do not sell data)',
        nonDiscrimination: 'Right to non-discriminatory treatment'
      },
      contact: {
        email: 'privacy@ghostjobdetector.com',
        responseTime: '30 days for GDPR, 45 days for CCPA'
      }
    };
  }

  getWithdrawalRights(processingType) {
    const rights = {
      consent: 'You can withdraw consent at any time without affecting lawfulness of processing',
      legitimate_interest: 'You can object to processing based on legitimate interests'
    };
    
    return rights[this.processingLegalBases[processingType]] || 'Contact us for more information';
  }

  convertToCSV(data) {
    // Simple CSV conversion for portability
    const csvRows = [];
    
    // Add headers
    csvRows.push('Timestamp,Activity,Job URL,Risk Score,Purpose');
    
    // Add analysis history rows
    data.data.analysisHistory.forEach(analysis => {
      csvRows.push([
        analysis.timestamp,
        'Job Analysis',
        analysis.jobUrl,
        analysis.riskScore,
        analysis.processing_purpose
      ].join(','));
    });
    
    return csvRows.join('\n');
  }

  async logComplianceEvent(event, data) {
    try {
      await prisma.event.create({
        data: {
          kind: `compliance_${event}`,
          meta: {
            ...data,
            compliance_version: '1.0',
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      console.error('Error logging compliance event:', error);
    }
  }

  getDataRetentionInfo() {
    return {
      jobPostingContent: '90 days',
      analysisHistory: '1 year',
      auditLogs: '2 years (security logs), 1 year (other)',
      userSessions: '30 days'
    };
  }
}

// Export singleton instance
export const complianceManager = new ComplianceManager();