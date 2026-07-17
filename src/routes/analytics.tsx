import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { StaffLayout } from '@/components/staff-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useQuery, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'

type Period = 'daily' | 'weekly' | 'monthly'

function buildRatingTrend(responses: { rating: number; submittedAt: number }[], period: Period) {
  const now = new Date()
  const buckets: { label: string; start: number; end: number }[] = []

  if (period === 'daily') {
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now)
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      buckets.push({ label: d.toLocaleDateString([], { month: 'short', day: 'numeric' }), start: d.getTime(), end: d.getTime() + 24 * 60 * 60 * 1000 })
    }
  } else if (period === 'weekly') {
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now)
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - d.getDay() - i * 7)
      buckets.push({ label: d.toLocaleDateString([], { month: 'short', day: 'numeric' }), start: d.getTime(), end: d.getTime() + 7 * 24 * 60 * 60 * 1000 })
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(1)
      d.setHours(0, 0, 0, 0)
      d.setMonth(d.getMonth() - i)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()
      buckets.push({ label: d.toLocaleDateString([], { month: 'short' }), start: d.getTime(), end })
    }
  }

  return buckets.map((b) => {
    const inBucket = responses.filter((r) => r.submittedAt >= b.start && r.submittedAt < b.end)
    const avg = inBucket.length > 0 ? inBucket.reduce((sum, r) => sum + r.rating, 0) / inBucket.length : null
    return { label: b.label, rating: avg !== null ? Number(avg.toFixed(2)) : null }
  })
}

function AnalyticsPage() {
  const { isAuthenticated } = useConvexAuth()
  const staffUser = useQuery(api.clinics.getMyStaffUser, isAuthenticated ? {} : 'skip')
  const feedbackRequests = useQuery(api.feedback.listFeedbackRequests, staffUser ? {} : 'skip') ?? []
  const feedbackResponses = useQuery(api.feedback.listFeedbackResponses, staffUser ? {} : 'skip') ?? []
  const complaints = useQuery(api.complaints.listComplaints, staffUser ? {} : 'skip') ?? []
  const reviewStats = useQuery(api.reviews.getReviewStats, staffUser ? {} : 'skip')
  const reviewRequests = useQuery(api.reviews.listReviewRequests, staffUser ? {} : 'skip') ?? []

  const [period, setPeriod] = useState<Period>('weekly')

  const respondedCount = feedbackRequests.filter((f) => f.status === 'responded').length
  const responseRate = feedbackRequests.length > 0 ? Math.round((respondedCount / feedbackRequests.length) * 100) : 0
  const avgRating = feedbackResponses.length > 0
    ? (feedbackResponses.reduce((sum, f) => sum + f.rating, 0) / feedbackResponses.length).toFixed(1)
    : '0'
  const reviewsSubmitted = reviewRequests.filter((r) => r.completedAt).length
  const resolvedComplaints = complaints.filter((c) => c.status === 'resolved')
  const avgResolutionHours = resolvedComplaints.length > 0
    ? Math.round(resolvedComplaints.reduce((sum, c) => sum + (c.updatedAt - c.createdAt), 0) / resolvedComplaints.length / (60 * 60 * 1000))
    : 0

  const trend = buildRatingTrend(feedbackResponses, period)

  const metrics = [
    { value: feedbackRequests.length, label: 'Feedback requests sent' },
    { value: `${responseRate}%`, label: 'Response rate' },
    { value: avgRating, label: 'Average rating' },
    { value: reviewStats?.clicked ?? 0, label: 'Google review clicks' },
    { value: reviewsSubmitted, label: 'Reviews submitted' },
    { value: complaints.length, label: 'Complaints' },
    { value: `${avgResolutionHours}h`, label: 'Avg. resolution time' },
  ]

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">Reputation and feedback health.</p>
          </div>
          <div className="inline-flex rounded-xl border border-border bg-card p-1">
            {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${
                  period === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <Card key={m.label}>
              <CardContent className="p-5">
                <div className="text-2xl font-bold">{m.value}</div>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Average rating trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={trend} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 12,
                    color: 'hsl(var(--popover-foreground))',
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="rating" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  )
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/analytics',
  component: AnalyticsPage,
})
