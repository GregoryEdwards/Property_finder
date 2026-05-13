import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Loader2,
  MapPin,
  Search,
} from 'lucide-react'
import { lookupPostcode, reverseLookupPostcode } from '@/lib/geocode'
import { regionForCoords, REGIONS_BY_ID } from '@/lib/regions'
import { usePinnedStore } from '@/state/usePinnedStore'
import { useUIStore } from '@/state/useUIStore'
import { cn } from '@/lib/utils'

interface Props {
  onClose: () => void
}

/**
 * Form for adding a pinned property.
 *
 * Two entry paths share the same form:
 *
 *   1. **Postcode lookup** — user types a UK postcode, we hit
 *      postcodes.io, fill lat/lng + canonical postcode.
 *   2. **Map pin-drop** — user clicks "Drop on map", the form closes,
 *      MapView enters pin-drop mode, the next click sets
 *      `pendingPinDrop` in the UI store, and this form re-opens with
 *      lat/lng pre-filled and a reverse-looked-up postcode suggestion.
 *
 * The form validates coordinates before submit and shows the region
 * the pin will sit in so the user knows whether it'll be scored against
 * London, the West Midlands, or "outside supported regions."
 */
export function AddPinnedForm({ onClose }: Props) {
  const addPin = usePinnedStore((s) => s.add)
  const pendingPinDrop = useUIStore((s) => s.pendingPinDrop)
  const setPendingPinDrop = useUIStore((s) => s.setPendingPinDrop)
  const setPinDropMode = useUIStore((s) => s.setPinDropMode)
  const setSelectedPinnedId = useUIStore((s) => s.setSelectedPinnedId)

  // Inputs.
  const [name, setName] = useState('')
  const [postcodeInput, setPostcodeInput] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  )
  const [resolvedPostcode, setResolvedPostcode] = useState<string | undefined>()
  const [price, setPrice] = useState('')
  const [beds, setBeds] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [notes, setNotes] = useState('')

  // Async state.
  const [lookupBusy, setLookupBusy] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)

  // If a pin-drop arrived from MapView, ingest it.
  useEffect(() => {
    if (!pendingPinDrop) return
    setCoords(pendingPinDrop)
    setLookupBusy(true)
    setLookupError(null)
    reverseLookupPostcode(pendingPinDrop.lat, pendingPinDrop.lng)
      .then((r) => {
        if (!r) return
        setResolvedPostcode(r.postcode)
        if (!postcodeInput) setPostcodeInput(r.postcode)
        if (!name) setName(`Pin near ${r.postcode}`)
      })
      .finally(() => setLookupBusy(false))
    // Clear the pending so it doesn't re-trigger on unrelated rerenders.
    setPendingPinDrop(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPinDrop])

  const region = coords ? regionForCoords(coords.lat, coords.lng) : null
  const regionName = region ? REGIONS_BY_ID[region]?.displayName : null

  const canSave = !!coords && name.trim().length > 0

  async function handleLookupPostcode() {
    setLookupError(null)
    if (!postcodeInput.trim()) {
      setLookupError('Type a UK postcode (e.g. SW1A 1AA)')
      return
    }
    setLookupBusy(true)
    const r = await lookupPostcode(postcodeInput)
    setLookupBusy(false)
    if (!r) {
      setLookupError(
        "Couldn't find that postcode. Check spelling or try again.",
      )
      return
    }
    setCoords({ lat: r.lat, lng: r.lng })
    setResolvedPostcode(r.postcode)
    setPostcodeInput(r.postcode)
    if (!name) setName(`Pin in ${r.postcode}`)
  }

  function handleDropOnMap() {
    // Close this form; MapView will re-open it once the user clicks the
    // map and `pendingPinDrop` arrives via the UI store.
    setPinDropMode(true)
    onClose()
  }

  function handleSave() {
    if (!coords) return
    const pin = addPin({
      name: name.trim(),
      lat: coords.lat,
      lng: coords.lng,
      postcode: resolvedPostcode ?? (postcodeInput.trim() || undefined),
      externalUrl: externalUrl.trim() || undefined,
      price: price ? Number(price) : undefined,
      beds: beds ? Number(beds) : undefined,
      notes: notes.trim() || undefined,
    })
    setSelectedPinnedId(pin.id)
    onClose()
  }

  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-primary">
          Add a pinned property
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] text-ink-muted hover:text-ink-primary"
        >
          Cancel
        </button>
      </header>

      {/* Postcode lookup */}
      <div className="space-y-1.5">
        <Label htmlFor="pin-postcode">UK postcode</Label>
        <div className="flex items-center gap-1.5">
          <input
            id="pin-postcode"
            type="text"
            value={postcodeInput}
            onChange={(e) => setPostcodeInput(e.target.value)}
            placeholder="e.g. SW1A 1AA"
            autoComplete="postal-code"
            className="flex-1 rounded-md border border-border bg-bg-base px-2 py-1.5 text-xs text-ink-primary placeholder:text-ink-muted focus:border-accent focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleLookupPostcode()
              }
            }}
          />
          <button
            type="button"
            onClick={handleLookupPostcode}
            disabled={lookupBusy || !postcodeInput.trim()}
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] transition-colors',
              lookupBusy || !postcodeInput.trim()
                ? 'bg-bg-subtle text-ink-muted'
                : 'bg-accent text-bg-base hover:bg-accent/90',
            )}
          >
            {lookupBusy ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Search className="h-3 w-3" />
            )}
            Look up
          </button>
        </div>
        {lookupError && (
          <div className="flex items-start gap-1 text-[10px] text-red-300">
            <AlertTriangle className="mt-0.5 h-2.5 w-2.5 shrink-0" />
            {lookupError}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-ink-muted">
          or
        </span>
        <button
          type="button"
          onClick={handleDropOnMap}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-bg-subtle px-2 py-1 text-[11px] text-ink-secondary hover:border-border-strong hover:bg-bg-hover hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <MapPin className="h-3 w-3" />
          Drop a pin on the map
        </button>
      </div>

      {/* Status: where the pin will land */}
      <div className="rounded-md border border-border bg-bg-base px-2.5 py-2 text-[11px]">
        {coords ? (
          <>
            <div className="flex items-center gap-1.5 text-ink-primary">
              <MapPin className="h-3 w-3 text-accent" />
              <span className="font-mono">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </span>
            </div>
            <div className="mt-0.5 text-[10px] text-ink-muted">
              {regionName ? (
                <>
                  Will be scored against{' '}
                  <span className="text-ink-secondary">{regionName}</span>
                </>
              ) : (
                <>
                  Outside the supported regions — saved but unscored. Add
                  another region to score it.
                </>
              )}
            </div>
          </>
        ) : (
          <div className="text-ink-muted">
            Look up a postcode or drop a pin on the map to set coordinates.
          </div>
        )}
      </div>

      {/* Metadata */}
      <Field label="Name (required)">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. 3-bed terrace, Brixton"
          className="w-full rounded-md border border-border bg-bg-base px-2 py-1.5 text-xs text-ink-primary placeholder:text-ink-muted focus:border-accent focus:outline-none"
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Price (£)">
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="450000"
            step={5000}
            className="w-full rounded-md border border-border bg-bg-base px-2 py-1.5 text-xs text-ink-primary placeholder:text-ink-muted focus:border-accent focus:outline-none"
          />
        </Field>
        <Field label="Bedrooms">
          <input
            type="number"
            value={beds}
            onChange={(e) => setBeds(e.target.value)}
            placeholder="3"
            min={0}
            max={20}
            className="w-full rounded-md border border-border bg-bg-base px-2 py-1.5 text-xs text-ink-primary placeholder:text-ink-muted focus:border-accent focus:outline-none"
          />
        </Field>
      </div>

      <Field label="Listing URL (Rightmove / Zoopla / OTM)">
        <input
          type="url"
          value={externalUrl}
          onChange={(e) => setExternalUrl(e.target.value)}
          placeholder="https://www.rightmove.co.uk/properties/…"
          className="w-full rounded-md border border-border bg-bg-base px-2 py-1.5 text-xs text-ink-primary placeholder:text-ink-muted focus:border-accent focus:outline-none"
        />
      </Field>

      <Field label="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything to remember about this one…"
          rows={2}
          className="w-full resize-y rounded-md border border-border bg-bg-base px-2 py-1.5 text-xs text-ink-primary placeholder:text-ink-muted focus:border-accent focus:outline-none"
        />
      </Field>

      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition-colors',
          canSave
            ? 'bg-accent text-bg-base hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-panel'
            : 'bg-bg-subtle text-ink-muted',
        )}
      >
        Save pin
      </button>
    </div>
  )
}

function Label({
  children,
  htmlFor,
}: {
  children: React.ReactNode
  htmlFor?: string
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[10px] uppercase tracking-wider text-ink-muted"
    >
      {children}
    </label>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
