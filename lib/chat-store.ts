// ─── Types ─────────────────────────────────────────────────────────────────────
export interface Location {
  lat: number
  lon: number
  label: string
  country: string
  resources: LocalResource[]
}

export interface LocalResource {
  name: string
  type: string
  distance: number
  osmId?: string
  tags?: Record<string, string>
}

export interface Idea {
  id: string
  title: string
  category: 'software' | 'hardware' | 'hybrid'
  difficulty: 'easy' | 'medium' | 'hard'
  localProblem: string
  whyHere: string
  softwareSketch: string
  hardwareSketch: string
  bomPreview: string[]
  suggestedResources: string[]
  tags: string[]
  savedAt?: number
}

export interface LocalProblem {
  title: string
  summary: string
  source: string
  url: string
  category: 'infrastructure' | 'environment' | 'health' | 'economy' | 'education' | 'safety' | 'civic' | 'other'
  severity: 'high' | 'medium' | 'low'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

export interface ChatThread {
  id: string
  ideaId: string
  ideaTitle: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

export interface AppState {
  location: Location | null
  ideas: Idea[]
  ideasCachedAt: number | null
  groqApiKey: string
  groqModel: string
  threads: ChatThread[]
  activeThreadId: string | null
}

const KEYS = {
  LOCATION: 'lia_location',
  IDEAS: 'lia_ideas',
  IDEAS_CACHED_AT: 'lia_ideas_cached_at',
  SAVED_IDEAS: 'lia_saved_ideas',
  GROQ_API_KEY: 'lia_groq_api_key',
  GROQ_MODEL: 'lia_groq_model',
  TAVILY_API_KEY: 'lia_tavily_api_key',
  THREADS: 'lia_threads',
  ACTIVE_THREAD: 'lia_active_thread',
}

// ─── Safe localStorage helpers ─────────────────────────────────────────────────
function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function safeSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or unavailable — silently fail
  }
}

// ─── Location ──────────────────────────────────────────────────────────────────
export function getStoredLocation(): Location | null {
  return safeGet<Location | null>(KEYS.LOCATION, null)
}

export function setStoredLocation(loc: Location): void {
  safeSet(KEYS.LOCATION, loc)
}

export function clearStoredLocation(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(KEYS.LOCATION)
}

// ─── Ideas Cache ───────────────────────────────────────────────────────────────
const IDEAS_TTL_MS = 30 * 60 * 1000 // 30 minutes

export function getStoredIdeas(): Idea[] | null {
  const ideas = safeGet<Idea[]>(KEYS.IDEAS, [])
  const cachedAt = safeGet<number | null>(KEYS.IDEAS_CACHED_AT, null)
  if (!cachedAt || !ideas.length) return null
  if (Date.now() - cachedAt > IDEAS_TTL_MS) return null
  return ideas
}

export function setStoredIdeas(ideas: Idea[]): void {
  safeSet(KEYS.IDEAS, ideas)
  safeSet(KEYS.IDEAS_CACHED_AT, Date.now())
}

export function clearStoredIdeas(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(KEYS.IDEAS)
    localStorage.removeItem(KEYS.IDEAS_CACHED_AT)
  }
}

// ─── Saved Ideas ───────────────────────────────────────────────────────────────
export function getSavedIdeas(): Idea[] {
  return safeGet<Idea[]>(KEYS.SAVED_IDEAS, [])
}

export function isIdeaSaved(id: string): boolean {
  const saved = getSavedIdeas()
  return saved.some(i => i.id === id)
}

export function toggleSavedIdea(idea: Idea): boolean {
  const saved = getSavedIdeas()
  const exists = saved.findIndex(i => i.id === idea.id)
  
  if (exists >= 0) {
    saved.splice(exists, 1)
    safeSet(KEYS.SAVED_IDEAS, saved)
    return false
  } else {
    idea.savedAt = Date.now()
    saved.unshift(idea)
    safeSet(KEYS.SAVED_IDEAS, saved)
    return true
  }
}

// ─── Groq Settings ─────────────────────────────────────────────────────────────
export const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'

export const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Recommended)', note: 'Best quality' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', note: 'Fastest / cheapest' },
  { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', note: 'Long context' },
  { id: 'gemma2-9b-it', label: 'Gemma 2 9B', note: 'Google model' },
] as const

export type GroqModelId = typeof GROQ_MODELS[number]['id']

export function getApiSettings() {
  return {
    apiKey: safeGet<string>(KEYS.GROQ_API_KEY, ''),
    groqModel: safeGet<string>(KEYS.GROQ_MODEL, 'llama-3.3-70b-versatile'),
    tavilyApiKey: safeGet<string>(KEYS.TAVILY_API_KEY, ''),
  }
}

export function setApiSettings(settings: { apiKey?: string; groqModel?: string; tavilyApiKey?: string }): void {
  if (settings.apiKey !== undefined) safeSet(KEYS.GROQ_API_KEY, settings.apiKey)
  if (settings.groqModel !== undefined) safeSet(KEYS.GROQ_MODEL, settings.groqModel)
  if (settings.tavilyApiKey !== undefined) safeSet(KEYS.TAVILY_API_KEY, settings.tavilyApiKey)
}

// ─── Chat Threads ──────────────────────────────────────────────────────────────
export function getAllThreads(): ChatThread[] {
  return safeGet<ChatThread[]>(KEYS.THREADS, [])
}

export function getThreadsForIdea(ideaId: string): ChatThread[] {
  return getAllThreads().filter(t => t.ideaId === ideaId)
}

export function getThread(threadId: string): ChatThread | undefined {
  return getAllThreads().find(t => t.id === threadId)
}

export function saveThread(thread: ChatThread): void {
  const threads = getAllThreads()
  const idx = threads.findIndex(t => t.id === thread.id)
  if (idx >= 0) {
    threads[idx] = thread
  } else {
    threads.unshift(thread)
  }
  // keep at most 50 threads
  safeSet(KEYS.THREADS, threads.slice(0, 50))
}

export function createThread(ideaId: string, ideaTitle: string): ChatThread {
  const thread: ChatThread = {
    id: `thread_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ideaId,
    ideaTitle,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  saveThread(thread)
  return thread
}

export function addMessageToThread(threadId: string, message: ChatMessage): ChatThread | null {
  const thread = getThread(threadId)
  if (!thread) return null
  thread.messages.push(message)
  thread.updatedAt = Date.now()
  saveThread(thread)
  return thread
}

export function deleteThread(threadId: string): void {
  const threads = getAllThreads().filter(t => t.id !== threadId)
  safeSet(KEYS.THREADS, threads)
}

// ─── Active Thread ─────────────────────────────────────────────────────────────
export function getActiveThreadId(): string | null {
  return safeGet<string | null>(KEYS.ACTIVE_THREAD, null)
}

export function setActiveThreadId(threadId: string | null): void {
  safeSet(KEYS.ACTIVE_THREAD, threadId)
}

// ─── ID Generator ──────────────────────────────────────────────────────────────
export function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}
