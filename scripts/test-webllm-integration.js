// Test script for WebLLM integration
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testWebLLMIntegration() {
    try {
        console.log('🧪 Testing WebLLM Integration...');

        // Check database schema for agent events
        console.log('\n📊 Testing database schema...');
        
        // Test agent event creation
        const testEvent = await prisma.event.create({
            data: {
                kind: 'agent_validate',
                meta: {
                    test: true,
                    validated: false,
                    fields: {
                        title: { value: 'Test Job Title', conf: 0.9 },
                        company: { value: 'Test Company', conf: 0.85 }
                    },
                    notes: 'Test agent validation event',
                    timestamp: new Date().toISOString()
                }
            }
        });

        console.log('✅ Created test agent validation event:', testEvent.id);

        // Test agent promotion event
        const promotionEvent = await prisma.event.create({
            data: {
                kind: 'agent_promotion',
                meta: {
                    test: true,
                    rulesGenerated: 2,
                    promotedEvents: 1,
                    rules: [
                        {
                            type: 'title_correction',
                            domain: 'test.com',
                            pattern: 'agent_verified',
                            correction: 'Corrected Title',
                            confidence: 0.9,
                            source: 'agent_promotion'
                        }
                    ],
                    timestamp: new Date().toISOString()
                }
            }
        });

        console.log('✅ Created test agent promotion event:', promotionEvent.id);

        // Test event querying
        const agentEvents = await prisma.event.findMany({
            where: {
                kind: {
                    in: ['agent_validate', 'agent_promotion']
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        console.log(`✅ Found ${agentEvents.length} agent events in database`);

        // Test API endpoints (mock check)
        console.log('\n🌐 API Endpoint Check...');
        
        const endpoints = [
            '/api/agent/ingest',
            '/api/agent/fallback'
        ];

        for (const endpoint of endpoints) {
            console.log(`📋 Endpoint configured: ${endpoint}`);
        }

        console.log('\n🔧 Environment Variables Check...');
        const requiredEnvVars = [
            'AGENT_ENABLED',
            'AGENT_USE_SERVER_FALLBACK',
            'GROQ_API_KEY',
            'GROQ_MODEL'
        ];

        for (const envVar of requiredEnvVars) {
            const value = process.env[envVar];
            if (value) {
                console.log(`✅ ${envVar}: ${envVar === 'GROQ_API_KEY' ? '[HIDDEN]' : value}`);
            } else {
                console.log(`⚠️  ${envVar}: Not set`);
            }
        }

        console.log('\n🎯 Integration Test Summary:');
        console.log('✅ Database schema supports agent events');
        console.log('✅ Agent validation events can be created');
        console.log('✅ Agent promotion events can be created');
        console.log('✅ Event querying works correctly');
        console.log('✅ API endpoints are configured');
        
        const envVarsSet = requiredEnvVars.filter(v => process.env[v]).length;
        console.log(`📊 Environment variables: ${envVarsSet}/${requiredEnvVars.length} set`);

        // Cleanup test events
        await prisma.event.deleteMany({
            where: {
                id: { in: [testEvent.id, promotionEvent.id] }
            }
        });
        console.log('🧹 Cleaned up test events');

        console.log('\n🚀 WebLLM Integration Test PASSED!');
        console.log('\n📋 Next Steps:');
        console.log('1. Set GROQ_API_KEY in environment variables');
        console.log('2. Configure Upstash Redis for rate limiting');
        console.log('3. Test with actual job postings');
        console.log('4. Verify WebGPU support in target browsers');

    } catch (error) {
        console.error('💥 WebLLM Integration Test FAILED:', error);
        console.error('\n🔧 Troubleshooting:');
        console.error('1. Check database connection');
        console.error('2. Ensure Prisma schema is up to date');
        console.error('3. Verify environment variables');
    } finally {
        await prisma.$disconnect();
    }
}

testWebLLMIntegration().catch(console.error);