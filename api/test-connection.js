// Simple API test endpoint to check if Vercel deployment is working
export default async function handler(req, res) {
    console.log('🧪 Test endpoint called');
    console.log('Method:', req.method);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    
    try {
        // Test environment variables
        const envCheck = {
            DATABASE_URL: !!process.env.DATABASE_URL,
            KV_REST_API_URL: !!process.env.KV_REST_API_URL,
            KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
            BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN
        };
        
        console.log('Environment variables check:', envCheck);
        
        // Test basic database import
        let dbStatus = 'not tested';
        try {
            const { prisma } = await import('../lib/db.js');
            await prisma.$connect();
            const userCount = await prisma.user.count();
            await prisma.$disconnect();
            dbStatus = `connected, ${userCount} users`;
        } catch (dbError) {
            dbStatus = `error: ${dbError.message}`;
            console.error('Database test error:', dbError);
        }
        
        // Test KV import
        let kvStatus = 'not tested';
        try {
            const { kv } = await import('@vercel/kv');
            await kv.set('test', 'value');
            await kv.del('test');
            kvStatus = 'connected';
        } catch (kvError) {
            kvStatus = `error: ${kvError.message}`;
            console.error('KV test error:', kvError);
        }
        
        const response = {
            status: 'API endpoint is working',
            timestamp: new Date().toISOString(),
            environment: {
                NODE_ENV: process.env.NODE_ENV,
                VERCEL: process.env.VERCEL,
                VERCEL_ENV: process.env.VERCEL_ENV
            },
            connections: {
                database: dbStatus,
                kv: kvStatus,
                environmentVariables: envCheck
            },
            deployment_info: {
                vercel_region: process.env.VERCEL_REGION,
                function_name: process.env.AWS_LAMBDA_FUNCTION_NAME
            }
        };
        
        console.log('Test response:', JSON.stringify(response, null, 2));
        
        return res.status(200).json(response);
        
    } catch (error) {
        console.error('Test endpoint error:', error);
        return res.status(500).json({
            error: 'Test endpoint failed',
            message: error.message,
            stack: error.stack
        });
    }
}