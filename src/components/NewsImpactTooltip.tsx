import React from 'react'
import { TrendingUp, Clock, Building } from 'lucide-react'
import { ghostJobStats } from '@/data/newsArticles'

interface NewsImpactTooltipProps {
  isVisible: boolean
}

export const NewsImpactTooltip: React.FC<NewsImpactTooltipProps> = ({ isVisible }) => {
  if (!isVisible) return null

  return (
    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 animate-in fade-in-0 zoom-in-95 duration-200">
      {/* Arrow */}
      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-l border-t border-gray-200 rotate-45"></div>
      
      {/* Content */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 text-sm">Ghost Job Impact</h3>
        
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-red-100 rounded-full">
              <TrendingUp className="w-3 h-3 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Up to {ghostJobStats.prevalence} of listings</p>
              <p className="text-xs text-gray-600">May be ghost jobs today</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-orange-100 rounded-full">
              <Clock className="w-3 h-3 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{ghostJobStats.avgPostingDuration} average</p>
              <p className="text-xs text-gray-600">Posting duration</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-blue-100 rounded-full">
              <Building className="w-3 h-3 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Most affected:</p>
              <p className="text-xs text-gray-600">{ghostJobStats.mostAffectedIndustries.join(', ')}</p>
            </div>
          </div>
        </div>

        <div className="border-t pt-2 mt-3">
          <p className="text-xs text-gray-500 text-center">Click to view latest news & research</p>
        </div>
      </div>
    </div>
  )
}