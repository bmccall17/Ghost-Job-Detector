// Ultra-simple test endpoint without any imports
export default function handler(req, res) {
    console.log('Simple test endpoint called');
    
    return res.status(200).json({
        message: 'API is working!',
        method: req.method,
        timestamp: new Date().toISOString(),
        query: req.query,
        body: req.body
    });
}