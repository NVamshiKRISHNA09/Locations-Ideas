'use client'

import { useState, useEffect, useCallback } from 'react'
import Navbar from '@/components/Navbar'
import LocationPicker from '@/components/LocationPicker'
import IdeaCard from '@/components/IdeaCard'
import ApiKeyModal from '@/components/ApiKeyModal'
import LocalProblems from '@/components/LocalProblems'
import {
  getStoredLocation, setStoredLocation, clearStoredLocation,
  getStoredIdeas, setStoredIdeas, clearStoredIdeas,
  type Location, type Idea, type LocalProblem, getApiSettings,
} from '@/lib/chat-store'
import {
  Sparkles, RefreshCw, SlidersHorizontal,
  Cpu, Wrench, Layers, Lightbulb,
  AlertCircle, Zap, MapPin, Globe, Brain, Package,
  ArrowRight, CheckCircle2, ChevronDown,
} from 'lucide-react'

type Category = 'all' | 'software' | 'hardware' | 'hybrid'

// ─── Loading steps ─────────────────────────────────────────────────────────────
const LOADING_STEPS = [
  { icon: <Globe className="w-4 h-4" />,  label: 'Searching internet for local problems...' },
  { icon: <Brain className="w-4 h-4" />,  label: 'Analysing your location context...' },
  { icon: <Sparkles className="w-4 h-4" />,label: 'Generating tailored ideas with Groq AI...' },
  { icon: <Package className="w-4 h-4" />, label: 'Building component lists & resource maps...' },
]

