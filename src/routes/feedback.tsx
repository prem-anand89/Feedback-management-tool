import { useMemo, useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { StaffLayout } from '@/components/staff-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { BoardView, type ComplaintStatus } from '@/components/feedback/board-view'
import { Star, Download } from 'lucide-react'
import { useQuery, useMutation, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { downloadCsv } from '@/lib/csv'

const STATUSES: ComplaintStatus[] = ['pending', 'in-progress', 'resolved', 'closed']

function FeedbackPage() {
  const { isAuthenticated } = useConvexAuth()
  const responses = useQuery(api.feedback.listFeedbackResponses, isAuthenticated ? {} : 'skip') ?? []
  const complaints = useQuery(api.complaints.listComplaints, isAuthenticated ? {} : 'skip') ?? []
  const patients = useQuery(api.patients.listPatients, isAuthenticated ? {} : 'skip') ?? []
  const staffList = useQuery(api.clinics.listStaff, isAuthenticated ? {} : 'skip') ?? []

  const updateComplaintStatus = useMutation(api.complaints.updateComplaintStatus)
  const assignComplaint = useMutation(api.complaints.assignComplaint)
  const addComplaintNote = useMutation(api.complaints.addComplaintNote)

  const [viewMode, setViewMode] = useState<'list' | 'board'>('list')
  const [complaintsOnly, setComplaintsOnly] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const patientName = (id: string) => patients.find((p) => p._id === id)?.name ?? 'Unknown patient'
  const therapistName = (id: string) => staffList.find((s) => s._id === id)?.name ?? 'Unknown'
  const staffName = (id: string | undefined) => (id ? staffList.find((s) => s._id === id)?.name : null) ?? 'Unassigned'

  // Built once per render rather than a .find() per row — the row *is* the
  // feedback response already, so this is also the only lookup needed (no
  // separate excerpt lookup back into feedbackResponses like the old
  // complaints.tsx did).
  const complaintByResponseId = useMemo(() => {
    const map = new Map<string, (typeof complaints)[number]>()
    for (const c of complaints) map.set(c.feedbackResponseId, c)
    return map
  }, [complaints])

  const sortedResponses = useMemo(() => [...responses].sort((a, b) => b.submittedAt - a.submittedAt), [responses])
  const visibleResponses = complaintsOnly ? sortedResponses.filter((r) => complaintByResponseId.has(r._id)) : sortedResponses

  const selected = selectedId ? responses.find((f) => f._id === selectedId) : null
  const selectedComplaint = selected ? complaintByResponseId.get(selected._id) : undefined
  const selectedNotes: { author: string; timestamp: number; text: string }[] = selectedComplaint
    ? JSON.parse(selectedComplaint.notes)
    : []

  const excerpt = (feedbackResponseId: string) => responses.find((f) => f._id === feedbackResponseId)?.comments || null

  // Exports exactly what's currently visible (respects the "Complaints
  // only" filter) — one row per feedback response, complaint columns blank
  // when the response never became a complaint.
  const handleExport = () => {
    const rows = visibleResponses.map((r) => {
      const patient = patients.find((p) => p._id === r.patientId)
      const complaint = complaintByResponseId.get(r._id)
      return {
        date: new Date(r.submittedAt).toISOString().slice(0, 10),
        patient_name: patient?.name ?? '',
        patient_phone: patient?.phone ?? '',
        clinician: therapistName(r.therapistId),
        rating: r.rating,
        comments: r.comments,
        complaint_status: complaint?.status ?? '',
        complaint_priority: complaint?.priority ?? '',
      }
    })
    downloadCsv(`feedback-export-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  const handleUpdateStatus = async (newStatus: ComplaintStatus) => {
    if (!selectedComplaint) return
    setIsLoading(true)
    setError('')
    try {
      await updateComplaintStatus({ complaintId: selectedComplaint._id, status: newStatus })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssign = async (staffId: string) => {
    if (!selectedComplaint) return
    try {
      await assignComplaint({ complaintId: selectedComplaint._id, staffId: (staffId || undefined) as any })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign complaint')
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedComplaint || !noteText.trim()) return

    setIsLoading(true)
    setError('')
    try {
      await addComplaintNote({ complaintId: selectedComplaint._id, note: noteText.trim() })
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Feedback</h1>
            <p className="text-muted-foreground">All patient feedback, with complaints flagged for follow-up.</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={complaintsOnly} onChange={(e) => setComplaintsOnly(e.target.checked)} />
              Complaints only
            </label>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={visibleResponses.length === 0}>
              <Download className="mr-2 h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'board')}>
              <TabsList>
                <TabsTrigger value="list">List</TabsTrigger>
                <TabsTrigger value="board">Board</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {viewMode === 'board' ? (
          <BoardView
            complaints={complaints}
            selectedFeedbackResponseId={selectedId}
            onSelect={setSelectedId}
            patientName={patientName}
            staffName={staffName}
            excerpt={excerpt}
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>All Feedback</CardTitle>
                <CardDescription>{visibleResponses.length} response{visibleResponses.length === 1 ? '' : 's'}</CardDescription>
              </CardHeader>
              <CardContent>
                {visibleResponses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No feedback responses yet</p>
                ) : (
                  <div className="space-y-2">
                    {visibleResponses.map((feedback) => {
                      const complaint = complaintByResponseId.get(feedback._id)
                      return (
                        <button
                          key={feedback._id}
                          onClick={() => setSelectedId(feedback._id)}
                          className={`w-full rounded-lg border p-4 text-left transition-colors ${
                            selectedId === feedback._id ? 'border-primary bg-primary/5' : 'border-input hover:bg-accent'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium">{patientName(feedback.patientId)}</p>
                              <p className="text-xs text-muted-foreground">
                                {therapistName(feedback.therapistId)} · {new Date(feedback.submittedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {complaint && (
                                <>
                                  <Badge variant={`priority-${complaint.priority}` as BadgeVariant}>{complaint.priority}</Badge>
                                  <Badge variant={`status-${complaint.status}` as BadgeVariant}>{complaint.status.replace('-', ' ')}</Badge>
                                </>
                              )}
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={`h-3.5 w-3.5 ${i < feedback.rating ? 'fill-chipAmber-foreground text-chipAmber-foreground' : 'text-muted'}`} />
                                ))}
                              </div>
                            </div>
                          </div>
                          {feedback.comments && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{feedback.comments}</p>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {selected && (
              <Card>
                <CardHeader>
                  <CardTitle>{patientName(selected.patientId)}</CardTitle>
                  <CardDescription>{new Date(selected.submittedAt).toLocaleString()}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Overall Rating</p>
                    <div className="mt-1 flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < selected.rating ? 'fill-chipAmber-foreground text-chipAmber-foreground' : 'text-muted'}`} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Therapist</p>
                    <p className="text-sm">{therapistName(selected.therapistId)}</p>
                  </div>
                  {selected.comments && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Comments</p>
                      <p className="mt-1 text-sm">{selected.comments}</p>
                    </div>
                  )}

                  {/* Rating >= 3 responses render none of the complaint management UI
                      below — gated strictly on complaintByResponseId, never inferred
                      from rating client-side. */}
                  {selectedComplaint && (
                    <div className="space-y-4 border-t border-border pt-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Priority</p>
                          <Badge variant={`priority-${selectedComplaint.priority}` as BadgeVariant}>{selectedComplaint.priority}</Badge>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Assigned To</p>
                          <select
                            value={selectedComplaint.assignedToId ?? ''}
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

                      {error && <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Move to</p>
                        <div className="flex flex-wrap gap-2">
                          {STATUSES.map((status) => (
                            <Button
                              key={status}
                              variant={selectedComplaint.status === status ? 'default' : 'outline'}
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
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </StaffLayout>
  )
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/feedback',
  component: FeedbackPage,
})
