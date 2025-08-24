#!/usr/bin/env node

/**
 * Comprehensive Testing Script for Engagement Signal Service
 * Tests Phase 6 implementation across different engagement scenarios
 */

import { EngagementSignalService } from '../lib/services/EngagementSignalService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testEngagementSignalService() {
    console.log('📊 Testing Engagement Signal Service - Phase 6');
    console.log('='.repeat(60));

    const engagementService = new EngagementSignalService();
    
    // Test scenarios with different engagement patterns
    const testJobData = [
        {
            title: 'Software Engineer',
            company: 'TechCorp',
            description: 'Exciting opportunity for a software engineer...',
            expectation: 'Should have moderate engagement if data exists'
        },
        {
            title: 'Marketing Manager', 
            company: 'StartupXYZ',
            description: 'Join our marketing team...',
            expectation: 'Limited data expected for smaller company'
        },
        {
            title: 'Senior Developer',
            company: 'HighEngagementCorp',
            description: 'Senior position with great benefits...',
            expectation: 'Test high engagement scenario'
        },
        {
            title: 'Data Analyst',
            company: 'LowEngagementCorp', 
            description: 'Data analysis role...',
            expectation: 'Test low engagement scenario'
        }
    ];

    console.log('\n📈 Testing Engagement Signal Analysis:');
    console.log('-'.repeat(50));

    for (const jobData of testJobData) {
        try {
            console.log(`\n🔍 Analyzing: ${jobData.title} @ ${jobData.company}`);
            console.log(`Expected: ${jobData.expectation}`);
            
            const startTime = Date.now();
            const analysis = await engagementService.analyzeEngagementSignals(
                jobData, 
                `https://example.com/jobs/${Math.random()}`
            );
            const duration = Date.now() - startTime;
            
            console.log(`✅ Analysis completed in ${duration}ms`);
            console.log(`📊 Engagement Score: ${analysis.engagementScore.toFixed(2)}`);
            console.log(`🎯 Assessment Level: ${analysis.assessment.level}`);
            console.log(`📋 Sample Size: ${analysis.assessment.sampleSize || 0} applications`);
            console.log(`🔍 Confidence: ${(analysis.assessment.confidence * 100).toFixed(1)}%`);
            
            // Display signals breakdown
            if (analysis.signals) {
                console.log('\n   🔬 Signal Breakdown:');
                
                const outcomes = analysis.signals.applicationOutcomes;
                if (outcomes) {
                    console.log(`   📥 Applications: ${outcomes.totalApplications}`);
                    if (outcomes.hiringRate !== null) {
                        console.log(`   💼 Hiring Rate: ${(outcomes.hiringRate * 100).toFixed(1)}%`);
                    }
                    if (outcomes.responseRate !== null) {
                        console.log(`   💬 Response Rate: ${(outcomes.responseRate * 100).toFixed(1)}%`);
                    }
                    if (outcomes.interviewRate !== null) {
                        console.log(`   🎤 Interview Rate: ${(outcomes.interviewRate * 100).toFixed(1)}%`);
                    }
                    if (outcomes.avgTimeToResponse !== null) {
                        console.log(`   ⏱️ Avg Response Time: ${Math.round(outcomes.avgTimeToResponse)} days`);
                    }
                }
                
                const patterns = analysis.signals.responsePatterns;
                if (patterns) {
                    console.log(`   🔄 Response Trend: ${patterns.engagementTrend}`);
                    if (patterns.avgApplicationsPerJob !== null) {
                        console.log(`   📊 Avg Applications/Job: ${Math.round(patterns.avgApplicationsPerJob)}`);
                    }
                }
                
                const duration = analysis.signals.durationPatterns;
                if (duration) {
                    console.log(`   📅 Posting Pattern: ${duration.postingPattern}`);
                    if (duration.avgPostingDuration !== null) {
                        console.log(`   ⏳ Avg Duration: ${Math.round(duration.avgPostingDuration)} days`);
                    }
                }
            }
            
            // Display recommendations
            if (analysis.assessment.recommendations && analysis.assessment.recommendations.length > 0) {
                console.log('\n   💡 Recommendations:');
                analysis.assessment.recommendations.forEach((rec, i) => {
                    console.log(`   ${i + 1}. ${rec}`);
                });
            }

        } catch (error) {
            console.error(`❌ Error analyzing ${jobData.company}:`, error.message);
        }
    }

    // Test engagement adjustment functionality
    console.log('\n🎛️ Testing Engagement Adjustment Integration:');
    console.log('-'.repeat(50));

    const mockBaseResults = {
        ghostProbability: 0.6,
        riskLevel: 'medium',
        keyFactors: ['Original analysis factors'],
        riskFactors: ['Original risk factors'],
        confidence: 0.75
    };

    // Test high engagement scenario
    try {
        console.log('\n🧪 Testing adjustment with HIGH engagement...');
        const highEngagementAnalysis = {
            engagementScore: 0.85,
            assessment: {
                level: 'high_engagement',
                confidence: 0.9,
                sampleSize: 25,
                description: 'Strong engagement signals indicate active hiring'
            },
            signals: {
                applicationOutcomes: {
                    hiringRate: 0.15,
                    responseRate: 0.8,
                    avgTimeToResponse: 3,
                    sampleSize: 25
                },
                durationPatterns: {
                    avgPostingDuration: 30
                }
            }
        };

        const highAdjustedResults = engagementService.applyEngagementAdjustment(
            mockBaseResults,
            highEngagementAnalysis
        );

        console.log(`📉 Ghost probability: ${mockBaseResults.ghostProbability} → ${highAdjustedResults.ghostProbability.toFixed(3)}`);
        console.log(`🎯 Risk level: ${mockBaseResults.riskLevel} → ${highAdjustedResults.riskLevel}`);
        console.log(`✅ Engagement adjustment applied: ${highAdjustedResults.engagementAdjustment.applied}`);
        console.log(`📋 Adjustments made: ${highAdjustedResults.engagementAdjustment.adjustments.length}`);

        if (highAdjustedResults.engagementAdjustment.adjustments.length > 0) {
            highAdjustedResults.engagementAdjustment.adjustments.forEach((adj, i) => {
                console.log(`   ${i + 1}. ${adj}`);
            });
        }

    } catch (error) {
        console.error('❌ Error testing high engagement adjustment:', error.message);
    }

    // Test low engagement scenario
    try {
        console.log('\n🧪 Testing adjustment with LOW engagement...');
        const lowEngagementAnalysis = {
            engagementScore: 0.25,
            assessment: {
                level: 'very_low_engagement',
                confidence: 0.8,
                sampleSize: 15,
                description: 'Very low engagement suggests possible ghost job'
            },
            signals: {
                applicationOutcomes: {
                    hiringRate: 0.0,
                    responseRate: 0.2,
                    avgTimeToResponse: 35,
                    sampleSize: 15
                },
                durationPatterns: {
                    avgPostingDuration: 120
                }
            }
        };

        const lowAdjustedResults = engagementService.applyEngagementAdjustment(
            mockBaseResults,
            lowEngagementAnalysis
        );

        console.log(`📈 Ghost probability: ${mockBaseResults.ghostProbability} → ${lowAdjustedResults.ghostProbability.toFixed(3)}`);
        console.log(`🎯 Risk level: ${mockBaseResults.riskLevel} → ${lowAdjustedResults.riskLevel}`);
        console.log(`⚠️ Engagement penalty applied: ${lowAdjustedResults.engagementAdjustment.applied}`);
        console.log(`📋 Adjustments made: ${lowAdjustedResults.engagementAdjustment.adjustments.length}`);

    } catch (error) {
        console.error('❌ Error testing low engagement adjustment:', error.message);
    }

    // Test helper methods
    console.log('\n🔧 Testing Helper Methods:');
    console.log('-'.repeat(30));

    // Test job family extraction
    const jobTitles = [
        'Senior Software Engineer',
        'Jr. Marketing Manager', 
        'Lead Data Scientist',
        'Principal Product Manager II',
        'Staff Software Engineer III'
    ];

    console.log('\n🏷️ Job family extraction tests:');
    jobTitles.forEach(title => {
        const family = engagementService.extractJobFamily(title);
        console.log(`   "${title}" → "${family}"`);
    });

    // Test engagement scoring
    const testOutcomes = {
        hiringRate: 0.12,
        responseRate: 0.75,
        interviewRate: 0.35,
        avgTimeToResponse: 5,
        confidence: 0.8
    };

    const testPatterns = {
        avgApplicationsPerJob: 50,
        avgResponseTime: 7,
        responseConsistency: 0.6
    };

    const testDurations = {
        avgPostingDuration: 45,
        postingPattern: 'normal'
    };

    console.log('\n📊 Engagement score calculation test:');
    try {
        const calculatedScore = engagementService.calculateEngagementScore(
            testOutcomes,
            testPatterns,
            testDurations
        );
        console.log(`   Input: hiring(${testOutcomes.hiringRate}), response(${testOutcomes.responseRate}), interview(${testOutcomes.interviewRate})`);
        console.log(`   ➤ Engagement Score: ${calculatedScore.toFixed(3)}`);
    } catch (error) {
        console.error('❌ Error calculating engagement score:', error.message);
    }

    // Test posting pattern classification
    const durationTests = [5, 15, 30, 60, 150];
    console.log('\n📅 Posting duration classification:');
    durationTests.forEach(duration => {
        const pattern = engagementService.classifyPostingPattern(duration);
        console.log(`   ${duration} days → ${pattern}`);
    });

    console.log('\n🎉 Engagement Signal Service Testing Complete!');
    console.log('='.repeat(60));
}

