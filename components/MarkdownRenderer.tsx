'use client'

import { useState, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'
import { copyToClipboard } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface MarkdownRendererProps {
  content: string
  isStreaming?: boolean
  className?: string
}

// ─── Code Block Component ──────────────────────────────────────────────────────
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(code)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [code])

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/30 border-b border-slate-200">
        <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors opacity-0 group-hover:opacity-100"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Code */}
      <pre className="overflow-x-auto p-4 bg-black/20 text-sm">
        <code className="font-mono text-slate-800 leading-relaxed whitespace-pre">{code}</code>
      </pre>
    </div>
  )
}

// ─── Table Component ──────────────────────────────────────────────────────────
function MarkdownTable({ rows }: { rows: string[][] }) {
  if (rows.length === 0) return null
  const header = rows[0]
  const body = rows.slice(2) // skip separator row

  return (
    <div className="overflow-x-auto my-4 rounded-xl border border-slate-200">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {header.map((cell, i) => (
              <th
                key={i}
                className="px-4 py-2.5 text-left font-semibold text-brand-300 bg-brand-500/10 border-b border-slate-200 whitespace-nowrap"
              >
                {cell.trim()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? '' : 'bg-slate-50'}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-slate-700 border-b border-white/4 last:border-b-0">
                  <InlineMarkdown text={cell.trim()} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Inline Markdown (bold, italic, code, links) ──────────────────────────────
function InlineMarkdown({ text }: { text: string }) {
  // Process inline elements: code, bold, italic, links
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  // Regex patterns for inline elements
  const patterns = [
    { re: /`([^`]+)`/, render: (m: RegExpMatchArray) => <code key={key++} className="px-1.5 py-0.5 rounded bg-brand-100 text-brand-300 font-mono text-[0.82em]">{m[1]}</code> },
    { re: /\*\*([^*]+)\*\*/, render: (m: RegExpMatchArray) => <strong key={key++} className="font-semibold text-slate-900">{m[1]}</strong> },
    { re: /\*([^*]+)\*/, render: (m: RegExpMatchArray) => <em key={key++} className="italic text-purple-300">{m[1]}</em> },
    { re: /\[([^\]]+)\]\(([^)]+)\)/, render: (m: RegExpMatchArray) => <a key={key++} href={m[2]} target="_blank" rel="noopener noreferrer" className="text-brand-400 underline underline-offset-2 hover:text-brand-300">{m[1]}</a> },
  ]

  while (remaining.length > 0) {
    let earliest: { index: number; match: RegExpMatchArray; render: (m: RegExpMatchArray) => React.ReactNode } | null = null

    for (const { re, render } of patterns) {
      const match = remaining.match(re)
      if (match && match.index !== undefined) {
        if (!earliest || match.index < earliest.index) {
          earliest = { index: match.index, match, render }
        }
      }
    }

    if (!earliest) {
      parts.push(remaining)
      break
    }

    // Text before match
    if (earliest.index > 0) {
      parts.push(remaining.slice(0, earliest.index))
    }
    parts.push(earliest.render(earliest.match))
    remaining = remaining.slice(earliest.index + earliest.match[0].length)
  }

  return <>{parts}</>
}

// ─── Block-level Markdown Parser ──────────────────────────────────────────────
function parseBlocks(content: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let key = 0

  // Split into segments at code fences first
  const codeFenceRe = /```(\w*)\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = codeFenceRe.exec(content)) !== null) {
    // Process text before code block
    if (match.index > lastIndex) {
      nodes.push(...parseTextBlocks(content.slice(lastIndex, match.index), () => key++))
    }
    nodes.push(<CodeBlock key={key++} language={match[1] || ''} code={match[2].trimEnd()} />)
    lastIndex = match.index + match[0].length
  }

  // Process remaining text
  if (lastIndex < content.length) {
    nodes.push(...parseTextBlocks(content.slice(lastIndex), () => key++))
  }

  return nodes
}

function parseTextBlocks(text: string, getKey: () => number): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const lines = text.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip empty lines
    if (!trimmed) { i++; continue }

    // Table detection: line starts and ends with |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableRows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const row = lines[i].trim().slice(1, -1).split('|')
        tableRows.push(row)
        i++
      }
      nodes.push(<MarkdownTable key={getKey()} rows={tableRows} />)
      continue
    }

    // H1
    const h1 = trimmed.match(/^# (.+)/)
    if (h1) {
      nodes.push(<h1 key={getKey()} className="text-2xl font-black text-slate-900 mt-6 mb-3 leading-tight">{h1[1]}</h1>)
      i++; continue
    }

    // H2
    const h2 = trimmed.match(/^## (.+)/)
    if (h2) {
      nodes.push(<h2 key={getKey()} className="text-lg font-bold text-brand-300 mt-5 mb-2.5 pb-1 border-b border-slate-200 leading-tight">{h2[1]}</h2>)
      i++; continue
    }

    // H3
    const h3 = trimmed.match(/^### (.+)/)
    if (h3) {
      nodes.push(<h3 key={getKey()} className="text-base font-bold text-purple-300 mt-4 mb-2 leading-tight">{h3[1]}</h3>)
      i++; continue
    }

    // H4
    const h4 = trimmed.match(/^#### (.+)/)
    if (h4) {
      nodes.push(<h4 key={getKey()} className="text-sm font-bold text-slate-700 mt-3 mb-1.5 leading-tight">{h4[1]}</h4>)
      i++; continue
    }

    // Horizontal rule
    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      nodes.push(<hr key={getKey()} className="my-5 border-slate-200" />)
      i++; continue
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].trim().slice(2))
        i++
      }
      nodes.push(
        <blockquote key={getKey()} className="pl-4 py-1 border-l-2 border-brand-500 my-3 text-slate-600 italic text-sm">
          {quoteLines.map((ql, qi) => <p key={qi}><InlineMarkdown text={ql} /></p>)}
        </blockquote>
      )
      continue
    }

    // Unordered list
    if (/^[-*+] /.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^[\s]*[-*+] /.test(lines[i]) && lines[i].trim()) {
        items.push(lines[i].replace(/^[\s]*[-*+] /, ''))
        i++
      }
      nodes.push(
        <ul key={getKey()} className="my-3 space-y-1.5 pl-0">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-slate-700 text-sm leading-relaxed">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
              <span><InlineMarkdown text={item} /></span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Ordered list
    if (/^\d+\. /.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i].trim()) && lines[i].trim()) {
        items.push(lines[i].replace(/^\d+\. /, ''))
        i++
      }
      nodes.push(
        <ol key={getKey()} className="my-3 space-y-1.5 pl-0">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-3 text-slate-700 text-sm leading-relaxed">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                {idx + 1}
              </span>
              <span><InlineMarkdown text={item} /></span>
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Regular paragraph — collect consecutive non-special lines
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().match(/^#{1,4} /) &&
      !lines[i].trim().match(/^[-*+] /) &&
      !lines[i].trim().match(/^\d+\. /) &&
      !lines[i].trim().startsWith('|') &&
      !lines[i].trim().startsWith('> ') &&
      !/^---+$/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith('```')
    ) {
      paraLines.push(lines[i])
      i++
    }

    if (paraLines.length > 0) {
      nodes.push(
        <p key={getKey()} className="text-slate-700 text-sm leading-relaxed mb-3">
          <InlineMarkdown text={paraLines.join(' ')} />
        </p>
      )
    } else {
      i++
    }
  }

  return nodes
}

// ─── Main Renderer ─────────────────────────────────────────────────────────────
export default function MarkdownRenderer({ content, isStreaming = false, className = '' }: MarkdownRendererProps) {
  const nodes = parseBlocks(content)

  return (
    <div className={`markdown-content ${className}`}>
      {nodes}
      {isStreaming && (
        <span className="inline-block w-0.5 h-4 bg-brand-400 ml-0.5 animate-pulse rounded-full" />
      )}
    </div>
  )
}
