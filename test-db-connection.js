// Test database connections
import { prisma } from './lib/db.js';
import { kv } from '@vercel/kv';
import { put } from '@vercel/blob';

async function testConnections() {
    console.log('🧪 Testing Ghost Job Detector Database Connections');
    console.log('=' * 60);
    
    // Test 1: PostgreSQL (Neon)
    console.log('\n📊 Testing PostgreSQL (Neon) connection...');
    try {
        const userCount = await prisma.user.count();
        const sourceCount = await prisma.source.count();
        const analysisCount = await prisma.analysis.count();
        
        console.log(`✅ PostgreSQL connected successfully!`);
        console.log(`   - Users: ${userCount}`);
        console.log(`   - Sources: ${sourceCount}`);
        console.log(`   - Analyses: ${analysisCount}`);
    } catch (error) {
        console.log(`❌ PostgreSQL connection failed: ${error.message}`);
    }
    
    // Test 2: Upstash Redis KV
    console.log('\n🔑 Testing Upstash Redis KV connection...');
    try {
        const testKey = `test_${Date.now()}`;
        await kv.set(testKey, 'test_value', { ex: 60 });
        const value = await kv.get(testKey);
        await kv.del(testKey);
        
        if (value === 'test_value') {
            console.log(`✅ KV store connected successfully!`);
            console.log(`   - Test key/value operation completed`);
        } else {
            console.log(`❌ KV store value mismatch`);
        }
    } catch (error) {
        console.log(`❌ KV store connection failed: ${error.message}`);
    }
    
    // Test 3: Vercel Blob Storage
    console.log('\n📦 Testing Vercel Blob storage...');
    try {
        const testContent = `Test blob content ${Date.now()}`;
        const testFilename = `test/connection-test-${Date.now()}.txt`;
        
        const blob = await put(testFilename, testContent, {
            access: 'public',
            contentType: 'text/plain'
        });
        
        console.log(`✅ Blob storage connected successfully!`);
        console.log(`   - Test file uploaded: ${blob.url}`);
        console.log(`   - Size: ${testContent.length} bytes`);
    } catch (error) {
        console.log(`❌ Blob storage connection failed: ${error.message}`);
    }
    
    // Test 4: Create sample data
    console.log('\n🌱 Creating sample analysis data...');
    try {
        // Create a test source
        const source = await prisma.source.create({
            data: {
                kind: 'url',
                url: 'https://example.com/test-job',
                contentSha256: `test_${Date.now()}`,
                httpStatus: 200
            }
        });
        
        // Create a test job listing
        const jobListing = await prisma.jobListing.create({
            data: {
                sourceId: source.id,
                title: 'Test Software Engineer Position',
                company: 'Test Company Inc',
                location: 'Remote',
                remoteFlag: true,
                canonicalUrl: 'https://example.com/test-job',
                rawParsedJson: {
                    test: true,
                    createdAt: new Date().toISOString()
                },
                normalizedKey: `test_${Date.now()}`
            }
        });
        
        // Create a test analysis
        const analysis = await prisma.analysis.create({
            data: {
                jobListingId: jobListing.id,
                score: 0.25,
                verdict: 'likely_real',
                reasonsJson: {
                    riskFactors: ['Remote position'],
                    keyFactors: ['Specific company name', 'Clear job title'],
                    confidence: 0.8
                },
                modelVersion: 'v1.0.0-test'
            }
        });
        
        console.log(`✅ Sample data created successfully!`);
        console.log(`   - Source ID: ${source.id}`);
        console.log(`   - Job Listing ID: ${jobListing.id}`);
        console.log(`   - Analysis ID: ${analysis.id}`);
        console.log(`   - Ghost Probability: ${Number(analysis.score) * 100}%`);
        
    } catch (error) {
        console.log(`❌ Sample data creation failed: ${error.message}`);
    }
    
    console.log('\n🏁 Database connection test complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. Deploy to Vercel');
    console.log('   2. Test API endpoints');
    console.log('   3. Set up cron jobs');
    console.log('   4. Monitor queue processing');
}

// Run the test
testConnections()
    .catch(console.error)
    .finally(() => process.exit(0));