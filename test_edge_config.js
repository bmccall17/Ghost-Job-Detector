
const { get, getAll } = require('@vercel/edge-config');

async function testEdgeConfig() {
    try {
        console.log('🔍 Testing Edge Config with @vercel/edge-config...');
        
        // Test getting all data
        const allData = await getAll();
        console.log('✅ getAll() succeeded:');
        console.log(JSON.stringify(allData, null, 2));
        
    } catch (error) {
        console.log('❌ Edge Config test failed:', error.message);
    }
}

testEdgeConfig();
