import { useState } from 'react'
import { BarChart3, History as HistoryIcon, Shield } from 'lucide-react'
import { Analytics } from '@vercel/analytics/react'
import { JobAnalysisDashboard } from '@/features/detection/JobAnalysisDashboard'
import { AnalysisHistory } from '@/features/detection/AnalysisHistory'
import { NewsImpactButton } from '@/components/NewsImpactButton'
import { NewsImpactPage } from '@/components/NewsImpactPage'

type ActiveView = 'dashboard' | 'history' | 'news'

function App() {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Ghost Job Detector</h1>
                <NewsImpactButton onClick={() => setActiveView('news')} />
              </div>
            </div>

            <div className="flex space-x-1">
              <button
                onClick={() => setActiveView('dashboard')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'dashboard'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => setActiveView('history')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'history'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <HistoryIcon className="w-4 h-4" />
                <span>History</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-8">
        {activeView === 'dashboard' && <JobAnalysisDashboard />}
        {activeView === 'history' && <AnalysisHistory />}
      </main>

      <footer className="bg-white border-t mt-16">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>&copy; 2025 Ghost Job Detector. Detecting fake job postings with 95%+ accuracy.</p>
            <div className="flex items-center space-x-4">
              <span>Model Version: v0.1.6</span>
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