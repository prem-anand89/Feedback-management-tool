import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { StaffLayout } from '@/components/staff-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarClock, Plus, Clock, CheckCircle2, XCircle, MessageSquareText } from 'lucide-react'
import { useQuery, useMutation, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { IconBadge } from '@/components/ui/icon-badge'

const inputClass =
  'w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50'

const statusBadgeClass: Record<string, string> = {
  scheduled: 'bg-secondary/15 text-secondary',
  completed: 'bg-primary/10 text-primary',
  cancelled: 'bg-muted text-muted-foreground',
  'no-show': 'bg-destructive/10 text-destructive',
}

function dayLabel(ts: number) {
  const date = new Date(ts)
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (sameDay(date, today)) return 'Today'
  if (sameDay(date, tomorrow)) return 'Tomorrow'
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

// "09:00 AM" / "02:30 PM" -> "09:00" / "14:30", for prefilling a
// datetime-local input from a patient's preferred slot string.
function slotTo24h(slot: string): string {
  const match = slot.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return '09:00'
  let [, hh, mm, period] = match
  let hours = parseInt(hh, 10)
  if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12
  if (period.toUpperCase() === 'AM' && hours === 12) hours = 0
  return `${String(hours).padStart(2, '0')}:${mm}`
}

function AppointmentsPage() {
  const { isAuthenticated } = useConvexAuth()
  const clinic = useQuery(api.clinics.getMyClinic, isAuthenticated ? {} : 'skip')
  const patients = useQuery(api.patients.listPatients, isAuthenticated ? {} : 'skip') ?? []
  const staffList = useQuery(api.clinics.listStaff, isAuthenticated ? {} : 'skip') ?? []
  const upcoming = useQuery(api.appointments.listUpcomingAppointments, isAuthenticated ? {} : 'skip') ?? []
  const pendingRequests = useQuery(api.appointmentRequests.listPendingAppointmentRequests, isAuthenticated ? {} : 'skip') ?? []

  const createAppointment = useMutation(api.appointments.createAppointment)
  const completeAppointment = useMutation(api.appointments.completeAppointment)
  const cancelAppointment = useMutation(api.appointments.cancelAppointment)
  const rescheduleAppointment = useMutation(api.appointments.rescheduleAppointment)
  const markNoShow = useMutation(api.appointments.markNoShow)
  const confirmAppointmentRequest = useMutation(api.appointmentRequests.confirmAppointmentRequest)
  const updateRequestStatus = useMutation(api.appointmentRequests.updateAppointmentRequestStatus)

  const services = clinic?.services ?? []

  const [showSchedule, setShowSchedule] = useState(false)
  const [apptPatientId, setApptPatientId] = useState('')
  const [apptDateTime, setApptDateTime] = useState('')
  const [apptService, setApptService] = useState('')
  const [apptTherapistId, setApptTherapistId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [reschedulingId, setReschedulingId] = useState<string | null>(null)
  const [rescheduleDateTime, setRescheduleDateTime] = useState('')
  const [confirmingRequestId, setConfirmingRequestId] = useState<string | null>(null)
  const [confirmDateTime, setConfirmDateTime] = useState('')
  const [confirmTherapistId, setConfirmTherapistId] = useState('')
  const [error, setError] = useState('')

  const patientName = (id: string) => patients.find((p) => p._id === id)?.name ?? 'Unknown patient'
  const therapistName = (id: string) => staffList.find((s) => s._id === id)?.name ?? 'Unassigned'

  const grouped = upcoming.reduce((acc: Record<string, any[]>, appt: any) => {
    const key = new Date(appt.scheduledAt).toDateString()
    acc[key] = acc[key] ? [...acc[key], appt] : [appt]
    return acc
  }, {} as Record<string, any[]>)

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!apptPatientId || !apptDateTime || !apptTherapistId) {
      setError('Patient, date/time, and therapist are required')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      await createAppointment({
        patientId: apptPatientId as any,
        therapistId: apptTherapistId as any,
        scheduledAt: new Date(apptDateTime).getTime(),
        serviceContext: apptService || undefined,
      })
      setApptPatientId('')
      setApptDateTime('')
      setApptService('')
      setApptTherapistId('')
      setShowSchedule(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule appointment')
    } finally {
      setIsLoading(false)
    }
  }

  const startReschedule = (appointmentId: string, currentScheduledAt: number) => {
    setReschedulingId(appointmentId)
    // Pre-fill with the current time, formatted for a datetime-local input.
    const d = new Date(currentScheduledAt)
    const pad = (n: number) => String(n).padStart(2, '0')
    setRescheduleDateTime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`)
  }

  const commitReschedule = async (appointmentId: string) => {
    if (!rescheduleDateTime) return
    try {
      await rescheduleAppointment({ appointmentId: appointmentId as any, scheduledAt: new Date(rescheduleDateTime).getTime() })
      setReschedulingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reschedule appointment')
    }
  }

  const startConfirmRequest = (request: any) => {
    setConfirmingRequestId(request._id)
    setConfirmDateTime(`${request.preferredDate}T${slotTo24h(request.preferredTime)}`)
    setConfirmTherapistId(request.preferredTherapistId ?? '')
  }

  const commitConfirmRequest = async (requestId: string) => {
    if (!confirmDateTime || !confirmTherapistId) {
      setError('Pick a therapist before confirming')
      return
    }
    const request = pendingRequests.find((r: any) => r._id === requestId)

    // Open a blank tab synchronously, inside the click gesture — most
    // browsers block window.open() called after an awaited async call, so we
    // reserve the tab now and point it at WhatsApp once confirmation saves.
    const waTab = request ? window.open('', '_blank') : null

    try {
      await confirmAppointmentRequest({
        requestId: requestId as any,
        therapistId: confirmTherapistId as any,
        scheduledAt: new Date(confirmDateTime).getTime(),
      })
      setConfirmingRequestId(null)

      if (request && waTab) {
        const when = new Date(confirmDateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
        const message = `Hi ${request.patientName}, your appointment at ${clinic?.name ?? 'our clinic'} is confirmed for ${when} with ${therapistName(confirmTherapistId)}. See you then!`
        waTab.location.href = `https://wa.me/${request.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
      } else {
        waTab?.close()
      }
    } catch (err) {
      waTab?.close()
      setError(err instanceof Error ? err.message : 'Failed to confirm request')
    }
  }

  const rejectRequest = async (requestId: string) => {
    try {
      await updateRequestStatus({ requestId: requestId as any, status: 'rejected' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update request')
    }
  }

  const markRequestNoResponse = async (requestId: string) => {
    try {
      await updateRequestStatus({ requestId: requestId as any, status: 'no-response' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update request')
    }
  }

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Appointments</h1>
            <p className="text-muted-foreground">Upcoming visits and reminders across the clinic</p>
          </div>
          <Button onClick={() => setShowSchedule(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Appointment
          </Button>
        </div>

        {pendingRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquareText className="h-4 w-4 text-secondary" />
                Appointment Requests
                <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-xs font-semibold text-secondary">
                  {pendingRequests.length}
                </span>
              </CardTitle>
              <CardDescription>Submitted by patients — review and confirm to schedule, or decline.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingRequests.map((req: any) => (
                <div key={req._id} className="rounded-xl border border-border p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{req.patientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {req.phone}
                        {req.email && <> · {req.email}</>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Requested {req.preferredDate} at {req.preferredTime}
                        {req.reason && <> · {req.reason}</>}
                        {req.preferredTherapistId && <> · Prefers {therapistName(req.preferredTherapistId)}</>}
                      </p>
                      {req.notes && <p className="text-xs text-muted-foreground">"{req.notes}"</p>}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button onClick={() => startConfirmRequest(req)} size="sm">
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        Confirm
                      </Button>
                      <Button onClick={() => markRequestNoResponse(req._id)} size="sm" variant="ghost">
                        No Response
                      </Button>
                      <Button
                        onClick={() => rejectRequest(req._id)}
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>

                  {confirmingRequestId === req._id && (
                    <div className="mt-3 grid gap-2 border-t border-border pt-3 md:grid-cols-3">
                      <input
                        type="datetime-local"
                        value={confirmDateTime}
                        onChange={(e) => setConfirmDateTime(e.target.value)}
                        className={inputClass}
                      />
                      <select value={confirmTherapistId} onChange={(e) => setConfirmTherapistId(e.target.value)} className={inputClass}>
                        <option value="">Select a therapist…</option>
                        {staffList.map((staff) => (
                          <option key={staff._id} value={staff._id}>
                            {staff.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => commitConfirmRequest(req._id)}>
                          Confirm &amp; Notify
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setConfirmingRequestId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {error && <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            </CardContent>
          </Card>
        )}

        {showSchedule && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Schedule Appointment</CardTitle>
              <CardDescription>A WhatsApp reminder is sent automatically before the appointment.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSchedule} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Patient</label>
                    <select value={apptPatientId} onChange={(e) => setApptPatientId(e.target.value)} disabled={isLoading} className={inputClass}>
                      <option value="">Select a patient…</option>
                      {patients.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date &amp; Time</label>
                    <input
                      type="datetime-local"
                      value={apptDateTime}
                      onChange={(e) => setApptDateTime(e.target.value)}
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Service</label>
                    <select value={apptService} onChange={(e) => setApptService(e.target.value)} disabled={isLoading} className={inputClass}>
                      <option value="">Select a service…</option>
                      {services.map((service) => (
                        <option key={service} value={service}>
                          {service}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Therapist</label>
                    <select value={apptTherapistId} onChange={(e) => setApptTherapistId(e.target.value)} disabled={isLoading} className={inputClass}>
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
                  <Button type="button" variant="outline" onClick={() => setShowSchedule(false)} disabled={isLoading}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <IconBadge icon={CalendarClock} size="md" />
              <p className="text-sm text-muted-foreground">No upcoming appointments. Schedule one to get started.</p>
            </CardContent>
          </Card>
        ) : (
          (Object.entries(grouped) as [string, any[]][])
            .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
            .map(([dateKey, appts]) => (
              <Card key={dateKey}>
                <CardHeader>
                  <CardTitle className="text-lg">{dayLabel(appts[0].scheduledAt)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {appts.map((appt) => (
                    <div key={appt._id} className="rounded-xl border border-border p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">
                            {new Date(appt.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {patientName(appt.patientId)}
                          </p>
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {appt.serviceContext && <>{appt.serviceContext} · </>}
                            {therapistName(appt.therapistId)}
                          </p>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass[appt.status]}`}>
                            <Clock className="h-3 w-3" />
                            Scheduled
                          </span>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button onClick={() => completeAppointment({ appointmentId: appt._id })} size="sm" variant="outline">
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            Complete
                          </Button>
                          <Button onClick={() => startReschedule(appt._id, appt.scheduledAt)} size="sm" variant="outline">
                            Reschedule
                          </Button>
                          <Button onClick={() => markNoShow({ appointmentId: appt._id })} size="sm" variant="ghost">
                            No-show
                          </Button>
                          <Button
                            onClick={() => cancelAppointment({ appointmentId: appt._id })}
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                          >
                            <XCircle className="mr-1.5 h-3.5 w-3.5" />
                            Cancel
                          </Button>
                        </div>
                      </div>

                      {reschedulingId === appt._id && (
                        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                          <input
                            type="datetime-local"
                            value={rescheduleDateTime}
                            onChange={(e) => setRescheduleDateTime(e.target.value)}
                            className={inputClass}
                          />
                          <Button size="sm" onClick={() => commitReschedule(appt._id)}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setReschedulingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
        )}
      </div>
    </StaffLayout>
  )
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/appointments',
  component: AppointmentsPage,
})
