import React, { useState, useRef, useEffect } from 'react'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface RiskTooltipProps {
  factors: string[]
  probability: number
  children: React.ReactNode
}

export const RiskTooltip: React.FC<RiskTooltipProps> = ({ factors, probability, children }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const timeoutRef = useRef<NodeJS.Timeout>()
  const triggerRef = useRef<HTMLDivElement>(null)

  const categorizeFactors = (factors: string[]) => {
    const redFlags: string[] = []
    const yellowFlags: string[] = []
    const greenFlags: string[] = []

    factors.forEach(factor => {
      const lowerFactor = factor.toLowerCase()
      if (lowerFactor.includes('45+ days') || 
          lowerFactor.includes('minimal') || 
          lowerFactor.includes('unusual') ||
          lowerFactor.includes('generic') ||
          lowerFactor.includes('vague')) {
        redFlags.push(factor)
      } else if (lowerFactor.includes('recent') || 
                 lowerFactor.includes('detailed') || 
                 lowerFactor.includes('specific') ||
                 lowerFactor.includes('clear')) {
        greenFlags.push(factor)
      } else {
        yellowFlags.push(factor)
      }
    })

    return { redFlags, yellowFlags, greenFlags }
  }

  const { redFlags, yellowFlags, greenFlags } = categorizeFactors(factors)

  const handleMouseEnter = (_e: React.MouseEvent) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (rect) {
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        })
        setIsVisible(true)
      }
    }, 1000) // 1 second delay
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const getRiskColor = (probability: number) => {
    if (probability >= 0.67) return 'text-red-600'
    if (probability >= 0.34) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getRiskLevel = (probability: number) => {
    if (probability >= 0.67) return 'High Risk'
    if (probability >= 0.34) return 'Medium Risk'
    return 'Low Risk'
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="cursor-help"
      >
        {children}
      </div>

      {isVisible && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm"
          style={{
            left: position.x - 150, // Center the tooltip
            top: position.y,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className={`font-semibold ${getRiskColor(probability)}`}>
                {getRiskLevel(probability)} ({Math.round(probability * 100)}%)
              </div>
            </div>

            {redFlags.length > 0 && (
              <div>
                <div className="flex items-center space-x-1 text-red-600 text-sm font-medium mb-1">
                  <XCircle className="w-3 h-3" />
                  <span>Red Flags</span>
                </div>
                <ul className="space-y-1">
                  {redFlags.map((flag, index) => (
                    <li key={index} className="text-xs text-gray-700 flex items-start">
                      <span className="w-2 h-2 bg-red-500 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {yellowFlags.length > 0 && (
              <div>
                <div className="flex items-center space-x-1 text-yellow-600 text-sm font-medium mb-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Warning Signs</span>
                </div>
                <ul className="space-y-1">
                  {yellowFlags.map((flag, index) => (
                    <li key={index} className="text-xs text-gray-700 flex items-start">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {greenFlags.length > 0 && (
              <div>
                <div className="flex items-center space-x-1 text-green-600 text-sm font-medium mb-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>Positive Indicators</span>
                </div>
                <ul className="space-y-1">
                  {greenFlags.map((flag, index) => (
                    <li key={index} className="text-xs text-gray-700 flex items-start">
                      <span className="w-2 h-2 bg-green-500 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Tooltip arrow */}
          <div
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full"
            style={{ marginLeft: '0px' }}
          >
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-200"></div>
            <div className="w-0 h-0 border-l-7 border-r-7 border-t-7 border-l-transparent border-r-transparent border-t-white absolute bottom-0.5 left-1/2 transform -translate-x-1/2"></div>
          </div>
        </div>
      )}
    </>
  )
}