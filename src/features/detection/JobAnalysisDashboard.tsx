import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Link as LinkIcon, Upload, BarChart3, MessageSquare } from 'lucide-react'
import { useAnalysisStore } from '@/stores/analysisStore'
import { AnalysisService } from '@/services/analysisService'
import { FileUpload } from '@/components/FileUpload'
import { PDFUpload } from '@/components/PDFUpload'
import { GhostJobBadge } from '@/components/GhostJobBadge'
import { AIThinkingTerminal } from '@/components/AIThinkingTerminal'
import { ParsingFeedbackModal } from '@/components/ParsingFeedbackModal'
import { useAnalysisLogger } from '@/hooks/useAnalysisLogger'
import { JobAnalysis } from '@/types'
import { ParsingLearningService } from '@/services/parsing/ParsingLearningService'
import MetadataIntegration from '@/features/metadata/MetadataIntegration'
import { useMetadataStore } from '@/features/metadata/stores/metadataStore'
import { useAnalysisIntegration } from '@/features/metadata/hooks/useMetadataUpdates'

const urlAnalysisSchema = z.object({
  jobUrl: z.string().url('Please enter a valid job URL')
})

const pdfAnalysisSchema = z.object({
  pdfFile: z.instanceof(File).refine(
    (file) => file.type === 'application/pdf',
    'Please upload a PDF file'
  )
})

type UrlAnalysisForm = z.infer<typeof urlAnalysisSchema>
type PdfAnalysisForm = z.infer<typeof pdfAnalysisSchema>

