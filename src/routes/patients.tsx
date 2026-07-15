import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { StaffLayout } from '@/components/staff-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, Phone, Plus } from 'lucide-react'
import { useQuery, useMutation, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'

function PatientsPage() {
  const { isAuthenticated } = useConvexAuth()
  const staffUser = useQuery(api.clinics.getMyStaffUser, isAuthenticated ? {} : 'skip')
  const patients = useQuery(api.patients.listPatients, isAuthenticated ? {} : 'skip') ?? []
  const visits = useQuery(api.visits.listVisits, isAuthenticated ? {} : 'skip') ?? []

  const createPatient = useMutation(api.patients.createPatient)
  const createVisit = useMutation(api.visits.createVisit)
  const completeVisit = useMutation(api.visits.completeVisit)

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [showAddPatient, setShowAddPatient] = useState(false)
  const [showAddVisit, setShowAddVisit] = useState(false)
  const [newPatientName, setNewPatientName] = useState('')
  const [newPatientEmail, setNewPatientEmail] = useState('')
  const [newPatientPhone, setNewPatientPhone] = useState('')
  const [isLoadingPatient, setIsLoadingPatient] = useState(false)
  const [isLoadingVisit, setIsLoadingVisit] = useState(false)
  const [error, setError] = useState('')

  const selected = selectedPatientId ? patients.find((p) => p._id === selectedPatientId) : null
  const patientVisits = selected ? visits.filter((v) => v.patientId === selected._id) : []

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPatientName.trim() || !newPatientEmail.trim() || !newPatientPhone.trim()) {
      setError('All fields are required')
      return
    }

    setIsLoadingPatient(true)
    setError('')
    try {
      const patientId = await createPatient({
        name: newPatientName.trim(),
        email: newPatientEmail.trim(),
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
      })
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

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
            <p className="text-muted-foreground">Manage patients and schedule visits</p>
          </div>
          <Button onClick={() => setShowAddPatient(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Patient
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Patients</CardTitle>
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
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        selectedPatientId === patient._id ? 'border-primary bg-primary/5' : 'border-input hover:bg-accent'
                      }`}
                    >
                      <p className="font-medium">{patient.name}</p>
                      <p className="text-xs text-muted-foreground">{patient.phone}</p>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {selected && (
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selected.name}</CardTitle>
                    <CardDescription>Patient profile and visits</CardDescription>
                  </div>
                  <Button onClick={() => setShowAddVisit(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Visit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{selected.email}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{selected.phone}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-4 font-semibold">Visits</h3>
                  {patientVisits.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No visits scheduled. Create one to get started.</p>
                  ) : (
                    <div className="space-y-3">
                      {patientVisits.map((visit) => (
                        <div key={visit._id} className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <p className="font-medium text-sm">
                              {new Date(visit.createdAt).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {visit.completedAt ? 'Completed' : 'Pending'}
                            </p>
                          </div>
                          {!visit.completedAt && (
                            <Button
                              onClick={() => handleCompleteVisit(visit._id)}
                              size="sm"
                              variant="outline"
                            >
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
          )}
        </div>

        {showAddPatient && (
          <Card>
            <CardHeader>
              <CardTitle>Add New Patient</CardTitle>
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
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={newPatientEmail}
                      onChange={(e) => setNewPatientEmail(e.target.value)}
                      disabled={isLoadingPatient}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
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
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                    />
                  </div>
                </div>
                {error && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                    {error}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="submit" disabled={isLoadingPatient}>
                    {isLoadingPatient ? 'Adding...' : 'Add Patient'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddPatient(false)}
                    disabled={isLoadingPatient}
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
              <CardTitle>Schedule Visit for {selected.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddVisit} className="space-y-4">
                {error && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                    {error}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="submit" disabled={isLoadingVisit}>
                    {isLoadingVisit ? 'Scheduling...' : 'Schedule Visit'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddVisit(false)}
                    disabled={isLoadingVisit}
                  >
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
