import { create } from 'zustand'
import { JobAnalysis, BulkAnalysisJob } from '@/types'

interface AnalysisState {
  currentAnalysis: JobAnalysis | null
  analysisHistory: JobAnalysis[]
  bulkJobs: BulkAnalysisJob[]
  isAnalyzing: boolean
  
  setCurrentAnalysis: (analysis: JobAnalysis | null) => void
  addToHistory: (analysis: JobAnalysis) => void
  updateAnalysis: (id: string, updates: Partial<JobAnalysis>) => void
  addBulkJob: (job: BulkAnalysisJob) => void
  updateBulkJob: (id: string, updates: Partial<BulkAnalysisJob>) => void
  setIsAnalyzing: (isAnalyzing: boolean) => void
  clearHistory: () => void
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  currentAnalysis: null,
  analysisHistory: [],
  bulkJobs: [],
  isAnalyzing: false,

  setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),

  addToHistory: (analysis) => set((state) => ({
    analysisHistory: [analysis, ...state.analysisHistory]
  })),

  updateAnalysis: (id, updates) => set((state) => ({
    analysisHistory: state.analysisHistory.map(analysis =>
      analysis.id === id ? { ...analysis, ...updates } : analysis
    ),
    currentAnalysis: state.currentAnalysis?.id === id
      ? { ...state.currentAnalysis, ...updates }
      : state.currentAnalysis
  })),

  addBulkJob: (job) => set((state) => ({
    bulkJobs: [job, ...state.bulkJobs]
  })),

  updateBulkJob: (id, updates) => set((state) => ({
    bulkJobs: state.bulkJobs.map(job =>
      job.id === id ? { ...job, ...updates } : job
    )
  })),

  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),

  clearHistory: () => set({
    analysisHistory: [],
    bulkJobs: [],
    currentAnalysis: null
  })
}))