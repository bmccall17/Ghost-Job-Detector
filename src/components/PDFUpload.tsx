import React, { useCallback, useState } from 'react'
import { Upload, FileText, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react'

interface PDFUploadProps {
  onFileSelect: (file: File) => void
  maxSize?: number
  disabled?: boolean
}

export const PDFUpload: React.FC<PDFUploadProps> = ({
  onFileSelect,
  maxSize = 10 * 1024 * 1024, // 10MB
  disabled = false
}) => {
  const [showInstructions, setShowInstructions] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type === 'application/pdf' && droppedFile.size <= maxSize) {
      onFileSelect(droppedFile)
    }
  }, [onFileSelect, maxSize])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      onFileSelect(selectedFile)
    }
  }, [onFileSelect])

  return (
    <div className="space-y-4">
      {/* Instructions Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              Important: Save PDF with Header and Footer Information
            </h3>
            <p className="text-sm text-blue-800 mb-3">
              To ensure accurate analysis, your PDF must include the original job posting URL. 
              Follow these steps when saving the job posting as a PDF:
            </p>
            
            <div className="space-y-2 text-sm text-blue-800">
              <div className="flex items-start space-x-2">
                <span className="font-medium text-blue-900">1.</span>
                <span>When printing/saving the job posting to PDF, ensure <strong>Headers and Footers</strong> are enabled</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-medium text-blue-900">2.</span>
                <span>The system will automatically extract the URL from the footer (e.g., "https://apply.deloitte.com/...")</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-medium text-blue-900">3.</span>
                <span>No need to manually enter the URL - it will be detected from the PDF footer</span>
              </div>
            </div>

            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 underline"
            >
              {showInstructions ? 'Hide' : 'Show'} detailed instructions
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Instructions */}
      {showInstructions && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Browser-Specific Instructions:</h4>
          
          <div className="space-y-4 text-sm text-gray-700">
            {/* Chrome Instructions */}
            <div className="border-l-4 border-blue-400 pl-4">
              <h5 className="font-medium text-gray-900">Chrome/Edge:</h5>
              <ol className="list-decimal list-inside space-y-1 mt-1">
                <li>Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+P</kbd> (or <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Cmd+P</kbd> on Mac)</li>
                <li>Click "More settings"</li>
                <li>Check ✅ "Headers and footers"</li>
                <li>Choose "Save as PDF" and save</li>
              </ol>
            </div>

            {/* Firefox Instructions */}
            <div className="border-l-4 border-orange-400 pl-4">
              <h5 className="font-medium text-gray-900">Firefox:</h5>
              <ol className="list-decimal list-inside space-y-1 mt-1">
                <li>Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+P</kbd> (or <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Cmd+P</kbd> on Mac)</li>
                <li>In print dialog, check ✅ "Print headers and footers"</li>
                <li>Select "Microsoft Print to PDF" or "Save as PDF"</li>
                <li>Click "Print" to save</li>
              </ol>
            </div>

            {/* Safari Instructions */}
            <div className="border-l-4 border-purple-400 pl-4">
              <h5 className="font-medium text-gray-900">Safari:</h5>
              <ol className="list-decimal list-inside space-y-1 mt-1">
                <li>Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Cmd+P</kbd></li>
                <li>Click "Show Details" if needed</li>
                <li>Check ✅ "Print headers and footers"</li>
                <li>Click "PDF" → "Save as PDF"</li>
              </ol>
            </div>
          </div>

          {/* Example footer */}
          <div className="mt-4 p-3 bg-white border rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Example of what the footer should contain:</p>
            <code className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
              https://apply.deloitte.com/en_US/careers/InviteToApply?jobId=309048&source=LinkedIn
            </code>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${disabled 
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className={`p-3 rounded-full ${disabled ? 'bg-gray-200' : 'bg-red-100'}`}>
            {disabled ? (
              <FileText className="w-8 h-8 text-gray-400" />
            ) : (
              <Upload className="w-8 h-8 text-red-600" />
            )}
          </div>
          
          <div>
            <p className={`text-lg font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
              Drop your PDF file here
            </p>
            <p className={`text-sm ${disabled ? 'text-gray-300' : 'text-gray-500'}`}>
              PDF files only • Max {(maxSize / 1024 / 1024).toFixed(0)}MB • Must include headers/footers
            </p>
          </div>

          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileInput}
            disabled={disabled}
            className="hidden"
            id="pdf-upload"
          />
          
          <label
            htmlFor="pdf-upload"
            className={`
              px-4 py-2 rounded-md text-sm font-medium transition-colors
              ${disabled
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700 cursor-pointer'
              }
            `}
          >
            Choose PDF File
          </label>
        </div>
      </div>

    </div>
  )
}