export default function HomePage() {
  const [location, setLocation] = useState<Location | null>(null)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [realProblems, setRealProblems] = useState<LocalProblem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadStep, setLoadStep] = useState(0)
  const [categoryFilter, setCategoryFilter] = useState<Category>('all')
  const [error, setError] = useState('')
  const [isFallback, setIsFallback] = useState(false)
  const [apiKeyOpen, setApiKeyOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const loc = getStoredLocation()
    if (loc) setLocation(loc)
    const cached = getStoredIdeas()
    if (cached) setIdeas(cached)
  }, [])

  // Animate through loading steps
  useEffect(() => {
    if (!loading) { setLoadStep(0); return }
    const interval = setInterval(() => {
      setLoadStep(s => (s + 1) % LOADING_STEPS.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [loading])

  const generateIdeas = useCallback(async (loc: Location, force = false) => {
    if (!force) {
      const cached = getStoredIdeas()
      if (cached && cached.length > 0) { setIdeas(cached); return }
    }
    setLoading(true)
    setError('')
    setIsFallback(false)
    try {
      const { apiKey, groqModel, tavilyApiKey } = getApiSettings()
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: loc, apiKey, groqModel, tavilyApiKey }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const fetched: Idea[] = data.ideas || []
      setIdeas(fetched)
      setIsFallback(!!data.fallback)
      setStoredIdeas(fetched)
      if (data.realProblems?.length) setRealProblems(data.realProblems)
    } catch (err) {
      setError(`Failed to generate ideas: ${String(err)}`)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleLocationChange = (loc: Location) => {
    setLocation(loc)
    setStoredLocation(loc)
    clearStoredIdeas()
    setIdeas([])
    generateIdeas(loc)
  }

  const handleClearLocation = () => {
    setLocation(null)
    clearStoredLocation()
    clearStoredIdeas()
    setIdeas([])
    setRealProblems([])
    setError('')
  }

  const filteredIdeas = ideas.filter(
    (idea) => categoryFilter === 'all' || idea.category === categoryFilter
  )

  const FILTERS: { value: Category; label: string; icon: React.ReactNode; count: number }[] = [
    { value: 'all',      label: 'All Ideas', icon: <Sparkles className="w-3.5 h-3.5" />, count: ideas.length },
    { value: 'software', label: 'Software',  icon: <Cpu     className="w-3.5 h-3.5" />, count: ideas.filter(i => i.category === 'software').length },
    { value: 'hardware', label: 'Hardware',  icon: <Wrench  className="w-3.5 h-3.5" />, count: ideas.filter(i => i.category === 'hardware').length },
    { value: 'hybrid',   label: 'Hybrid',    icon: <Layers  className="w-3.5 h-3.5" />, count: ideas.filter(i => i.category === 'hybrid').length },
  ]

  if (!mounted) return null

  const hasResults = location || ideas.length > 0

  return (
    <>
      {/* ── Background orbs ─────────────────────────────────────────────── */}
      <div className="orb orb-purple" />
      <div className="orb orb-teal" />
      <div className="orb orb-pink" />

      <Navbar locationLabel={location?.label} onOpenApiKey={() => setApiKeyOpen(true)} />

      <main className="relative z-10 min-h-screen pt-16">

        {/* ══════════════════════════════════════════════════════════════════
            HERO SECTION
        ══════════════════════════════════════════════════════════════════ */}
        <section className="px-4 pt-20 pb-12 max-w-5xl mx-auto text-center">

          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-500/30 bg-brand-500/8 text-brand-400 text-xs font-semibold mb-8 animate-fade-in"
            style={{ backdropFilter: 'blur(8px)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            Groq · Tavily · OpenStreetMap · Powered
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] mb-6 animate-slide-up">
            <span className="text-slate-900">Turn Local Problems</span>
            <br />
            <span
              className="bg-gradient-to-r from-brand-400 via-accent-purple to-accent-teal bg-clip-text text-transparent"
              style={{ WebkitBackgroundClip: 'text' }}
            >
              Into Real Projects
            </span>
          </h1>

          {/* Sub-headline */}
          <p
            className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed mb-10 animate-slide-up"
            style={{ animationDelay: '0.1s' }}
          >
            We search the internet for <span className="text-slate-800 font-medium">real civic problems</span> in your city,
            then use <span className="text-brand-300 font-medium">Groq AI</span> to generate buildable software &amp;
            hardware solutions — complete with BOMs, code sketches, and local resource maps.
          </p>

          {/* Feature pills */}
          <div
            className="flex flex-wrap items-center justify-center gap-2 mb-12 animate-fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            {[
              { icon: <Globe className="w-3.5 h-3.5" />,   label: 'Internet-sourced problems' },
              { icon: <Brain className="w-3.5 h-3.5" />,   label: 'Groq Llama 3.3 70B' },
              { icon: <MapPin className="w-3.5 h-3.5" />,  label: 'GPS + local resources' },
              { icon: <Package className="w-3.5 h-3.5" />, label: 'Full BOM generation' },
              { icon: <Zap className="w-3.5 h-3.5" />,     label: 'AI build briefs' },
            ].map((pill, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-600 font-medium"
              >
                <span className="text-brand-400">{pill.icon}</span>
                {pill.label}
              </span>
            ))}
          </div>

          {/* Scroll cue */}
          {!hasResults && (
            <div className="flex flex-col items-center gap-2 text-slate-600 animate-bounce-subtle">
              <span className="text-xs font-medium tracking-wide uppercase">Enter your location</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            LOCATION PICKER
        ══════════════════════════════════════════════════════════════════ */}
        <section className="px-4 pb-10 max-w-xl mx-auto">
          <LocationPicker
            location={location}
            onLocationChange={handleLocationChange}
            onClear={handleClearLocation}
            isLoading={loading}
          />
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            HOW IT WORKS  (shown only when no location set yet)
        ══════════════════════════════════════════════════════════════════ */}
        {!hasResults && (
          <section className="px-4 pb-24 max-w-4xl mx-auto">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-600 mb-8">
              How it works
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  step: '01',
                  icon: <MapPin className="w-6 h-6" />,
                  color: 'from-brand-100 to-brand-50 border-brand-200',
                  iconColor: 'text-brand-400',
                  title: 'Set your location',
                  desc: 'Use GPS or type any city worldwide. We fetch nearby makerspaces, electronics stores, and civic resources via OpenStreetMap.',
                },
                {
                  step: '02',
                  icon: <Globe className="w-6 h-6" />,
                  color: 'from-rose-100 to-rose-50 border-rose-200',
                  iconColor: 'text-rose-600',
                  title: 'We search the internet',
                  desc: 'Tavily AI searches news articles, civic reports, and local forums to find real, documented problems in your city.',
                },
                {
                  step: '03',
                  icon: <Sparkles className="w-6 h-6" />,
                  color: 'from-purple-100 to-purple-50 border-purple-200',
                  iconColor: 'text-accent-purple',
                  title: 'AI builds your ideas',
                  desc: 'Groq Llama 3.3 70B generates 8 tailored project ideas grounded in real problems — each with code sketch, hardware BOM, and local sourcing tips.',
                },
              ].map((s, i) => (
                <div
                  key={i}
                  className={`glass-card bg-gradient-to-br ${s.color} p-6 animate-slide-up relative overflow-hidden`}
                  style={{ animationDelay: `${i * 0.12}s` }}
                >
                  <div className="absolute top-4 right-4 text-5xl font-black text-slate-900/4 select-none leading-none">
                    {s.step}
                  </div>
                  <div className={`w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4 ${s.iconColor}`}>
                    {s.icon}
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mb-2">{s.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>

            {/* Micro feature grid */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { emoji: '🌍', label: 'Any city worldwide' },
                { emoji: '🔍', label: 'Real internet problems' },
                { emoji: '⚡', label: 'Groq blazing speed' },
                { emoji: '🆓', label: 'Free to explore' },
              ].map((f, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-1.5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-center animate-fade-in"
                  style={{ animationDelay: `${0.3 + i * 0.08}s` }}
                >
                  <span className="text-2xl">{f.emoji}</span>
                  <span className="text-xs text-slate-500">{f.label}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            IDEAS SECTION
        ══════════════════════════════════════════════════════════════════ */}
        {hasResults && (
          <section className="px-4 pb-24 max-w-7xl mx-auto">

            {/* Section header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {loading
                      ? 'Analysing your location…'
                      : isFallback
                      ? 'Sample Ideas'
                      : `Ideas for ${location?.label?.split(',')[0] || 'your area'}`}
                  </h2>
                  {!loading && ideas.length > 0 && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {realProblems.length > 0
                        ? `Grounded in ${realProblems.length} real problems found online`
                        : 'AI-generated, location-tailored project ideas'}
                    </p>
                  )}
                </div>
                {!loading && ideas.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-400 text-xs font-semibold border border-brand-200">
                    {ideas.length} ideas
                  </span>
                )}
              </div>

              {ideas.length > 0 && !loading && (
                <button
                  onClick={() => location && generateIdeas(location, true)}
                  className="btn-secondary flex items-center gap-2 text-sm self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate
                </button>
              )}
            </div>

            {/* ── Animated loading state ──────────────────────────────────── */}
            {loading && (
              <div className="mb-8">
                {/* Progress steps */}
                <div className="glass-card p-6 mb-6 max-w-lg mx-auto text-center animate-fade-in">
                  <div className="w-12 h-12 rounded-2xl bg-brand-100 border border-brand-200 flex items-center justify-center mx-auto mb-4">
                    <div className="text-brand-400 animate-spin">
                      {LOADING_STEPS[loadStep].icon}
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 font-medium mb-4">
                    {LOADING_STEPS[loadStep].label}
                  </p>
                  {/* Step dots */}
                  <div className="flex items-center justify-center gap-1.5">
                    {LOADING_STEPS.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 rounded-full transition-all duration-500 ${
                          i === loadStep
                            ? 'w-6 bg-brand-400'
                            : i < loadStep
                            ? 'w-3 bg-brand-500/40'
                            : 'w-3 bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Skeleton cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="glass-card p-5 animate-pulse"
                      style={{ animationDelay: `${i * 0.07}s`, opacity: 1 - i * 0.07 }}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl shimmer flex-shrink-0" />
                        <div className="flex gap-2 pt-1">
                          <div className="h-5 w-16 rounded-full shimmer" />
                          <div className="h-5 w-14 rounded-full shimmer" />
                        </div>
                      </div>
                      <div className="h-5 w-4/5 rounded shimmer mb-2" />
                      <div className="h-4 w-full rounded shimmer mb-1" />
                      <div className="h-4 w-3/4 rounded shimmer mb-3" />
                      <div className="h-16 w-full rounded-lg shimmer mb-3" />
                      <div className="h-10 w-full rounded-lg shimmer" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Real problems panel ─────────────────────────────────────── */}
            {realProblems.length > 0 && !loading && location && (
              <div className="mb-6 animate-slide-up">
                <LocalProblems problems={realProblems} locationLabel={location.label} />
              </div>
            )}

            {/* ── Fallback notice ─────────────────────────────────────────── */}
            {isFallback && !loading && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 mb-6 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-700">Showing sample ideas</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Add your{' '}
                    <button onClick={() => setApiKeyOpen(true)} className="underline hover:text-amber-700 font-medium">
                      Groq API key
                    </button>{' '}
                    to get AI-generated ideas tailored to your city&apos;s real problems. Free at{' '}
                    <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-700">
                      console.groq.com
                    </a>.
                  </p>
                </div>
              </div>
            )}

            {/* ── Error ───────────────────────────────────────────────────── */}
            {error && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 mb-6">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-rose-600">{error}</p>
              </div>
            )}

            {/* ── Filters + grid ──────────────────────────────────────────── */}
            {!loading && ideas.length > 0 && (
              <>
                {/* Filters */}
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 hide-scrollbar">
                  <SlidersHorizontal className="w-4 h-4 text-slate-500 flex-shrink-0 mr-1" />
                  {FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setCategoryFilter(f.value)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all duration-200 flex-shrink-0 ${
                        categoryFilter === f.value
                          ? 'bg-brand-500/20 text-brand-300 border-brand-500/40 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white hover:text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {f.icon}
                      {f.label}
                      {f.count > 0 && (
                        <span className={`ml-0.5 ${categoryFilter === f.value ? 'text-brand-400' : 'text-slate-600'}`}>
                          ({f.count})
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Cards grid */}
                {filteredIdeas.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredIdeas.map((idea, i) => (
                      <div
                        key={idea.id}
                        className="animate-slide-up"
                        style={{ animationDelay: `${i * 0.06}s` }}
                      >
                        <IdeaCard idea={idea} location={location || undefined} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No ideas in this category yet.</p>
                  </div>
                )}
              </>
            )}

            {/* ── Empty state (location set, no ideas) ───────────────────── */}
            {!loading && location && ideas.length === 0 && !error && (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-3xl bg-brand-500/10 border border-brand-200 flex items-center justify-center mx-auto mb-6 animate-float">
                  <MapPin className="w-10 h-10 text-brand-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Location pinned!</h3>
                <p className="text-slate-600 mb-6 text-sm max-w-sm mx-auto">
                  Ready to search the internet for real problems and generate AI-powered project ideas for{' '}
                  <span className="text-slate-900 font-medium">{location.label.split(',')[0]}</span>.
                </p>
                <button
                  onClick={() => location && generateIdeas(location, true)}
                  className="btn-primary inline-flex items-center gap-2 text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Ideas Now
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            FOOTER  (only when no results)
        ══════════════════════════════════════════════════════════════════ */}
        {!hasResults && (
          <footer className="border-t border-slate-200 py-8 px-4 text-center">
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 mb-3">
              {[
                { label: 'Groq AI', url: 'https://console.groq.com' },
                { label: 'Tavily Search', url: 'https://tavily.com' },
                { label: 'OpenStreetMap', url: 'https://openstreetmap.org' },
                { label: 'Overpass API', url: 'https://overpass-api.de' },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slate-600 transition-colors flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3 text-brand-500/50" />
                  {link.label}
                </a>
              ))}
            </div>
            <p className="text-xs text-slate-700">
              Built with Next.js 14 · All keys stored locally in your browser
            </p>
          </footer>
        )}

      </main>

      <ApiKeyModal
        isOpen={apiKeyOpen}
        onClose={() => setApiKeyOpen(false)}
        onSaved={() => location && generateIdeas(location, true)}
      />
    </>
  )
}
