import { get, getAll, has } from '@vercel/edge-config';

async function testEdgeConfig() {
    try {
        console.log('🔍 Testing Edge Config with @vercel/edge-config...');
        console.log('🔗 EDGE_CONFIG:', process.env.EDGE_CONFIG?.substring(0, 50) + '...');
        
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
            console.log('💡 Add test_message="hello-from-edge-config" to your Edge Config store');
        }
        
        // Test setting up some initial data structure for Ghost Job Detector
        console.log('\n🧪 Testing job analysis data structure...');
        
        const jobSearches = await get('job_searches');
        const companies = await get('companies');
        const stats = await get('stats');
        
        console.log('📊 Current data structure:');
        console.log('   job_searches:', jobSearches ? Object.keys(jobSearches).length + ' entries' : 'not set');
        console.log('   companies:', companies ? Object.keys(companies).length + ' entries' : 'not set');
        console.log('   stats:', stats ? 'present' : 'not set');
        
        console.log('\n🎉 Edge Config is working correctly!');
        console.log('💡 Your database writes should work now.');
        
    } catch (error) {
        console.log('❌ Edge Config test failed:', error.message);
        console.log('📋 Debug info:');
        console.log('   Error type:', error.constructor.name);
        console.log('   EDGE_CONFIG present:', !!process.env.EDGE_CONFIG);
        
        if (error.message.includes('unauthorized') || error.message.includes('403')) {
            console.log('💡 Suggestions:');
            console.log('   1. Ensure your Edge Config store is connected to this project');
            console.log('   2. Check that the token has read permissions');
            console.log('   3. Verify the EDGE_CONFIG URL is correct');
        }
    }
}

testEdgeConfig();