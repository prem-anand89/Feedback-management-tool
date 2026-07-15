import { useState } from 'react'
import { createRoute, useNavigate } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useMutation, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Stethoscope } from 'lucide-react'

function SetupPage() {
  const { isAuthenticated } = useConvexAuth()
  const navigate = useNavigate()
  const createClinic = useMutation(api.clinics.createClinic)
  const [clinicName, setClinicName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreateClinic = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clinicName.trim()) {
      setError('Clinic name is required')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      await createClinic({ clinicName: clinicName.trim() })
      navigate({ to: '/dashboard' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create clinic')
      setIsLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Redirecting...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Please sign in first</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">TheraNet</h1>
              <p className="text-xs text-muted-foreground">Feedback Management</p>
            </div>
          </div>
          <CardTitle>Set Up Your Clinic</CardTitle>
          <CardDescription>Create your clinic to get started managing patient feedback</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateClinic} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="clinic-name" className="text-sm font-medium">
                Clinic Name
              </label>
              <input
                id="clinic-name"
                type="text"
                placeholder="e.g., Beyond Mechanics Wellness"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !clinicName.trim()}
              className="w-full"
            >
              {isLoading ? 'Creating...' : 'Create Clinic'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/setup',
  component: SetupPage,
})
