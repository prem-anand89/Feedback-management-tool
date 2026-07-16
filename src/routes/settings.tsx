import { useState, useEffect } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { StaffLayout } from '@/components/staff-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pencil, X, Check, Copy } from 'lucide-react'
import { useQuery, useMutation, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'

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
  bookingTimeSlotsText: string
  bookingClosedDays: number[]
  bookingWindowDays: string
}

function SettingsPage() {
  const { isAuthenticated } = useConvexAuth()
  const staffUser = useQuery(api.clinics.getMyStaffUser, isAuthenticated ? {} : 'skip')
  const clinic = useQuery(api.clinics.getMyClinic, staffUser ? {} : 'skip')
  const updateClinicSettings = useMutation(api.clinics.updateClinicSettings)

  const [settings, setSettings] = useState<ClinicSettings | null>(null)
  const [newService, setNewService] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const isOwner = staffUser?.role === 'owner'

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
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
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
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Configure your clinic's feedback system</p>
        </div>

        <div className="grid gap-6 max-w-2xl">
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
              <CardTitle>Automation Settings</CardTitle>
              <CardDescription>Configure feedback request timing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isOwner && <div className="rounded-xl bg-secondary/15 p-3 text-sm text-secondary-foreground">You need Owner role to change these settings</div>}

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
                      value={`${window.location.origin}/book/${clinic._id}`}
                      className="w-full rounded-xl border border-input bg-muted px-3.5 py-2.5 text-sm text-muted-foreground"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => navigator.clipboard.writeText(`${window.location.origin}/book/${clinic._id}`)}
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

          {error && (
            <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!isOwner || isSaving}>
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
