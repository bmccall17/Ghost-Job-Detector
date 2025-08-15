import React, { useEffect, useState } from 'react'
import { Star } from 'lucide-react'

interface NewContributionBadgeProps {
  isNew?: boolean
  onAnimationComplete?: () => void
}

export const NewContributionBadge: React.FC<NewContributionBadgeProps> = ({ 
  isNew = false, 
  onAnimationComplete 
}) => {
  const [showAnimation, setShowAnimation] = useState(false)

  useEffect(() => {
    if (isNew) {
      setShowAnimation(true)
      const timer = setTimeout(() => {
        setShowAnimation(false)
        onAnimationComplete?.()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isNew, onAnimationComplete])

  if (!isNew && !showAnimation) return null

  return (
    <div className="relative inline-flex items-center">
      <div className={`
        inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium
        ${showAnimation 
          ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 animate-pulse' 
          : 'bg-yellow-100 text-yellow-800'
        }
      `}>
        <Star 
          className={`w-3 h-3 ${showAnimation ? 'animate-spin' : ''}`} 
          fill="currentColor"
        />
        <span>New!</span>
      </div>
      
      {showAnimation && (
        <>
          {/* Sparkle effects */}
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
          <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-ping delay-150" />
          <div className="absolute top-0 left-1/2 w-1 h-1 bg-yellow-500 rounded-full animate-ping delay-300" />
          
          {/* Ripple effect */}
          <div className="absolute inset-0 rounded-full border-2 border-yellow-400 animate-ping opacity-30" />
        </>
      )}
    </div>
  )
}