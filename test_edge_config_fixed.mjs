import { get, getAll, has } from '@vercel/edge-config';
import { readFileSync } from 'fs';

// Load environment from .env.local
function loadEnv() {
    try {
        const envContent = readFileSync('.env.local', 'utf-8');
        for (const line of envContent.split('\n')) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                const [key, ...valueParts] = trimmed.split('=');
                const value = valueParts.join('=').trim();
                process.env[key.trim()] = value;
            }
        }
    } catch (error) {
        console.log('⚠️  Could not load .env.local:', error.message);
    }
}

async function testEdgeConfig() {
    // Load environment
    loadEnv();
    
    try {
        console.log('🔍 Testing Edge Config with @vercel/edge-config...');
        console.log('🔗 EDGE_CONFIG:', process.env.EDGE_CONFIG?.substring(0, 50) + '...');
        
        if (!process.env.EDGE_CONFIG) {
            console.log('❌ EDGE_CONFIG not found in environment');
            return false;
        }
        
        // Test if we can connect
        console.log('\n📡 Testing connection...');
        
        // Test getting all data
        const allData = await getAll();
        console.log('✅ getAll() succeeded!');
        console.log('📄 Data:', JSON.stringify(allData, null, 2));
        
        // Test checking for a specific key
        const hasTestMessage = await has('test_message');
        console.log('\n🔍 Testing for test_message key:', hasTestMessage);
        
        if (hasTestMessage) {
            const testMessage = await get('test_message');
            console.log('📩 test_message value:', testMessage);
        } else {
            console.log('💡 Edge Config is empty - this is normal for a new store');
        }
        
        // Check for job data
        const jobSearches = await get('job_searches');
        const companies = await get('companies');
        const stats = await get('stats');
        
        console.log('\n📊 Current Ghost Job Detector data:');
        console.log('   job_searches:', jobSearches ? Object.keys(jobSearches).length + ' entries' : 'not set');
        console.log('   companies:', companies ? Object.keys(companies).length + ' entries' : 'not set');
        console.log('   stats:', stats ? 'present' : 'not set');
        
        console.log('\n🎉 Edge Config is working correctly!');
        console.log('💡 Your database writes should work now.');
        
        return true;
        
    } catch (error) {
        console.log('❌ Edge Config test failed:', error.message);
        console.log('📋 Debug info:');
        console.log('   Error type:', error.constructor.name);
        console.log('   EDGE_CONFIG present:', !!process.env.EDGE_CONFIG);
        
        if (error.message.includes('unauthorized') || error.message.includes('403')) {
            console.log('💡 Still getting permission errors. Try:');
            console.log('   1. Redeploy your Vercel project');
            console.log('   2. Check Edge Config is connected in Vercel dashboard');
            console.log('   3. Wait a few minutes for propagation');
        }
        
        return false;
    }
}

testEdgeConfig();