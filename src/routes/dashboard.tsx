import { createRoute, Link } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { StaffLayout } from '@/components/staff-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageCircle, Clock, AlertCircle, CalendarClock, MessageCircleMore, CheckCircle2 } from 'lucide-react'
import { useQuery, useMutation, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { IconBadge } from '@/components/ui/icon-badge'
import { Badge, type BadgeVariant } from '@/components/ui/badge'

function relativeTime(ts: number) {
  const diffMs = Date.now() - ts
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

const metricIconClass: Record<string, string> = {
  blue: 'bg-chipBlue text-chipBlue-foreground',
  amber: 'bg-chipAmber text-chipAmber-foreground',
  green: 'bg-chipGreen text-chipGreen-foreground',
  purple: 'bg-chipPurple text-chipPurple-foreground',
  pink: 'bg-chipPink text-chipPink-foreground',
}

function MetricCard({
  icon: Icon,
  color,
  value,
  label,
}: {
  icon: any
  color: keyof typeof metricIconClass
  value: string | number
  label: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <IconBadge icon={Icon} size="sm" colorClassName={metricIconClass[color]} />
        <div className="min-w-0">
          <div className="text-xl font-semibold leading-tight">{value}</div>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardPage() {
  const { isAuthenticated } = useConvexAuth()
  const staffUser = useQuery(api.clinics.getMyStaffUser, isAuthenticated ? {} : 'skip')

  const feedbackRequests = useQuery(api.feedback.listFeedbackRequests, staffUser ? {} : 'skip') ?? []
  const feedbackResponses = useQuery(api.feedback.listFeedbackResponses, staffUser ? {} : 'skip') ?? []
  const complaints = useQuery(api.complaints.listComplaints, staffUser ? {} : 'skip') ?? []
  const upcomingAppointments = useQuery(api.appointments.listUpcomingAppointments, staffUser ? {} : 'skip') ?? []
  const pendingRequests = useQuery(api.appointmentRequests.listPendingAppointmentRequests, staffUser ? {} : 'skip') ?? []
  const patients = useQuery(api.patients.listPatients, staffUser ? {} : 'skip') ?? []
  const staffList = useQuery(api.clinics.listStaff, staffUser ? {} : 'skip') ?? []
  const completeAppointment = useMutation(api.appointments.completeAppointment)

  const patientName = (id: string) => patients.find((p) => p._id === id)?.name ?? 'Unknown patient'
  const therapistName = (id: string) => staffList.find((s) => s._id === id)?.name ?? 'Unassigned'

  const todaysAppointments = upcomingAppointments
    .filter((a) => new Date(a.scheduledAt).toDateString() === new Date().toDateString())
    .sort((a, b) => a.scheduledAt - b.scheduledAt)

  // Past their scheduled time but never marked complete or cancelled — the
  // feedback pipeline only fires on completion, so these are silently
  // stuck unless a human notices and acts.
  const awaitingCompletion = upcomingAppointments
    .filter((a) => a.scheduledAt < Date.now())
    .sort((a, b) => a.scheduledAt - b.scheduledAt)

  const todayFeedback = feedbackRequests.filter((f) => {
    const today = new Date()
    const sentDate = new Date(f.sentAt)
    return sentDate.toDateString() === today.toDateString()
  }).length

  const pendingFeedback = feedbackRequests.filter((f) => f.status === 'pending').length

  const recentActivity = [
    ...feedbackResponses.map((f) => ({
      id: f._id,
      message: `Feedback received: ${f.rating}★ rating`,
      timestamp: f.submittedAt,
      icon: MessageCircle,
      color: 'blue' as const,
    })),
    ...complaints.map((c) => ({
      id: c._id,
      message: `Complaint: ${c.priority} priority`,
      timestamp: c.createdAt,
      icon: AlertCircle,
      color: 'pink' as const,
    })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 6)

  const attentionComplaints = complaints
    .filter((c) => c.status === 'pending' || c.status === 'in-progress')
    .sort((a, b) => (a.priority === 'high' ? -1 : b.priority === 'high' ? 1 : b.createdAt - a.createdAt))
    .slice(0, 5)

  if (isAuthenticated && staffUser === null) {
    return (
      <StaffLayout>
        <Card>
          <CardHeader>
            <CardTitle>No clinic set up yet</CardTitle>
            <CardDescription>Your account isn't linked to a clinic. Set one up to start collecting feedback.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/setup">Set up your clinic</Link>
            </Button>
          </CardContent>
        </Card>
      </StaffLayout>
    )
  }

  return (
    <StaffLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">What needs your attention right now. For trends over time, see Analytics.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarClock className="h-4 w-4 text-secondary" />
              Today's Appointments
              {todaysAppointments.length > 0 && (
                <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-xs font-semibold text-secondary">
                  {todaysAppointments.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaysAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No appointments scheduled for today.</p>
            ) : (
              <div className="space-y-1">
                {todaysAppointments.map((appt) => (
                  <div key={appt._id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
                    <IconBadge icon={Clock} size="xs" colorClassName="bg-chipBlue text-chipBlue-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{patientName(appt.patientId)}</p>
                      <p className="text-xs text-muted-foreground">{therapistName(appt.therapistId)}</p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {new Date(appt.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {awaitingCompletion.length > 0 && (
          <Card className="border-chipAmber-foreground/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-4 w-4 text-chipAmber-foreground" />
                Awaiting Completion
                <span className="rounded-full bg-chipAmber px-2 py-0.5 text-xs font-semibold text-chipAmber-foreground">
                  {awaitingCompletion.length}
                </span>
              </CardTitle>
              <CardDescription>
                These appointments have passed but were never marked complete — feedback won't be requested until they are.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {awaitingCompletion.slice(0, 6).map((appt) => (
                  <div key={appt._id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
                    <IconBadge icon={Clock} size="xs" colorClassName="bg-chipAmber text-chipAmber-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{patientName(appt.patientId)}</p>
                      <p className="text-xs text-muted-foreground">
                        {therapistName(appt.therapistId)} · {new Date(appt.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => completeAppointment({ appointmentId: appt._id })}>
                      Complete
                    </Button>
                  </div>
                ))}
              </div>
              {awaitingCompletion.length > 6 && (
                <Link to="/appointments" className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
                  View all {awaitingCompletion.length} in Appointments →
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard icon={MessageCircle} color="blue" value={todayFeedback} label="Today's Feedback" />
          <MetricCard icon={Clock} color="amber" value={pendingFeedback} label="Pending Feedback" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageCircleMore className="h-4 w-4 text-secondary" />
                Appointment Requests
                {pendingRequests.length > 0 && (
                  <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-xs font-semibold text-secondary">
                    {pendingRequests.length}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending requests.</p>
              ) : (
                <div className="space-y-1">
                  {pendingRequests.slice(0, 5).map((req) => (
                    <div key={req._id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
                      <IconBadge icon={MessageCircleMore} size="xs" colorClassName="bg-chipPurple text-chipPurple-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{req.patientName}</p>
                        <p className="text-xs text-muted-foreground">
                          Requested {req.preferredDate} at {req.preferredTime}
                        </p>
                      </div>
                    </div>
                  ))}
                  <Link to="/appointments" className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
                    Review in Appointments →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="h-4 w-4 text-destructive" />
                Complaints Needing Attention
                {attentionComplaints.length > 0 && (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                    {attentionComplaints.length}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attentionComplaints.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing open right now.</p>
              ) : (
                <div className="space-y-1">
                  {attentionComplaints.map((c) => (
                    <div key={c._id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{patientName(c.patientId)}</p>
                        <p className="text-xs text-muted-foreground">{c.status.replace('-', ' ')}</p>
                      </div>
                      <Badge variant={`priority-${c.priority}` as BadgeVariant}>{c.priority}</Badge>
                    </div>
                  ))}
                  <Link to="/feedback" className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
                    Manage in Feedback →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <div className="space-y-1">
                {recentActivity.map((activity) => {
                  const Icon = activity.icon
                  return (
                    <div key={activity.id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
                      <IconBadge icon={Icon} size="xs" colorClassName={metricIconClass[activity.color]} />
                      <p className="min-w-0 flex-1 truncate text-sm font-medium">{activity.message}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {relativeTime(activity.timestamp)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  )
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/dashboard',
  component: DashboardPage,
})
