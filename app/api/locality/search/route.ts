import { NextRequest, NextResponse } from 'next/server'

/**
 * Dedicated Nominatim autocomplete endpoint
 * GET /api/locality/search?q=bangalore&limit=5
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 10)

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=${limit}&addressdetails=1&namedetails=1`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'LocalityIdeaAssistant/1.0' },
      signal: AbortSignal.timeout(6000),
    })

    if (!res.ok) {
      return NextResponse.json({ results: [], error: `Nominatim ${res.status}` })
    }

    const data = await res.json()

    const results = (data as Array<{
      place_id: string
      display_name: string
      lat: string
      lon: string
      type: string
      importance: number
      address?: {
        country?: string
        country_code?: string
        city?: string
        town?: string
        village?: string
        state?: string
      }
    }>)
      .sort((a, b) => b.importance - a.importance)
      .map((r) => ({
        placeId: r.place_id,
        label: r.display_name,
        shortLabel:
          r.address?.city ||
          r.address?.town ||
          r.address?.village ||
          r.address?.state ||
          r.display_name.split(',')[0],
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        country: r.address?.country || '',
        countryCode: (r.address?.country_code || '').toUpperCase(),
        type: r.type,
      }))

    return NextResponse.json({ results })
  } catch (err) {
    console.warn('[search] Nominatim error:', err)
    return NextResponse.json({ results: [], error: String(err) })
  }
}
