import { useState } from 'react'
import { BarChart3, History as HistoryIcon } from 'lucide-react'
import { Analytics } from '@vercel/analytics/react'
import { JobAnalysisDashboard } from '@/features/detection/JobAnalysisDashboard'
import { AnalysisHistory } from '@/features/detection/AnalysisHistory'
import { NewsImpactButton } from '@/components/NewsImpactButton'
import { NewsImpactPage } from '@/components/NewsImpactPage'
import { ThemeProvider, ThemeToggle } from '@/components/ThemeToggle'
import LiveMetadataTest from '@/features/metadata/LiveMetadataTest'
import { MetadataErrorBoundary } from '@/features/metadata/components/ErrorBoundary'

type ActiveView = 'dashboard' | 'history' | 'news' | 'metadata-test'

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

function AppContent() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard')

  // If viewing news page, render it directly without navigation
  if (activeView === 'news') {
    return (
      <>
        <NewsImpactPage onBack={() => setActiveView('dashboard')} />
        <Analytics />
      </>
    )
  }

  // If viewing metadata test, render it directly
  if (activeView === 'metadata-test') {
    return (
      <>
        <div className="p-4">
          <button 
            onClick={() => setActiveView('dashboard')}
            className="mb-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
        <LiveMetadataTest />
        <Analytics />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 rounded-lg shadow-lg">
                <img src="/logo.svg" alt="Ghost Job Detector" className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Ghost Job Detector</h1>
                <NewsImpactButton onClick={() => setActiveView('news')} />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'dashboard'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => setActiveView('history')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'history'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <HistoryIcon className="w-4 h-4" />
                  <span>History</span>
                </button>
                <button
                  onClick={() => setActiveView('metadata-test')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    (activeView as string) === 'metadata-test'
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span>🔍</span>
                  <span>Metadata Test</span>
                </button>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      <main className="py-8">
        <MetadataErrorBoundary fallback={
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-6 text-center">
              <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
                Application Error
              </h2>
              <p className="text-red-600 dark:text-red-300 mb-4">
                The dashboard encountered an error and needs to be reloaded.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Reload Dashboard
              </button>
            </div>
          </div>
        }>
          {activeView === 'dashboard' && <JobAnalysisDashboard />}
          {activeView === 'history' && <AnalysisHistory />}
        </MetadataErrorBoundary>
      </main>

      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <p>&copy; 2025 Ghost Job Detector. Detecting fake job postings with 95%+ accuracy.</p>
            <div className="flex items-center space-x-4">
              <span>Model Version: v0.1.8</span>
              <span>•</span>
              <span>Last Updated: {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </footer>
      <Analytics />
    </div>
  )
}

export default App