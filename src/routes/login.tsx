import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { createRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Stethoscope } from 'lucide-react'
import { createMockSession, saveSession, type StaffRole, roleLabels } from '@/lib/staff-session'

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('Dr. Sarah')
  const [role, setRole] = useState<StaffRole>('therapist')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    const session = createMockSession(role, name)
    saveSession(session)
    navigate({ to: '/dashboard' })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">TheraNet</h1>
              <p className="text-xs text-muted-foreground">Feedback Management</p>
            </div>
          </div>
          <CardTitle className="text-center">Staff Login</CardTitle>
          <CardDescription className="text-center">Mock login - select your role to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={role} onValueChange={(value) => setRole(value as StaffRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Clinic Owner</SelectItem>
                  <SelectItem value="therapist">Therapist</SelectItem>
                  <SelectItem value="receptionist">Receptionist</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email (optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@clinic.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-4 text-xs text-muted-foreground">
            <p className="font-semibold">Demo Info:</p>
            <p>This is a mock login with no real authentication. Select a role and click Login to continue.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/login',
  component: LoginPage,
})
