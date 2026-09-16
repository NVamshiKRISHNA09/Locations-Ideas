'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Navbar from '@/components/Navbar'
import ApiKeyModal from '@/components/ApiKeyModal'
import {
  getStoredLocation,
  type Idea,
  type Location,
} from '@/lib/chat-store'
import type { ChatHandle } from '@/components/Chat'
// Note: ChatHandle exposes { startNewChat, regenerate }
import {
  ChevronLeft, Cpu, Wrench, Layers, MapPin, Sparkles,
  RotateCcw, Package, CheckSquare, Square as SquareIcon,
  ChevronDown, ChevronUp, Loader2, Tag, Zap, Clock,
  AlertTriangle, Store, BookOpen, FileText, Bookmark, Download
} from 'lucide-react'
import { isIdeaSaved, toggleSavedIdea } from '@/lib/chat-store'
import { downloadAsFile } from '@/lib/utils'

// Lazy-load Chat to avoid SSR issues with localStorage
const Chat = dynamic(() => import('@/components/Chat'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
    </div>
  ),
})

// ─── Difficulty + Category configs ────────────────────────────────────────────
const CAT_CONFIG: Record<string, { icon: React.ReactNode; label: string; tagClass: string; iconColor: string; iconBg: string }> = {
  software: {
    icon: <Cpu className="w-4 h-4" />,
    label: 'Software',
    tagClass: 'tag-software',
    iconColor: 'text-brand-400',
    iconBg: 'bg-brand-100 border-brand-200',
  },
  hardware: {
    icon: <Wrench className="w-4 h-4" />,
    label: 'Hardware',
    tagClass: 'tag-hardware',
    iconColor: 'text-teal-400',
    iconBg: 'bg-teal-500/15 border-teal-500/25',
  },
  hybrid: {
    icon: <Layers className="w-4 h-4" />,
    label: 'Hybrid',
    tagClass: 'tag-hybrid',
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/15 border-purple-500/25',
  },
}

const DIFF_CONFIG: Record<string, { label: string; tagClass: string; emoji: string; timeEst: string }> = {
  easy:   { label: 'Easy',   tagClass: 'tag-easy',   emoji: '🟢', timeEst: 'Weekend – 1 week' },
  medium: { label: 'Medium', tagClass: 'tag-medium', emoji: '🟡', timeEst: '1 – 2 months' },
  hard:   { label: 'Hard',   tagClass: 'tag-hard',   emoji: '🔴', timeEst: '3 – 6 months' },
}

