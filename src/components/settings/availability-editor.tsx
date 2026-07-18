import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { ChevronDown, Check } from 'lucide-react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const inputClass =
  'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50'

type Clinician = {
  _id: string
  name: string
  weeklyAvailability?: { day: number; slots: string[] }[] | null
}

function parseSlots(text: string): string[] {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function ClinicianRow({ clinician, defaultSlots, disabled }: { clinician: Clinician; defaultSlots: string[]; disabled: boolean }) {
  const update = useMutation(api.clinics.updateStaffAvailability)
  const hasCustom = !!clinician.weeklyAvailability && clinician.weeklyAvailability.length > 0

  const [expanded, setExpanded] = useState(false)
  const [custom, setCustom] = useState(hasCustom)
  const [days, setDays] = useState<string[]>(() => {
    const arr = Array(7).fill('') as string[]
    for (const e of clinician.weeklyAvailability ?? []) arr[e.day] = e.slots.join(', ')
    return arr
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const enableCustom = () => {
    // Starting from the clinic's default hours on every day is the friendliest
    // baseline — the owner trims the days/times that don't apply.
    if (days.every((d) => !d.trim())) setDays(Array(7).fill(defaultSlots.join(', ')))
    setCustom(true)
  }

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const weeklyAvailability = custom
        ? days.map((text, day) => ({ day, slots: parseSlots(text) })).filter((e) => e.slots.length > 0)
        : []
      await update({ staffId: clinician._id as any, weeklyAvailability })
      setSaved(true)
      setTimeout(() => setSaved(false), 1600)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save availability')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium">{clinician.name}</p>
          <p className="text-xs text-muted-foreground">{hasCustom ? 'Custom hours' : 'Uses clinic default hours'}</p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-border p-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setCustom(false)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                !custom ? 'border-primary bg-primary/10 text-primary' : 'border-input hover:bg-accent'
              }`}
            >
              Clinic default hours
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={enableCustom}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                custom ? 'border-primary bg-primary/10 text-primary' : 'border-input hover:bg-accent'
              }`}
            >
              Custom hours
            </button>
          </div>

          {custom ? (
            <div className="space-y-2">
              {DAYS.map((dayName, day) => (
                <div key={day} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">{dayName}</span>
                  <input
                    value={days[day]}
                    onChange={(e) => setDays((prev) => prev.map((d, i) => (i === day ? e.target.value : d)))}
                    disabled={disabled}
                    placeholder="Closed — leave blank"
                    className={inputClass}
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Comma-separated times per day (e.g. “09:00 AM, 09:30 AM”). Leave a day blank to mark it closed for this clinician.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              This clinician is bookable at the clinic's default time slots on every open day. Switch to “Custom hours” to set their own schedule.
            </p>
          )}

          {error && <div className="rounded-xl bg-destructive/10 p-2.5 text-xs text-destructive">{error}</div>}

          <Button size="sm" onClick={save} disabled={disabled || saving}>
            {saved ? (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Saved
              </>
            ) : saving ? (
              'Saving…'
            ) : (
              'Save availability'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

export function AvailabilityEditor({
  clinicians,
  defaultSlots,
  disabled,
}: {
  clinicians: Clinician[]
  defaultSlots: string[]
  disabled: boolean
}) {
  if (clinicians.length === 0) {
    return <p className="text-sm text-muted-foreground">Add a clinician in Clinic Profile → Team to set their booking hours.</p>
  }
  return (
    <div className="space-y-2">
      {clinicians.map((c) => (
        // Stable key by id — the row owns its own draft state, so it stays
        // put (and keeps its "Saved" confirmation) when listStaff refetches
        // after a save rather than remounting and collapsing.
        <ClinicianRow key={c._id} clinician={c} defaultSlots={defaultSlots} disabled={disabled} />
      ))}
    </div>
  )
}
