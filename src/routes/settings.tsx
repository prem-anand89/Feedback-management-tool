import { useState, useEffect } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { StaffLayout } from '@/components/staff-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
}

function SettingsPage() {
  const { isAuthenticated } = useConvexAuth()
  const staffUser = useQuery(api.clinics.getMyStaffUser, isAuthenticated ? {} : 'skip')
  const clinic = useQuery(api.clinics.getMyClinic, staffUser ? {} : 'skip')
  const updateClinicSettings = useMutation(api.clinics.updateClinicSettings)

  const [settings, setSettings] = useState<ClinicSettings | null>(null)
  const [newService, setNewService] = useState('')
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

  const removeService = (service: string) => {
    if (!settings) return
    setSettings({ ...settings, services: settings.services.filter((s) => s !== service) })
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
                  {settings.services.map((service) => (
                    <span
                      key={service}
                      className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground"
                    >
                      {service}
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => removeService(service)}
                          className="text-muted-foreground transition hover:text-destructive"
                          aria-label={`Remove ${service}`}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
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
