import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Button } from '@/components/ui/button'

const inputClass =
  'w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50'

type PatientOption = { _id: string; name: string }
type StaffOption = { _id: string; name: string }

/**
 * Shared "Schedule Appointment" form used by both the Appointments page and a
 * patient's timeline on the Patients page. Owns its own submit state so the
 * two call sites don't each re-implement it.
 *
 * Pass `patientId` to lock the form to one patient (Patients page, where a
 * patient is already selected); pass `patients` instead to render a patient
 * picker (Appointments page).
 */
export function ScheduleAppointmentForm({
  patientId,
  patients,
  services,
  staffList,
  onDone,
  onCancel,
}: {
  patientId?: string
  patients?: PatientOption[]
  services: string[]
  staffList: StaffOption[]
  onDone?: () => void
  onCancel?: () => void
}) {
  const createAppointment = useMutation(api.appointments.createAppointment)

  const showPatientPicker = !patientId
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [service, setService] = useState('')
  const [therapistId, setTherapistId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const effectivePatientId = patientId ?? selectedPatientId
    if (!effectivePatientId || !dateTime || !therapistId) {
      setError('Patient, date/time, and therapist are required')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      await createAppointment({
        patientId: effectivePatientId as any,
        therapistId: therapistId as any,
        scheduledAt: new Date(dateTime).getTime(),
        serviceContext: service || undefined,
      })
      setSelectedPatientId('')
      setDateTime('')
      setService('')
      setTherapistId('')
      onDone?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule appointment')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className={`grid gap-4 ${showPatientPicker ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
        {showPatientPicker && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Patient</label>
            <select value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)} disabled={isLoading} className={inputClass}>
              <option value="">Select a patient…</option>
              {patients?.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-2">
          <label className="text-sm font-medium">Date &amp; Time</label>
          <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} disabled={isLoading} className={inputClass} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Service</label>
          <select value={service} onChange={(e) => setService(e.target.value)} disabled={isLoading} className={inputClass}>
            <option value="">Select a service…</option>
            {services.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Therapist</label>
          <select value={therapistId} onChange={(e) => setTherapistId(e.target.value)} disabled={isLoading} className={inputClass}>
            <option value="">Select a therapist…</option>
            {staffList.map((staff) => (
              <option key={staff._id} value={staff._id}>
                {staff.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Scheduling...' : 'Schedule Appointment'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
