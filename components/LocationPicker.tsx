'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin, Locate, Search, X, Loader2, Cpu, Wrench, Store, Zap } from 'lucide-react'
import type { Location, LocalResource } from '@/lib/chat-store'

interface LocationPickerProps {
  location: Location | null
  onLocationChange: (loc: Location) => void
  onClear?: () => void
  isLoading?: boolean
}

interface Suggestion {
  placeId: string
  label: string
  shortLabel: string
  lat: number
  lon: number
  country: string
  countryCode: string
  type: string
}

// ─── Resource icon helper ──────────────────────────────────────────────────────
function ResourceIcon({ type }: { type: string }) {
  if (type.includes('Maker') || type.includes('Fab') || type.includes('Hacker'))
    return <Cpu className="w-3 h-3 text-brand-400" />
  if (type.includes('Electronics'))
    return <Zap className="w-3 h-3 text-teal-400" />
  if (type.includes('Hardware'))
    return <Wrench className="w-3 h-3 text-amber-400" />
  return <Store className="w-3 h-3 text-slate-600" />
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function LocationPicker({
  location,
  onLocationChange,
  onClear,
  isLoading,
}: LocationPickerProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [geoLoading, setGeoLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Fetch locality details for a lat/lon ─────────────────────────────────
  const fetchLocality = useCallback(async (lat: number, lon: number): Promise<Location> => {
    const res = await fetch('/api/locality', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lon }),
    })
    if (!res.ok) throw new Error(`Locality API error: ${res.status}`)
    const data = await res.json()
    return {
      lat: data.lat,
      lon: data.lon,
      label: data.label,
      country: data.country,
      resources: data.resources || [],
    }
  }, [])

  // ── Browser GPS geolocation ──────────────────────────────────────────────
  const handleGeolocate = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported. Please search by city name.')
      return
    }
    setGeoLoading(true)
    setError('')

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const loc = await fetchLocality(coords.latitude, coords.longitude)
          onLocationChange(loc)
          setQuery('')
        } catch {
          setError('Could not fetch location details. Try searching by city name.')
        } finally {
          setGeoLoading(false)
        }
      },
      (posErr) => {
        setGeoLoading(false)
        const messages: Partial<Record<number, string>> = {
          1: 'Location permission denied. Please search by city name instead.',
          2: 'Location signal unavailable. Try searching by city.',
          3: 'Location detection timed out. Try searching by city.',
        }
        setError(messages[posErr.code] ?? 'Could not detect location.')
      },
      { timeout: 12000, enableHighAccuracy: false, maximumAge: 300000 }
    )
  }, [fetchLocality, onLocationChange])

  // ── Autocomplete search ──────────────────────────────────────────────────
  const searchLocations = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setSuggestions([])
      return
    }
    setSearchLoading(true)
    try {
      const res = await fetch(
        `/api/locality/search?q=${encodeURIComponent(q)}&limit=6`
      )
      const data = await res.json()
      setSuggestions(data.results || [])
      setShowSuggestions(true)
      setSelectedIndex(-1)
    } catch {
      setSuggestions([])
    } finally {
      setSearchLoading(false)
    }
  }, [])

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchLocations(query), 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, searchLocations])

  // ── Select a suggestion ──────────────────────────────────────────────────
  const selectSuggestion = useCallback(
    async (s: Suggestion) => {
      setShowSuggestions(false)
      setQuery('')
      setSuggestions([])
      setSearchLoading(true)
      setError('')
      try {
        const loc = await fetchLocality(s.lat, s.lon)
        // Use suggestion label as fallback if reverse geocode gives a bad label
        if (!loc.label || loc.label.length < 3) {
          loc.label = s.shortLabel
          loc.country = s.country
        }
        onLocationChange(loc)
      } catch {
        // Fallback: use suggestion data directly
        onLocationChange({
          lat: s.lat,
          lon: s.lon,
          label: s.shortLabel,
          country: s.country,
          resources: [],
        })
      } finally {
        setSearchLoading(false)
      }
    },
    [fetchLocality, onLocationChange]
  )

  // ── Keyboard navigation ──────────────────────────────────────────────────
  // Wrapped in useCallback to avoid re-creating on every render (fixes ESLint
  // react-hooks/exhaustive-deps and prevents unnecessary child re-renders)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || suggestions.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          selectSuggestion(suggestions[selectedIndex])
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false)
      }
    },
    [showSuggestions, suggestions, selectedIndex, selectSuggestion]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // Current location display
  if (location) {
    return (
      <div className="glass-card p-4 animate-fade-in">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-accent-teal/15 border border-brand-200 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-accent-teal" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 text-sm leading-tight truncate">{location.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {location.lat.toFixed(4)}°, {location.lon.toFixed(4)}° · {location.country || 'Unknown country'}
            </p>
            {location.resources.length > 0 ? (
              <p className="text-xs text-brand-400 mt-1">
                {location.resources.length} local resource{location.resources.length !== 1 ? 's' : ''} found nearby
              </p>
            ) : (
              <p className="text-xs text-slate-600 mt-1">No local makerspaces found in OSM</p>
            )}
          </div>
          <button
            onClick={onClear}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all flex-shrink-0 mt-0.5"
            title="Change location"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nearby resources chips */}
        {location.resources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">Nearby</p>
            <div className="flex flex-wrap gap-1.5">
              {location.resources.slice(0, 6).map((r: LocalResource, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-slate-600"
                  title={`${r.type} — ${r.distance.toFixed(1)}km away`}
                >
                  <ResourceIcon type={r.type} />
                  <span className="max-w-[110px] truncate">{r.name}</span>
                  <span className="text-slate-600 ml-0.5">{r.distance.toFixed(1)}km</span>
                </div>
              ))}
              {location.resources.length > 6 && (
                <div className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-slate-500">
                  +{location.resources.length - 6} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Location picker input
  return (
    <div className="w-full space-y-3">
      {/* Search input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            ref={inputRef}
            id="location-search"
            type="text"
            className="input-glass pl-10 pr-10"
            placeholder="Search city, town, or region…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setError('') }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          {searchLoading || isLoading ? (
            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400 animate-spin" />
          ) : query ? (
            <button
              onClick={() => { setQuery(''); setSuggestions([]) }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full mt-1.5 w-full z-20 glass border border-white/[0.08] rounded-xl overflow-hidden shadow-card animate-slide-up">
            {suggestions.map((s, i) => (
              <button
                key={s.placeId}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-white/[0.04] last:border-b-0 transition-colors ${
                  i === selectedIndex ? 'bg-brand-100' : 'hover:bg-white/[0.04]'
                }`}
                onMouseDown={() => selectSuggestion(s)}
              >
                <MapPin className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-slate-900 font-medium truncate">{s.shortLabel}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {s.label.split(',').slice(1, 4).join(',')}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* GPS button */}
      <button
        onClick={handleGeolocate}
        disabled={geoLoading}
        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl border border-dashed border-brand-500/30 text-brand-400 hover:text-brand-300 hover:border-brand-500/60 hover:bg-brand-500/5 transition-all text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {geoLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Locate className="w-4 h-4" />
        )}
        {geoLoading ? 'Detecting your location…' : 'Use my current location (GPS)'}
      </button>

      {/* Error */}
      {error && (
        <p className="text-xs text-rose-600 flex items-center gap-2 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}



