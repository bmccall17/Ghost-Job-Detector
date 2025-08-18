import React, { useState, useEffect, useRef } from 'react'
import { Terminal, Minimize2, Maximize2, X, Copy, Download } from 'lucide-react'

export interface ThinkingLogEntry {
  timestamp: string
  type: 'info' | 'process' | 'analysis' | 'warning' | 'success' | 'error'
  message: string
  details?: string
}

interface AIThinkingTerminalProps {
  isVisible: boolean
  isAnalyzing: boolean
  logs: ThinkingLogEntry[]
  onClear: () => void
  onClose?: () => void
}

export const AIThinkingTerminal: React.FC<AIThinkingTerminalProps> = ({
  isVisible,
  isAnalyzing,
  logs,
  onClear,
  onClose
}) => {
  const [isMinimized, setIsMinimized] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [logs])

  // Add cursor blink animation when analyzing
  useEffect(() => {
    if (!isAnalyzing && terminalRef.current) {
      // Add final prompt when analysis completes
      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = contentRef.current.scrollHeight
        }
      }, 100)
    }
  }, [isAnalyzing])

  const handleCopyLogs = () => {
    const logText = logs.map(log => `[${log.timestamp}] ${log.message}${log.details ? `\n  ${log.details}` : ''}`).join('\n')
    navigator.clipboard.writeText(logText)
  }

  const handleDownloadLogs = () => {
    const logText = logs.map(log => `[${log.timestamp}] ${log.message}${log.details ? `\n  ${log.details}` : ''}`).join('\n')
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ghost-job-analysis-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.log`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getTypeColor = (type: ThinkingLogEntry['type']) => {
    switch (type) {
      case 'info': return 'text-blue-400'
      case 'process': return 'text-yellow-400'
      case 'analysis': return 'text-purple-400'
      case 'warning': return 'text-orange-400'
      case 'success': return 'text-green-400'
      case 'error': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getTypePrefix = (type: ThinkingLogEntry['type']) => {
    switch (type) {
      case 'info': return '[INFO]'
      case 'process': return '[PROC]'
      case 'analysis': return '[ANLZ]'
      case 'warning': return '[WARN]'
      case 'success': return '[SUCC]'
      case 'error': return '[ERRR]'
      default: return '[    ]'
    }
  }

  if (!isVisible) return null

  return (
    <div
      ref={terminalRef}
      className={`bg-gray-900 border border-gray-700 rounded-lg shadow-2xl transition-all duration-300 ${
        isFullscreen 
          ? 'fixed inset-4 z-50' 
          : isMinimized 
          ? 'h-12' 
          : 'h-96'
      }`}
    >
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-green-400" />
            <span className="text-sm font-mono text-gray-300">
              ghost-job-analyzer {isAnalyzing && <span className="animate-pulse">● analyzing</span>}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyLogs}
            className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
            title="Copy logs"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownloadLogs}
            className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
            title="Download logs"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onClear}
            className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
            title="Clear logs"
          >
            <span className="text-xs font-mono">clear</span>
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
            title={isMinimized ? "Restore" : "Minimize"}
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-red-400 transition-colors"
              title="Close terminal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Content */}
      {!isMinimized && (
        <div
          ref={contentRef}
          className="p-4 font-mono text-sm text-gray-300 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
          style={{ height: isFullscreen ? 'calc(100vh - 120px)' : '340px' }}
        >
          {/* Initial prompt */}
          <div className="text-green-400 mb-2">
            <span className="text-gray-500">ghost-job-detector@ai-analyzer</span>
            <span className="text-white">:</span>
            <span className="text-blue-400">~/analysis</span>
            <span className="text-white">$ </span>
            <span className="text-green-400">initialize --mode=investigative</span>
          </div>

          {/* Log entries */}
          <div className="space-y-1">
            {logs.map((log, index) => (
              <div key={index} className="group">
                <div className="flex items-start space-x-2">
                  <span className="text-gray-500 text-xs font-mono shrink-0">
                    {log.timestamp}
                  </span>
                  <span className={`text-xs font-bold shrink-0 ${getTypeColor(log.type)}`}>
                    {getTypePrefix(log.type)}
                  </span>
                  <span className="text-gray-300 break-words">
                    {log.message}
                  </span>
                </div>
                {log.details && (
                  <div className="ml-20 text-gray-400 text-xs mt-1 pl-4 border-l border-gray-700">
                    {log.details}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Cursor when analyzing */}
          {isAnalyzing && (
            <div className="flex items-center mt-4">
              <span className="text-green-400">
                <span className="text-gray-500">ghost-job-detector@ai-analyzer</span>
                <span className="text-white">:</span>
                <span className="text-blue-400">~/analysis</span>
                <span className="text-white">$ </span>
              </span>
              <span className="ml-1 bg-green-400 text-gray-900 animate-pulse">█</span>
            </div>
          )}

          {/* Final prompt when done */}
          {!isAnalyzing && logs.length > 0 && (
            <div className="mt-4 text-green-400">
              <span className="text-gray-500">ghost-job-detector@ai-analyzer</span>
              <span className="text-white">:</span>
              <span className="text-blue-400">~/analysis</span>
              <span className="text-white">$ </span>
              <span className="text-gray-400">analysis complete ✓</span>
            </div>
          )}

          {/* Empty state */}
          {logs.length === 0 && !isAnalyzing && (
            <div className="text-gray-500 italic">
              Waiting for job analysis to begin...
              <br />
              <span className="text-xs">Terminal will show AI thought process and verification steps</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}