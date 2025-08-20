import React, { useState, useEffect } from 'react'
import { Newspaper } from 'lucide-react'
import { NewsImpactTooltip } from './NewsImpactTooltip'

interface NewsImpactButtonProps {
  onClick: () => void
}

export const NewsImpactButton: React.FC<NewsImpactButtonProps> = ({ onClick }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    let timeout: NodeJS.Timeout

    if (isHovered) {
      // Show tooltip immediately on hover
      setShowTooltip(true)
    } else {
      // Hide tooltip after a brief delay when not hovered
      timeout = setTimeout(() => {
        setShowTooltip(false)
      }, 100)
    }

    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [isHovered])

  // Auto-hide tooltip after 3 seconds
  useEffect(() => {
    let autoHideTimeout: NodeJS.Timeout

    if (showTooltip) {
      autoHideTimeout = setTimeout(() => {
        setShowTooltip(false)
        setIsHovered(false)
      }, 3000)
    }

    return () => {
      if (autoHideTimeout) clearTimeout(autoHideTimeout)
    }
  }, [showTooltip])

  const handleClick = () => {
    setShowTooltip(false)
    setIsHovered(false)
    onClick()
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        className="inline-flex items-center space-x-2 text-xs text-gray-500 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded px-2 py-1"
        aria-label="View ghost job news and impact"
      >
        <Newspaper className="w-3 h-3" />
        <span>News & Impact</span>
      </button>

      <NewsImpactTooltip isVisible={showTooltip} />
    </div>
  )
}