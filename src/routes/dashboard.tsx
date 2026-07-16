import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { StaffLayout } from '@/components/staff-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { MessageSquare, Clock, Star, Globe, AlertCircle, CheckCircle } from 'lucide-react'
import { useQuery, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'

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
  sub,
}: {
  icon: any
  color: keyof typeof metricIconClass
  value: string | number
  label: string
  sub?: string
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${metricIconClass[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
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
  const reviewStats = useQuery(api.reviews.getReviewStats, staffUser ? {} : 'skip')

  const todayFeedback = feedbackRequests.filter((f) => {
    const today = new Date()
    const sentDate = new Date(f.sentAt)
    return sentDate.toDateString() === today.toDateString()
  }).length

  const pendingFeedback = feedbackRequests.filter((f) => f.status === 'pending').length

  const avgRating = feedbackResponses.length > 0
    ? (feedbackResponses.reduce((sum, f) => sum + f.rating, 0) / feedbackResponses.length).toFixed(1)
    : '0'

  const complaintCount = complaints.filter((c) => c.status === 'pending' || c.status === 'in-progress').length
  const resolved = complaints.filter((c) => c.status === 'resolved').length

  const recentActivity = [
    ...feedbackResponses.map((f) => ({
      id: f._id,
      message: `Feedback received: ${f.rating}★ rating`,
      timestamp: f.submittedAt,
      icon: MessageSquare,
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

  // Trailing 6 months of feedback volume, bucketed by month.
  const monthlyData = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - (5 - i))
    const label = d.toLocaleDateString([], { month: 'short' })
    const count = feedbackResponses.filter((f) => {
      const submitted = new Date(f.submittedAt)
      return submitted.getFullYear() === d.getFullYear() && submitted.getMonth() === d.getMonth()
    }).length
    return { month: label, count }
  })

  if (isAuthenticated && staffUser === null) {
    return (
      <StaffLayout>
        <Card>
          <CardHeader>
            <CardTitle>No clinic set up yet</CardTitle>
            <CardDescription>Your account isn't linked to a clinic. Set one up to start collecting feedback.</CardDescription>
          </CardHeader>
        </Card>
      </StaffLayout>
    )
  }

  return (
    <StaffLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of feedback, complaints, and reputation this week.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard icon={MessageSquare} color="blue" value={todayFeedback} label="Today's Feedback" />
          <MetricCard icon={Clock} color="amber" value={pendingFeedback} label="Pending Feedback" />
          <MetricCard icon={Star} color="green" value={`${avgRating} / 5`} label="Average Rating" />
          <MetricCard icon={Globe} color="purple" value={reviewStats?.clicked ?? 0} label="Google Reviews (mo.)" />
          <MetricCard icon={AlertCircle} color="pink" value={complaintCount} label="Open Complaints" />
          <MetricCard icon={CheckCircle} color="green" value={resolved} label="Resolved Issues" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Monthly feedback volume</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <Tooltip cursor={{ fill: '#F1F5F9' }} />
                  <Bar dataKey="count" fill="#0F172A" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

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
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${metricIconClass[activity.color]}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <p className="flex-1 text-sm font-medium">{activity.message}</p>
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
      </div>
    </StaffLayout>
  )
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/dashboard',
  component: DashboardPage,
})
