import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { ChevronDown, Check, Copy } from 'lucide-react'
import { STANDARD_SLOTS, TimeSlotChips } from './time-slot-chips'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type Clinician = {
  _id: string
  name: string
  weeklyAvailability?: { day: number; slots: string[] }[] | null
}

function ClinicianRow({ clinician, defaultSlots, disabled }: { clinician: Clinician; defaultSlots: string[]; disabled: boolean }) {
  const update = useMutation(api.clinics.updateStaffAvailability)
  const hasCustom = !!clinician.weeklyAvailability && clinician.weeklyAvailability.length > 0

  const [expanded, setExpanded] = useState(false)
  const [custom, setCustom] = useState(hasCustom)
  const [days, setDays] = useState<string[][]>(() => {
    const arr: string[][] = Array.from({ length: 7 }, () => [])
    for (const e of clinician.weeklyAvailability ?? []) arr[e.day] = [...e.slots]
    return arr
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const enableCustom = () => {
    // Starting from the clinic's default hours on every day is the friendliest
    // baseline — the owner trims the days/times that don't apply.
    if (days.every((d) => d.length === 0)) setDays(Array.from({ length: 7 }, () => [...defaultSlots]))
    setCustom(true)
  }

  const toggleSlot = (day: number, slot: string) => {
    setDays((prev) =>
      prev.map((d, i) => (i === day ? (d.includes(slot) ? d.filter((s) => s !== slot) : [...d, slot].sort((a, b) => STANDARD_SLOTS.indexOf(a) - STANDARD_SLOTS.indexOf(b))) : d)),
    )
  }

  const copyToAllDays = (day: number) => {
    setDays((prev) => prev.map(() => [...prev[day]]))
  }

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const weeklyAvailability = custom ? days.map((slots, day) => ({ day, slots })).filter((e) => e.slots.length > 0) : []
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
        <div className="space-y-4 border-t border-border p-3">
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
            <div className="space-y-4">
              {DAYS.map((dayName, day) => (
                <div key={day} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{dayName}</span>
                    <div className="flex items-center gap-2">
                      {days[day].length === 0 && <span className="text-[11px] text-muted-foreground">Closed</span>}
                      <button
                        type="button"
                        disabled={disabled || days[day].length === 0}
                        onClick={() => copyToAllDays(day)}
                        title={`Copy ${DAYS_SHORT[day]}'s hours to every day`}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-primary disabled:opacity-40"
                      >
                        <Copy className="h-3 w-3" />
                        Copy to all days
                      </button>
                    </div>
                  </div>
                  <TimeSlotChips slots={days[day]} onToggle={(slot) => toggleSlot(day, slot)} disabled={disabled} />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Tap times to toggle them on or off for that day. Leave a day empty to mark it closed for this clinician.</p>
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
