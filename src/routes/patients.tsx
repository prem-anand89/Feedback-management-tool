import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { StaffLayout } from '@/components/staff-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, Phone } from 'lucide-react'
import { mockPatients, mockTimeline } from '@/lib/mock-data'

function PatientsPage() {
  const [selectedPatientId, setSelectedPatientId] = useState(mockPatients[0]?.id)
  const selected = selectedPatientId ? mockPatients.find((p) => p.id === selectedPatientId) : null

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground">View patient profiles and their feedback timeline</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Patients</CardTitle>
              <CardDescription>{mockPatients.length} total</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockPatients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => setSelectedPatientId(patient.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedPatientId === patient.id ? 'border-primary bg-primary/5' : 'border-input hover:bg-accent'
                    }`}
                  >
                    <p className="font-medium">{patient.name}</p>
                    <p className="text-xs text-muted-foreground">{patient.phone}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {selected && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>{selected.name}</CardTitle>
                <CardDescription>Patient profile and timeline</CardDescription>
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
                  <h3 className="mb-4 font-semibold">Patient Timeline</h3>
                  <div className="space-y-4">
                    {mockTimeline.map((event, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="h-3 w-3 rounded-full bg-primary" />
                          {index < mockTimeline.length - 1 && <div className="mt-2 h-8 w-0.5 bg-border" />}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="font-medium">{event.title}</p>
                          <p className="text-xs text-muted-foreground">{event.date}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Button className="w-full" variant="outline">
                  View Full History
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </StaffLayout>
  )
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/patients',
  component: PatientsPage,
})
