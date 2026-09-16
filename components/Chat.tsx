'use client'

import {
  useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle,
} from 'react'
import {
  Send, Square, Plus, Trash2, Loader2, MessageSquare, Clock,
  Sparkles, RotateCcw, ChevronDown, ChevronUp, Download, Copy, Check,
  AlertCircle, Key,
} from 'lucide-react'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import {
  createThread, getThreadsForIdea, getThread, deleteThread,
  addMessageToThread, generateId, getApiSettings,
  type ChatThread, type ChatMessage, type Idea, type Location,
} from '@/lib/chat-store'
import { timeAgo, buildExportContent, downloadAsFile, copyToClipboard } from '@/lib/utils'

// ─── Quick prompts list ────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  '🔌 Give me the complete wiring diagram',
  '⚠️ What are the main technical risks?',
  '💰 Suggest cheaper alternative components',
  '💻 Write the code skeleton for the main module',
  '⏱️ How long will this project realistically take?',
  '🛒 Where can I source components locally?',
  '🔧 Explain the system architecture in detail',
  '📋 Create a checklist for Phase 1',
  '🔋 How do I handle power requirements?',
  '🐛 What are common beginner mistakes to avoid?',
]

// ─── Props ─────────────────────────────────────────────────────────────────────
export interface ChatHandle {
  startNewChat: () => void
  regenerate: () => void
}

interface ChatProps {
  idea: Idea
  location: Location
  onOpenApiKey: () => void
}

