import React from 'react'
import { TrendingUp, Clock, Building, Users, AlertTriangle } from 'lucide-react'
import { ghostJobStats } from '@/data/newsArticles'

interface NewsImpactTooltipProps {
  isVisible: boolean
}

export const NewsImpactTooltip: React.FC<NewsImpactTooltipProps> = ({ isVisible }) => {
  if (!isVisible) return null

  return (
    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 p-5 z-50 animate-in fade-in-0 zoom-in-95 duration-200">
      {/* Arrow */}
      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-l border-t border-gray-200 rotate-45"></div>
      
      {/* Content */}
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="font-bold text-gray-900 text-base">2025 Ghost Job Crisis</h3>
          <p className="text-xs text-gray-600 mt-1">Latest industry research & statistics</p>
        </div>
        
        {/* Grid Layout for Better Organization */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-red-100 rounded-full">
              <TrendingUp className="w-3 h-3 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{ghostJobStats.prevalence}</p>
              <p className="text-xs text-gray-600">Ghost job prevalence</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-orange-100 rounded-full">
              <AlertTriangle className="w-3 h-3 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{ghostJobStats.ghostingByAgencies}</p>
              <p className="text-xs text-gray-600">Staffing agency ghosting</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-100 rounded-full">
              <Clock className="w-3 h-3 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{ghostJobStats.timeWastedPerYear}</p>
              <p className="text-xs text-gray-600">Wasted per year</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-green-100 rounded-full">
              <Users className="w-3 h-3 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{ghostJobStats.transparentSalaryGhosting}</p>
              <p className="text-xs text-gray-600">With salary transparency</p>
            </div>
          </div>
        </div>

        {/* Key Insight Highlight */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
          <div className="flex items-start space-x-2">
            <Building className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Most Affected Industries</p>
              <p className="text-xs text-blue-700 mt-1">{ghostJobStats.mostAffectedIndustries.join(' • ')}</p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="border-t pt-3 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Based on 2025 research</p>
            <p className="text-xs text-blue-600 font-medium">Click to explore research →</p>
          </div>
        </div>
      </div>
    </div>
  )
}