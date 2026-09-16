'use client'

import { useRouter } from 'next/navigation'
import {
  ArrowRight, Cpu, Wrench, Layers, MapPin, Zap,
  Package, Tag, Code2, CircuitBoard, Users, Bookmark
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { isIdeaSaved, toggleSavedIdea, type Idea } from '@/lib/chat-store'

interface IdeaCardProps {
  idea: Idea
  location?: { label: string; country?: string }
}

const CATEGORY_CONFIG = {
  software: {
    icon: <Cpu className="w-4 h-4" />,
    label: 'Software',
    tagClass: 'tag-software',
    gradient: 'from-brand-500/20 to-brand-700/10',
    iconBg: 'bg-brand-100 border-brand-200',
    iconColor: 'text-brand-400',
    accentColor: 'rgba(99,102,241,0.6)',
    sectionBorder: 'border-brand-500/15',
    sectionBg: 'bg-brand-500/5',
    labelColor: 'text-brand-400/70',
  },
  hardware: {
    icon: <Wrench className="w-4 h-4" />,
    label: 'Hardware',
    tagClass: 'tag-hardware',
    gradient: 'from-teal-500/20 to-teal-700/10',
    iconBg: 'bg-teal-500/15 border-teal-500/25',
    iconColor: 'text-teal-400',
    accentColor: 'rgba(20,184,166,0.6)',
    sectionBorder: 'border-teal-500/15',
    sectionBg: 'bg-teal-500/5',
    labelColor: 'text-teal-400/70',
  },
  hybrid: {
    icon: <Layers className="w-4 h-4" />,
    label: 'Hybrid',
    tagClass: 'tag-hybrid',
    gradient: 'from-purple-500/20 to-purple-700/10',
    iconBg: 'bg-purple-500/15 border-purple-500/25',
    iconColor: 'text-purple-400',
    accentColor: 'rgba(168,85,247,0.6)',
    sectionBorder: 'border-purple-500/15',
    sectionBg: 'bg-purple-500/5',
    labelColor: 'text-purple-400/70',
  },
}

const DIFFICULTY_CONFIG = {
  easy: { label: 'Easy', tagClass: 'tag-easy', emoji: '🟢' },
  medium: { label: 'Medium', tagClass: 'tag-medium', emoji: '🟡' },
  hard: { label: 'Hard', tagClass: 'tag-hard', emoji: '🔴' },
}

export default function IdeaCard({ idea, location }: IdeaCardProps) {
  const router = useRouter()
  const cat = CATEGORY_CONFIG[idea.category] || CATEGORY_CONFIG.software
  const diff = DIFFICULTY_CONFIG[idea.difficulty] || DIFFICULTY_CONFIG.medium
  const cityName = location?.label?.split(',')[0] || 'your area'
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    setIsSaved(isIdeaSaved(idea.id))
  }, [idea.id])

  const handleOpen = () => {
    sessionStorage.setItem(`idea_${idea.id}`, JSON.stringify(idea))
    router.push(`/ideas/${idea.id}`)
  }

  return (
    <div
      className="glass-card cursor-pointer group relative overflow-hidden flex flex-col"
      onClick={handleOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleOpen()}
    >
      {/* Hover gradient overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[inherit] pointer-events-none`}
      />
      {/* Top border accent */}
      <div
        className="absolute top-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(to right, transparent, ${cat.accentColor}, transparent)` }}
      />

      <div className="relative z-10 p-5 flex flex-col gap-3 flex-1">

        {/* ── Header: icon + badges ─────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${cat.iconBg} ${cat.iconColor}`}>
            {cat.icon}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsSaved(toggleSavedIdea(idea));
              }}
              className={`p-1.5 rounded-full transition-colors ${
                isSaved 
                  ? 'bg-brand-500/10 text-brand-500 hover:bg-brand-500/20' 
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
              }`}
              title={isSaved ? "Remove from Saved" : "Save Project"}
            >
              <Bookmark className="w-3.5 h-3.5" fill={isSaved ? "currentColor" : "none"} />
            </button>
            <span className={`tag ${cat.tagClass}`}>{cat.label}</span>
            <span className={`tag ${diff.tagClass}`}>{diff.emoji} {diff.label}</span>
          </div>
        </div>

        {/* ── Title ────────────────────────────────────────────────── */}
        <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-brand-200 transition-colors">
          {idea.title}
        </h3>

        {/* ── 📍 Local Problem ──────────────────────────────────────── */}
        <div className={`rounded-xl p-3 border ${cat.sectionBg} ${cat.sectionBorder}`}>
          <div className={`flex items-center gap-1.5 mb-1.5 text-xs font-semibold uppercase tracking-wider ${cat.labelColor}`}>
            <MapPin className="w-3 h-3" />
            Problem in {cityName}
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            {idea.localProblem}
          </p>
        </div>

        {/* ── 💡 Why Here ──────────────────────────────────────────── */}
        {idea.whyHere && (
          <div className="rounded-xl p-3 border bg-amber-500/5 border-amber-500/15">
            <div className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400/70">
              <Zap className="w-3 h-3" />
              Why {cityName}
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {idea.whyHere}
            </p>
          </div>
        )}

        {/* ── Software Sketch ──────────────────────────────────────── */}
        {idea.softwareSketch && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold uppercase tracking-wider text-brand-400/60">
              <Code2 className="w-3 h-3" />
              Software Stack
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              {idea.softwareSketch}
            </p>
          </div>
        )}

        {/* ── Hardware Sketch ──────────────────────────────────────── */}
        {idea.hardwareSketch && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold uppercase tracking-wider text-teal-400/60">
              <CircuitBoard className="w-3 h-3" />
              Hardware
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              {idea.hardwareSketch}
            </p>
          </div>
        )}

        {/* ── BOM Preview (all items) ───────────────────────────────── */}
        {idea.bomPreview.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Package className="w-3 h-3" />
              Components ({idea.bomPreview.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {idea.bomPreview.map((item, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs text-slate-600">
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Suggested Resources (all) ─────────────────────────────── */}
        {idea.suggestedResources.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Users className="w-3 h-3" />
              Local Resources
            </div>
            <div className="flex flex-wrap gap-1.5">
              {idea.suggestedResources.map((r, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md bg-accent-teal/8 border border-accent-teal/15 text-xs text-teal-400/80">
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Tags (all) ────────────────────────────────────────────── */}
        {idea.tags.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Tag className="w-3 h-3" />
              Tags
            </div>
            <div className="flex flex-wrap gap-1">
              {idea.tags.map((tag, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md text-xs text-slate-500 border border-slate-200 hover:text-slate-600 transition-colors">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── CTA ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 mt-auto">
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <Zap className="w-3 h-3" />
            <span>AI Build Plan included</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-400 group-hover:text-brand-300 transition-colors">
            Start Building
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

      </div>
    </div>
  )
}