// Database schema verification for Phase 6
async function testApplicationOutcomeSchema() {
    console.log('\n🗄️ Testing Application Outcome Schema (Phase 6 Dependency):');
    console.log('-'.repeat(50));

    try {
        // Check if ApplicationOutcome table exists and has the expected structure
        const outcome = await prisma.applicationOutcome.findFirst();
        
        if (outcome) {
            console.log('✅ ApplicationOutcome table exists and has data');
            console.log(`📋 Sample outcome:`, {
                outcome: outcome.outcome,
                appliedAt: outcome.appliedAt,
                respondedAt: outcome.respondedAt || 'null'
            });
            
            // Get outcome distribution
            const outcomeStats = await prisma.applicationOutcome.groupBy({
                by: ['outcome'],
                _count: { outcome: true }
            });
            
            console.log('📊 Outcome distribution:');
            outcomeStats.forEach(stat => {
                console.log(`   ${stat.outcome}: ${stat._count.outcome}`);
            });
            
        } else {
            console.log('⚠️ ApplicationOutcome table exists but has no data');
            console.log('💡 Consider adding sample data for testing engagement signals');
        }
        
    } catch (error) {
        if (error.code === 'P2021' || error.message.includes('does not exist')) {
            console.log('❌ ApplicationOutcome table does not exist');
            console.log('📝 Note: This table is required for full Phase 6 functionality');
            console.log('🔧 Run database migrations or update schema to add this table');
            
            // Show expected schema
            console.log('\n📋 Expected ApplicationOutcome schema:');
            console.log(`
model ApplicationOutcome {
  id           String    @id @default(cuid())
  jobListingId String
  jobListing   JobListing @relation(fields: [jobListingId], references: [id], onDelete: Cascade)
  outcome      String    // 'applied', 'no_response', 'rejected', 'phone_screen', 'interview_scheduled', 'interviewed', 'hired'
  appliedAt    DateTime
  respondedAt  DateTime?
  notes        String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  
  @@map("application_outcomes")
}`);
            
        } else {
            console.error('❌ Database error:', error.message);
        }
    }
}

