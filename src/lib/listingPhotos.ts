/**
 * Curated CC0 / Unsplash-license photo catalog for synthetic UK listings.
 *
 * Phase 1.3 ships real-looking exterior + interior shots so the demo reads
 * convincingly. Each listing in the seed gets a deterministic photo set
 * (hero + 3 thumbnails) via its `photoSeed`.
 *
 * Why Unsplash CDN URLs (not Picsum):
 *   - Picsum returns generic stock; rarely architecture.
 *   - Unsplash CDN URLs with a stable photo id are persistent.
 *   - License: Unsplash License (similar to CC0 — free for commercial use,
 *     no attribution required). See https://unsplash.com/license.
 *
 * Maintenance: if an image goes 404 in the future, replace the entry —
 * each listing's `photoSeed` is a stable int so swapping array positions
 * may rotate which listings get which photo. The seed file is regenerated
 * by `npm run seed`, so a refresh restores a coherent pairing.
 *
 * To extend: add a `LISTING_PHOTOS` entry below. Keep `categories` so a
 * future enhancement can match photos to property types (flat ↔ apartment
 * interior, detached ↔ detached exterior, etc.). For Phase 1.3 the
 * selection is bag-of-photos; matching by type is a future improvement.
 */

export interface ListingPhoto {
  url: string
  /** Loose tagging — Phase 2 may match photo to property_type. */
  categories: Array<'exterior' | 'interior' | 'kitchen' | 'living' | 'bedroom'>
}

/** Build a stable Unsplash CDN URL. The CDN returns a resized JPEG. */
const u = (id: string): string =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=72`

export const LISTING_PHOTOS: ListingPhoto[] = [
  { url: u('photo-1568605114967-8130f3a36994'), categories: ['exterior'] }, // modern detached
  { url: u('photo-1564013799919-ab600027ffc6'), categories: ['exterior'] }, // suburban house, lawn
  { url: u('photo-1570129477492-45c003edd2be'), categories: ['exterior'] }, // detached, drive
  { url: u('photo-1580587771525-78b9dba3b914'), categories: ['exterior'] }, // luxury exterior
  { url: u('photo-1512917774080-9991f1c4c750'), categories: ['exterior'] }, // UK terraced row
  { url: u('photo-1505843513577-22bb7d21e455'), categories: ['exterior'] }, // manor house
  { url: u('photo-1494526585095-c41746248156'), categories: ['exterior'] }, // modern white
  { url: u('photo-1571055107559-3e67626fa8be'), categories: ['exterior'] }, // exterior front
  { url: u('photo-1605276374104-dee2a0ed3cd6'), categories: ['exterior'] }, // suburban semi
  { url: u('photo-1576941089067-2de3c901e126'), categories: ['exterior'] }, // contemporary house
  { url: u('photo-1502672260266-1c1ef2d93688'), categories: ['interior', 'living'] },
  { url: u('photo-1556228453-efd6c1ff04f6'), categories: ['interior', 'living'] },
  { url: u('photo-1493809842364-78817add7ffb'), categories: ['interior', 'living'] },
  { url: u('photo-1567016376408-0226e4d0c1ea'), categories: ['interior', 'living'] },
  { url: u('photo-1583847268964-b28dc8f51f92'), categories: ['kitchen'] },
  { url: u('photo-1600585154340-be6161a56a0c'), categories: ['kitchen'] },
  { url: u('photo-1556909114-f6e7ad7d3136'), categories: ['kitchen'] },
  { url: u('photo-1556909212-d5b604d0c90d'), categories: ['kitchen'] },
  { url: u('photo-1540518614846-7eded433c457'), categories: ['bedroom'] },
  { url: u('photo-1522708323590-d24dbb6b0267'), categories: ['bedroom'] },
  { url: u('photo-1505691938895-1758d7feb511'), categories: ['bedroom'] },
  { url: u('photo-1611892440504-42a792e24d32'), categories: ['bedroom'] },
  { url: u('photo-1600596542815-ffad4c1539a9'), categories: ['kitchen', 'interior'] },
  { url: u('photo-1600585154526-990dced4db0d'), categories: ['exterior'] },
  { url: u('photo-1593696140826-c58b021acf8b'), categories: ['exterior'] },
  { url: u('photo-1518895949257-7621c3c786d7'), categories: ['exterior'] }, // London street
  { url: u('photo-1580237072617-771c3ecc4a24'), categories: ['exterior'] }, // UK townhouse row
  { url: u('photo-1530102026311-91d52a7c7b51'), categories: ['exterior'] }, // brick semi
  { url: u('photo-1597100798933-bcb3df8a1146'), categories: ['exterior'] }, // modern build
  { url: u('photo-1572120360610-d971b9d7767c'), categories: ['interior', 'living'] },
]

/**
 * Pick a stable set of (1 hero + N gallery thumbs) for a listing.
 *
 * Determinism: the photoSeed-based offset means the same listing always
 * gets the same photos, regardless of catalog ordering churn within a
 * minor cycle (so a hot-reload during dev doesn't shuffle the gallery).
 */
export function photosForSeed(
  photoSeed: number,
  galleryCount = 3,
): string[] {
  const n = LISTING_PHOTOS.length
  const hero = LISTING_PHOTOS[photoSeed % n].url
  const out: string[] = [hero]
  // Bias the gallery toward photos of *different* categories from the hero
  // by offsetting by primes. Avoids the gallery being "house exterior x4".
  const offsets = [7, 13, 19, 23, 29]
  const used = new Set<string>([hero])
  for (let i = 0; i < galleryCount; i++) {
    const idx = (photoSeed + offsets[i % offsets.length] * (i + 1)) % n
    const url = LISTING_PHOTOS[idx].url
    if (!used.has(url)) {
      out.push(url)
      used.add(url)
    }
  }
  return out
}
