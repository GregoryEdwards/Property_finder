import { PRESETS } from '@/lib/catalog'
import { useProfileStore } from '@/state/useProfileStore'

/**
 * Persona presets — first-run picker. Users can clone any preset and edit.
 */
export function PresetPicker() {
  const { id, applyPreset, resetToDefaults } = useProfileStore()
  return (
    <div className="space-y-2 px-3 pb-3 pt-2">
      <label className="text-[10px] uppercase tracking-wider text-ink-muted">
        Preset
      </label>
      <select
        value={id}
        onChange={(e) => {
          if (e.target.value === 'default') resetToDefaults()
          else applyPreset(e.target.value)
        }}
        className="w-full rounded-md border border-border bg-bg-subtle px-2 py-1.5 text-sm text-ink-primary focus:border-accent focus:outline-none"
      >
        <option value="default">Untitled profile</option>
        {PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  )
}
