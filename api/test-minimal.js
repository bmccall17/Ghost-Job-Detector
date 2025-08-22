// Minimal test endpoint to debug the issue
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        return res.status(200).json({
            message: 'Minimal test works',
            timestamp: new Date().toISOString(),
            body: req.body
        });
    } catch (error) {
        return res.status(500).json({
            error: 'Test failed',
            message: error.message
        });
    }
}