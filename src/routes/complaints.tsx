import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { StaffLayout } from '@/components/staff-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { mockComplaints } from '@/lib/mock-data'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'

function ComplaintsPage() {
  const [complaints, setComplaints] = useState(mockComplaints)
  const [selectedId, setSelectedId] = useState<string | null>(mockComplaints[0]?.id)
  const selected = selectedId ? complaints.find((c) => c.id === selectedId) : null

  const statuses = ['pending', 'in-progress', 'resolved', 'closed'] as const
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
  }

  const getComplaints = (status: typeof statuses[number]) => complaints.filter((c) => c.status === status)

  const updateComplaintStatus = (id: string, newStatus: typeof statuses[number]) => {
    setComplaints((prevComplaints) => prevComplaints.map((c) => (c.id === id ? { ...c, status: newStatus } : c)))
  }

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Complaints</h1>
          <p className="text-muted-foreground">Track and resolve patient complaints and issues</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Complaint Board</CardTitle>
              <CardDescription>Total: {complaints.length} complaints</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statuses.map((status) => {
                  const statusComplaints = getComplaints(status)
                  return (
                    <div key={status}>
                      <h3 className="mb-2 text-sm font-semibold capitalize">{status.replace('-', ' ')}</h3>
                      <div className="space-y-2 rounded-lg bg-muted/30 p-3">
                        {statusComplaints.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No complaints</p>
                        ) : (
                          statusComplaints.map((complaint) => (
                            <button
                              key={complaint.id}
                              onClick={() => setSelectedId(complaint.id)}
                              className={`w-full rounded border p-3 text-left text-sm transition-colors ${
                                selectedId === complaint.id ? 'border-primary bg-primary/5' : 'border-input hover:bg-accent'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <p className="font-medium">{complaint.patientName}</p>
                                <span className={`rounded px-2 py-1 text-xs font-medium ${statusColors[status]}`}>{status}</span>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{complaint.feedback}</p>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {selected && (
            <Card>
              <CardHeader>
                <CardTitle>Complaint Details</CardTitle>
                <CardDescription>{selected.patientName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Patient</p>
                  <p className="font-medium">{selected.patientName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Priority</p>
                  <div className="mt-1">
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        selected.priority === 'high'
                          ? 'bg-red-100 text-red-800'
                          : selected.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {selected.priority}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Status</p>
                  <p className="mt-1 font-medium capitalize">{selected.status.replace('-', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Feedback</p>
                  <p className="mt-1 text-sm">{selected.feedback}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Change Status</p>
                  <div className="space-y-2">
                    {statuses.map((status) => (
                      <Button
                        key={status}
                        variant={selected.status === status ? 'default' : 'outline'}
                        size="sm"
                        className="w-full capitalize"
                        onClick={() => updateComplaintStatus(selected.id, status)}
                      >
                        {status.replace('-', ' ')}
                      </Button>
                    ))}
                  </div>
                </div>
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
  path: '/complaints',
  component: ComplaintsPage,
})