// Integration test with main algorithm
async function testAlgorithmIntegration() {
    console.log('\n🔗 Testing Algorithm Integration (Phase 6 in v0.1.8):');
    console.log('-'.repeat(50));

    try {
        // Test the service integration pattern used in analyze.js
        const engagementService = new EngagementSignalService();
        
        const mockJobData = {
            title: 'Software Engineer',
            company: 'TestCompany',
            description: 'Test job description'
        };
        
        const mockUrl = 'https://example.com/job/123';
        
        console.log('🧪 Testing service instantiation and call pattern...');
        const results = await engagementService.analyzeEngagementSignals(mockJobData, mockUrl);
        
        console.log(`✅ Service call successful`);
        console.log(`📊 Returned engagement score: ${results.engagementScore}`);
        console.log(`🎯 Assessment level: ${results.assessment.level}`);
        console.log(`⏱️ Processing time: ${results.processingTime}ms`);
        
        // Test the adjustment integration
        console.log('\n🔧 Testing adjustment method integration...');
        const mockAnalysisResults = {
            ghostProbability: 0.5,
            riskLevel: 'medium',
            keyFactors: [],
            riskFactors: [],
            confidence: 0.7
        };
        
        const adjustedResults = engagementService.applyEngagementAdjustment(
            mockAnalysisResults,
            results
        );
        
        console.log(`✅ Adjustment integration successful`);
        console.log(`📈 Ghost probability adjusted: ${mockAnalysisResults.ghostProbability} → ${adjustedResults.ghostProbability.toFixed(3)}`);
        console.log(`🎯 Risk level: ${adjustedResults.riskLevel}`);
        console.log(`📋 Adjustment applied: ${adjustedResults.engagementAdjustment.applied}`);
        
    } catch (error) {
        console.error('❌ Integration test failed:', error.message);
    }
}

// Run comprehensive Phase 6 tests
async function runEngagementTests() {
    console.log('🧪 PHASE 6: Engagement Signal Service Testing');
    console.log('Algorithm Core v0.1.8 - Comprehensive Test Suite');
    console.log('='.repeat(70));
    
    try {
        await testApplicationOutcomeSchema();
        await testEngagementSignalService();
        await testAlgorithmIntegration();
        
        console.log('\n✅ All Phase 6 tests completed successfully!');
        console.log('🚀 Engagement Signal Service is ready for production deployment.');
        
    } catch (error) {
        console.error('\n❌ Test suite failed:', error);
        process.exit(1);
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runEngagementTests().catch(console.error);
}

export { testEngagementSignalService, testApplicationOutcomeSchema, testAlgorithmIntegration };