import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { StaffLayout } from '@/components/staff-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useQuery, useMutation, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'

const STATUSES = ['pending', 'in-progress', 'resolved', 'closed'] as const
type Status = (typeof STATUSES)[number]

const columnAccent: Record<Status, string> = {
  pending: 'border-t-chipAmber-foreground',
  'in-progress': 'border-t-chipBlue-foreground',
  resolved: 'border-t-chipGreen-foreground',
  closed: 'border-t-muted-foreground',
}

const priorityClass: Record<string, string> = {
  high: 'bg-chipPink text-chipPink-foreground',
  medium: 'bg-chipAmber text-chipAmber-foreground',
  low: 'bg-chipGreen text-chipGreen-foreground',
}

function ComplaintsPage() {
  const { isAuthenticated } = useConvexAuth()
  const complaints = useQuery(api.complaints.listComplaints, isAuthenticated ? {} : 'skip') ?? []
  const patients = useQuery(api.patients.listPatients, isAuthenticated ? {} : 'skip') ?? []
  const staffList = useQuery(api.clinics.listStaff, isAuthenticated ? {} : 'skip') ?? []
  const feedbackResponses = useQuery(api.feedback.listFeedbackResponses, isAuthenticated ? {} : 'skip') ?? []
  const updateComplaintStatus = useMutation(api.complaints.updateComplaintStatus)
  const assignComplaint = useMutation(api.complaints.assignComplaint)
  const addComplaintNote = useMutation(api.complaints.addComplaintNote)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const patientName = (id: string) => patients.find((p) => p._id === id)?.name ?? 'Unknown patient'
  const staffName = (id: string | undefined) => (id ? staffList.find((s) => s._id === id)?.name : null) ?? 'Unassigned'
  const complaintExcerpt = (feedbackResponseId: string) => {
    const response = feedbackResponses.find((f) => f._id === feedbackResponseId)
    return response?.comments || null
  }

  const selected = selectedId ? complaints.find((c) => c._id === selectedId) : null
  const selectedNotes: { author: string; timestamp: number; text: string }[] = selected ? JSON.parse(selected.notes) : []

  const handleUpdateStatus = async (newStatus: Status) => {
    if (!selected) return
    setIsLoading(true)
    setError('')
    try {
      await updateComplaintStatus({ complaintId: selected._id as any, status: newStatus })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssign = async (staffId: string) => {
    if (!selected) return
    try {
      await assignComplaint({ complaintId: selected._id as any, staffId: (staffId || undefined) as any })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign complaint')
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected || !noteText.trim()) return

    setIsLoading(true)
    setError('')
    try {
      await addComplaintNote({ complaintId: selected._id as any, note: noteText.trim() })
      setNoteText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Complaints</h1>
          <p className="text-muted-foreground">Pipeline of open issues by status.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {STATUSES.map((status) => {
            const statusComplaints = complaints.filter((c) => c.status === status)
            return (
              <div key={status} className={`rounded-2xl border-t-4 bg-card ${columnAccent[status]} border border-border`}>
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h3 className="text-sm font-semibold capitalize">{status.replace('-', ' ')}</h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    {statusComplaints.length}
                  </span>
                </div>
                <div className="space-y-2 p-3">
                  {statusComplaints.length === 0 ? (
                    <p className="px-1 py-4 text-center text-xs text-muted-foreground">No complaints</p>
                  ) : (
                    statusComplaints.map((complaint) => {
                      const excerpt = complaintExcerpt(complaint.feedbackResponseId)
                      return (
                        <button
                          key={complaint._id}
                          onClick={() => setSelectedId(complaint._id)}
                          className={`w-full rounded-xl border p-3 text-left text-sm transition-colors ${
                            selectedId === complaint._id ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold">{patientName(complaint.patientId)}</p>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${priorityClass[complaint.priority]}`}>
                              {complaint.priority}
                            </span>
                          </div>
                          {excerpt && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{excerpt}</p>}
                          <p className="mt-2 text-xs text-muted-foreground">Assigned: {staffName(complaint.assignedToId)}</p>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {selected && (
          <Card>
            <CardHeader>
              <CardTitle>{patientName(selected.patientId)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Priority</p>
                  <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${priorityClass[selected.priority]}`}>
                    {selected.priority}
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Assigned To</p>
                  <select
                    value={selected.assignedToId ?? ''}
                    onChange={(e) => handleAssign(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Unassigned</option>
                    {staffList.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {complaintExcerpt(selected.feedbackResponseId) && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Original Feedback</p>
                  <p className="mt-1 text-sm">{complaintExcerpt(selected.feedbackResponseId)}</p>
                </div>
              )}

              {error && <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Move to</p>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((status) => (
                    <Button
                      key={status}
                      variant={selected.status === status ? 'default' : 'outline'}
                      size="sm"
                      className="capitalize"
                      onClick={() => handleUpdateStatus(status)}
                      disabled={isLoading}
                    >
                      {status.replace('-', ' ')}
                    </Button>
                  ))}
                </div>
              </div>

              {selectedNotes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <div className="space-y-2">
                    {selectedNotes.map((note, i) => (
                      <div key={i} className="rounded-xl bg-muted p-3 text-sm">
                        <p>{note.text}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{new Date(note.timestamp).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleAddNote} className="space-y-2">
                <label className="text-sm font-medium">Add Note</label>
                <textarea
                  placeholder="Add a note..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  disabled={isLoading}
                  rows={3}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                />
                <Button type="submit" size="sm" disabled={isLoading || !noteText.trim()}>
                  {isLoading ? 'Adding...' : 'Add Note'}
                </Button>
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
  path: '/complaints',
  component: ComplaintsPage,
})
