import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { StaffLayout } from '@/components/staff-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, Phone, Plus, Stethoscope, CheckCircle2, Clock, CalendarClock, XCircle } from 'lucide-react'
import { useQuery, useMutation, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'

const statusBadgeClass: Record<string, string> = {
  scheduled: 'bg-secondary/15 text-secondary-foreground',
  completed: 'bg-primary/10 text-primary',
  cancelled: 'bg-muted text-muted-foreground',
  'no-show': 'bg-destructive/10 text-destructive',
}

const inputClass =
  'w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50'

function PatientsPage() {
  const { isAuthenticated } = useConvexAuth()
  const staffUser = useQuery(api.clinics.getMyStaffUser, isAuthenticated ? {} : 'skip')
  const clinic = useQuery(api.clinics.getMyClinic, isAuthenticated ? {} : 'skip')
  const patients = useQuery(api.patients.listPatients, isAuthenticated ? {} : 'skip') ?? []
  const visits = useQuery(api.visits.listVisits, isAuthenticated ? {} : 'skip') ?? []
  const staffList = useQuery(api.clinics.listStaff, isAuthenticated ? {} : 'skip') ?? []

  const createPatient = useMutation(api.patients.createPatient)
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

  const selected = selectedPatientId ? patients.find((p) => p._id === selectedPatientId) : null
  const patientVisits = selected ? visits.filter((v) => v.patientId === selected._id) : []
  const patientAppointments = useQuery(
    api.appointments.listAppointmentsForPatient,
    selected ? { patientId: selected._id } : 'skip',
  ) ?? []

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

  const handleCompleteVisit = async (visitId: string) => {
    try {
      await completeVisit({ visitId: visitId as any })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete visit')
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

  const handleCompleteAppointment = async (appointmentId: string) => {
    try {
      await completeAppointment({ appointmentId: appointmentId as any })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete appointment')
    }
  }

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      await cancelAppointment({ appointmentId: appointmentId as any })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel appointment')
    }
  }

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
            <p className="text-muted-foreground">Manage patients and log their visits</p>
          </div>
          <Button onClick={() => setShowAddPatient(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Patient
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-xl">Patients</CardTitle>
              <CardDescription>{patients.length} total</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {patients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No patients yet. Add one to get started.</p>
                ) : (
                  patients.map((patient) => (
                    <button
                      key={patient._id}
                      onClick={() => setSelectedPatientId(patient._id)}
                      className={`w-full rounded-xl border p-3 text-left transition-colors ${
                        selectedPatientId === patient._id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-accent'
                      }`}
                    >
                      <p className="font-semibold">{patient.name}</p>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {patient.phone}
                      </p>
                    </button>
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
                    <CardDescription>Patient profile, appointments, and visits</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setShowScheduleAppointment(true)} size="sm" variant="outline">
                      <CalendarClock className="mr-2 h-4 w-4" />
                      Schedule Appointment
                    </Button>
                    <Button onClick={() => setShowAddVisit(true)} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Log Visit
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">{selected.phone}</p>
                    </div>
                  </div>
                  {selected.email && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">{selected.email}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-4 font-semibold">Appointments</h3>
                  {patientAppointments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No appointments scheduled yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {patientAppointments.map((appt) => {
                        const therapist = staffList.find((s) => s._id === appt.therapistId)
                        return (
                          <div key={appt._id} className="flex items-center justify-between rounded-xl border border-border p-3.5">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold">
                                {new Date(appt.scheduledAt).toLocaleString([], {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </p>
                              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                {appt.serviceContext && <>{appt.serviceContext} · </>}
                                {therapist ? therapist.name : 'Unassigned'}
                              </p>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass[appt.status]}`}
                              >
                                {appt.status === 'scheduled' && <Clock className="h-3 w-3" />}
                                {appt.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                                {appt.status === 'cancelled' && <XCircle className="h-3 w-3" />}
                                {appt.status === 'no-show' && <XCircle className="h-3 w-3" />}
                                {appt.status === 'no-show' ? 'No-show' : appt.status[0].toUpperCase() + appt.status.slice(1)}
                              </span>
                            </div>
                            {appt.status === 'scheduled' && (
                              <div className="flex gap-2">
                                <Button onClick={() => handleCompleteAppointment(appt._id)} size="sm" variant="outline">
                                  Complete
                                </Button>
                                <Button
                                  onClick={() => handleCancelAppointment(appt._id)}
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                >
                                  Cancel
                                </Button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-4 font-semibold">Visits</h3>
                  {patientVisits.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No visits logged yet. Log one to start collecting feedback.</p>
                  ) : (
                    <div className="space-y-3">
                      {patientVisits.map((visit) => (
                        <div key={visit._id} className="flex items-center justify-between rounded-xl border border-border p-3.5">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">{new Date(visit.createdAt).toLocaleDateString()}</p>
                            {visit.serviceContext && (
                              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Stethoscope className="h-3 w-3" />
                                {visit.serviceContext}
                              </p>
                            )}
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                visit.completedAt
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-secondary/15 text-secondary-foreground'
                              }`}
                            >
                              {visit.completedAt ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              {visit.completedAt ? 'Completed' : 'In progress'}
                            </span>
                          </div>
                          {!visit.completedAt && (
                            <Button onClick={() => handleCompleteVisit(visit._id)} size="sm" variant="outline">
                              Mark Complete
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="md:col-span-2">
              <CardContent className="flex h-full min-h-48 flex-col items-center justify-center gap-2 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                  <Stethoscope className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Select a patient to view their profile and visits.</p>
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
