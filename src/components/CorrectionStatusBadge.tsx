import { CheckCircle, AlertTriangle, RotateCcw, Edit3 } from 'lucide-react'

interface CorrectionStatusBadgeProps {
  status: 'verified' | 'manual_override' | 'needs_review' | 'user_corrected'
  count?: number
  size?: 'sm' | 'md' | 'lg'
}

export function CorrectionStatusBadge({ status, count, size = 'md' }: CorrectionStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'verified':
        return {
          icon: CheckCircle,
          text: 'Algorithm Verified',
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          borderColor: 'border-green-200',
          iconColor: 'text-green-600'
        }
      case 'manual_override':
        return {
          icon: AlertTriangle,
          text: 'Manual Override',
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-700',
          borderColor: 'border-amber-200',
          iconColor: 'text-amber-600'
        }
      case 'needs_review':
        return {
          icon: RotateCcw,
          text: 'Needs Review',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-600'
        }
      case 'user_corrected':
        return {
          icon: Edit3,
          text: 'User Corrected',
          bgColor: 'bg-purple-50',
          textColor: 'text-purple-700',
          borderColor: 'border-purple-200',
          iconColor: 'text-purple-600'
        }
      default:
        return {
          icon: Edit3,
          text: 'Unknown',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200',
          iconColor: 'text-gray-600'
        }
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-1 text-xs',
          icon: 'w-3 h-3',
          gap: 'space-x-1'
        }
      case 'lg':
        return {
          container: 'px-4 py-2 text-sm',
          icon: 'w-5 h-5',
          gap: 'space-x-2'
        }
      default: // md
        return {
          container: 'px-3 py-1.5 text-xs',
          icon: 'w-4 h-4',
          gap: 'space-x-1.5'
        }
    }
  }

  const config = getStatusConfig()
  const sizeClasses = getSizeClasses()
  const Icon = config.icon

  return (
    <div 
      className={`
        inline-flex items-center rounded-full border font-medium
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        ${sizeClasses.container} ${sizeClasses.gap}
      `}
      title={`${config.text}${count ? ` (${count})` : ''}`}
    >
      <Icon className={`${config.iconColor} ${sizeClasses.icon}`} />
      <span>{config.text}</span>
      {count && count > 1 && (
        <span className={`
          inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full
          ${config.textColor === 'text-green-700' ? 'bg-green-200 text-green-800' :
            config.textColor === 'text-amber-700' ? 'bg-amber-200 text-amber-800' :
            config.textColor === 'text-blue-700' ? 'bg-blue-200 text-blue-800' :
            config.textColor === 'text-purple-700' ? 'bg-purple-200 text-purple-800' :
            'bg-gray-200 text-gray-800'}
        `}>
          {count}
        </span>
      )}
    </div>
  )
}

interface CorrectionFieldIndicatorProps {
  field: 'title' | 'company' | 'location' | 'postedAt'
  status: 'verified' | 'manual_override' | 'needs_review'
  originalValue?: string
  correctedValue?: string
}

export function CorrectionFieldIndicator({ 
  field, 
  status, 
  originalValue, 
  correctedValue 
}: CorrectionFieldIndicatorProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-3 h-3 text-green-600" />
      case 'manual_override':
        return <AlertTriangle className="w-3 h-3 text-amber-600" />
      case 'needs_review':
        return <RotateCcw className="w-3 h-3 text-blue-600" />
    }
  }

  const getBorderColor = () => {
    switch (status) {
      case 'verified':
        return 'border-l-green-400'
      case 'manual_override':
        return 'border-l-amber-400'
      case 'needs_review':
        return 'border-l-blue-400'
      default:
        return 'border-l-gray-400'
    }
  }

  return (
    <div 
      className={`border-l-2 pl-2 ${getBorderColor()}`}
      title={`${field} was corrected: "${originalValue}" → "${correctedValue}"`}
    >
      <div className="flex items-center space-x-1">
        {getStatusIcon()}
        <span className="text-sm font-medium capitalize">{field} Corrected</span>
      </div>
      {originalValue && correctedValue && (
        <div className="mt-1 text-xs text-gray-600">
          <div className="line-through text-gray-400">{originalValue}</div>
          <div className="font-medium">{correctedValue}</div>
        </div>
      )}
    </div>
  )
}

interface CorrectionSummaryProps {
  totalCorrections: number
  verifiedCorrections: number
  manualOverrides: number
  needsReview: number
}

export function CorrectionSummary({ 
  totalCorrections, 
  verifiedCorrections, 
  manualOverrides, 
  needsReview 
}: CorrectionSummaryProps) {
  if (totalCorrections === 0) return null

  return (
    <div className="bg-gray-50 rounded-lg p-4 border">
      <h4 className="text-sm font-medium text-gray-900 mb-3">Correction Summary</h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Total Corrections:</span>
          <span className="font-semibold text-gray-900">{totalCorrections}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Verified:</span>
          <span className="font-semibold text-green-600">{verifiedCorrections}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Manual Override:</span>
          <span className="font-semibold text-amber-600">{manualOverrides}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Needs Review:</span>
          <span className="font-semibold text-blue-600">{needsReview}</span>
        </div>
      </div>
      
      {totalCorrections > 0 && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center space-x-2">
            <Edit3 className="w-4 h-4 text-purple-600" />
            <span className="text-sm text-purple-700 font-medium">
              This job has been manually corrected by users
            </span>
          </div>
        </div>
      )}
    </div>
  )
}