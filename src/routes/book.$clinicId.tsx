import { useParams, createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { IconBadge } from '@/components/ui/icon-badge'

const fieldClass =
  'w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 placeholder:text-muted-foreground'

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function BookAppointmentPage() {
  const { clinicId } = useParams({ from: '/book/$clinicId' })
  const info = useQuery(api.appointmentRequests.getPublicClinicBookingInfo, { clinicId: clinicId as any })
  const createRequest = useMutation(api.appointmentRequests.createAppointmentRequest)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  if (info === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (info === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          This booking link isn't valid.
        </div>
      </div>
    )
  }

  const today = new Date()
  const minDate = toLocalDateStr(today)
  const maxDateObj = new Date(today)
  maxDateObj.setDate(maxDateObj.getDate() + info.windowDays)
  const maxDate = toLocalDateStr(maxDateObj)

  const isClosedDay = (dateStr: string) => {
    if (!dateStr) return false
    const day = new Date(`${dateStr}T00:00:00`).getDay()
    return info.closedDays.includes(day)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim() || !date || !time || !reason) {
      setError('Please fill in all required fields')
      return
    }
    if (date < minDate || date > maxDate) {
      setError('Please choose a date within the available booking window')
      return
    }
    if (isClosedDay(date)) {
      setError('The clinic is closed on the selected day. Please choose another date.')
      return
    }

    // Open a blank tab synchronously, inside the click gesture — most
    // browsers block window.open() called after an awaited async call, so we
    // reserve the tab now and point it at WhatsApp once the request is saved.
    const waTab = info.whatsappNumber ? window.open('', '_blank') : null

    setSubmitting(true)
    setError('')
    try {
      await createRequest({
        clinicId: clinicId as any,
        patientName: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        preferredDate: date,
        preferredTime: time,
        reason,
        notes: notes.trim() || undefined,
      })

      if (info.whatsappNumber && waTab) {
        const message = [
          `Hello ${info.name},`,
          '',
          `I'd like to request an appointment.`,
          '',
          `Name: ${name.trim()}`,
          `Phone: ${phone.trim()}`,
          `Preferred Date: ${date}`,
          `Preferred Time: ${time}`,
          `Reason: ${reason}`,
          email.trim() ? `Email: ${email.trim()}` : null,
          notes.trim() ? `Notes: ${notes.trim()}` : null,
          '',
          `Submitted via ${info.name} website`,
        ]
          .filter(Boolean)
          .join('\n')

        const waNumber = info.whatsappNumber.replace(/\D/g, '')
        waTab.location.href = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`
      } else {
        waTab?.close()
      }

      setSubmitted(true)
    } catch (err) {
      waTab?.close()
      setError(err instanceof Error ? err.message : 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <IconBadge icon={CheckCircle2} size="lg" colorClassName="bg-primary/10 text-primary" className="mx-auto mb-4" />
          <h1 className="mb-2 text-xl font-semibold">Request Received</h1>
          <p className="text-sm text-muted-foreground">
            Thank you. Your appointment request has been received. We will contact you shortly to confirm your appointment.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold text-primary">Make an Appointment</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            placeholder="Patient Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            className={fieldClass}
          />
          <input
            type="tel"
            placeholder="Phone *"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={submitting}
            className={fieldClass}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              min={minDate}
              max={maxDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={submitting}
              className={fieldClass}
            />
            <select value={time} onChange={(e) => setTime(e.target.value)} disabled={submitting} className={fieldClass}>
              <option value="">Time *</option>
              {info.timeSlots.map((slot: string) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
          {date && isClosedDay(date) && <p className="text-xs text-destructive">The clinic is closed on this day.</p>}

          {info.services.length > 0 ? (
            <select value={reason} onChange={(e) => setReason(e.target.value)} disabled={submitting} className={fieldClass}>
              <option value="">Reason for Visit *</option>
              {info.services.map((service: string) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
          ) : (
            <input
              placeholder="Reason for Visit *"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              className={fieldClass}
            />
          )}

          <input
            type="email"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            className={fieldClass}
          />
          <textarea
            placeholder="Type Appointment Note"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
            rows={3}
            className={fieldClass}
          />

          {error && <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Request Appointment'}
          </button>
        </form>
      </div>
    </div>
  )
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/book/$clinicId',
  component: BookAppointmentPage,
})
