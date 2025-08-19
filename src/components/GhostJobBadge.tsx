import React from 'react'
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'

interface GhostJobBadgeProps {
  probability: number
  confidence: number
  size?: 'sm' | 'md' | 'lg'
}

export const GhostJobBadge: React.FC<GhostJobBadgeProps> = ({
  probability,
  confidence: _confidence,
  size = 'md'
}) => {
  const getColorClass = () => {
    if (probability <= 0.33) return 'bg-green-100 text-green-800 border-green-200'
    if (probability <= 0.66) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-red-100 text-red-800 border-red-200'
  }

  const getIcon = () => {
    if (probability <= 0.33) return <CheckCircle className="w-4 h-4" />
    if (probability <= 0.66) return <AlertCircle className="w-4 h-4" />
    return <AlertTriangle className="w-4 h-4" />
  }

  const getSizeClass = () => {
    switch (size) {
      case 'sm': return 'px-2 py-1 text-xs'
      case 'lg': return 'px-4 py-2 text-base'
      default: return 'px-3 py-1.5 text-sm'
    }
  }

  const getLabel = () => {
    if (probability <= 0.33) return 'Likely Real'
    if (probability <= 0.66) return 'Uncertain'
    return 'Likely Ghost'
  }

  return (
    <div className={`
      inline-flex items-center space-x-2 rounded-full border font-medium
      ${getColorClass()} ${getSizeClass()}
    `}>
      {getIcon()}
      <span>{getLabel()}</span>
      <span className="font-bold">{Math.round(probability * 100)}%</span>
    </div>
  )
}