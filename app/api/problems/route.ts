import { NextRequest, NextResponse } from 'next/server'

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface LocalProblem {
  title: string
  summary: string
  source: string
  url: string
  category: 'infrastructure' | 'environment' | 'health' | 'economy' | 'education' | 'safety' | 'civic' | 'other'
  severity: 'high' | 'medium' | 'low'
}

// ─── Search queries to run for a location ─────────────────────────────────────
function buildSearchQueries(label: string, country: string): string[] {
  const city = label.split(',')[0].trim()
  return [
    `${city} ${country} major problems issues 2024`,
    `${city} infrastructure problems citizens complaints`,
    `${city} environmental issues pollution problems`,
    `${city} public health problems challenges`,
    `${city} civic problems government failures local`,
  ]
}

// ─── Categorise a problem from its title/summary ──────────────────────────────
function categorise(title: string, summary: string): LocalProblem['category'] {
  const text = (title + ' ' + summary).toLowerCase()
  if (/road|traffic|transport|water|power|electricity|flood|drainage|sewage|bridge|infrastructure/.test(text)) return 'infrastructure'
  if (/pollution|air quality|waste|garbage|environment|climate|deforestation|contamina/.test(text)) return 'environment'
  if (/health|hospital|disease|malaria|dengue|covid|medicine|sanitation|malnutrition/.test(text)) return 'health'
  if (/unemploy|poverty|economy|jobs|cost|inflation|market|business|income/.test(text)) return 'economy'
  if (/school|education|literacy|student|teacher|college|dropout/.test(text)) return 'education'
  if (/crime|safety|violence|accident|fire|theft|security/.test(text)) return 'safety'
  if (/government|council|corruption|civic|municipality|bureaucracy|policy/.test(text)) return 'civic'
  return 'other'
}

// ─── Guess severity from keywords ────────────────────────────────────────────
function severity(title: string, summary: string): LocalProblem['severity'] {
  const text = (title + ' ' + summary).toLowerCase()
  if (/crisis|severe|critical|urgent|emergency|death|deadly|fatal|disaster/.test(text)) return 'high'
  if (/significant|serious|major|widespread|chronic|persistent|ongoing/.test(text)) return 'medium'
  return 'low'
}

// ─── Tavily search ────────────────────────────────────────────────────────────
async function tavilySearch(query: string, apiKey: string) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',
      max_results: 5,
      include_answer: false,
      include_raw_content: false,
    }),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Tavily error ${res.status}: ${err}`)
  }
  return res.json()
}

// ─── Route Handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { label, country, tavilyApiKey: clientKey, numQueries = 3 } = body as {
      label: string
      country: string
      tavilyApiKey?: string
      numQueries?: number
    }

    if (!label) {
      return NextResponse.json({ error: 'label required' }, { status: 400 })
    }

    const tavilyKey = process.env.TAVILY_API_KEY || clientKey || ''

    // No Tavily key → return empty (graceful degradation)
    if (!tavilyKey) {
      return NextResponse.json({ problems: [], noKey: true })
    }

    const queries = buildSearchQueries(label, country || '')

    // Run up to numQueries in parallel (all 5 when called from ideas route)
    const results = await Promise.allSettled(
      queries.slice(0, Math.min(numQueries, queries.length)).map((q) => tavilySearch(q, tavilyKey))
    )

    // Flatten all results, deduplicate by URL
    const seen = new Set<string>()
    const problems: LocalProblem[] = []

    for (const result of results) {
      if (result.status !== 'fulfilled') continue
      const hits = result.value?.results || []
      for (const hit of hits) {
        if (!hit.url || seen.has(hit.url)) continue
        seen.add(hit.url)
        const title = hit.title || ''
        const summary = hit.content || hit.snippet || ''
        if (!title || !summary) continue

        problems.push({
          title,
          summary: summary.slice(0, 300),
          source: new URL(hit.url).hostname.replace('www.', ''),
          url: hit.url,
          category: categorise(title, summary),
          severity: severity(title, summary),
        })
      }
    }

    // Sort: high severity first, then medium, then low
    const severityOrder = { high: 0, medium: 1, low: 2 }
    problems.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    return NextResponse.json({ problems: problems.slice(0, 12) })
  } catch (err) {
    console.error('[problems] route error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch local problems', details: String(err) },
      { status: 500 }
    )
  }
}
