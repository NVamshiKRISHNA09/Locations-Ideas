// ─── Utility Functions ─────────────────────────────────────────────────────────

/**
 * Format a timestamp into a human-readable relative string
 */
export function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(timestamp).toLocaleDateString()
}

/**
 * Format a date for display
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Truncate a string to a max length with ellipsis
 */
export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str
}

/**
 * Copy text to clipboard, returns success boolean
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    try {
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      return true
    } catch {
      return false
    }
  }
}

/**
 * Download text as a file
 */
export function downloadAsFile(content: string, filename: string, mimeType = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Convert markdown content to a clean download format
 */
export function buildExportContent(params: {
  ideaTitle: string
  location: string
  messages: Array<{ role: string; content: string; createdAt: number }>
}): string {
  const { ideaTitle, location, messages } = params
  const header = `# Build Plan: ${ideaTitle}
Location: ${location}
Generated: ${new Date().toLocaleDateString()}
---
`
  const body = messages
    .map((m) => `### ${m.role === 'user' ? '👤 You' : '🤖 AI Assistant'}\n\n${m.content}`)
    .join('\n\n---\n\n')

  return header + '\n\n' + body
}

/**
 * Slugify a string for use in URLs and IDs
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Parse difficulty color classes
 */
export function getDifficultyClass(difficulty: string): string {
  switch (difficulty) {
    case 'easy': return 'tag-easy'
    case 'medium': return 'tag-medium'
    case 'hard': return 'tag-hard'
    default: return 'tag-medium'
  }
}

/**
 * Parse category color classes
 */
export function getCategoryClass(category: string): string {
  switch (category) {
    case 'software': return 'tag-software'
    case 'hardware': return 'tag-hardware'
    case 'hybrid': return 'tag-hybrid'
    default: return 'tag-software'
  }
}

/**
 * Count tokens (rough estimate: 4 chars = 1 token)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Format token count for display
 */
export function formatTokens(count: number): string {
  if (count < 1000) return `~${count} tokens`
  return `~${(count / 1000).toFixed(1)}k tokens`
}
