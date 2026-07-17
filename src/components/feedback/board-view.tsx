import { Badge, type BadgeVariant } from '@/components/ui/badge'

const STATUSES = ['pending', 'in-progress', 'resolved', 'closed'] as const
export type ComplaintStatus = (typeof STATUSES)[number]

const columnAccent: Record<ComplaintStatus, string> = {
  pending: 'border-t-chipAmber-foreground',
  'in-progress': 'border-t-chipBlue-foreground',
  resolved: 'border-t-chipGreen-foreground',
  closed: 'border-t-muted-foreground',
}

interface ComplaintCard {
  _id: string
  feedbackResponseId: string
  patientId: string
  priority: 'low' | 'medium' | 'high'
  status: ComplaintStatus
  assignedToId?: string
}

interface BoardViewProps {
  complaints: ComplaintCard[]
  selectedFeedbackResponseId: string | null
  onSelect: (feedbackResponseId: string) => void
  patientName: (id: string) => string
  staffName: (id: string | undefined) => string
  excerpt: (feedbackResponseId: string) => string | null | undefined
}

export function BoardView({ complaints, selectedFeedbackResponseId, onSelect, patientName, staffName, excerpt }: BoardViewProps) {
  return (
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
                  const complaintExcerpt = excerpt(complaint.feedbackResponseId)
                  return (
                    <button
                      key={complaint._id}
                      onClick={() => onSelect(complaint.feedbackResponseId)}
                      className={`w-full rounded-xl border p-3 text-left text-sm transition-colors ${
                        selectedFeedbackResponseId === complaint.feedbackResponseId
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-accent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold">{patientName(complaint.patientId)}</p>
                        <Badge variant={`priority-${complaint.priority}` as BadgeVariant}>{complaint.priority}</Badge>
                      </div>
                      {complaintExcerpt && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{complaintExcerpt}</p>}
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
  )
}
