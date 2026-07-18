import { useState, useEffect } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { StaffLayout } from '@/components/staff-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Pencil, X, Check, Copy, UserPlus, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { STAFF_ROLES, type StaffRole, roleLabel } from '@/lib/roles'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface ClinicSettings {
  clinicName: string
  feedbackDelay: string
  reminderDelay: string
  googleReviewUrl: string
  checkInMessage: string
  reminderMessage: string
  services: string[]
  appointmentReminderLeadHours: string
  appointmentReminderMessage: string
  whatsappNumber: string
  whatsappAccessToken: string
  whatsappPhoneNumberId: string
  bookingTimeSlotsText: string
  bookingClosedDays: number[]
  bookingWindowDays: string
}

function SettingsPage() {
  const { isAuthenticated } = useConvexAuth()
  const staffUser = useQuery(api.clinics.getMyStaffUser, isAuthenticated ? {} : 'skip')
  const clinic = useQuery(api.clinics.getMyClinic, staffUser ? {} : 'skip')
  const staffList = useQuery(api.clinics.listStaff, staffUser ? {} : 'skip') ?? []
  const updateClinicSettings = useMutation(api.clinics.updateClinicSettings)
  const addProvider = useMutation(api.clinics.addProvider)
  const removeStaffMember = useMutation(api.clinics.removeStaffMember)
  const updateStaffMember = useMutation(api.clinics.updateStaffMember)

  const [settings, setSettings] = useState<ClinicSettings | null>(null)
  const [newService, setNewService] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const [newProviderName, setNewProviderName] = useState('')
  const [newProviderEmail, setNewProviderEmail] = useState('')
  const [newProviderPhone, setNewProviderPhone] = useState('')
  const [newProviderRole, setNewProviderRole] = useState<StaffRole>('therapist')
  const [isAddingProvider, setIsAddingProvider] = useState(false)
  const [teamError, setTeamError] = useState('')

  const [editingStaffId, setEditingStaffId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editRole, setEditRole] = useState<StaffRole>('therapist')
  const [isSavingStaffEdit, setIsSavingStaffEdit] = useState(false)

  // Ownership is who created the clinic (clinics.ownerUserId), not a role —
  // decoupled so the owner's job title displays the same as anyone else's.
  const isOwner = !!clinic && !!staffUser && clinic.ownerUserId === staffUser.userId
  // Fetched separately, owner-only — getMyClinic strips this field since
  // every staff member (not just the owner) reads that query.
  const whatsappCreds = useQuery(api.clinics.getWhatsAppCredentials, isOwner ? {} : 'skip')

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProviderName.trim()) {
      setTeamError('Name is required')
      return
    }
    setIsAddingProvider(true)
    setTeamError('')
    try {
      await addProvider({
        name: newProviderName.trim(),
        email: newProviderEmail.trim() || undefined,
        phone: newProviderPhone.trim() || undefined,
        role: newProviderRole,
      })
      setNewProviderName('')
      setNewProviderEmail('')
      setNewProviderPhone('')
      setNewProviderRole('therapist')
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : 'Failed to add provider')
    } finally {
      setIsAddingProvider(false)
    }
  }

  const handleRemoveStaff = async (staffId: string, name: string) => {
    if (!window.confirm(`Remove ${name} from the team? They'll no longer appear in scheduling or booking. Their past appointments and visits are kept.`)) {
      return
    }
    setTeamError('')
    try {
      await removeStaffMember({ staffId: staffId as any })
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : 'Failed to remove')
    }
  }

  const startEditStaff = (member: { _id: string; name: string; email: string; phone?: string; role: string }) => {
    setEditingStaffId(member._id)
    setEditName(member.name)
    setEditEmail(member.email)
    setEditPhone(member.phone ?? '')
    // Legacy 'owner' rows don't match any selectable option — default the
    // dropdown to Clinician/Therapist rather than showing nothing selected.
    setEditRole((STAFF_ROLES as readonly string[]).includes(member.role) ? (member.role as StaffRole) : 'therapist')
    setTeamError('')
  }

  const handleSaveStaffEdit = async () => {
    if (!editingStaffId) return
    if (!editName.trim()) {
      setTeamError('Name is required')
      return
    }
    setIsSavingStaffEdit(true)
    setTeamError('')
    try {
      await updateStaffMember({
        staffId: editingStaffId as any,
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        role: editRole,
      })
      setEditingStaffId(null)
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setIsSavingStaffEdit(false)
    }
  }

  useEffect(() => {
    if (clinic && !settings) {
      setSettings({
        clinicName: clinic.name,
        feedbackDelay: String(clinic.feedbackDelay),
        reminderDelay: String(clinic.reminderDelay),
        googleReviewUrl: clinic.googleReviewUrl ?? '',
        checkInMessage: clinic.checkInMessage,
        reminderMessage: clinic.reminderMessage,
        services: clinic.services ?? [],
        appointmentReminderLeadHours: String(clinic.appointmentReminderLeadHours ?? 24),
        appointmentReminderMessage:
          clinic.appointmentReminderMessage ??
          'Hi {patient_name}, this is a reminder of your appointment at {clinic_name} on {appointment_time}.',
        whatsappNumber: clinic.whatsappNumber ?? clinic.contactPhone ?? '',
        // Patched in by the effect below once the owner-only credentials
        // query resolves — getMyClinic never returns the raw token.
        whatsappAccessToken: '',
        whatsappPhoneNumberId: clinic.whatsappPhoneNumberId ?? '',
        bookingTimeSlotsText: (
          clinic.bookingTimeSlots ?? [
            '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
            '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM',
          ]
        ).join(', '),
        bookingClosedDays: clinic.bookingClosedDays ?? [0],
        bookingWindowDays: String(clinic.bookingWindowDays ?? 90),
      })
    }
  }, [clinic, settings])

  useEffect(() => {
    if (whatsappCreds) {
      setSettings((s) => (s ? { ...s, whatsappAccessToken: whatsappCreds.whatsappAccessToken } : s))
    }
  }, [whatsappCreds])

  const addService = () => {
    if (!settings) return
    const value = newService.trim()
    if (!value || settings.services.includes(value)) {
      setNewService('')
      return
    }
    setSettings({ ...settings, services: [...settings.services, value] })
    setNewService('')
  }

  const removeService = (index: number) => {
    if (!settings) return
    setSettings({ ...settings, services: settings.services.filter((_, i) => i !== index) })
    if (editingIndex === index) setEditingIndex(null)
  }

  const startEditingService = (index: number) => {
    if (!settings) return
    setEditingIndex(index)
    setEditingValue(settings.services[index])
  }

  const commitEditingService = () => {
    if (!settings || editingIndex === null) return
    const value = editingValue.trim()
    if (!value) {
      // Empty rename removes the service instead of leaving a blank entry.
      removeService(editingIndex)
      return
    }
    setSettings({
      ...settings,
      services: settings.services.map((s, i) => (i === editingIndex ? value : s)),
    })
    setEditingIndex(null)
  }

  const cancelEditingService = () => setEditingIndex(null)

  const toggleClosedDay = (day: number) => {
    if (!settings) return
    const has = settings.bookingClosedDays.includes(day)
    setSettings({
      ...settings,
      bookingClosedDays: has ? settings.bookingClosedDays.filter((d) => d !== day) : [...settings.bookingClosedDays, day].sort(),
    })
  }

  const handleSave = async () => {
    if (!settings) return
    setIsSaving(true)
    setError('')
    try {
      await updateClinicSettings({
        name: settings.clinicName,
        feedbackDelay: Number(settings.feedbackDelay),
        reminderDelay: Number(settings.reminderDelay),
        googleReviewUrl: settings.googleReviewUrl,
        checkInMessage: settings.checkInMessage,
        reminderMessage: settings.reminderMessage,
        services: settings.services,
        appointmentReminderLeadHours: Number(settings.appointmentReminderLeadHours),
        appointmentReminderMessage: settings.appointmentReminderMessage,
        whatsappNumber: settings.whatsappNumber || undefined,
        whatsappAccessToken: settings.whatsappAccessToken || undefined,
        whatsappPhoneNumberId: settings.whatsappPhoneNumberId || undefined,
        bookingTimeSlots: settings.bookingTimeSlotsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        bookingClosedDays: settings.bookingClosedDays,
        bookingWindowDays: Number(settings.bookingWindowDays),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (!settings) {
    return (
      <StaffLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Loading clinic settings...</p>
          </div>
        </div>
      </StaffLayout>
    )
  }

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Configure your clinic's feedback system</p>
        </div>

        <div className="max-w-2xl space-y-6">
          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile">Clinic Profile</TabsTrigger>
              <TabsTrigger value="booking">Booking &amp; Reminders</TabsTrigger>
              <TabsTrigger value="automation">Feedback Automation</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Clinic Information</CardTitle>
                  <CardDescription>Basic clinic details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Clinic Name</label>
                    <input
                      type="text"
                      value={settings.clinicName}
                      onChange={(e) => setSettings({ ...settings, clinicName: e.target.value })}
                      disabled={!isOwner}
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Services</CardTitle>
                  <CardDescription>
                    The list of services/treatments staff choose from when logging a visit. Works for any specialty.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settings.services.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No services yet. Add your first one below.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {settings.services.map((service, index) =>
                        editingIndex === index ? (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 rounded-full border border-primary bg-card px-2 py-1"
                          >
                            <input
                              autoFocus
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  commitEditingService()
                                }
                                if (e.key === 'Escape') {
                                  e.preventDefault()
                                  cancelEditingService()
                                }
                              }}
                              className="w-32 bg-transparent px-1 text-sm font-medium outline-none"
                            />
                            <button
                              type="button"
                              onClick={commitEditingService}
                              className="text-primary transition hover:text-primary/70"
                              aria-label="Save"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditingService}
                              className="text-muted-foreground transition hover:text-destructive"
                              aria-label="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ) : (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground"
                          >
                            {service}
                            {isOwner && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEditingService(index)}
                                  className="text-muted-foreground transition hover:text-primary"
                                  aria-label={`Rename ${service}`}
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeService(index)}
                                  className="text-muted-foreground transition hover:text-destructive"
                                  aria-label={`Remove ${service}`}
                                >
                                  ×
                                </button>
                              </>
                            )}
                          </span>
                        ),
                      )}
                    </div>
                  )}

                  {isOwner && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newService}
                        onChange={(e) => setNewService(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addService()
                          }
                        }}
                        placeholder="e.g. Consultation, Cleaning, X-ray"
                        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <Button type="button" variant="outline" onClick={addService}>
                        Add
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Team</CardTitle>
                  <CardDescription>
                    Clinicians/Therapists appear in scheduling and as options on your public booking form. Adding
                    someone here doesn't give them dashboard access — that requires them to sign up separately and be
                    linked to your clinic (not available yet). Add a phone number to send appointment reminders to a
                    team member's WhatsApp instead of email.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {staffList.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No team members yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {staffList.map((member) => {
                        const hasLogin = !member.userId.startsWith('provider_')
                        if (isOwner && editingStaffId === member._id) {
                          return (
                            <div key={member._id} className="space-y-2 rounded-xl border border-primary bg-primary/5 p-3">
                              <div className="grid gap-2 sm:grid-cols-2">
                                <input
                                  placeholder="Name"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  disabled={isSavingStaffEdit}
                                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                                />
                                <select
                                  value={editRole}
                                  onChange={(e) => setEditRole(e.target.value as StaffRole)}
                                  disabled={isSavingStaffEdit}
                                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                                >
                                  {STAFF_ROLES.map((role) => (
                                    <option key={role} value={role}>
                                      {roleLabel(role)}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="email"
                                  placeholder="Email"
                                  value={editEmail}
                                  onChange={(e) => setEditEmail(e.target.value)}
                                  disabled={isSavingStaffEdit}
                                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                                />
                                <input
                                  type="tel"
                                  placeholder="Phone (for WhatsApp reminders)"
                                  value={editPhone}
                                  onChange={(e) => setEditPhone(e.target.value)}
                                  disabled={isSavingStaffEdit}
                                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={handleSaveStaffEdit} disabled={isSavingStaffEdit}>
                                  {isSavingStaffEdit ? 'Saving...' : 'Save'}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingStaffId(null)} disabled={isSavingStaffEdit}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )
                        }
                        return (
                          <div key={member._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">
                                {member.name}
                                {member._id === staffUser?._id && <span className="text-muted-foreground"> (you)</span>}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                <span>{roleLabel(member.role)}</span>
                                {member.email && <> · {member.email}</>}
                                {member.phone && <> · {member.phone}</>}
                                {!hasLogin && <> · No dashboard login</>}
                              </p>
                            </div>
                            {isOwner && (
                              <div className="flex shrink-0 gap-1">
                                <Button size="sm" variant="ghost" onClick={() => startEditStaff(member)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                {member._id !== staffUser?._id && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleRemoveStaff(member._id, member.name)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {teamError && (
                    <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{teamError}</div>
                  )}
                </CardContent>
              </Card>

              {isOwner && (
                <Card>
                  <CardHeader>
                    <CardTitle>Add Team Member</CardTitle>
                    <CardDescription>e.g. another clinician, receptionist, or admin at your clinic</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddProvider} className="grid gap-3 sm:grid-cols-2">
                      <input
                        placeholder="Name *"
                        value={newProviderName}
                        onChange={(e) => setNewProviderName(e.target.value)}
                        disabled={isAddingProvider}
                        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 sm:col-span-2"
                      />
                      <input
                        type="email"
                        placeholder="Email (optional)"
                        value={newProviderEmail}
                        onChange={(e) => setNewProviderEmail(e.target.value)}
                        disabled={isAddingProvider}
                        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                      />
                      <input
                        type="tel"
                        placeholder="Phone (optional, for WhatsApp reminders)"
                        value={newProviderPhone}
                        onChange={(e) => setNewProviderPhone(e.target.value)}
                        disabled={isAddingProvider}
                        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                      />
                      <select
                        value={newProviderRole}
                        onChange={(e) => setNewProviderRole(e.target.value as StaffRole)}
                        disabled={isAddingProvider}
                        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                      >
                        {STAFF_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {roleLabel(role)}
                          </option>
                        ))}
                      </select>

                      {teamError && (
                        <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive sm:col-span-2">{teamError}</div>
                      )}

                      <Button type="submit" disabled={isAddingProvider} className="sm:col-span-2">
                        <UserPlus className="mr-2 h-4 w-4" />
                        {isAddingProvider ? 'Adding...' : 'Add Team Member'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="booking" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Online Booking</CardTitle>
                  <CardDescription>
                    Patients request an appointment from a public form — you confirm it, nothing is auto-scheduled.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {clinic && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Your Booking Link</label>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={`${window.location.origin}${import.meta.env.BASE_URL}book/${clinic._id}`}
                          className="w-full rounded-xl border border-input bg-muted px-3.5 py-2.5 text-sm text-muted-foreground"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => navigator.clipboard.writeText(`${window.location.origin}${import.meta.env.BASE_URL}book/${clinic._id}`)}
                          title="Copy link"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Share this link, or embed it as an iframe, on your own website.</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">WhatsApp Number</label>
                    <input
                      type="tel"
                      value={settings.whatsappNumber}
                      onChange={(e) => isOwner && setSettings({ ...settings, whatsappNumber: e.target.value })}
                      disabled={!isOwner}
                      placeholder="e.g. 919876543210 (country code, no + or spaces)"
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    />
                    <p className="text-xs text-muted-foreground">
                      When a patient submits a request, WhatsApp opens on their device with this number pre-filled.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Available Time Slots</label>
                    <textarea
                      value={settings.bookingTimeSlotsText}
                      onChange={(e) => isOwner && setSettings({ ...settings, bookingTimeSlotsText: e.target.value })}
                      disabled={!isOwner}
                      rows={2}
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    />
                    <p className="text-xs text-muted-foreground">Comma-separated, e.g. "09:00 AM, 09:30 AM, 02:00 PM"</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Closed Days</label>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map((day, index) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => isOwner && toggleClosedDay(index)}
                          disabled={!isOwner}
                          className={`rounded-full px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                            settings.bookingClosedDays.includes(index)
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-accent text-accent-foreground'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Booking Window (days ahead)</label>
                    <input
                      type="number"
                      min={1}
                      value={settings.bookingWindowDays}
                      onChange={(e) => isOwner && setSettings({ ...settings, bookingWindowDays: e.target.value })}
                      disabled={!isOwner}
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Appointment Reminders</CardTitle>
                  <CardDescription>Configure the WhatsApp reminder sent before a scheduled appointment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Send Reminder Before Appointment</label>
                    <Select
                      value={settings.appointmentReminderLeadHours}
                      onValueChange={(value) => isOwner && setSettings({ ...settings, appointmentReminderLeadHours: value })}
                      disabled={!isOwner}
                    >
                      <SelectTrigger disabled={!isOwner}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Hour</SelectItem>
                        <SelectItem value="2">2 Hours</SelectItem>
                        <SelectItem value="24">24 Hours</SelectItem>
                        <SelectItem value="48">48 Hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reminder Message</label>
                    <textarea
                      value={settings.appointmentReminderMessage}
                      onChange={(e) => isOwner && setSettings({ ...settings, appointmentReminderMessage: e.target.value })}
                      disabled={!isOwner}
                      rows={2}
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use {'{patient_name}'}, {'{clinic_name}'}, and {'{appointment_time}'} for dynamic values
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    WhatsApp Business API
                    {settings.whatsappAccessToken && settings.whatsappPhoneNumberId ? (
                      <span className="rounded-full bg-chipGreen px-2 py-0.5 text-xs font-medium text-chipGreen-foreground">Connected</span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Not connected</span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Your own Meta WhatsApp Business Cloud API credentials, used to actually send reminders and
                    feedback requests. This is separate from the WhatsApp Number above — this is what lets the app
                    send automatically, from your clinic's own number, billed to your own Meta account (not the app
                    operator's). Until this is set, WhatsApp sends are skipped — appointment reminders to your team
                    still go out by email, but patient-facing feedback requests and reminders won't send at all.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone Number ID</label>
                    <input
                      type="text"
                      value={settings.whatsappPhoneNumberId}
                      onChange={(e) => isOwner && setSettings({ ...settings, whatsappPhoneNumberId: e.target.value })}
                      disabled={!isOwner}
                      placeholder="From Meta's WhatsApp > API Setup page"
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Access Token</label>
                    <input
                      type="password"
                      value={settings.whatsappAccessToken}
                      onChange={(e) => isOwner && setSettings({ ...settings, whatsappAccessToken: e.target.value })}
                      disabled={!isOwner || whatsappCreds === undefined}
                      placeholder={whatsappCreds === undefined ? 'Loading…' : 'A permanent access token, from a Meta System User'}
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    />
                    <p className="text-xs text-muted-foreground">
                      Kept private — only you (the clinic owner) can view or change this. See the setup guide for how
                      to create a Meta Business account, add WhatsApp, and generate a permanent token.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="automation" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Google Review Integration</CardTitle>
                  <CardDescription>Configure your clinic's Google Review link</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Google Review URL</label>
                    <input
                      type="url"
                      value={settings.googleReviewUrl}
                      onChange={(e) => isOwner && setSettings({ ...settings, googleReviewUrl: e.target.value })}
                      disabled={!isOwner}
                      placeholder="https://google.com/maps/place/..."
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Automation Settings</CardTitle>
                  <CardDescription>Configure feedback request timing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isOwner && <div className="rounded-xl bg-secondary/15 p-3 text-sm text-secondary">Only the clinic owner can change these settings</div>}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Feedback Request Delay</label>
                    <Select value={settings.feedbackDelay} onValueChange={(value) => isOwner && setSettings({ ...settings, feedbackDelay: value })} disabled={!isOwner}>
                      <SelectTrigger disabled={!isOwner}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Immediate</SelectItem>
                        <SelectItem value="2">2 Hours</SelectItem>
                        <SelectItem value="6">6 Hours</SelectItem>
                        <SelectItem value="24">24 Hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reminder Delay (if no response)</label>
                    <Select value={settings.reminderDelay} onValueChange={(value) => isOwner && setSettings({ ...settings, reminderDelay: value })} disabled={!isOwner}>
                      <SelectTrigger disabled={!isOwner}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24">24 Hours</SelectItem>
                        <SelectItem value="48">48 Hours</SelectItem>
                        <SelectItem value="72">72 Hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Message Templates</CardTitle>
                  <CardDescription>Customize patient-facing messages</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Check-in Message</label>
                    <textarea
                      value={settings.checkInMessage}
                      onChange={(e) => isOwner && setSettings({ ...settings, checkInMessage: e.target.value })}
                      disabled={!isOwner}
                      rows={3}
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    />
                    <p className="text-xs text-muted-foreground">Use {'{clinic_name}'} for dynamic clinic name</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reminder Message</label>
                    <textarea
                      value={settings.reminderMessage}
                      onChange={(e) => isOwner && setSettings({ ...settings, reminderMessage: e.target.value })}
                      disabled={!isOwner}
                      rows={3}
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>

          {error && (
            <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            {/* whatsappCreds not yet loaded would mean handleSave sends an
                empty whatsappAccessToken and wipes out an already-saved
                one — block Save until it's resolved. */}
            <Button onClick={handleSave} disabled={!isOwner || isSaving || whatsappCreds === undefined}>
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </div>
    </StaffLayout>
  )
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/settings',
  component: SettingsPage,
})
