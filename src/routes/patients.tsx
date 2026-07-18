import { useState } from 'react'
import { createRoute, Link } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { StaffLayout } from '@/components/staff-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Phone, Plus, Stethoscope, Calendar, CalendarClock, MessageSquare, Star, XCircle, Archive, ArchiveRestore, Upload } from 'lucide-react'
import { useQuery, useMutation, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { IconBadge } from '@/components/ui/icon-badge'

const inputClass =
  'w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50'

const timelineIconClass: Record<string, string> = {
  blue: 'bg-chipBlue text-chipBlue-foreground',
  green: 'bg-chipGreen text-chipGreen-foreground',
  amber: 'bg-chipAmber text-chipAmber-foreground',
  purple: 'bg-chipPurple text-chipPurple-foreground',
  muted: 'bg-muted text-muted-foreground',
}

interface TimelineEntry {
  id: string
  timestamp: number
  kind: string
  icon: any
  color: keyof typeof timelineIconClass
  title: string
  subtitle?: string
  actions?: { label: string; onClick: () => void; variant?: 'outline' | 'ghost' }[]
}

function PatientsPage() {
  const { isAuthenticated } = useConvexAuth()
  const staffUser = useQuery(api.clinics.getMyStaffUser, isAuthenticated ? {} : 'skip')
  const clinic = useQuery(api.clinics.getMyClinic, isAuthenticated ? {} : 'skip')
  const [showArchived, setShowArchived] = useState(false)
  const patients = useQuery(api.patients.listPatients, isAuthenticated ? { includeArchived: showArchived } : 'skip') ?? []
  const visits = useQuery(api.visits.listVisits, isAuthenticated ? {} : 'skip') ?? []
  const staffList = useQuery(api.clinics.listStaff, isAuthenticated ? {} : 'skip') ?? []
  const feedbackResponses = useQuery(api.feedback.listFeedbackResponses, isAuthenticated ? {} : 'skip') ?? []
  const feedbackRequests = useQuery(api.feedback.listFeedbackRequests, isAuthenticated ? {} : 'skip') ?? []
  const reviewRequests = useQuery(api.reviews.listReviewRequests, isAuthenticated ? {} : 'skip') ?? []

  const createPatient = useMutation(api.patients.createPatient)
  const archivePatient = useMutation(api.patients.archivePatient)
  const unarchivePatient = useMutation(api.patients.unarchivePatient)
  const createVisit = useMutation(api.visits.createVisit)
  const completeVisit = useMutation(api.visits.completeVisit)
  const createAppointment = useMutation(api.appointments.createAppointment)
  const completeAppointment = useMutation(api.appointments.completeAppointment)
  const cancelAppointment = useMutation(api.appointments.cancelAppointment)

  const services = clinic?.services ?? []

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [showAddPatient, setShowAddPatient] = useState(false)
  const [showAddVisit, setShowAddVisit] = useState(false)
  const [showScheduleAppointment, setShowScheduleAppointment] = useState(false)
  const [newPatientName, setNewPatientName] = useState('')
  const [newPatientEmail, setNewPatientEmail] = useState('')
  const [newPatientPhone, setNewPatientPhone] = useState('')
  const [visitService, setVisitService] = useState('')
  const [apptDateTime, setApptDateTime] = useState('')
  const [apptService, setApptService] = useState('')
  const [apptTherapistId, setApptTherapistId] = useState('')
  const [isLoadingPatient, setIsLoadingPatient] = useState(false)
  const [isLoadingVisit, setIsLoadingVisit] = useState(false)
  const [isLoadingAppt, setIsLoadingAppt] = useState(false)
  const [error, setError] = useState('')
  const [copiedRequestId, setCopiedRequestId] = useState<string | null>(null)

  const selected = selectedPatientId ? patients.find((p) => p._id === selectedPatientId) : null
  const patientVisits = selected ? visits.filter((v) => v.patientId === selected._id) : []
  const patientAppointments = useQuery(
    api.appointments.listAppointmentsForPatient,
    selected ? { patientId: selected._id } : 'skip',
  ) ?? []

  const therapistName = (id: string) => staffList.find((s) => s._id === id)?.name ?? 'the clinic'

  // Manual fallback for sharing a feedback link — the automatic WhatsApp
  // Cloud API send requires Meta Business verification (can take weeks), so
  // pending requests need a way to actually reach the patient in the
  // meantime. wa.me needs no API/credentials, just the staff member's own
  // WhatsApp, same trick the public booking form already uses.
  const feedbackLink = (token: string) => `${window.location.origin}${import.meta.env.BASE_URL}f/${token}`

  const copyFeedbackLink = async (requestId: string, token: string) => {
    await navigator.clipboard.writeText(feedbackLink(token))
    setCopiedRequestId(requestId)
    setTimeout(() => setCopiedRequestId((current) => (current === requestId ? null : current)), 1500)
  }

  const whatsappFeedbackLink = (patientPhone: string, patientDisplayName: string, token: string) => {
    const message = `Hi ${patientDisplayName}, thanks for visiting ${clinic?.name ?? 'us'}! We'd love your feedback: ${feedbackLink(token)}`
    window.open(`https://wa.me/${patientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank')
  }

  // Appointments that already produced a visit are represented once (as the
  // appointment entry) — the linked visit is suppressed to avoid a duplicate
  // row for the common appointment -> complete -> visit path.
  const linkedVisitIds = new Set(patientAppointments.map((a: any) => a.visitId).filter(Boolean))

  const timeline: TimelineEntry[] = selected
    ? [
        ...patientAppointments.map((a: any) => {
          if (a.status === 'scheduled') {
            return {
              id: `appt-${a._id}`,
              timestamp: a.scheduledAt,
              kind: 'appointment',
              icon: CalendarClock,
              color: 'purple' as const,
              title: `Upcoming${a.serviceContext ? `: ${a.serviceContext}` : ''} with ${therapistName(a.therapistId)}`,
              subtitle: new Date(a.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
              actions: [
                { label: 'Complete', onClick: () => completeAppointment({ appointmentId: a._id }) },
                { label: 'Cancel', onClick: () => cancelAppointment({ appointmentId: a._id }), variant: 'ghost' as const },
              ],
            }
          }
          if (a.status === 'cancelled' || a.status === 'no-show') {
            return {
              id: `appt-${a._id}`,
              timestamp: a.scheduledAt,
              kind: 'appointment',
              icon: XCircle,
              color: 'muted' as const,
              title: a.status === 'cancelled' ? 'Appointment cancelled' : 'Did not show up',
              subtitle: new Date(a.scheduledAt).toLocaleDateString(),
            }
          }
          // completed — shown as a visit below via completedAt, skip here
          return null
        }),
        ...patientVisits
          .filter((v) => !linkedVisitIds.has(v._id))
          .map((v) => ({
            id: `visit-${v._id}`,
            timestamp: v.completedAt ?? v.createdAt,
            kind: 'visit',
            icon: Calendar,
            color: 'blue' as const,
            title: `${v.completedAt ? 'Visit' : 'Visit in progress'}${v.serviceContext ? `: ${v.serviceContext}` : ''} with ${therapistName(v.therapistId)}`,
            subtitle: new Date(v.completedAt ?? v.createdAt).toLocaleDateString(),
            actions: !v.completedAt ? [{ label: 'Mark Complete', onClick: () => completeVisit({ visitId: v._id }) }] : undefined,
          })),
        ...patientAppointments
          .filter((a: any) => a.status === 'completed' && a.visitId)
          .map((a: any) => ({
            id: `appt-visit-${a._id}`,
            timestamp: a.completedAt ?? a.scheduledAt,
            kind: 'visit',
            icon: Calendar,
            color: 'blue' as const,
            title: `Visit${a.serviceContext ? `: ${a.serviceContext}` : ''} with ${therapistName(a.therapistId)}`,
            subtitle: new Date(a.completedAt ?? a.scheduledAt).toLocaleDateString(),
          })),
        ...feedbackRequests
          .filter((r) => r.patientId === selected._id && r.status !== 'responded')
          .map((r) => ({
            id: `feedback-request-${r._id}`,
            timestamp: r.sentAt,
            kind: 'feedback',
            icon: MessageSquare,
            color: 'amber' as const,
            title: r.status === 'reminded' ? 'Feedback reminder sent' : 'Feedback request pending',
            subtitle: 'Not yet responded — share the link directly if WhatsApp auto-send isn\'t set up',
            actions: [
              {
                label: copiedRequestId === r._id ? 'Copied!' : 'Copy Link',
                onClick: () => copyFeedbackLink(r._id, r.token),
              },
              {
                label: 'WhatsApp',
                onClick: () => whatsappFeedbackLink(selected.phone, selected.name, r.token),
              },
            ],
          })),
        ...feedbackResponses
          .filter((f) => f.patientId === selected._id)
          .map((f) => ({
            id: `feedback-${f._id}`,
            timestamp: f.submittedAt,
            kind: 'feedback',
            icon: MessageSquare,
            color: 'green' as const,
            title: `${f.rating}★ feedback submitted`,
            subtitle: f.comments || undefined,
          })),
        ...reviewRequests
          .filter((r) => r.patientId === selected._id && (r.clickedAt || r.completedAt))
          .map((r) => ({
            id: `review-${r._id}`,
            timestamp: r.completedAt ?? r.clickedAt ?? r.createdAt,
            kind: 'review',
            icon: Star,
            color: 'amber' as const,
            title: r.completedAt ? 'Google review submitted' : 'Clicked Google review link',
            subtitle: new Date(r.completedAt ?? r.clickedAt ?? r.createdAt).toLocaleDateString(),
          })),
      ]
        .filter((e): e is TimelineEntry => e !== null)
        .sort((a, b) => b.timestamp - a.timestamp)
    : []

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault()
    // Email is optional now — phone is the primary contact.
    if (!newPatientName.trim() || !newPatientPhone.trim()) {
      setError('Name and phone are required')
      return
    }

    setIsLoadingPatient(true)
    setError('')
    try {
      const patientId = await createPatient({
        name: newPatientName.trim(),
        email: newPatientEmail.trim() || undefined,
        phone: newPatientPhone.trim(),
      })
      setSelectedPatientId(patientId)
      setNewPatientName('')
      setNewPatientEmail('')
      setNewPatientPhone('')
      setShowAddPatient(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create patient')
    } finally {
      setIsLoadingPatient(false)
    }
  }

  const handleAddVisit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected || !staffUser) {
      setError('Please select a patient first')
      return
    }

    setIsLoadingVisit(true)
    setError('')
    try {
      await createVisit({
        patientId: selected._id,
        therapistId: staffUser._id,
        serviceContext: visitService || undefined,
      })
      setVisitService('')
      setShowAddVisit(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create visit')
    } finally {
      setIsLoadingVisit(false)
    }
  }

  const handleArchivePatient = async () => {
    if (!selected) return
    if (!window.confirm(`Archive ${selected.name}? Their visit and feedback history is kept — they'll just be hidden from the default patient list. You can unarchive them anytime.`)) {
      return
    }
    try {
      await archivePatient({ patientId: selected._id })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive patient')
    }
  }

  const handleUnarchivePatient = async (patientId: string) => {
    try {
      await unarchivePatient({ patientId: patientId as any })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unarchive patient')
    }
  }

  const handleScheduleAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected || !apptDateTime || !apptTherapistId) {
      setError('Date/time and therapist are required')
      return
    }

    setIsLoadingAppt(true)
    setError('')
    try {
      await createAppointment({
        patientId: selected._id,
        therapistId: apptTherapistId as any,
        scheduledAt: new Date(apptDateTime).getTime(),
        serviceContext: apptService || undefined,
      })
      setApptDateTime('')
      setApptService('')
      setApptTherapistId('')
      setShowScheduleAppointment(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule appointment')
    } finally {
      setIsLoadingAppt(false)
    }
  }

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
            <p className="text-muted-foreground">Visit → feedback → resolution history at a glance.</p>
          </div>
          <div className="flex gap-2">
            {staffUser?.role === 'owner' && (
              <Button asChild variant="outline">
                <Link to="/patients/import">
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV
                </Link>
              </Button>
            )}
            <Button onClick={() => setShowAddPatient(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Patient
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-xl">Patients</CardTitle>
                  <CardDescription>
                    {patients.filter((p) => !p.archivedAt).length} active
                    {showArchived && ` · ${patients.filter((p) => p.archivedAt).length} archived`}
                  </CardDescription>
                </div>
                <button
                  onClick={() => setShowArchived((v) => !v)}
                  className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  {showArchived ? 'Hide archived' : 'Show archived'}
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {patients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No patients yet. Add one to get started.</p>
                ) : (
                  patients.map((patient) => (
                    <div
                      key={patient._id}
                      className={`flex items-center gap-2 rounded-xl border p-3 transition-colors ${
                        selectedPatientId === patient._id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-accent'
                      } ${patient.archivedAt ? 'opacity-60' : ''}`}
                    >
                      <button onClick={() => setSelectedPatientId(patient._id)} className="min-w-0 flex-1 text-left">
                        <p className="truncate font-semibold">{patient.name}</p>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {patient.phone}
                          {patient.archivedAt && <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">Archived</span>}
                        </p>
                      </button>
                      {patient.archivedAt && (
                        <Button
                          onClick={() => handleUnarchivePatient(patient._id)}
                          size="sm"
                          variant="ghost"
                          title="Unarchive"
                        >
                          <ArchiveRestore className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {selected ? (
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{selected.name}</CardTitle>
                    <CardDescription>
                      {selected.phone}
                      {selected.email && <> · {selected.email}</>}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setShowScheduleAppointment(true)} size="sm" variant="outline">
                      <CalendarClock className="mr-2 h-4 w-4" />
                      Schedule
                    </Button>
                    <Button onClick={() => setShowAddVisit(true)} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Log Visit
                    </Button>
                    {selected.archivedAt ? (
                      <Button onClick={() => handleUnarchivePatient(selected._id)} size="sm" variant="outline">
                        <ArchiveRestore className="mr-2 h-4 w-4" />
                        Unarchive
                      </Button>
                    ) : (
                      <Button onClick={handleArchivePatient} size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No history yet. Schedule an appointment or log a visit to get started.</p>
                ) : (
                  <div className="space-y-1">
                    {timeline.map((entry) => {
                      const Icon = entry.icon
                      return (
                        <div key={entry.id} className="flex gap-3 border-b border-border py-3 last:border-0">
                          <IconBadge icon={Icon} size="xs" colorClassName={timelineIconClass[entry.color]} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{entry.kind}</p>
                            <p className="text-sm font-medium">{entry.title}</p>
                            {entry.subtitle && <p className="text-xs text-muted-foreground">{entry.subtitle}</p>}
                          </div>
                          {entry.actions && (
                            <div className="flex shrink-0 gap-2">
                              {entry.actions.map((action) => (
                                <Button
                                  key={action.label}
                                  size="sm"
                                  variant={action.variant ?? 'outline'}
                                  onClick={action.onClick}
                                  className={action.variant === 'ghost' ? 'text-destructive hover:text-destructive' : ''}
                                >
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="md:col-span-2">
              <CardContent className="flex h-full min-h-48 flex-col items-center justify-center gap-2 py-10 text-center">
                <IconBadge icon={Stethoscope} size="md" />
                <p className="text-sm text-muted-foreground">Select a patient to view their timeline.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {showAddPatient && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Add New Patient</CardTitle>
              <CardDescription>Phone is required. Email is optional — most clinics only need a phone number.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddPatient} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <input
                      type="text"
                      placeholder="Full name"
                      value={newPatientName}
                      onChange={(e) => setNewPatientName(e.target.value)}
                      disabled={isLoadingPatient}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone</label>
                    <input
                      type="tel"
                      placeholder="+1234567890"
                      value={newPatientPhone}
                      onChange={(e) => setNewPatientPhone(e.target.value)}
                      disabled={isLoadingPatient}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Email <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={newPatientEmail}
                      onChange={(e) => setNewPatientEmail(e.target.value)}
                      disabled={isLoadingPatient}
                      className={inputClass}
                    />
                  </div>
                </div>
                {error && <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
                <div className="flex gap-2">
                  <Button type="submit" disabled={isLoadingPatient}>
                    {isLoadingPatient ? 'Adding...' : 'Add Patient'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddPatient(false)} disabled={isLoadingPatient}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {showScheduleAppointment && selected && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Schedule Appointment for {selected.name}</CardTitle>
              <CardDescription>
                A WhatsApp reminder is sent automatically before the appointment (configurable in Settings).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleScheduleAppointment} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date &amp; Time</label>
                    <input
                      type="datetime-local"
                      value={apptDateTime}
                      onChange={(e) => setApptDateTime(e.target.value)}
                      disabled={isLoadingAppt}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Service</label>
                    <select
                      value={apptService}
                      onChange={(e) => setApptService(e.target.value)}
                      disabled={isLoadingAppt}
                      className={inputClass}
                    >
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
                    <select
                      value={apptTherapistId}
                      onChange={(e) => setApptTherapistId(e.target.value)}
                      disabled={isLoadingAppt}
                      className={inputClass}
                    >
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
                  <Button type="submit" disabled={isLoadingAppt}>
                    {isLoadingAppt ? 'Scheduling...' : 'Schedule Appointment'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowScheduleAppointment(false)}
                    disabled={isLoadingAppt}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {showAddVisit && selected && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Log Visit for {selected.name}</CardTitle>
              <CardDescription>Record which service the patient received so feedback is tied to the right treatment.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddVisit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Service / Treatment</label>
                  <select
                    value={visitService}
                    onChange={(e) => setVisitService(e.target.value)}
                    disabled={isLoadingVisit}
                    className={inputClass}
                  >
                    <option value="">Select a service…</option>
                    {services.map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                  {services.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No services configured yet. Add them in Settings → Services.
                    </p>
                  )}
                </div>
                {error && <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
                <div className="flex gap-2">
                  <Button type="submit" disabled={isLoadingVisit}>
                    {isLoadingVisit ? 'Logging...' : 'Log Visit'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddVisit(false)} disabled={isLoadingVisit}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </StaffLayout>
  )
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/patients',
  component: PatientsPage,
})
