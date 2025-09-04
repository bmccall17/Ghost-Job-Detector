import React, { useCallback } from 'react'
import { Upload, FileText } from 'lucide-react'

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
              PDF files only • Max {(maxSize / 1024 / 1024).toFixed(0)}MB
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