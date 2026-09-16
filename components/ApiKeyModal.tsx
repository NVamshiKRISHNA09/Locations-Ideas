'use client'

import { useState, useEffect } from 'react'
import { X, Key, Save, Eye, EyeOff, ExternalLink, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { getApiSettings, setApiSettings, GROQ_BASE_URL, GROQ_MODELS } from '@/lib/chat-store'

interface ApiKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: () => void
}

export default function ApiKeyModal({ isOpen, onClose, onSaved }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('llama-3.3-70b-versatile')
  const [tavilyKey, setTavilyKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [showTavilyKey, setShowTavilyKey] = useState(false)
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [statusMsg, setStatusMsg] = useState('')

  useEffect(() => {
    if (isOpen) {
      const settings = getApiSettings()
      setApiKey(settings.apiKey || '')
      setModel(settings.groqModel || 'llama-3.3-70b-versatile')
      setTavilyKey(settings.tavilyApiKey || '')
      setStatus('idle')
      setStatusMsg('')
    }
  }, [isOpen])

  const handleSave = () => {
    setApiSettings({
      apiKey: apiKey.trim(),
      groqModel: model,
      tavilyApiKey: tavilyKey.trim(),
    })
    setStatus('success')
    setStatusMsg('Settings saved! Your Groq key is stored locally in your browser.')
    setTimeout(() => {
      onSaved?.()
      onClose()
    }, 1200)
  }

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setStatus('error')
      setStatusMsg('Please enter a Groq API key first.')
      return
    }
    setStatus('testing')
    setStatusMsg('Testing Groq connection...')
    try {
      const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Hi! Reply with just "ok".' }],
          max_tokens: 5,
        }),
      })
      if (res.ok) {
        setStatus('success')
        setStatusMsg('✅ Connection successful! Groq API key is valid.')
      } else {
        const err = await res.json().catch(() => ({}))
        setStatus('error')
        setStatusMsg(`❌ Error ${res.status}: ${err?.error?.message || 'Invalid response'}`)
      }
    } catch (err) {
      setStatus('error')
      setStatusMsg(`❌ Network error: ${String(err)}`)
    }
  }

  const handleClear = () => {
    setApiKey('')
    setModel('llama-3.3-70b-versatile')
    setTavilyKey('')
    setApiSettings({ apiKey: '', groqModel: 'llama-3.3-70b-versatile', tavilyApiKey: '' })
    setStatus('idle')
    setStatusMsg('Settings cleared.')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative glass-card w-full max-w-md p-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-700/10 border border-orange-500/25 flex items-center justify-center">
              <Key className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Groq API Settings</h2>
              <p className="text-xs text-slate-500">Stored locally in your browser</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-4 mb-5">
          {/* API Key */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Groq API Key <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                className="input-glass pr-10 font-mono text-xs"
                placeholder="gsk_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Groq keys start with <code className="text-orange-400/80">gsk_</code>
            </p>
          </div>

          {/* Model selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Model
            </label>
            <select
              className="input-glass font-mono text-xs appearance-none cursor-pointer"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{ backgroundImage: 'none' }}
            >
              {GROQ_MODELS.map((m) => (
                <option key={m.id} value={m.id} className="bg-[#111118] text-slate-800">
                  {m.label} — {m.note}
                </option>
              ))}
            </select>
          </div>

          {/* Groq base URL read-only display */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              API Endpoint <span className="text-slate-600">(fixed)</span>
            </label>
            <div className="input-glass font-mono text-xs text-slate-600 cursor-not-allowed select-none truncate">
              {GROQ_BASE_URL}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200 pt-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <span className="text-lg">🌐</span> Internet Search (Optional)
            </p>

            {/* Tavily Key */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Tavily API Key
              </label>
              <div className="relative">
                <input
                  type={showTavilyKey ? 'text' : 'password'}
                  className="input-glass pr-10 font-mono text-xs"
                  placeholder="tvly-..."
                  value={tavilyKey}
                  onChange={(e) => setTavilyKey(e.target.value)}
                  autoComplete="off"
                />
                <button
                  onClick={() => setShowTavilyKey(!showTavilyKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {showTavilyKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Powers <strong className="text-slate-500">real internet problem search</strong>. Free 1000 req/month at{' '}
                <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">tavily.com</a>
              </p>
            </div>
          </div>
        </div>

        {/* Status */}
        {statusMsg && (
          <div className={`flex items-start gap-2 p-3 rounded-lg mb-4 text-xs ${
            status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            status === 'error' ? 'bg-rose-500/10 text-rose-600 border border-rose-200' :
            'bg-orange-500/10 text-orange-400 border border-orange-500/20'
          }`}>
            {status === 'testing' && <Loader2 className="w-3.5 h-3.5 mt-0.5 animate-spin flex-shrink-0" />}
            {status === 'success' && <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
            {status === 'error' && <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Groq provider info */}
        <div className="mb-5 p-3 rounded-xl bg-orange-500/5 border border-orange-500/15">
          <p className="text-xs font-semibold text-orange-400/70 mb-2 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            Get a free Groq API Key
          </p>
          <a
            href="https://console.groq.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-xs text-slate-600 hover:text-slate-900 transition-colors group"
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-orange-300">console.groq.com</span>
              <span className="text-slate-600">Free tier · Blazing fast inference · No credit card required</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
          </a>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleTest}
            disabled={status === 'testing' || !apiKey}
            className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"
          >
            {status === 'testing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Test Connection
          </button>
          <button
            onClick={handleSave}
            className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </button>
        </div>

        {getApiSettings().apiKey && (
          <button
            onClick={handleClear}
            className="w-full mt-2 text-xs text-slate-600 hover:text-rose-600 transition-colors text-center"
          >
            Clear saved settings
          </button>
        )}
      </div>
    </div>
  )
}
