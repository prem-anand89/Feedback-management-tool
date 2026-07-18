import { useParams, createRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Route as RootRoute } from './__root'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { CheckCircle2, AlertCircle, Phone, MessageCircle } from 'lucide-react'

// This public booking form deliberately commits to a single, fixed light
// look (the "Minimal & refined" design) — it never follows the viewer's
// dark-mode preference, so its palette (paper #f7f5f6, ink #231f26, plum
// #6b2f66 / deep #522450 / tint #f2e9f1, hairline #e7e2e8, required #b0455f)
// is hardcoded here rather than drawn from the theme tokens the rest of the
// app uses.
const labelClass = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a8290]'
const fieldClass =
  'w-full rounded-none border-0 border-b border-[#e7e2e8] bg-transparent px-1 py-2.5 text-sm text-[#231f26] outline-none transition focus:border-[#6b2f66] disabled:opacity-50 placeholder:text-[#8a8290]'

const FLEXIBLE_TIME = "I'm flexible with the timing"

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function Req() {
  return <span className="text-[#b0455f]"> *</span>
}
function Opt() {
  return <span className="font-medium normal-case tracking-normal"> · optional</span>
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
  const [therapistId, setTherapistId] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  if (info === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f5f6]">
        <p className="text-sm text-[#8a8290]">Loading…</p>
      </div>
    )
  }

  if (info === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f5f6] p-4">
        <div className="flex items-center gap-2 text-sm text-[#8a8290]">
          <AlertCircle className="h-4 w-4" />
          This booking link isn't valid.
        </div>
      </div>
    )
  }

  const today = new Date()
  const minDate = toLocalDateStr(today)
  const tomorrowStr = toLocalDateStr(new Date(today.getTime() + 24 * 60 * 60 * 1000))
  const maxDateObj = new Date(today)
  maxDateObj.setDate(maxDateObj.getDate() + info.windowDays)
  const maxDate = toLocalDateStr(maxDateObj)

  const isClosedDay = (dateStr: string) => {
    if (!dateStr) return false
    const day = new Date(`${dateStr}T00:00:00`).getDay()
    return info.closedDays.includes(day)
  }

  // Per-clinician availability isn't modelled yet (it's the next feature —
  // editable day-wise/per-therapist slots). Until then every clinician shares
  // the clinic-wide list, so selecting one doesn't narrow the times.
  const availableSlots: string[] = info.timeSlots

  const callHref = info.contactPhone ? `tel:${info.contactPhone.replace(/\s+/g, '')}` : null
  const waHref = info.whatsappNumber ? `https://wa.me/${info.whatsappNumber.replace(/\D/g, '')}` : null

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
        preferredTherapistId: (therapistId || undefined) as any,
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
      <div className="flex min-h-screen items-center justify-center bg-[#f7f5f6] p-4">
        <div className="w-full max-w-md rounded-md border border-[#ded8df] bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f2e9f1]">
            <CheckCircle2 className="h-7 w-7 text-[#6b2f66]" />
          </div>
          <h1 className="mb-2 text-xl font-semibold text-[#522450]">Request received</h1>
          <p className="text-sm text-[#8a8290]">
            Thank you. Your appointment request has been received. We'll contact you shortly to confirm.
          </p>

          {(callHref || waHref) && (
            <div className="mt-6 space-y-2 border-t border-[#e7e2e8] pt-6">
              <p className="text-xs font-medium text-[#8a8290]">Need to reach us directly?</p>
              <div className="flex justify-center gap-2">
                {callHref && (
                  <a
                    href={callHref}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#e7e2e8] px-4 py-2 text-sm font-medium text-[#231f26] transition hover:border-[#6b2f66]"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Call {info.contactPhone}
                  </a>
                )}
                {waHref && (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#e7e2e8] px-4 py-2 text-sm font-medium text-[#231f26] transition hover:border-[#6b2f66]"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const dateIsCustom = !!date && date !== tomorrowStr

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f5f6] p-4">
      <div className="w-full max-w-md rounded-md border border-[#ded8df] bg-white p-8">
        <h1 className="text-xl font-semibold text-[#522450]">Request an appointment</h1>
        <p className="mb-6 mt-0.5 text-xs text-[#8a8290]">{info.name}</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Your details */}
          <div className="space-y-4">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Name<Req /></span>
              <input value={name} onChange={(e) => setName(e.target.value)} disabled={submitting} placeholder="Full name" className={fieldClass} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Phone<Req /></span>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={submitting} placeholder="Mobile" className={fieldClass} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Email<Opt /></span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={submitting} placeholder="Email" className={fieldClass} />
              </label>
            </div>
          </div>

          {/* Your visit */}
          <div className="space-y-4">
            {info.therapists.length > 0 && (
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Preferred clinician<Opt /></span>
                <select value={therapistId} onChange={(e) => setTherapistId(e.target.value)} disabled={submitting} className={fieldClass}>
                  <option value="">No preference — any available clinician</option>
                  {info.therapists.map((t: { _id: string; name: string }) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Service<Req /></span>
              {info.services.length > 0 ? (
                <select value={reason} onChange={(e) => setReason(e.target.value)} disabled={submitting} className={fieldClass}>
                  <option value="">Choose a service…</option>
                  {info.services.map((service: string) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              ) : (
                <input value={reason} onChange={(e) => setReason(e.target.value)} disabled={submitting} placeholder="What do you need?" className={fieldClass} />
              )}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Notes<Opt /></span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
                rows={2}
                placeholder="Anything else we should know?"
                className={`${fieldClass} resize-none`}
              />
            </label>
          </div>

          {/* When */}
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <span className={labelClass}>Date<Req /></span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={submitting || tomorrowStr > maxDate || isClosedDay(tomorrowStr)}
                  onClick={() => setDate(tomorrowStr)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition disabled:opacity-40 ${
                    date === tomorrowStr ? 'border-[#6b2f66] bg-[#f2e9f1] text-[#522450]' : 'border-[#e7e2e8] text-[#231f26] hover:border-[#6b2f66]'
                  }`}
                >
                  Tomorrow
                </button>
                <label
                  className={`flex flex-1 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                    dateIsCustom ? 'border-[#6b2f66] bg-[#f2e9f1] text-[#522450]' : 'border-[#e7e2e8] text-[#8a8290] hover:border-[#6b2f66]'
                  }`}
                >
                  🗓️
                  <input
                    type="date"
                    min={minDate}
                    max={maxDate}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    disabled={submitting}
                    className="w-full bg-transparent text-xs outline-none disabled:opacity-50"
                    aria-label="Pick a date"
                  />
                </label>
              </div>
              {date && isClosedDay(date) && <p className="text-xs text-[#b0455f]">The clinic is closed on this day.</p>}
            </div>

            <div className="flex flex-col gap-2">
              <span className={labelClass}>Time<Req /></span>
              <div className="flex flex-wrap gap-2">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    disabled={submitting}
                    onClick={() => setTime(slot)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold tabular-nums transition disabled:opacity-40 ${
                      time === slot ? 'border-[#6b2f66] bg-[#f2e9f1] text-[#522450]' : 'border-[#e7e2e8] text-[#231f26] hover:border-[#6b2f66]'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setTime(FLEXIBLE_TIME)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
                    time === FLEXIBLE_TIME ? 'border-[#6b2f66] bg-[#f2e9f1] text-[#522450]' : 'border-[#e7e2e8] text-[#8a8290] hover:border-[#6b2f66]'
                  }`}
                >
                  I'm flexible
                </button>
              </div>
            </div>
          </div>

          {error && <div className="rounded-md bg-[#b0455f]/10 p-3 text-sm text-[#b0455f]">{error}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[#231f26] py-3 text-sm font-semibold text-white transition hover:bg-[#522450] disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Request Appointment'}
          </button>

          {(callHref || waHref) && (
            <p className="text-center text-xs text-[#8a8290]">
              Prefer to talk to us directly?{' '}
              {callHref && (
                <a href={callHref} className="font-medium text-[#6b2f66] hover:underline">
                  Call {info.contactPhone}
                </a>
              )}
              {callHref && waHref && ' · '}
              {waHref && (
                <a href={waHref} target="_blank" rel="noopener noreferrer" className="font-medium text-[#6b2f66] hover:underline">
                  WhatsApp us
                </a>
              )}
            </p>
          )}
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
