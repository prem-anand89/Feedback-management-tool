import { useState, useEffect } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { StaffLayout } from '@/components/staff-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pencil, X, Check } from 'lucide-react'
import { useQuery, useMutation, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'

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