export const JobAnalysisDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'url' | 'pdf'>('url')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null)
  const [linkedInSearchUrl, setLinkedInSearchUrl] = useState('')
  const [careerSiteUrl, setCareerSiteUrl] = useState('')
  const [isBulkAnalyzing, setIsBulkAnalyzing] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedbackData, setFeedbackData] = useState<{
    title: string
    company: string
    location?: string
    url: string
  } | null>(null)
  
  const { logs, clearLogs, simulateAnalysis, addLog } = useAnalysisLogger()
  
  const {
    currentAnalysis,
    isAnalyzing,
    setCurrentAnalysis,
    addToHistory,
    setIsAnalyzing,
    addBulkJob,
    findExistingAnalysis,
    triggerHistoryRefresh
  } = useAnalysisStore()

  // TASK 1.3: Connect Real-time Streaming to UI
  const { onAnalysisStart } = useAnalysisIntegration()
  
  // TASK 1.1: Connect Form Input to Metadata Display
  const { setCardVisible, startExtraction } = useMetadataStore()

  const urlForm = useForm<UrlAnalysisForm>({
    resolver: zodResolver(urlAnalysisSchema)
  })

  const pdfForm = useForm<PdfAnalysisForm>({
    resolver: zodResolver(pdfAnalysisSchema)
  })

  const onSubmitUrl = async (data: UrlAnalysisForm) => {
    setIsAnalyzing(true)
    setCurrentAnalysis(null)
    clearLogs() // Clear any previous logs
    setShowTerminal(true) // Show terminal when analysis starts
    
    // TASK 1.1 & 1.3: Connect Form Input to Metadata Display and start real-time extraction
    setCardVisible(true);
    startExtraction(data.jobUrl);
    onAnalysisStart(data.jobUrl);
    
    // Add immediate test log to verify logging works
    addLog('info', '🚀 Analysis process started')
    addLog('info', '📊 Metadata extraction initialized')
    console.log('Terminal should now show logs');

    try {
      // Check if this job has already been analyzed
      const existingAnalysis = findExistingAnalysis(data.jobUrl)
      
      if (existingAnalysis) {
        // Job already analyzed - show existing results but still show thinking logs
        console.log('📁 Found existing analysis, showing demo logs');
        
        // Run a quick demo simulation for existing analysis
        const demoJobData = {
          title: existingAnalysis.title,
          company: existingAnalysis.company
        };
        
        simulateAnalysis(data.jobUrl, demoJobData).then(() => {
          console.log('Demo simulation completed for existing analysis');
        }).catch(error => {
          console.error('Demo simulation failed:', error);
        });
        
        setCurrentAnalysis(existingAnalysis)
        addToHistory(existingAnalysis) // This will move it to top without marking as new
        triggerHistoryRefresh() // Refresh database history in History tab
        urlForm.reset()
        setIsAnalyzing(false)
        return
      }

      // TASK 1.3: Start real metadata extraction with streaming
      console.log('🚀 Starting real-time metadata extraction...');
      // Real-time metadata extraction started via onAnalysisStart above
      
      // New job - extract data and run analysis (parallel with metadata)
      const jobData = await AnalysisService.extractJobData(data.jobUrl);
      
      // Start AI simulation for terminal logs (runs in parallel with real analysis)
      console.log('🚀 Starting AI simulation for terminal logs');
      const simulationPromise = simulateAnalysis(data.jobUrl, jobData);
      
      // Call the REAL API for analysis and database storage
      console.log('🚀 Calling real analysis API...');
      const result = await AnalysisService.analyzeJob(data.jobUrl, {
        title: jobData.title,
        company: jobData.company,
        description: '',
        location: jobData.location,
        remoteFlag: jobData.remoteFlag,
        postedAt: jobData.postedAt
      });
      
      // Note: Metadata extraction runs in parallel and updates the UI in real-time

      // Wait for simulation to complete for terminal display
      console.log('🚀 Waiting for AI simulation to complete...');
      const simulationResult = await simulationPromise;
      console.log('✅ AI simulation completed:', simulationResult);
      console.log('✅ Real analysis result received:', result);

      const analysis: JobAnalysis = {
        id: result.id,
        jobUrl: data.jobUrl,
        title: result.jobData?.title || jobData.title,
        company: result.jobData?.company || jobData.company,
        ghostProbability: result.ghostProbability,
        confidence: simulationResult.confidence,
        factors: [...(result.riskFactors || []), ...(result.keyFactors || [])],
        analyzedAt: new Date(),
        status: 'completed',
        isNewContribution: true,
        parsingMetadata: jobData.parsingMetadata,
        metadata: {
          // Real detailed analyzer processing data from API response
          algorithmAssessment: result.metadata?.algorithmAssessment,
          riskFactorsAnalysis: result.metadata?.riskFactorsAnalysis,
          recommendation: result.metadata?.recommendation,
          analysisDetails: result.metadata?.analysisDetails,

          // Legacy detailed analysis for fallback (using simulation for terminal display)
          rawData: {
            detailedAnalysis: {
              thoughtProcess: logs.filter(log => log.type === 'analysis').map(log => log.message),
              riskFactors: simulationResult.riskFactors,
              legitimacyIndicators: simulationResult.legitimacyIndicators,
              finalAssessment: `Analysis completed with ${Math.round(simulationResult.confidence * 100)}% confidence. Ghost probability: ${Math.round(result.ghostProbability * 100)}%`
            }
          }
        }
      }

      console.log('📊 Final analysis object created:', analysis);
      console.log('🎯 Setting current analysis in state...');
      
      // Add debugging for state update
      console.log('📋 Current analysis state before update:', currentAnalysis ? 'exists' : 'null');
      setCurrentAnalysis(analysis)
      console.log('📋 setCurrentAnalysis called with:', { id: analysis.id, title: analysis.title });
      
      addToHistory(analysis)
      triggerHistoryRefresh() // Refresh database history in History tab
      urlForm.reset()
      console.log('✅ Analysis state updated successfully!');
      
      // Verify state was set (this will run on next render)
      setTimeout(() => {
        console.log('🔍 Verification: currentAnalysis state after 100ms:', currentAnalysis ? 'exists' : 'still null');
      }, 100);
    } catch (error) {
      console.error('Analysis failed:', error)
      
      // Show user-friendly error message for specific cases
      if (error instanceof Error) {
        if (error.message.includes('Cannot automatically extract') && error.message.includes('anti-bot protection')) {
          // LinkedIn/Glassdoor extraction blocked - show helpful message
          alert(`🤖 ${error.message}\n\n💡 Tip: Copy the job title, company name, and description from the webpage and paste them into the manual entry form below.`)
        } else if (error.message.includes('Failed to fetch content')) {
          // CORS/network error - show general message  
          alert(`🌐 Unable to automatically extract job details due to website restrictions.\n\nPlease enter the job information manually below.`)
        } else {
          // Other errors - show generic message
          alert(`❌ Analysis failed: ${error.message}\n\nPlease try again or enter job details manually.`)
        }
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  const onSubmitPdf = async (_data: PdfAnalysisForm) => {
    if (!selectedPdf) return
    
    setIsAnalyzing(true)
    setCurrentAnalysis(null)

    try {
      // Extract job data from PDF (including URL from header/footer)
      const jobData = await AnalysisService.extractJobDataFromPDF(selectedPdf);
      
      if (!jobData.sourceUrl) {
        throw new Error('Could not find URL in PDF header/footer. Please ensure the PDF was saved with headers and footers enabled.');
      }

      // Check if this job has already been analyzed using the extracted URL
      const existingAnalysis = findExistingAnalysis(jobData.sourceUrl)
      
      if (existingAnalysis) {
        // Job already analyzed - show existing results
        setCurrentAnalysis(existingAnalysis)
        addToHistory(existingAnalysis) // This will move it to top without marking as new
        triggerHistoryRefresh() // Refresh database history in History tab
        pdfForm.reset()
        setSelectedPdf(null)
        setIsAnalyzing(false)
        return
      }

      // New job - run analysis using extracted URL and data
      const result = await AnalysisService.analyzeJob(jobData.sourceUrl, {
        title: jobData.title,
        company: jobData.company,
        description: jobData.content || '', // Use PDF content as description
        location: undefined, // PDF extraction doesn't provide location yet
        remoteFlag: false, // PDF extraction doesn't provide remote flag yet  
        postedAt: undefined // PDF extraction doesn't provide posted date yet
      });

      const analysis: JobAnalysis = {
        id: result.id,
        jobUrl: jobData.sourceUrl,
        title: result.jobData?.title || jobData.title,
        company: result.jobData?.company || jobData.company,
        ghostProbability: result.ghostProbability,
        confidence: 0.8, // Default confidence since API doesn't return it
        factors: [...(result.riskFactors || []), ...(result.keyFactors || [])],
        analyzedAt: new Date(),
        status: 'completed',
        isNewContribution: true
      }

      setCurrentAnalysis(analysis)
      addToHistory(analysis)
      triggerHistoryRefresh() // Refresh database history in History tab
      pdfForm.reset()
      setSelectedPdf(null)
    } catch (error) {
      console.error('PDF Analysis failed:', error)
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze PDF. Please ensure the PDF contains header/footer information with the job URL.'
      alert(errorMessage)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file)
    
    const bulkJob = {
      id: Math.random().toString(36).substr(2, 9),
      fileName: file.name,
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      status: 'uploading' as const,
      createdAt: new Date(),
      results: []
    }

    addBulkJob(bulkJob)
  }

  const handleLinkedInSearchAnalysis = async () => {
    if (!linkedInSearchUrl.trim()) return
    
    setIsBulkAnalyzing(true)
    try {
      const jobUrls = await AnalysisService.extractJobsFromLinkedInSearch(linkedInSearchUrl)
      
      const bulkJob = {
        id: Math.random().toString(36).substr(2, 9),
        fileName: `LinkedIn Search (${jobUrls.length} jobs)`,
        totalJobs: jobUrls.length,
        completedJobs: 0,
        failedJobs: 0,
        status: 'processing' as const,
        createdAt: new Date(),
        results: []
      }

      addBulkJob(bulkJob)
      setLinkedInSearchUrl('')
      
      // TODO: Process jobs in background
      console.log('Found LinkedIn jobs:', jobUrls)
    } catch (error) {
      console.error('LinkedIn search analysis failed:', error)
    } finally {
      setIsBulkAnalyzing(false)
    }
  }

  const handleCareerSiteAnalysis = async () => {
    if (!careerSiteUrl.trim()) return
    
    setIsBulkAnalyzing(true)
    try {
      const jobUrls = await AnalysisService.extractJobsFromCareerSite(careerSiteUrl)
      
      const bulkJob = {
        id: Math.random().toString(36).substr(2, 9),
        fileName: `Career Site Crawl (${jobUrls.length} jobs)`,
        totalJobs: jobUrls.length,
        completedJobs: 0,
        failedJobs: 0,
        status: 'processing' as const,
        createdAt: new Date(),
        results: []
      }

      addBulkJob(bulkJob)
      setCareerSiteUrl('')
      
      // TODO: Process jobs in background
      console.log('Found career site jobs:', jobUrls)
    } catch (error) {
      console.error('Career site analysis failed:', error)
    } finally {
      setIsBulkAnalyzing(false)
    }
  }

  const handleShowFeedback = (analysis: JobAnalysis) => {
    setFeedbackData({
      title: analysis.title,
      company: analysis.company,
      location: undefined, // We don't have location in JobAnalysis type yet
      url: analysis.jobUrl
    })
    setShowFeedbackModal(true)
  }

  const handleSubmitFeedback = async (feedback: {
    correctTitle?: string
    correctCompany?: string
    correctLocation?: string
    feedbackType: 'correction' | 'confirmation'
    notes?: string
  }) => {
    if (!feedbackData) return

    try {
      // Submit feedback to the database via API
      const response = await fetch('/api/agent?mode=feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: feedbackData.url,
          originalTitle: feedbackData.title,
          originalCompany: feedbackData.company,
          originalLocation: feedbackData.location,
          correctTitle: feedback.correctTitle,
          correctCompany: feedback.correctCompany,
          correctLocation: feedback.correctLocation,
          feedbackType: feedback.feedbackType,
          notes: feedback.notes
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Feedback submitted successfully:', result.correctionId)
        addLog('success', `✅ ${result.message}`)

        // If this is a correction, update the current analysis display
        if (feedback.feedbackType === 'correction' && currentAnalysis && currentAnalysis.jobUrl === feedbackData.url) {
          const updatedAnalysis = { ...currentAnalysis }
          if (feedback.correctTitle) updatedAnalysis.title = feedback.correctTitle
          if (feedback.correctCompany) updatedAnalysis.company = feedback.correctCompany
          if (feedback.correctLocation) updatedAnalysis.location = feedback.correctLocation
          
          setCurrentAnalysis(updatedAnalysis)
          addToHistory(updatedAnalysis)
          triggerHistoryRefresh() // Refresh database history in History tab
        }
      } else {
        throw new Error(result.message || 'Failed to submit feedback')
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      addLog('error', `❌ Failed to submit feedback: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Also update local learning service for immediate improvements
    try {
      const learningService = ParsingLearningService.getInstance()
      
      if (feedback.feedbackType === 'correction') {
        const improvements = await learningService.learnFromFailedParse(
          feedbackData.url,
          '', // We don't have HTML here, but the method can work without it for user feedback
          {
            title: feedbackData.title,
            company: feedbackData.company,
            location: feedbackData.location
          },
          {
            correctTitle: feedback.correctTitle,
            correctCompany: feedback.correctCompany,
            correctLocation: feedback.correctLocation
          }
        )
        console.log('🎓 Local learning service updated:', improvements.improvements.length, 'improvements')
      }
    } catch (learningError) {
      console.warn('⚠️ Local learning service update failed:', learningError)
      // Don't show error to user since database submission was successful
    }

    setShowFeedbackModal(false)
    setFeedbackData(null)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Job Analysis Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Analyze job postings from URLs, PDF uploads, or CSV files for bulk ghost job detection
        </p>
      </div>

      {/* Live Metadata Integration - Re-enabled with Enhanced Error Handling */}
      <MetadataIntegration
        isAnalyzing={isAnalyzing}
        currentJobUrl={urlForm.watch('jobUrl') || ''}
        analysisResult={currentAnalysis || undefined}
      />

      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('url')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'url'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          <LinkIcon className="w-4 h-4" />
          <span>URL Analysis</span>
        </button>
        <button
          onClick={() => setActiveTab('pdf')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'pdf'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>PDF Upload</span>
        </button>
      </div>

      {activeTab === 'url' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <form onSubmit={urlForm.handleSubmit(onSubmitUrl)} className="space-y-4">
            <div>
              <label htmlFor="jobUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Job URL (LinkedIn, company career pages, Indeed, etc.)
              </label>
              <input
                {...urlForm.register('jobUrl')}
                type="url"
                id="jobUrl"
                placeholder="https://www.linkedin.com/jobs/view/1234567890 or https://careers.company.com/jobs/123"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {urlForm.formState.errors.jobUrl && (
                <p className="mt-1 text-sm text-red-600">{urlForm.formState.errors.jobUrl.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isAnalyzing}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4" />
                  <span>Analyze Job</span>
                </>
              )}
            </button>
          </form>

          {/* Debug Button - Only in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Debug: Test Terminal</h4>
                  <p className="text-xs text-yellow-600">Development mode - Test terminal logging</p>
                </div>
                <button
                  onClick={() => {
                    setShowTerminal(true);
                    addLog('info', '🧪 Development test log');
                    addLog('process', '🔧 Testing terminal functionality');
                    addLog('success', '✅ Terminal logging working correctly!');
                  }}
                  className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                >
                  Test Logs
                </button>
              </div>
              <div className="mt-3 text-xs">
                <div className="text-yellow-800">
                  <strong>Debug Info:</strong><br/>
                  isAnalyzing: {String(isAnalyzing)}<br/>
                  currentAnalysis: {currentAnalysis ? 'Set' : 'null'}<br/>
                  {currentAnalysis && (
                    <>
                      Analysis ID: {currentAnalysis.id}<br/>
                      Title: {currentAnalysis.title}<br/>
                      Ghost Probability: {currentAnalysis.ghostProbability}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI Thinking Terminal */}
          {showTerminal && (
            <div className="mt-6">
              <AIThinkingTerminal
                isVisible={showTerminal}
                isAnalyzing={isAnalyzing}
                logs={logs}
                onClear={clearLogs}
                onClose={() => setShowTerminal(false)}
              />
            </div>
          )}

          {/* Debug: Check currentAnalysis state at render time */}
          {(() => {
            if (process.env.NODE_ENV === 'development') {
              console.log('🎨 Render check: currentAnalysis =', currentAnalysis ? `${currentAnalysis.title} (${currentAnalysis.id})` : 'null');
            }
            return null;
          })()}
          
          {currentAnalysis && currentAnalysis.title && currentAnalysis.company && (
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Analysis Results</h3>
                </div>
                <button
                  onClick={() => handleShowFeedback(currentAnalysis)}
                  className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Improve Parsing</span>
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{currentAnalysis.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{currentAnalysis.company}</p>
                  </div>
                  <GhostJobBadge 
                    probability={currentAnalysis.ghostProbability}
                    confidence={currentAnalysis.confidence}
                  />
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Key Factors:</h5>
                  <ul className="space-y-1">
                    {currentAnalysis.factors.map((factor, index) => (
                      <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start">
                        <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'pdf' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <form onSubmit={pdfForm.handleSubmit(onSubmitPdf)} className="space-y-6">
            <PDFUpload
              onFileSelect={(file) => {
                setSelectedPdf(file)
                pdfForm.setValue('pdfFile', file)
              }}
              disabled={isAnalyzing}
            />

            {selectedPdf && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Upload className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      PDF Ready for Analysis
                    </p>
                    <p className="text-sm text-green-700">
                      {selectedPdf.name} ({(selectedPdf.size / 1024).toFixed(1)} KB)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {pdfForm.formState.errors.pdfFile && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{pdfForm.formState.errors.pdfFile.message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isAnalyzing || !selectedPdf}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing PDF...</span>
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4" />
                  <span>Analyze PDF</span>
                </>
              )}
            </button>
          </form>

          {currentAnalysis && (
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Analysis Results</h3>
                </div>
                <button
                  onClick={() => handleShowFeedback(currentAnalysis)}
                  className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Improve Parsing</span>
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{currentAnalysis.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{currentAnalysis.company}</p>
                  </div>
                  <GhostJobBadge 
                    probability={currentAnalysis.ghostProbability}
                    confidence={currentAnalysis.confidence}
                  />
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Key Factors:</h5>
                  <ul className="space-y-1">
                    {currentAnalysis.factors.map((factor, index) => (
                      <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start">
                        <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk analysis section hidden for v0.1 */}
      {false && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Bulk Job Analysis</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Analyze multiple job postings at once using CSV files, LinkedIn search URLs, or career site URLs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CSV Upload */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">CSV File Upload</h4>
              <p className="text-xs text-gray-500 mb-3">Upload a CSV with job URLs</p>
              <FileUpload 
                onFileSelect={handleFileUpload}
                accept=".csv"
                maxSize={10 * 1024 * 1024}
              />
            </div>

            {/* LinkedIn Search URL */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">LinkedIn Search</h4>
              <p className="text-xs text-gray-500 mb-3">Paste LinkedIn jobs search URL</p>
              <textarea
                value={linkedInSearchUrl}
                onChange={(e) => setLinkedInSearchUrl(e.target.value)}
                placeholder="https://www.linkedin.com/jobs/search/?currentJobId=4283562303&f_C=2582861..."
                className="w-full h-20 text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none"
              />
              <button 
                onClick={handleLinkedInSearchAnalysis}
                disabled={isBulkAnalyzing || !linkedInSearchUrl.trim()}
                className="w-full mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBulkAnalyzing ? 'Analyzing...' : 'Analyze Search Results'}
              </button>
            </div>

            {/* Career Site URL */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Career Site Crawl</h4>
              <p className="text-xs text-gray-500 mb-3">Crawl company career pages</p>
              <input
                type="url"
                value={careerSiteUrl}
                onChange={(e) => setCareerSiteUrl(e.target.value)}
                placeholder="https://careers.company.com/jobs"
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              />
              <button 
                onClick={handleCareerSiteAnalysis}
                disabled={isBulkAnalyzing || !careerSiteUrl.trim()}
                className="w-full mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBulkAnalyzing ? 'Crawling...' : 'Crawl & Analyze'}
              </button>
            </div>
          </div>
          
          {uploadedFile && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>File uploaded:</strong> {uploadedFile!.name} ({(uploadedFile!.size / 1024).toFixed(1)} KB)
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Processing will begin automatically. You can monitor progress in the history section.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Parsing Feedback Modal */}
      {feedbackData && (
        <ParsingFeedbackModal
          isVisible={showFeedbackModal}
          onClose={() => {
            setShowFeedbackModal(false)
            setFeedbackData(null)
          }}
          originalData={feedbackData}
          onSubmitFeedback={handleSubmitFeedback}
        />
      )}
    </div>
  )
}