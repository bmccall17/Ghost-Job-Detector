import { ParsingLearningService } from '../../src/services/parsing/ParsingLearningService.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { url, html, failedResult, userAgent } = req.body

    if (!url || !failedResult) {
      return res.status(400).json({ error: 'Missing required fields: url, failedResult' })
    }

    console.log(`📥 Ingesting parsing failure for: ${url}`)

    const learningService = ParsingLearningService.getInstance()
    
    // Trigger real-time learning from the failed parse
    const improvements = await learningService.learnFromFailedParse(
      url,
      html || '',
      {
        title: failedResult.title,
        company: failedResult.company,
        location: failedResult.location
      }
    )

    console.log(`🎓 Learning completed:`, improvements)

    // Return the improvements to be applied immediately
    res.status(200).json({
      success: true,
      improvements: improvements.improvements,
      learnedData: {
        title: improvements.title || failedResult.title,
        company: improvements.company || failedResult.company,
        location: improvements.location || failedResult.location
      },
      metadata: {
        improvementsCount: improvements.improvements.length,
        hasImprovements: improvements.improvements.length > 0,
        userAgent,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Failed to process parsing failure:', error)
    res.status(500).json({ 
      error: 'Failed to process parsing failure',
      details: error.message 
    })
  }
}