/**
 * UK postcode geocoding via postcodes.io.
 *
 * postcodes.io is a free, no-key, UK-specific service maintained by
 * Ideal Postcodes. It returns lat/lng + admin info for any valid UK
 * postcode and supports reverse lookup (nearest postcodes to a
 * coordinate). It's the right tool for this app — we don't need
 * country-wide geocoding, just UK postcodes.
 *
 * No caching: results are stable and cheap. If we ever start hammering
 * the endpoint, add localStorage caching keyed by canonical postcode.
 *
 * All exported functions return `null` on any error (network, 404,
 * malformed response) — callers handle nullable cleanly.
 */

export interface GeocodeResult {
  postcode: string
  lat: number
  lng: number
  /** District-level admin area (e.g. "Westminster", "Birmingham"). */
  adminDistrict?: string
}

/**
 * Forward lookup — postcode → coordinates.
 * Accepts any casing/spacing; postcodes.io tolerates "sw1a 1aa" or
 * "SW1A1AA" equally and returns the canonical form.
 */
export async function lookupPostcode(input: string): Promise<GeocodeResult | null> {
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, ' ')
  if (!cleaned) return null
  const url = `https://api.postcodes.io/postcodes/${encodeURIComponent(cleaned)}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = (await res.json()) as {
      result?: {
        postcode: string
        latitude: number
        longitude: number
        admin_district?: string
      }
    }
    const r = data?.result
    if (!r || typeof r.latitude !== 'number') return null
    return {
      postcode: r.postcode,
      lat: r.latitude,
      lng: r.longitude,
      adminDistrict: r.admin_district,
    }
  } catch {
    return null
  }
}

/**
 * Reverse lookup — coordinates → nearest postcode.
 * Used when the user drops a pin on the map: we offer a suggested
 * postcode they can accept or override.
 */
export async function reverseLookupPostcode(
  lat: number,
  lng: number,
): Promise<GeocodeResult | null> {
  const url = `https://api.postcodes.io/postcodes?lat=${lat}&lon=${lng}&limit=1`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = (await res.json()) as {
      result?: Array<{
        postcode: string
        latitude: number
        longitude: number
        admin_district?: string
      }>
    }
    const r = data?.result?.[0]
    if (!r) return null
    return {
      postcode: r.postcode,
      lat: r.latitude,
      lng: r.longitude,
      adminDistrict: r.admin_district,
    }
  } catch {
    return null
  }
}