// ─── BOM Checkbox ─────────────────────────────────────────────────────────────
function BomItem({
  item,
  checked,
  onToggle,
}: {
  item: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm group ${
        checked
          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
          : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-brand-200'
      }`}
    >
      {checked ? (
        <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />
      ) : (
        <SquareIcon className="w-4 h-4 text-slate-500 flex-shrink-0 group-hover:text-brand-400 transition-colors" />
      )}
      <span className={checked ? 'line-through opacity-60' : ''}>{item}</span>
    </button>
  )
}

// ─── Collapsible Section ──────────────────────────────────────────────────────
function Section({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
          {icon}
          {title}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-600" />
        )}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

// ─── Plan Phase Card ──────────────────────────────────────────────────────────
const PHASES = [
  { num: 1, title: 'Proof of Concept', color: 'from-brand-500/30 to-brand-600/10', border: 'border-brand-500/30', badge: 'bg-brand-500/20 text-brand-300 border-brand-500/30' },
  { num: 2, title: 'Working Prototype', color: 'from-teal-500/30 to-teal-600/10',  border: 'border-teal-500/30',   badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
  { num: 3, title: 'Feature Complete', color: 'from-purple-500/30 to-purple-600/10', border: 'border-purple-500/30', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { num: 4, title: 'Polish & Deploy', color: 'from-amber-500/30 to-amber-600/10', border: 'border-amber-500/30',   badge: 'bg-amber-500/20 text-amber-700 border-amber-500/30' },
]

// ─── Page Component ───────────────────────────────────────────────────────────
export default function IdeaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ideaId = params.id as string

  const [idea, setIdea] = useState<Idea | null>(null)
  const [location, setLocation] = useState<Location | null>(null)
  const [bomChecked, setBomChecked] = useState<Record<string, boolean>>({})
  const [apiKeyOpen, setApiKeyOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'brief' | 'plan' | 'resources'>('brief')
  const [isSaved, setIsSaved] = useState(false)

  const chatRef = useRef<ChatHandle>(null)

  // ── Hydrate idea from sessionStorage ────────────────────────────────────────
  useEffect(() => {
    setMounted(true)
    const stored = sessionStorage.getItem(`idea_${ideaId}`)
    if (stored) {
      try {
        const parsedIdea = JSON.parse(stored)
        setIdea(parsedIdea)
        setIsSaved(isIdeaSaved(parsedIdea.id))
      } catch { /* ignore */ }
    }
    const loc = getStoredLocation()
    setLocation(loc)
  }, [ideaId])

  const toggleBom = useCallback((item: string) => {
    setBomChecked((prev) => ({ ...prev, [item]: !prev[item] }))
  }, [])

  if (!mounted) return null

  if (!idea) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="orb orb-purple" />
        <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-200 flex items-center justify-center animate-float">
          <Sparkles className="w-8 h-8 text-brand-400" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Project Not Found</h2>
          <p className="text-slate-600 text-sm mb-4">
            This idea could not be loaded. It may have expired from session storage.
          </p>
          <button onClick={() => router.push('/')} className="btn-primary">
            ← Back to Ideas
          </button>
        </div>
      </div>
    )
  }

  if (!location) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-slate-600">No location set.</p>
        <button onClick={() => router.push('/')} className="btn-primary">
          ← Go Set Location
        </button>
      </div>
    )
  }

  const cat = CAT_CONFIG[idea.category] || CAT_CONFIG.software
  const diff = DIFF_CONFIG[idea.difficulty] || DIFF_CONFIG.medium
  const bomProgress = Math.round(
    (Object.values(bomChecked).filter(Boolean).length / Math.max(idea.bomPreview.length, 1)) * 100
  )

  return (
    <>
      <div className="orb orb-purple" style={{ opacity: 0.4 }} />
      <div className="orb orb-teal" style={{ opacity: 0.25 }} />

      <Navbar locationLabel={location.label} onOpenApiKey={() => setApiKeyOpen(true)} />

      {/* ── Full-screen split layout ────────────────────────────────────────── */}
      <div className="flex h-screen pt-16 relative z-10 overflow-hidden">

        {/* ═══════════════════════════════════════════════════════════════════
            LEFT PANEL — Project Brief (scrollable)
        ═══════════════════════════════════════════════════════════════════ */}
        <aside className="hidden lg:flex flex-col w-[400px] xl:w-[440px] border-r border-slate-200 bg-slate-50/40 overflow-hidden">
          
          {/* Sticky idea header */}
          <div className="flex-shrink-0 glass border-b border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors group"
              >
                <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                Back to ideas
              </button>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const newSavedState = toggleSavedIdea(idea)
                    setIsSaved(newSavedState)
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    isSaved
                      ? 'bg-brand-50 border-brand-200 text-brand-600 hover:bg-brand-100'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  title={isSaved ? "Remove from Saved" : "Save Project"}
                >
                  <Bookmark className="w-3.5 h-3.5" fill={isSaved ? "currentColor" : "none"} />
                  {isSaved ? "Saved" : "Save"}
                </button>
                <button
                  onClick={() => {
                    const content = `# Project Brief: ${idea.title}\n\n## Local Problem\n${idea.localProblem}\n\n## Why This Location\n${idea.whyHere}\n\n## Software Sketch\n${idea.softwareSketch}\n\n## Hardware Sketch\n${idea.hardwareSketch}\n\n## BOM Preview\n${idea.bomPreview.map(item => '- ' + item).join('\n')}\n\n## Suggested Resources\n${idea.suggestedResources.map(res => '- ' + res).join('\n')}`
                    downloadAsFile(content, `${idea.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-brief.md`, 'text/markdown')
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export MD
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${cat.iconBg} ${cat.iconColor}`}>
                {cat.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-black text-slate-900 text-sm leading-snug mb-1.5">{idea.title}</h1>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`tag ${cat.tagClass}`}>{cat.label}</span>
                  <span className={`tag ${diff.tagClass}`}>{diff.emoji} {diff.label}</span>
                  <span className="flex items-center gap-1 text-xs text-slate-600">
                    <Clock className="w-3 h-3" />
                    {diff.timeEst}
                  </span>
                </div>
              </div>
            </div>

            {/* Tab selector */}
            <div className="flex gap-1 p-1 rounded-xl bg-black/20 border border-slate-200">
              {[
                { key: 'brief', icon: <FileText className="w-3.5 h-3.5" />, label: 'Overview' },
                { key: 'plan', icon: <BookOpen className="w-3.5 h-3.5" />, label: 'Plan' },
                { key: 'resources', icon: <Store className="w-3.5 h-3.5" />, label: 'Resources' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === tab.key
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-200'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable panel content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* ── OVERVIEW TAB ────────────────────────────────────────────── */}
            {activeTab === 'brief' && (
              <>
                {/* Problem Statement */}
                <Section title="Local Problem" icon={<MapPin className="w-3.5 h-3.5 text-accent-teal" />}>
                  <p className="text-sm text-slate-700 leading-relaxed">{idea.localProblem}</p>
                </Section>

                {/* Why here */}
                {idea.whyHere && (
                  <Section title="Why This Location" icon={<Zap className="w-3.5 h-3.5 text-amber-400" />} defaultOpen={false}>
                    <p className="text-sm text-slate-600 leading-relaxed">{idea.whyHere}</p>
                  </Section>
                )}

                {/* Software approach */}
                {idea.softwareSketch && (
                  <Section title="Software Stack" icon={<Cpu className="w-3.5 h-3.5 text-brand-400" />} defaultOpen={false}>
                    <p className="text-sm text-slate-600 leading-relaxed">{idea.softwareSketch}</p>
                  </Section>
                )}

                {/* Hardware approach */}
                {idea.hardwareSketch && (
                  <Section title="Hardware Components" icon={<Wrench className="w-3.5 h-3.5 text-teal-400" />} defaultOpen={false}>
                    <p className="text-sm text-slate-600 leading-relaxed">{idea.hardwareSketch}</p>
                  </Section>
                )}

                {/* BOM with progress */}
                {idea.bomPreview.length > 0 && (
                  <Section title={`BOM Preview (${bomProgress}% acquired)`} icon={<Package className="w-3.5 h-3.5 text-slate-600" />}>
                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Components acquired</span>
                        <span className={bomProgress === 100 ? 'text-emerald-400 font-medium' : 'text-slate-600'}>
                          {Object.values(bomChecked).filter(Boolean).length}/{idea.bomPreview.length}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-teal transition-all duration-500"
                          style={{ width: `${bomProgress}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {idea.bomPreview.map((item, i) => (
                        <BomItem
                          key={i}
                          item={item}
                          checked={!!bomChecked[item]}
                          onToggle={() => toggleBom(item)}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-slate-600 mt-2.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Ask the AI for a complete BOM with quantities and prices →
                    </p>
                  </Section>
                )}

                {/* Tags */}
                {idea.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-600 mt-0.5" />
                    {idea.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-500"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── PLAN TAB ─────────────────────────────────────────────────── */}
            {activeTab === 'plan' && (
              <>
                <div className="glass-card p-4 mb-2">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    This is a suggested phased roadmap. Ask the AI assistant for a fully detailed plan with specific tasks and timelines.
                  </p>
                </div>

                <div className="space-y-3">
                  {PHASES.map((phase) => (
                    <div
                      key={phase.num}
                      className={`rounded-xl border ${phase.border} overflow-hidden`}
                    >
                      <div className={`flex items-center gap-3 px-4 py-3 bg-gradient-to-r ${phase.color}`}>
                        <span className={`flex items-center justify-center w-6 h-6 rounded-full border text-xs font-black ${phase.badge}`}>
                          {phase.num}
                        </span>
                        <span className="text-sm font-bold text-slate-900">{phase.title}</span>
                      </div>
                      <div className="px-4 py-3 space-y-2">
                        {phase.num === 1 && (
                          <>
                            <p className="text-xs text-slate-600">
                              • Set up development environment and tools
                            </p>
                            <p className="text-xs text-slate-600">
                              • {idea.softwareSketch ? 'Create basic project scaffold with key libraries' : 'Source and test core hardware components'}
                            </p>
                            <p className="text-xs text-slate-600">
                              • Validate the core concept works at minimal scale
                            </p>
                          </>
                        )}
                        {phase.num === 2 && (
                          <>
                            <p className="text-xs text-slate-600">
                              • Build the main functional system end-to-end
                            </p>
                            <p className="text-xs text-slate-600">
                              • {idea.category === 'hardware' ? 'Assemble and wire all hardware components' : 'Implement core features and data flows'}
                            </p>
                            <p className="text-xs text-slate-600">
                              • Test with real users or conditions in {location.label.split(',')[0]}
                            </p>
                          </>
                        )}
                        {phase.num === 3 && (
                          <>
                            <p className="text-xs text-slate-600">
                              • Add remaining features and edge case handling
                            </p>
                            <p className="text-xs text-slate-600">
                              • Optimize performance and reliability
                            </p>
                            <p className="text-xs text-slate-600">
                              • Write documentation and tests
                            </p>
                          </>
                        )}
                        {phase.num === 4 && (
                          <>
                            <p className="text-xs text-slate-600">
                              • Final UI/UX polish and user testing
                            </p>
                            <p className="text-xs text-slate-600">
                              • {idea.category === 'software' ? 'Deploy to production and set up monitoring' : 'Final assembly, enclosure, and safety checks'}
                            </p>
                            <p className="text-xs text-slate-600">
                              • Share with local community and iterate
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="glass-card p-4 border border-amber-200">
                  <div className="flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-700 mb-1">Safety &amp; Compliance</p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        All plans are for hobby/prototype use. Electrical, RF, and mechanical projects may require professional certification before commercial deployment. Follow local regulations in {location.country}.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── RESOURCES TAB ───────────────────────────────────────────── */}
            {activeTab === 'resources' && (
              <>
                {/* Nearby resources from OSM */}
                {location.resources.length > 0 ? (
                  <Section title="Nearby Makerspaces & Stores" icon={<Store className="w-3.5 h-3.5 text-accent-teal" />}>
                    <div className="space-y-2">
                      {location.resources.slice(0, 10).map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-slate-700 font-medium truncate">{r.name}</p>
                            <p className="text-xs text-slate-500">{r.type}</p>
                          </div>
                          <span className="text-xs text-slate-600 flex-shrink-0 ml-2">
                            {r.distance.toFixed(1)} km
                          </span>
                        </div>
                      ))}
                    </div>
                  </Section>
                ) : (
                  <div className="glass-card p-4 text-center">
                    <Store className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">No nearby makerspaces or stores found</p>
                    <p className="text-xs text-slate-600 mt-1">Consider online suppliers for {location.country}</p>
                  </div>
                )}

                {/* Suggested resources from idea */}
                {idea.suggestedResources.length > 0 && (
                  <Section title="Resources You'll Need" icon={<Tag className="w-3.5 h-3.5 text-purple-400" />} defaultOpen={false}>
                    <ul className="space-y-2">
                      {idea.suggestedResources.map((r, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {/* Online supplier suggestions by country */}
                <Section title="Online Suppliers" icon={<Zap className="w-3.5 h-3.5 text-amber-400" />} defaultOpen={false}>
                  <div className="space-y-2">
                    {[
                      { name: 'AliExpress', note: 'Best prices, longer shipping', url: 'https://aliexpress.com' },
                      { name: 'Mouser Electronics', note: 'Professional-grade components', url: 'https://mouser.com' },
                      { name: 'DigiKey', note: 'Wide selection, global shipping', url: 'https://digikey.com' },
                      { name: 'Adafruit', note: 'Maker-friendly, good docs', url: 'https://adafruit.com' },
                    ].map((s, i) => (
                      <a
                        key={i}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-brand-200 hover:bg-slate-100 transition-all group"
                      >
                        <div>
                          <p className="text-sm text-slate-700 font-medium group-hover:text-slate-900 transition-colors">{s.name}</p>
                          <p className="text-xs text-slate-500">{s.note}</p>
                        </div>
                        <ChevronLeft className="w-3.5 h-3.5 text-slate-600 rotate-180 group-hover:text-brand-400 transition-colors" />
                      </a>
                    ))}
                  </div>
                </Section>
              </>
            )}
          </div>
        </aside>

        {/* ═══════════════════════════════════════════════════════════════════
            RIGHT PANEL — Chat (full height)
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile header (only visible on small screens) */}
          <div className="lg:hidden glass border-b border-slate-200 px-4 py-3 flex-shrink-0">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 mb-2 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back to ideas
            </button>
            <h1 className="font-bold text-slate-900 text-sm line-clamp-1">{idea.title}</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`tag ${cat.tagClass}`}>{cat.label}</span>
              <span className={`tag ${diff.tagClass}`}>{diff.label}</span>
            </div>
          </div>

          {/* Chat fills remaining height */}
          <div className="flex-1 overflow-hidden">
            <Chat
              ref={chatRef}
              idea={idea}
              location={location}
              onOpenApiKey={() => setApiKeyOpen(true)}
            />
          </div>
        </div>
      </div>

      <ApiKeyModal isOpen={apiKeyOpen} onClose={() => setApiKeyOpen(false)} />
    </>
  )
}
