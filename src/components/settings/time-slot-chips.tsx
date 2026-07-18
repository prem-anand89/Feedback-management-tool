// "06:00 AM", "06:30 AM", … "08:30 PM" — covers ordinary clinic hours as
// tappable chips. Any slot already selected outside this range (e.g. set
// previously via free-text entry, or just an odd hour) is still shown as
// its own chip so it's never silently dropped.
export function buildStandardSlots(): string[] {
  const out: string[] = []
  for (let mins = 6 * 60; mins <= 20 * 60 + 30; mins += 30) {
    const h24 = Math.floor(mins / 60)
    const m = mins % 60
    const ap = h24 < 12 ? 'AM' : 'PM'
    const h12 = ((h24 + 11) % 12) + 1
    out.push(`${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`)
  }
  return out
}
export const STANDARD_SLOTS = buildStandardSlots()

export function TimeSlotChips({
  slots,
  onToggle,
  disabled,
}: {
  slots: string[]
  onToggle: (slot: string) => void
  disabled: boolean
}) {
  // Union of the standard grid + anything custom already selected, so an
  // unusual saved time (e.g. "07:15 AM") still gets its own chip.
  const allSlots = [...new Set([...STANDARD_SLOTS, ...slots])].sort(
    (a, b) => STANDARD_SLOTS.indexOf(a) - STANDARD_SLOTS.indexOf(b) || a.localeCompare(b),
  )
  return (
    <div className="flex flex-wrap gap-1.5">
      {allSlots.map((slot) => {
        const active = slots.includes(slot)
        return (
          <button
            key={slot}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(slot)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums transition disabled:opacity-50 ${
              active ? 'border-primary bg-primary/10 text-primary' : 'border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {slot}
          </button>
        )
      })}
    </div>
  )
}
