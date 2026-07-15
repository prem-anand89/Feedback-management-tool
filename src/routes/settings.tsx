import { useState, useEffect } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { StaffLayout } from '@/components/staff-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { readSession } from '@/lib/staff-session'

interface ClinicSettings {
  clinicName: string
  feedbackDelay: string
  reminderDelay: string
  googleReviewUrl: string
  checkInMessage: string
  reminderMessage: string
}

function SettingsPage() {
  const [session, setSession] = useState(readSession())
  const [settings, setSettings] = useState<ClinicSettings>({
    clinicName: 'Beyond Mechanics Wellness',
    feedbackDelay: '24',
    reminderDelay: '48',
    googleReviewUrl: 'https://google.com/maps/...',
    checkInMessage: 'Thank you for visiting {clinic_name}. How are you feeling after today\'s session?',
    reminderMessage: 'We\'d love to hear about your experience. Have you had a chance to share your feedback?',
  })

  const isOwner = session?.role === 'owner'

  const handleSave = () => {
    localStorage.setItem('clinic_settings', JSON.stringify(settings))
    alert('Settings saved!')
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
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
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
              {!isOwner && <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">You need Owner role to change these settings</div>}

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
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                />
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
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
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
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!isOwner}>
              Save Settings
            </Button>
            <Button variant="outline">Cancel</Button>
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