// ─── Message Bubble ────────────────────────────────────────────────────────────
function MessageBubble({
  message,
  isStreaming = false,
}: {
  message: ChatMessage
  isStreaming?: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const ok = await copyToClipboard(message.content)
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  if (message.role === 'user') {
    return (
      <div className="flex justify-end gap-2 group">
        <div className="max-w-[80%]">
          <div className="bg-brand-500/20 border border-brand-500/30 text-slate-800 rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
          <div className="flex items-center justify-end gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs text-slate-600">{timeAgo(message.createdAt)}</span>
          </div>
        </div>
      </div>
    )
  }

  // Assistant message
  return (
    <div className="flex gap-3 group">
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center flex-shrink-0 mt-1 shadow-glow-sm">
        <Sparkles className="w-3.5 h-3.5 text-slate-900" />
      </div>

      <div className="flex-1 min-w-0">
        <MarkdownRenderer content={message.content} isStreaming={isStreaming} />

        {/* Actions row */}
        {!isStreaming && (
          <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-700 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <span className="text-slate-700">·</span>
            <span className="text-xs text-slate-600">{timeAgo(message.createdAt)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Chat Component ───────────────────────────────────────────────────────
const Chat = forwardRef<ChatHandle, ChatProps>(function Chat(
  { idea, location, onOpenApiKey },
  ref
) {
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [showThreadList, setShowThreadList] = useState(false)
  const [showQuickPrompts, setShowQuickPrompts] = useState(false)
  const [error, setError] = useState('')

  const abortRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeThread?.messages, streamingContent])

  // ── Auto-resize textarea ─────────────────────────────────────────────────────
  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }, [])

  // ── Stream from /api/chat ────────────────────────────────────────────────────
  const streamChat = useCallback(
    async (
      thread: ChatThread,
      isInitialBrief: boolean,
      latestMessages: ChatMessage[]
    ) => {
      setStreaming(true)
      setStreamingContent('')
      setError('')

      const { apiKey, groqModel } = getApiSettings()
      abortRef.current = new AbortController()

      let accumulated = ''

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: latestMessages.map((m) => ({ role: m.role, content: m.content })),
            idea,
            location: {
              label: location.label,
              country: location.country,
              resources: location.resources,
            },
            isInitialBrief,
            apiKey,
            groqModel,
          }),
          signal: abortRef.current.signal,
        })

        const reader = res.body?.getReader()
        const decoder = new TextDecoder()

        if (reader) {
          let buffer = ''
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''
            for (const line of lines) {
              if (line === 'data: [DONE]') break
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6))
                  if (data.content) {
                    accumulated += data.content
                    setStreamingContent(accumulated)
                  }
                  if (data.error) {
                    setError(data.error)
                  }
                } catch { /* ignore malformed chunk */ }
              }
            }
          }
        }
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') {
          accumulated += '\n\n*(Generation stopped)*'
        } else {
          setError(`Connection error: ${String(err)}`)
        }
      } finally {
        // Save the completed message
        if (accumulated) {
          const assistantMsg: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: accumulated,
            createdAt: Date.now(),
          }
          const updated = addMessageToThread(thread.id, assistantMsg)
          if (updated) {
            setActiveThread({ ...updated })
            setThreads(getThreadsForIdea(idea.id))
          }
        }
        setStreaming(false)
        setStreamingContent('')
      }
    },
    [idea, location]
  )

  // ── Start a new chat thread with initial build brief ─────────────────────────
  const startNewChat = useCallback(async () => {
    const thread = createThread(idea.id, idea.title)
    setActiveThread(thread)
    setThreads(getThreadsForIdea(idea.id))
    setShowThreadList(false)
    await streamChat(thread, true, [])
  }, [idea, streamChat])

  // ── Expose to parent via ref ─────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    startNewChat,
    regenerate: () => {
      if (activeThread) {
        handleDeleteThread(activeThread.id)
      }
      startNewChat()
    },
  }))

  // ── Initialize on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    const existing = getThreadsForIdea(idea.id)
    setThreads(existing)
    if (existing.length > 0) {
      setActiveThread(existing[0])
    } else {
      // Auto-start first build brief
      startNewChat()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea.id])

  // ── Send user message ────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (messageText?: string) => {
      const text = (messageText || input).trim()
      if (!text || !activeThread || streaming) return

      setInput('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      setShowQuickPrompts(false)

      // Append user message immediately
      const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: text,
        createdAt: Date.now(),
      }
      const threadWithUser = addMessageToThread(activeThread.id, userMsg)
      if (threadWithUser) setActiveThread({ ...threadWithUser })

      // Stream assistant response
      const fresh = getThread(activeThread.id)
      if (fresh) {
        await streamChat(fresh, false, fresh.messages)
      }
    },
    [input, activeThread, streaming, streamChat]
  )

  // ── Stop generation ──────────────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  // ── Delete thread ────────────────────────────────────────────────────────────
  const handleDeleteThread = useCallback(
    (threadId: string) => {
      deleteThread(threadId)
      const remaining = getThreadsForIdea(idea.id)
      setThreads(remaining)
      if (activeThread?.id === threadId) {
        setActiveThread(remaining[0] || null)
      }
    },
    [idea.id, activeThread?.id]
  )

  // ── Export current thread ────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (!activeThread) return
    const content = buildExportContent({
      ideaTitle: idea.title,
      location: location.label,
      messages: activeThread.messages,
    })
    const slug = idea.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
    downloadAsFile(content, `${slug}-build-plan.md`, 'text/markdown')
  }, [activeThread, idea, location])

  // ── Build display messages list ──────────────────────────────────────────────
  const displayMessages = activeThread?.messages || []
  const allMessages: ChatMessage[] = streaming && streamingContent
    ? [
        ...displayMessages,
        {
          id: '__streaming__',
          role: 'assistant' as const,
          content: streamingContent,
          createdAt: Date.now(),
        },
      ]
    : displayMessages

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">

      {/* ── Chat Header ───────────────────────────────────────────────────────── */}
      <div className="glass border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-brand-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-slate-900 truncate">AI Build Assistant</span>
          {streaming && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">Live</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* History */}
          <button
            onClick={() => setShowThreadList(!showThreadList)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all"
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">History</span>
            {threads.length > 1 && <span className="text-brand-400">({threads.length})</span>}
          </button>

          {/* Export */}
          {activeThread && activeThread.messages.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all"
              title="Download build plan as Markdown"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}

          {/* New Chat */}
          <button
            onClick={startNewChat}
            disabled={streaming}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-brand-100 text-brand-400 hover:bg-brand-500/25 border border-brand-200 transition-all disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </div>

      {/* ── Thread History Panel ──────────────────────────────────────────────── */}
      {showThreadList && threads.length > 0 && (
        <div className="border-b border-slate-200 bg-black/20 p-3 animate-slide-up flex-shrink-0">
          <p className="text-xs text-slate-500 font-semibold mb-2 uppercase tracking-wider">
            Chat Sessions ({threads.length})
          </p>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {threads.map((t) => (
              <div
                key={t.id}
                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer group transition-all ${
                  activeThread?.id === t.id
                    ? 'bg-brand-100 border border-brand-200'
                    : 'hover:bg-slate-100 border border-transparent'
                }`}
                onClick={() => { setActiveThread(t); setShowThreadList(false) }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-700 font-medium">
                    {t.messages.length} messages
                    {activeThread?.id === t.id && <span className="text-brand-400 ml-1">• active</span>}
                  </p>
                  <p className="text-xs text-slate-600">{timeAgo(t.createdAt)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteThread(t.id) }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-600 hover:text-rose-600 transition-all"
                  title="Delete thread"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Messages Area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Empty/loading state */}
        {allMessages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/20 to-accent-purple/10 border border-brand-200 flex items-center justify-center mb-4 animate-float">
              <Sparkles className="w-8 h-8 text-brand-400" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Ready to Build?</h3>
            <p className="text-sm text-slate-500 max-w-xs">
              Start a new chat to get a comprehensive build plan for{' '}
              <strong className="text-slate-700">{idea.title}</strong>
            </p>
            <button onClick={startNewChat} className="btn-primary mt-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Generate Build Brief
            </button>
          </div>
        )}

        {/* Streaming start indicator */}
        {streaming && allMessages.length === 1 && streamingContent === '' && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center flex-shrink-0 mt-1">
              <Sparkles className="w-3.5 h-3.5 text-slate-900" />
            </div>
            <div className="flex items-center gap-1.5 px-4 py-3 glass-card">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-brand-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {allMessages.map((msg, idx) => (
          <div
            key={msg.id}
            className="animate-fade-in"
            style={{ animationDelay: `${Math.min(idx * 0.04, 0.25)}s` }}
          >
            <MessageBubble
              message={msg}
              isStreaming={msg.id === '__streaming__'}
            />
          </div>
        ))}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-rose-600">{error}</p>
              <button
                onClick={onOpenApiKey}
                className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-300 mt-1 transition-colors"
              >
                <Key className="w-3 h-3" /> Check API Key Settings
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Quick Prompts ─────────────────────────────────────────────────────── */}
      {allMessages.length > 0 && !streaming && (
        <div className="border-t border-slate-200 px-4 pt-3 flex-shrink-0">
          <button
            onClick={() => setShowQuickPrompts(!showQuickPrompts)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors mb-2"
          >
            {showQuickPrompts ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            Quick prompts
          </button>

          {showQuickPrompts && (
            <div className="flex flex-wrap gap-1.5 pb-2 animate-slide-up">
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt.replace(/^[^\s]+\s/, ''))}
                  className="px-3 py-1.5 rounded-full text-xs border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-brand-500/35 hover:bg-brand-500/8 transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Input Bar ─────────────────────────────────────────────────────────── */}
      <div className="glass border-t border-slate-200 p-3 flex-shrink-0">
        <div className="flex items-end gap-2.5">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              className="input-glass resize-none py-3 pr-4 leading-relaxed"
              style={{ minHeight: '48px', maxHeight: '160px' }}
              placeholder={
                streaming
                  ? 'AI is generating...'
                  : 'Ask about architecture, code, components, sourcing...'
              }
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                resizeTextarea()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              disabled={streaming}
              rows={1}
            />
          </div>

          {streaming ? (
            <button
              onClick={handleStop}
              className="flex-shrink-0 w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-600 hover:bg-rose-500/25 transition-all flex items-center justify-center"
              title="Stop generation"
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || !activeThread}
              className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-accent-purple text-slate-900 shadow-glow-sm hover:shadow-glow-md transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              title="Send (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-center text-xs text-slate-700 mt-2">
          Enter to send · Shift+Enter for new line · Hobby/prototype use only
        </p>
      </div>
    </div>
  )
})

export default Chat
