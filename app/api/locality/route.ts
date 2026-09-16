import { NextRequest, NextResponse } from 'next/server'

// ─── Haversine distance (km) ──────────────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── Nominatim Reverse Geocode ─────────────────────────────────────────────────
async function reverseGeocode(lat: number, lon: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'LocalityIdeaAssistant/1.0' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Nominatim error: ${res.status}`)
  return res.json()
}

// ─── Nominatim Forward Geocode ─────────────────────────────────────────────────
async function forwardGeocode(query: string) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'LocalityIdeaAssistant/1.0' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Nominatim error: ${res.status}`)
  return res.json()
}

// ─── Overpass API: Nearby Maker/HW Resources ──────────────────────────────────
async function fetchNearbyResources(lat: number, lon: number, radiusM = 25000) {
  const query = `
[out:json][timeout:20];
(
  node["amenity"="makerspace"](around:${radiusM},${lat},${lon});
  node["leisure"="hackerspace"](around:${radiusM},${lat},${lon});
  node["shop"="electronics"](around:${radiusM},${lat},${lon});
  node["shop"="hardware"](around:${radiusM},${lat},${lon});
  node["shop"="computer"](around:${radiusM},${lat},${lon});
  node["amenity"="fab_lab"](around:${radiusM},${lat},${lon});
  way["amenity"="makerspace"](around:${radiusM},${lat},${lon});
  way["leisure"="hackerspace"](around:${radiusM},${lat},${lon});
  way["shop"="electronics"](around:${radiusM},${lat},${lon});
);
out center qt 30;
`
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`Overpass error: ${res.status}`)
  return res.json()
}

// ─── Type Labeller ────────────────────────────────────────────────────────────
function labelResourceType(tags: Record<string, string>): string {
  if (tags.amenity === 'makerspace' || tags.amenity === 'fab_lab') return 'Makerspace / Fab Lab'
  if (tags.leisure === 'hackerspace') return 'Hackerspace'
  if (tags.shop === 'electronics') return 'Electronics Store'
  if (tags.shop === 'hardware') return 'Hardware Store'
  if (tags.shop === 'computer') return 'Computer / Tech Store'
  return 'Resource'
}

// ─── Route Handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { lat, lon, query: searchQuery } = body as {
      lat?: number
      lon?: number
      query?: string
    }

    let finalLat = lat
    let finalLon = lon
    let locationData: Record<string, unknown> = {}

    // ── Forward geocode if city string provided ──────────────────────────────
    if (searchQuery && (!lat || !lon)) {
      const results = await forwardGeocode(searchQuery)
      if (!results.length) {
        return NextResponse.json({ error: 'Location not found' }, { status: 404 })
      }
      const first = results[0]
      finalLat = parseFloat(first.lat)
      finalLon = parseFloat(first.lon)
      locationData = first
    }

    if (finalLat === undefined || finalLon === undefined) {
      return NextResponse.json({ error: 'lat/lon or query required' }, { status: 400 })
    }

    // ── Reverse geocode ──────────────────────────────────────────────────────
    if (!searchQuery) {
      try {
        locationData = await reverseGeocode(finalLat, finalLon)
      } catch {
        // non-fatal, we'll build a label from coords
      }
    }

    // ── Build human-readable label ───────────────────────────────────────────
    const address = (locationData.address as Record<string, string>) || {}
    const displayName = (locationData.display_name as string) || ''
    const city =
      address.city || address.town || address.village || address.county || address.state || ''
    const country = address.country || ''
    const countryCode = (address.country_code || '').toUpperCase()
    const label =
      city && country
        ? `${city}, ${country}`
        : displayName.split(',').slice(0, 3).join(',').trim() ||
          `${finalLat.toFixed(3)}, ${finalLon.toFixed(3)}`

    // ── Nearby resources via Overpass ────────────────────────────────────────
    let resources: Array<{
      name: string
      type: string
      distance: number
      osmId: string
      lat: number
      lon: number
    }> = []

    try {
      const overpassData = await fetchNearbyResources(finalLat, finalLon)
      const elements = overpassData.elements || []

      resources = elements
        .map((el: { type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; id: number; tags?: Record<string, string> }) => {
          const elLat = el.lat ?? el.center?.lat
          const elLon = el.lon ?? el.center?.lon
          if (elLat === undefined || elLon === undefined) return null

          const tags = el.tags || {}
          const name = tags.name || tags['name:en'] || labelResourceType(tags)
          const dist = haversine(finalLat!, finalLon!, elLat, elLon)

          return {
            name,
            type: labelResourceType(tags),
            distance: dist,
            osmId: `${el.type}/${el.id}`,
            lat: elLat,
            lon: elLon,
          }
        })
        .filter(Boolean)
        .sort((a: { distance: number }, b: { distance: number }) => a.distance - b.distance)
        .slice(0, 15)
    } catch (err) {
      console.warn('Overpass unavailable, skipping nearby resources:', err)
    }

    // ── Autocomplete suggestions (for forward geocode) ───────────────────────
    let suggestions: Array<{ label: string; lat: number; lon: number; country: string }> = []
    if (searchQuery) {
      const results = await forwardGeocode(searchQuery).catch(() => [])
      suggestions = (results as Array<{ display_name: string; lat: string; lon: string; address?: { country?: string } }>).slice(0, 5).map((r) => ({
        label: r.display_name,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        country: r.address?.country || '',
      }))
    }

    return NextResponse.json({
      lat: finalLat,
      lon: finalLon,
      label,
      country,
      countryCode,
      resources,
      suggestions,
    })
  } catch (err) {
    console.error('[locality] error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch locality data', details: String(err) },
      { status: 500 }
    )
  }
}
