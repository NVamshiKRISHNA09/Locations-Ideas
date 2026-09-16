'use client'

import { ExternalLink, Globe, AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { LocalProblem } from '@/lib/chat-store'

interface LocalProblemsProps {
  problems: LocalProblem[]
  locationLabel: string
}

const CATEGORY_CONFIG: Record<LocalProblem['category'], { label: string; emoji: string; color: string; bg: string; border: string }> = {
  infrastructure: { label: 'Infrastructure', emoji: '🏗️', color: 'text-orange-400', bg: 'bg-orange-500/8', border: 'border-orange-500/20' },
  environment:    { label: 'Environment',    emoji: '🌿', color: 'text-green-400',  bg: 'bg-green-500/8',  border: 'border-green-500/20' },
  health:         { label: 'Health',         emoji: '🏥', color: 'text-rose-600',   bg: 'bg-rose-50',   border: 'border-rose-200' },
  economy:        { label: 'Economy',        emoji: '💸', color: 'text-amber-400',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  education:      { label: 'Education',      emoji: '📚', color: 'text-blue-400',   bg: 'bg-blue-500/8',   border: 'border-blue-500/20' },
  safety:         { label: 'Safety',         emoji: '🛡️', color: 'text-red-400',    bg: 'bg-red-500/8',    border: 'border-red-500/20' },
  civic:          { label: 'Civic',          emoji: '🏛️', color: 'text-purple-400', bg: 'bg-purple-500/8', border: 'border-purple-500/20' },
  other:          { label: 'Other',          emoji: '📌', color: 'text-slate-600',  bg: 'bg-slate-500/8',  border: 'border-slate-500/20' },
}

const SEVERITY_ICON = {
  high:   <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />,
  medium: <AlertCircle   className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />,
  low:    <Info          className="w-3.5 h-3.5 text-blue-400  flex-shrink-0" />,
}

export default function LocalProblems({ problems, locationLabel }: LocalProblemsProps) {
  const [expanded, setExpanded] = useState(true)
  const [showAll, setShowAll] = useState(false)

  if (!problems.length) return null

  const city = locationLabel.split(',')[0]
  const displayed = showAll ? problems : problems.slice(0, 6)

  return (
    <div className="glass-card overflow-hidden animate-slide-up">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-500/10 border border-rose-200 flex items-center justify-center">
            <Globe className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">Real Problems in {city}</span>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 text-xs font-medium border border-rose-500/25">
                {problems.length} found
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Sourced from the internet — news, reports & civic data</p>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
        }
      </button>

      {/* Problems list */}
      {expanded && (
        <div className="border-t border-slate-200">
          <div className="divide-y divide-white/5">
            {displayed.map((problem, i) => {
              const cat = CATEGORY_CONFIG[problem.category] || CATEGORY_CONFIG.other
              return (
                <div
                  key={i}
                  className={`px-5 py-3.5 hover:bg-slate-50 transition-colors group`}
                >
                  <div className="flex items-start gap-3">
                    {/* Severity icon */}
                    <div className="mt-0.5">{SEVERITY_ICON[problem.severity]}</div>

                    <div className="flex-1 min-w-0">
                      {/* Title + category tag */}
                      <div className="flex items-start gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-slate-800 text-sm leading-snug">
                          {problem.title}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium border flex-shrink-0 ${cat.bg} ${cat.border} ${cat.color}`}>
                          {cat.emoji} {cat.label}
                        </span>
                      </div>

                      {/* Summary */}
                      <p className="text-xs text-slate-600 leading-relaxed mb-2">
                        {problem.summary}
                      </p>

                      {/* Source link */}
                      <a
                        href={problem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-brand-400 transition-colors group/link"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="group-hover/link:underline">{problem.source}</span>
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Show more / less */}
          {problems.length > 6 && (
            <div className="border-t border-slate-200 px-5 py-3">
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-xs text-slate-500 hover:text-brand-400 transition-colors flex items-center gap-1"
              >
                {showAll
                  ? <><ChevronUp className="w-3 h-3" /> Show fewer</>
                  : <><ChevronDown className="w-3 h-3" /> Show {problems.length - 6} more problems</>
                }
              </button>
            </div>
          )}

          {/* Footer note */}
          <div className="border-t border-slate-200 px-5 py-2.5 bg-white/1">
            <p className="text-xs text-slate-600">
              💡 Ideas generated below are grounded in these real problems
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
