import React, { useState, useMemo } from 'react'
import { ArrowLeft, ExternalLink, Filter, Calendar, Tag, TrendingUp } from 'lucide-react'
import { newsArticles, NewsArticle, ghostJobStats } from '@/data/newsArticles'

interface NewsImpactPageProps {
  onBack: () => void
}

export const NewsImpactPage: React.FC<NewsImpactPageProps> = ({ onBack }) => {
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'source'>('date')

  // Get unique types and tags for filters
  const types = useMemo(() => {
    const allTypes = newsArticles.map(article => article.type)
    return ['all', ...Array.from(new Set(allTypes))]
  }, [])

  const tags = useMemo(() => {
    const allTags = newsArticles.flatMap(article => article.tags)
    return ['all', ...Array.from(new Set(allTags)).sort()]
  }, [])

  // Filter and sort articles
  const filteredArticles = useMemo(() => {
    let filtered = newsArticles.filter(article => {
      const typeMatch = selectedType === 'all' || article.type === selectedType
      const tagMatch = selectedTag === 'all' || article.tags.includes(selectedTag)
      return typeMatch && tagMatch
    })

    // Sort articles
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
      } else {
        return a.source.localeCompare(b.source)
      }
    })

    return filtered
  }, [selectedType, selectedTag, sortBy])

  const getTypeColor = (type: NewsArticle['type']) => {
    const colors = {
      'Research': 'bg-blue-100 text-blue-800',
      'Industry Impact': 'bg-purple-100 text-purple-800',
      'Job Seeker Tips': 'bg-green-100 text-green-800',
      'News Report': 'bg-red-100 text-red-800',
      'Discussion': 'bg-orange-100 text-orange-800',
      'Tool': 'bg-indigo-100 text-indigo-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Ghost Job News & Impact</h1>
            <p className="text-gray-600 mb-4">
              Latest research, industry insights, and resources about the ghost job phenomenon
            </p>

            {/* Key Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-8 h-8 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-red-700">{ghostJobStats.prevalence}</p>
                    <p className="text-sm text-red-600">of job listings may be ghost jobs</p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold text-orange-700">{ghostJobStats.avgPostingDuration}</p>
                    <p className="text-sm text-orange-600">average posting duration</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Tag className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-lg font-bold text-blue-700">{ghostJobStats.mostAffectedIndustries.join(', ')}</p>
                    <p className="text-sm text-blue-600">most affected industries</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {types.map(type => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All Types' : type}
                </option>
              ))}
            </select>

            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {tags.map(tag => (
                <option key={tag} value={tag}>
                  {tag === 'all' ? 'All Tags' : tag}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'source')}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date">Sort by Date</option>
              <option value="source">Sort by Source</option>
            </select>

            <div className="text-sm text-gray-500">
              {filteredArticles.length} of {newsArticles.length} articles
            </div>
          </div>
        </div>
      </div>

      {/* Articles */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid gap-6">
          {filteredArticles.map((article) => (
            <article
              key={article.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(article.type)}`}>
                      {article.type}
                    </span>
                    <span className="text-sm text-gray-500">{article.source}</span>
                    <span className="text-sm text-gray-400">•</span>
                    <span className="text-sm text-gray-500">{formatDate(article.publishedDate)}</span>
                  </div>

                  <h2 className="text-xl font-semibold text-gray-900 mb-3">
                    {article.title}
                  </h2>

                  <p className="text-gray-600 mb-4 leading-relaxed">
                    {article.excerpt}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {article.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  <span>Read More</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}