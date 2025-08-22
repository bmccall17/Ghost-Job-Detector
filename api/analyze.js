// Debug version of analyze endpoint to test database connectivity
export default async function handler(req, res) {
    console.log('🔍 Analyze debug endpoint called');
    console.log('Method:', req.method);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { url, title, company, description } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        console.log('Input data:', { url, title, company, description });
        
        // Test 1: Check environment variables
        const envCheck = {
            DATABASE_URL: !!process.env.DATABASE_URL ? 'present' : 'missing',
            KV_REST_API_URL: !!process.env.KV_REST_API_URL ? 'present' : 'missing',
            BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN ? 'present' : 'missing'
        };
        console.log('Environment check:', envCheck);
        
        let dbConnectionStatus = 'not tested';
        let analysisResult = null;
        
        try {
            // Test 2: Try to import and connect to database
            console.log('Attempting to import Prisma...');
            const { PrismaClient } = await import('@prisma/client');
            const prisma = new PrismaClient();
            
            console.log('Prisma imported, testing connection...');
            await prisma.$connect();
            
            console.log('Connected to database, counting users...');
            const userCount = await prisma.user.count();
            dbConnectionStatus = `connected, ${userCount} users`;
            console.log('Database status:', dbConnectionStatus);
            
            // Test 3: Simple analysis without complex logic
            const analysisId = `debug_${Date.now()}`;
            const ghostProbability = Math.random() * 0.5; // Random score 0-50%
            
            console.log('Creating source record...');
            const source = await prisma.source.create({
                data: {
                    kind: 'url',
                    url: url,
                    contentSha256: `debug_${Date.now()}`,
                    httpStatus: 200
                }
            });
            console.log('Source created:', source.id);
            
            console.log('Creating job listing...');
            const jobListing = await prisma.jobListing.create({
                data: {
                    sourceId: source.id,
                    title: title || 'Debug Test Position',
                    company: company || 'Debug Test Company',
                    canonicalUrl: url,
                    rawParsedJson: {
                        debug: true,
                        timestamp: new Date().toISOString()
                    },
                    normalizedKey: `debug_${Date.now()}`
                }
            });
            console.log('Job listing created:', jobListing.id);
            
            console.log('Creating analysis...');
            const analysis = await prisma.analysis.create({
                data: {
                    jobListingId: jobListing.id,
                    score: ghostProbability,
                    verdict: ghostProbability > 0.3 ? 'uncertain' : 'likely_real',
                    reasonsJson: {
                        debug: true,
                        riskFactors: ['Debug test'],
                        keyFactors: ['Test analysis']
                    },
                    modelVersion: 'debug-v1.0.0'
                }
            });
            console.log('Analysis created:', analysis.id);
            
            analysisResult = {
                id: analysis.id,
                url,
                jobData: {
                    title: jobListing.title,
                    company: jobListing.company,
                    description: description || 'Debug test description'
                },
                ghostProbability,
                riskLevel: ghostProbability > 0.3 ? 'medium' : 'low',
                riskFactors: ['Debug test'],
                keyFactors: ['Test analysis'],
                metadata: {
                    storage: 'postgres-debug',
                    version: 'debug-2.0',
                    sourceId: source.id,
                    jobListingId: jobListing.id
                }
            };
            
            await prisma.$disconnect();
            console.log('Database operations completed successfully');
            
        } catch (dbError) {
            console.error('Database error:', dbError);
            dbConnectionStatus = `error: ${dbError.message}`;
        }
        
        // Return debug response
        const response = {
            status: 'Debug analysis complete',
            input: { url, title, company, description },
            environment: envCheck,
            database: dbConnectionStatus,
            result: analysisResult,
            timestamp: new Date().toISOString()
        };
        
        console.log('Returning response:', JSON.stringify(response, null, 2));
        return res.status(200).json(response);
        
    } catch (error) {
        console.error('Debug endpoint error:', error);
        return res.status(500).json({
            error: 'Debug analysis failed',
            message: error.message,
            stack: error.stack
        });
    }
}