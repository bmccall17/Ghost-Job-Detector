import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Link as LinkIcon, Upload, BarChart3 } from 'lucide-react'
import { useAnalysisStore } from '@/stores/analysisStore'
import { AnalysisService } from '@/services/analysisService'
import { FileUpload } from '@/components/FileUpload'
import { GhostJobBadge } from '@/components/GhostJobBadge'
import { NewContributionBadge } from '@/components/NewContributionBadge'
import { JobAnalysis } from '@/types'

const urlAnalysisSchema = z.object({
  jobUrl: z.string().url('Please enter a valid job URL')
})

const pdfAnalysisSchema = z.object({
  sourceUrl: z.string().url('Please enter the source URL for this job posting'),
  pdfFile: z.instanceof(File).refine(
    (file) => file.type === 'application/pdf',
    'Please upload a PDF file'
  )
})

type UrlAnalysisForm = z.infer<typeof urlAnalysisSchema>
type PdfAnalysisForm = z.infer<typeof pdfAnalysisSchema>

export const JobAnalysisDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'url' | 'pdf' | 'bulk'>('url')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null)
  
  const {
    currentAnalysis,
    isAnalyzing,
    setCurrentAnalysis,
    addToHistory,
    setIsAnalyzing,
    addBulkJob,
    findExistingAnalysis
  } = useAnalysisStore()

  const urlForm = useForm<UrlAnalysisForm>({
    resolver: zodResolver(urlAnalysisSchema)
  })

  const pdfForm = useForm<PdfAnalysisForm>({
    resolver: zodResolver(pdfAnalysisSchema)
  })

  const onSubmitUrl = async (data: UrlAnalysisForm) => {
    setIsAnalyzing(true)
    setCurrentAnalysis(null)

    try {
      // Check if this job has already been analyzed
      const existingAnalysis = findExistingAnalysis(data.jobUrl)
      
      if (existingAnalysis) {
        // Job already analyzed - show existing results
        setCurrentAnalysis(existingAnalysis)
        addToHistory(existingAnalysis) // This will move it to top without marking as new
        urlForm.reset()
        setIsAnalyzing(false)
        return
      }

      // New job - extract data and run analysis
      const [jobData, result] = await Promise.all([
        AnalysisService.extractJobData(data.jobUrl),
        AnalysisService.mockAnalyzeJob(data.jobUrl)
      ])

      const analysis: JobAnalysis = {
        id: result.id,
        jobUrl: data.jobUrl,
        title: jobData.title,
        company: jobData.company,
        ghostProbability: result.ghostProbability,
        confidence: result.confidence,
        factors: result.factors.map(f => f.description),
        analyzedAt: new Date(),
        status: 'completed',
        isNewContribution: true
      }

      setCurrentAnalysis(analysis)
      addToHistory(analysis)
      urlForm.reset()
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const onSubmitPdf = async (data: PdfAnalysisForm) => {
    if (!selectedPdf) return
    
    setIsAnalyzing(true)
    setCurrentAnalysis(null)

    try {
      // Check if this job has already been analyzed
      const existingAnalysis = findExistingAnalysis(data.sourceUrl)
      
      if (existingAnalysis) {
        // Job already analyzed - show existing results
        setCurrentAnalysis(existingAnalysis)
        addToHistory(existingAnalysis) // This will move it to top without marking as new
        pdfForm.reset()
        setSelectedPdf(null)
        setIsAnalyzing(false)
        return
      }

      // New job - extract data from PDF and run analysis
      const [jobData, result] = await Promise.all([
        AnalysisService.extractJobDataFromPDF(selectedPdf, data.sourceUrl),
        AnalysisService.mockAnalyzeJob(data.sourceUrl)
      ])

      const analysis: JobAnalysis = {
        id: result.id,
        jobUrl: data.sourceUrl,
        title: jobData.title,
        company: jobData.company,
        ghostProbability: result.ghostProbability,
        confidence: result.confidence,
        factors: result.factors.map(f => f.description),
        analyzedAt: new Date(),
        status: 'completed',
        isNewContribution: true
      }

      setCurrentAnalysis(analysis)
      addToHistory(analysis)
      pdfForm.reset()
      setSelectedPdf(null)
    } catch (error) {
      console.error('PDF Analysis failed:', error)
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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Job Analysis Dashboard</h1>
        <p className="text-gray-600">
          Analyze job postings from URLs, PDF uploads, or CSV files for bulk ghost job detection
        </p>
      </div>

      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('url')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'url'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <LinkIcon className="w-4 h-4" />
          <span>URL Analysis</span>
        </button>
        <button
          onClick={() => setActiveTab('pdf')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'pdf'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>PDF Upload</span>
        </button>
        <button
          onClick={() => setActiveTab('bulk')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'bulk'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Bulk Analysis</span>
        </button>
      </div>

      {activeTab === 'url' && (
        <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
          <form onSubmit={urlForm.handleSubmit(onSubmitUrl)} className="space-y-4">
            <div>
              <label htmlFor="jobUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Job URL (LinkedIn, company career pages, Indeed, etc.)
              </label>
              <input
                {...urlForm.register('jobUrl')}
                type="url"
                id="jobUrl"
                placeholder="https://careers.blackbaud.com/us/en/job/R0012886/Manager-Product-Management-Grantmaking"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

          {currentAnalysis && (
            <div className="border-t pt-6">
              <div className="flex items-center space-x-3 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Analysis Results</h3>
                <NewContributionBadge isNew={currentAnalysis.isNewContribution} />
              </div>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{currentAnalysis.title}</h4>
                    <p className="text-sm text-gray-600">{currentAnalysis.company}</p>
                  </div>
                  <GhostJobBadge 
                    probability={currentAnalysis.ghostProbability}
                    confidence={currentAnalysis.confidence}
                  />
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Key Factors:</h5>
                  <ul className="space-y-1">
                    {currentAnalysis.factors.map((factor, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
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
        <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
          <form onSubmit={pdfForm.handleSubmit(onSubmitPdf)} className="space-y-4">
            <div>
              <label htmlFor="sourceUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Source URL (where this job posting is from)
              </label>
              <input
                {...pdfForm.register('sourceUrl')}
                type="url"
                id="sourceUrl"
                placeholder="https://careers.blackbaud.com/us/en/job/R0012886/Manager-Product-Management-Grantmaking"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {pdfForm.formState.errors.sourceUrl && (
                <p className="mt-1 text-sm text-red-600">{pdfForm.formState.errors.sourceUrl.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="pdfFile" className="block text-sm font-medium text-gray-700 mb-2">
                Upload Job Posting PDF
              </label>
              <input
                type="file"
                id="pdfFile"
                accept=".pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setSelectedPdf(file)
                    pdfForm.setValue('pdfFile', file)
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {pdfForm.formState.errors.pdfFile && (
                <p className="mt-1 text-sm text-red-600">{pdfForm.formState.errors.pdfFile.message}</p>
              )}
              {selectedPdf && (
                <p className="mt-1 text-sm text-green-600">
                  Selected: {selectedPdf.name} ({(selectedPdf.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isAnalyzing || !selectedPdf}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="flex items-center space-x-3 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Analysis Results</h3>
                <NewContributionBadge isNew={currentAnalysis.isNewContribution} />
              </div>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{currentAnalysis.title}</h4>
                    <p className="text-sm text-gray-600">{currentAnalysis.company}</p>
                  </div>
                  <GhostJobBadge 
                    probability={currentAnalysis.ghostProbability}
                    confidence={currentAnalysis.confidence}
                  />
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Key Factors:</h5>
                  <ul className="space-y-1">
                    {currentAnalysis.factors.map((factor, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
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

      {activeTab === 'bulk' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Job Analysis</h3>
          <FileUpload 
            onFileSelect={handleFileUpload}
            accept=".csv"
            maxSize={10 * 1024 * 1024}
          />
          
          {uploadedFile && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>File uploaded:</strong> {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Processing will begin automatically. You can monitor progress in the history section.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}