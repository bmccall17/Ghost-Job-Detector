import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { JobAnalysis, BulkAnalysisJob } from '@/types'

interface AnalysisState {
  currentAnalysis: JobAnalysis | null
  analysisHistory: JobAnalysis[]
  bulkJobs: BulkAnalysisJob[]
  isAnalyzing: boolean
  refreshHistoryTrigger: number
  
  setCurrentAnalysis: (analysis: JobAnalysis | null) => void
  addToHistory: (analysis: JobAnalysis) => void
  updateAnalysis: (id: string, updates: Partial<JobAnalysis>) => void
  addBulkJob: (job: BulkAnalysisJob) => void
  updateBulkJob: (id: string, updates: Partial<BulkAnalysisJob>) => void
  setIsAnalyzing: (isAnalyzing: boolean) => void
  clearHistory: () => void
  findExistingAnalysis: (jobUrl: string) => JobAnalysis | null
  triggerHistoryRefresh: () => void
}

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set, get) => ({
      currentAnalysis: null,
      analysisHistory: [],
      bulkJobs: [],
      isAnalyzing: false,
      refreshHistoryTrigger: 0,

      setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),

      addToHistory: (analysis) => set((state) => {
        // Check if this URL already exists to avoid duplicates
        const existingIndex = state.analysisHistory.findIndex(
          existing => existing.jobUrl === analysis.jobUrl
        )
        
        if (existingIndex >= 0) {
          // Update existing analysis and move to top
          const updatedHistory = [...state.analysisHistory]
          updatedHistory[existingIndex] = { ...analysis, isNewContribution: false }
          updatedHistory.unshift(updatedHistory.splice(existingIndex, 1)[0])
          return { analysisHistory: updatedHistory }
        } else {
          // New analysis - mark as new contribution
          return {
            analysisHistory: [{ ...analysis, isNewContribution: true }, ...state.analysisHistory]
          }
        }
      }),

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
      }),

      findExistingAnalysis: (jobUrl) => {
        const state = get()
        return state.analysisHistory.find(analysis => analysis.jobUrl === jobUrl) || null
      },

      triggerHistoryRefresh: () => set((state) => ({
        refreshHistoryTrigger: state.refreshHistoryTrigger + 1
      }))
    }),
    {
      name: 'ghost-job-detector-storage',
      partialize: (state) => ({
        analysisHistory: state.analysisHistory,
        bulkJobs: state.bulkJobs,
        refreshHistoryTrigger: state.refreshHistoryTrigger
      })
    }
  )
)