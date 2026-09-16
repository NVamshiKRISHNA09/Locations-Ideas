'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Key, X, Cpu, Github, Sparkles, Settings, Bookmark } from 'lucide-react'
import { getApiSettings } from '@/lib/chat-store'

interface NavbarProps {
  locationLabel?: string
  onOpenApiKey?: () => void
}

export default function Navbar({ locationLabel, onOpenApiKey }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const settings = typeof window !== 'undefined' ? getApiSettings() : { apiKey: '' }
  const hasApiKey = !!settings.apiKey

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ── Logo ─────────────────────────────────────────────────────── */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center shadow-glow-sm group-hover:shadow-glow-md transition-all">
              <Cpu className="w-4 h-4 text-slate-900" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm tracking-tight">Locality</span>
              <span className="font-bold bg-gradient-to-r from-brand-400 to-accent-purple bg-clip-text text-transparent text-sm ml-1">Ideas</span>
            </div>
            <div className="hidden sm:flex items-center gap-1 ml-1">
              <Sparkles className="w-3 h-3 text-brand-400" />
              <span className="text-xs text-slate-500 font-medium">AI Build Assistant</span>
            </div>
          </Link>

          {/* ── Center: Location Badge ────────────────────────────────────── */}
          {locationLabel && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-sm text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-accent-teal" />
              <span className="max-w-[200px] truncate">{locationLabel}</span>
            </div>
          )}

          {/* ── Right Actions ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-2">
            {/* API Key Status Pill */}
            <button
              onClick={onOpenApiKey}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                hasApiKey
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-200 hover:bg-amber-500/20'
              }`}
            >
              <Key className="w-3 h-3" />
              {hasApiKey ? 'API Key Set' : 'Add API Key'}
            </button>

            {/* Saved Projects link */}
            <Link
              href="/saved"
              className="p-2 rounded-lg text-slate-600 hover:text-brand-500 hover:bg-brand-50 transition-all flex items-center gap-1.5 font-medium text-sm"
              title="Saved Projects"
            >
              <Bookmark className="w-4 h-4" />
              <span className="hidden sm:inline">Saved</span>
            </Link>

            {/* Settings button */}
            <button
              onClick={onOpenApiKey}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
              title="API Key Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden glass border-t border-slate-200 px-4 py-3 animate-slide-up">
          {locationLabel && (
            <div className="flex items-center gap-2 mb-3 text-sm text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-accent-teal" />
              <span>{locationLabel}</span>
            </div>
          )}
          <Link
            href="/saved"
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-3"
            onClick={() => setMenuOpen(false)}
          >
            <Bookmark className="w-4 h-4" />
            Saved Projects
          </Link>
          <button
            onClick={() => { onOpenApiKey?.(); setMenuOpen(false) }}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <Key className="w-4 h-4" />
            {hasApiKey ? 'API Key Set ✓' : 'Add API Key'}
          </button>
        </div>
      )}
    </nav>
  )
}
