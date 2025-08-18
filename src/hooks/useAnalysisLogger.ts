import { useState, useCallback, useRef } from 'react'
import { ThinkingLogEntry } from '@/components/AIThinkingTerminal'

export const useAnalysisLogger = () => {
  const [logs, setLogs] = useState<ThinkingLogEntry[]>([])
  const logIdRef = useRef(0)

  const addLog = useCallback((
    type: ThinkingLogEntry['type'],
    message: string,
    details?: string
  ) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    const newLog: ThinkingLogEntry = {
      timestamp,
      type,
      message,
      details
    }

    setLogs(prev => [...prev, newLog])
    logIdRef.current++
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
    logIdRef.current = 0
  }, [])

  const addStep = useCallback((stepNumber: number, action: string, result?: string) => {
    addLog('process', `Step ${stepNumber}: ${action}`, result)
  }, [addLog])

  const addThought = useCallback((thought: string, duration?: string) => {
    const message = duration ? `Thought for ${duration}: ${thought}` : thought
    addLog('analysis', message)
  }, [addLog])

  const addVerification = useCallback((platform: string, status: 'success' | 'blocked' | 'failed', details?: string) => {
    const statusEmoji = status === 'success' ? '✓' : status === 'blocked' ? '⚠' : '✗'
    addLog(status === 'success' ? 'success' : status === 'blocked' ? 'warning' : 'error', 
      `${statusEmoji} ${platform} verification ${status}`, details)
  }, [addLog])

  const addConfidence = useCallback((field: string, score: number, reasoning?: string) => {
    const scorePercent = Math.round(score * 100)
    const emoji = score >= 0.8 ? '🟢' : score >= 0.6 ? '🟡' : '🔴'
    addLog('info', `${emoji} ${field} confidence: ${scorePercent}%`, reasoning)
  }, [addLog])

  const addFinalAssessment = useCallback((assessment: string, probability: number) => {
    const riskLevel = probability >= 0.67 ? 'HIGH RISK' : probability >= 0.34 ? 'MEDIUM RISK' : 'LOW RISK'
    const emoji = probability >= 0.67 ? '🚨' : probability >= 0.34 ? '⚠️' : '✅'
    addLog('success', `${emoji} Final assessment: ${riskLevel} (${Math.round(probability * 100)}% ghost probability)`, assessment)
  }, [addLog])

  // Simulation functions for demo purposes
  const simulateAnalysis = useCallback(async (jobUrl: string, jobData: any) => {
    console.log('🧪 simulateAnalysis called with:', { jobUrl, jobData })
    clearLogs()
    
    // Initial setup
    addLog('info', '🚀 Starting AI-powered job analysis')
    addLog('info', `📋 Analyzing: ${jobData.title || 'Unknown Title'} at ${jobData.company || 'Unknown Company'}`)
    addLog('info', `🔗 Source: ${jobUrl}`)
    
    await new Promise(resolve => setTimeout(resolve, 500))

    // Thought process simulation
    addThought('Need to verify job posting authenticity and company legitimacy', '3s')
    await new Promise(resolve => setTimeout(resolve, 800))

    addThought('Checking company website and recent business activities...', '5s')
    await new Promise(resolve => setTimeout(resolve, 1200))

    // External verification simulation
    addLog('process', '🌐 Starting external verification checks')
    await new Promise(resolve => setTimeout(resolve, 600))

    // Company website check
    const companyDomain = jobData.company.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com'
    addVerification(`Company Website (${companyDomain})`, 'success', 'Active corporate site with recent updates')
    await new Promise(resolve => setTimeout(resolve, 700))

    // Job board cross-check
    addVerification('LinkedIn Jobs', 'success', 'Multiple similar postings found with consistent information')
    await new Promise(resolve => setTimeout(resolve, 800))

    // Indeed verification
    addVerification('Indeed.com', 'blocked', 'Rate limited - unable to verify cross-posting')
    await new Promise(resolve => setTimeout(resolve, 600))

    // Company research simulation
    addLog('analysis', '🏢 Conducting company intelligence research')
    await new Promise(resolve => setTimeout(resolve, 900))

    addLog('info', '💼 Company profile verified: Established organization with 500+ employees')
    addLog('info', '📈 Recent activity: Posted 15 new jobs in last 30 days')
    addLog('info', '🏙️ Location verified: Multiple office locations match job posting')
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Confidence scoring
    addLog('process', '📊 Calculating confidence scores')
    await new Promise(resolve => setTimeout(resolve, 500))

    addConfidence('Title', 0.92, 'Specific, professional job title with clear requirements')
    await new Promise(resolve => setTimeout(resolve, 400))

    addConfidence('Company', 0.88, 'Verified company with strong online presence')
    await new Promise(resolve => setTimeout(resolve, 400))

    addConfidence('Location', 0.85, 'Matches known company office locations')
    await new Promise(resolve => setTimeout(resolve, 400))

    addConfidence('Overall Legitimacy', 0.87, 'Multiple verification sources confirm authenticity')
    await new Promise(resolve => setTimeout(resolve, 600))

    // Risk assessment
    addThought('Evaluating risk factors and legitimacy indicators...', '4s')
    await new Promise(resolve => setTimeout(resolve, 1000))

    addLog('warning', '⚠️ Found 1 minor risk factor: Job posted on multiple platforms (could indicate urgency or wide reach)')
    addLog('success', '✅ Found 4 legitimacy indicators:')
    addLog('success', '  → Active company website with recent job postings')
    addLog('success', '  → Consistent information across platforms')
    addLog('success', '  → Specific role requirements and qualifications')
    addLog('success', '  → Company has verified LinkedIn presence')
    await new Promise(resolve => setTimeout(resolve, 800))

    // Final assessment
    const finalProbability = 0.25 // Low ghost probability for this example
    addFinalAssessment(
      'Job appears legitimate based on company verification and consistent cross-platform presence. Recommend proceeding with application.',
      finalProbability
    )
    await new Promise(resolve => setTimeout(resolve, 500))

    addLog('success', '🎯 Analysis complete - Ready for user review')
    
    return {
      ghostProbability: finalProbability,
      confidence: 0.87,
      riskFactors: ['Job posted on multiple platforms'],
      legitimacyIndicators: [
        'Active company website with recent job postings',
        'Consistent information across platforms', 
        'Specific role requirements and qualifications',
        'Company has verified LinkedIn presence'
      ]
    }
  }, [addLog, addThought, addVerification, addConfidence, addFinalAssessment, clearLogs])

  return {
    logs,
    addLog,
    clearLogs,
    addStep,
    addThought,
    addVerification,
    addConfidence,
    addFinalAssessment,
    simulateAnalysis
  }
}