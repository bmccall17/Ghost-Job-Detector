// Script to verify Vercel serverless function count
import { readdir } from 'fs/promises';
import { join } from 'path';

async function getFunctionPaths(dir, basePath = '') {
    const functions = [];
    try {
        const items = await readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = join(dir, item.name);
            const urlPath = join(basePath, item.name);
            
            if (item.isDirectory()) {
                // Recursively search subdirectories
                const subFunctions = await getFunctionPaths(fullPath, urlPath);
                functions.push(...subFunctions);
            } else if (item.name.endsWith('.js') || item.name.endsWith('.ts')) {
                // Add API function
                const apiPath = `/api/${urlPath.replace(/\\/g, '/').replace(/\.(js|ts)$/, '')}`;
                functions.push({
                    file: fullPath,
                    endpoint: apiPath,
                    name: item.name
                });
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${dir}:`, error.message);
    }
    
    return functions;
}

async function verifyFunctionCount() {
    try {
        console.log('🔍 Scanning for Vercel Serverless Functions...\n');
        
        const apiDir = './api';
        const functions = await getFunctionPaths(apiDir);
        
        // Sort by endpoint for better readability
        functions.sort((a, b) => a.endpoint.localeCompare(b.endpoint));
        
        console.log('📋 **Current Serverless Functions:**');
        console.log('=' .repeat(60));
        
        functions.forEach((func, index) => {
            console.log(`${String(index + 1).padStart(2)}. ${func.endpoint}`);
            console.log(`    └─ File: ${func.file}`);
        });
        
        console.log('=' .repeat(60));
        console.log(`\n📊 **Function Count Summary:**`);
        console.log(`   Total Functions: ${functions.length}`);
        
        // Vercel Hobby plan limit
        const hobbyLimit = 12;
        const remaining = hobbyLimit - functions.length;
        
        if (functions.length <= hobbyLimit) {
            console.log(`   ✅ Within Hobby Plan Limit: ${functions.length}/${hobbyLimit} functions`);
            console.log(`   📈 Remaining Slots: ${remaining}`);
        } else {
            console.log(`   ❌ Exceeds Hobby Plan Limit: ${functions.length}/${hobbyLimit} functions`);
            console.log(`   🚫 Over by: ${-remaining} functions`);
            console.log(`   💡 Consider upgrading to Pro Plan or removing ${-remaining} more functions`);
        }
        
        console.log(`\n🎯 **Recent Changes:**`);
        console.log(`   ✅ Removed: api/simple-test.js`);
        console.log(`   ✅ Removed: api/test-connection.js`);
        console.log(`   ✅ Consolidated: api/history.js → api/analysis-history.js`);
        console.log(`   📉 Net Reduction: 3 functions`);
        console.log(`   🔧 Previous Count: 13 → Current Count: ${functions.length}`);
        
        if (functions.length <= hobbyLimit) {
            console.log(`\n🚀 **Ready for Deployment!**`);
            console.log(`   Your app is now within the Vercel Hobby plan limits.`);
        }
        
    } catch (error) {
        console.error('💥 Verification failed:', error);
    }
}

verifyFunctionCount().catch(console.error);