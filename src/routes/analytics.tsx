import { lazy, Suspense, useMemo, useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { StaffLayout } from '@/components/staff-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useQuery, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'

const RatingTrendChart = lazy(() => import('@/components/analytics/rating-trend-chart'))
const PercentTrendChart = lazy(() => import('@/components/analytics/percent-trend-chart'))

type Period = 'daily' | 'weekly' | 'monthly'
type RangeKey = '7d' | '30d' | '90d' | 'all'

const RANGE_LABELS: Record<RangeKey, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
}
const RANGE_DAYS: Record<'7d' | '30d' | '90d', number> = { '7d': 7, '30d': 30, '90d': 90 }

function buildBuckets(period: Period) {
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
  return buckets
}

function buildRatingTrend(responses: { rating: number; submittedAt: number }[], period: Period) {
  return buildBuckets(period).map((b) => {
    const inBucket = responses.filter((r) => r.submittedAt >= b.start && r.submittedAt < b.end)
    const avg = inBucket.length > 0 ? inBucket.reduce((sum, r) => sum + r.rating, 0) / inBucket.length : null
    return { label: b.label, rating: avg !== null ? Number(avg.toFixed(2)) : null }
  })
}

function buildResponseRateTrend(requests: { sentAt: number; status: string }[], period: Period) {
  return buildBuckets(period).map((b) => {
    const inBucket = requests.filter((r) => r.sentAt >= b.start && r.sentAt < b.end)
    const responded = inBucket.filter((r) => r.status === 'responded').length
    const value = inBucket.length > 0 ? Math.round((responded / inBucket.length) * 100) : null
    return { label: b.label, value }
  })
}

// null means "no meaningful baseline" (previous period had zero) rather than
// an infinite/undefined percentage — the UI just hides the badge for those.
function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0) return null
  return Math.round(((curr - prev) / prev) * 100)
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0) return null
  const positive = delta > 0
  return (
    <span className={`ml-1.5 text-xs font-semibold ${positive ? 'text-chipGreen-foreground' : 'text-destructive'}`}>
      {positive ? '▲' : '▼'} {Math.abs(delta)}%
    </span>
  )
}

function BarList({ rows, unit = '' }: { rows: { label: string; value: number; sublabel?: string }[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">{row.label}</span>
            <span className="text-muted-foreground">
              {row.value}
              {unit}
              {row.sublabel && <span className="ml-1.5">· {row.sublabel}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function AnalyticsPage() {
  const { isAuthenticated } = useConvexAuth()
  const staffUser = useQuery(api.clinics.getMyStaffUser, isAuthenticated ? {} : 'skip')
  const feedbackRequests = useQuery(api.feedback.listFeedbackRequests, staffUser ? {} : 'skip') ?? []
  const feedbackResponses = useQuery(api.feedback.listFeedbackResponses, staffUser ? {} : 'skip') ?? []
  const complaints = useQuery(api.complaints.listComplaints, staffUser ? {} : 'skip') ?? []
  const reviewRequests = useQuery(api.reviews.listReviewRequests, staffUser ? {} : 'skip') ?? []
  const staffList = useQuery(api.clinics.listStaff, staffUser ? {} : 'skip') ?? []
  const visits = useQuery(api.visits.listVisits, staffUser ? {} : 'skip') ?? []

  const [period, setPeriod] = useState<Period>('weekly')
  const [range, setRange] = useState<RangeKey>('30d')

  // Date range filters the summary tiles/breakdowns below; the trend charts
  // always show their own fixed history (14 days / 8 weeks / 6 months)
  // regardless of range, same as before this range picker existed.
  const now = Date.now()
  const rangeMs = range === 'all' ? null : RANGE_DAYS[range] * 24 * 60 * 60 * 1000
  const windowStart = rangeMs ? now - rangeMs : 0
  const prevStart = rangeMs ? windowStart - rangeMs : null
  const prevEnd = windowStart
  const inCurrent = (ts: number) => ts >= windowStart
  const inPrev = (ts: number) => prevStart !== null && ts >= prevStart && ts < prevEnd

  const requestsCurr = useMemo(() => feedbackRequests.filter((f) => inCurrent(f.sentAt)), [feedbackRequests, windowStart])
  const requestsPrev = useMemo(() => feedbackRequests.filter((f) => inPrev(f.sentAt)), [feedbackRequests, prevStart, prevEnd])
  const responsesCurr = useMemo(() => feedbackResponses.filter((f) => inCurrent(f.submittedAt)), [feedbackResponses, windowStart])
  const responsesPrev = useMemo(() => feedbackResponses.filter((f) => inPrev(f.submittedAt)), [feedbackResponses, prevStart, prevEnd])
  const complaintsCurr = useMemo(() => complaints.filter((c) => inCurrent(c.createdAt)), [complaints, windowStart])
  const complaintsPrev = useMemo(() => complaints.filter((c) => inPrev(c.createdAt)), [complaints, prevStart, prevEnd])
  const reviewsClickedCurr = reviewRequests.filter((r) => r.clickedAt && inCurrent(r.clickedAt)).length
  const reviewsClickedPrev = reviewRequests.filter((r) => r.clickedAt && inPrev(r.clickedAt)).length
  const reviewsCompletedCurr = reviewRequests.filter((r) => r.completedAt && inCurrent(r.completedAt)).length
  const reviewsCompletedPrev = reviewRequests.filter((r) => r.completedAt && inPrev(r.completedAt)).length

  const respondedCurr = requestsCurr.filter((f) => f.status === 'responded').length
  const respondedPrev = requestsPrev.filter((f) => f.status === 'responded').length
  const responseRateCurr = requestsCurr.length > 0 ? Math.round((respondedCurr / requestsCurr.length) * 100) : 0
  const responseRatePrev = requestsPrev.length > 0 ? Math.round((respondedPrev / requestsPrev.length) * 100) : 0

  const avgRating = (rows: { rating: number }[]) => (rows.length > 0 ? rows.reduce((sum, r) => sum + r.rating, 0) / rows.length : 0)
  const avgRatingCurr = avgRating(responsesCurr)
  const avgRatingPrev = avgRating(responsesPrev)

  const metrics = [
    { value: requestsCurr.length, label: 'Feedback requests sent', delta: prevStart !== null ? pctDelta(requestsCurr.length, requestsPrev.length) : null },
    { value: `${responseRateCurr}%`, label: 'Response rate', delta: prevStart !== null ? pctDelta(responseRateCurr, responseRatePrev) : null },
    { value: avgRatingCurr.toFixed(1), label: 'Average rating', delta: prevStart !== null ? pctDelta(avgRatingCurr, avgRatingPrev) : null },
    { value: reviewsClickedCurr, label: 'Google review clicks', delta: prevStart !== null ? pctDelta(reviewsClickedCurr, reviewsClickedPrev) : null },
    { value: reviewsCompletedCurr, label: 'Reviews submitted', delta: prevStart !== null ? pctDelta(reviewsCompletedCurr, reviewsCompletedPrev) : null },
    { value: complaintsCurr.length, label: 'Complaints', delta: prevStart !== null ? pctDelta(complaintsCurr.length, complaintsPrev.length) : null },
  ]

  const trend = buildRatingTrend(feedbackResponses, period)
  const responseRateTrend = buildResponseRateTrend(feedbackRequests, period)

  const ratingDistribution = useMemo(() => {
    const counts = [1, 2, 3, 4, 5].map((star) => ({
      label: `${star}★`,
      value: responsesCurr.filter((r) => r.rating === star).length,
    }))
    return counts.reverse()
  }, [responsesCurr])

  const COMPLAINT_STATUSES = ['pending', 'in-progress', 'resolved', 'closed'] as const
  const complaintFunnel = useMemo(
    () =>
      COMPLAINT_STATUSES.map((status) => ({
        label: status.replace('-', ' '),
        value: complaintsCurr.filter((c) => c.status === status).length,
      })),
    [complaintsCurr],
  )

  // Ratings joined back to the service they were for, via
  // feedbackResponse -> feedbackRequest -> visit.serviceContext.
  const ratingByService = useMemo(() => {
    const requestById = new Map<string, (typeof feedbackRequests)[number]>(feedbackRequests.map((r) => [r._id, r]))
    const visitById = new Map<string, (typeof visits)[number]>(visits.map((v) => [v._id, v]))
    const byService = new Map<string, number[]>()
    for (const resp of responsesCurr) {
      const request = requestById.get(resp.feedbackRequestId)
      const visit = request ? visitById.get(request.visitId) : undefined
      const service = visit?.serviceContext || 'Unspecified'
      if (!byService.has(service)) byService.set(service, [])
      byService.get(service)!.push(resp.rating)
    }
    return [...byService.entries()]
      .map(([label, ratings]) => ({
        label,
        value: Number((ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)),
        sublabel: `${ratings.length} response${ratings.length === 1 ? '' : 's'}`,
      }))
      .sort((a, b) => b.value - a.value)
  }, [feedbackRequests, visits, responsesCurr])

  // Complaint counts per clinician joined via
  // complaint -> feedbackResponse.therapistId.
  const clinicianStats = useMemo(() => {
    const responseById = new Map<string, (typeof feedbackResponses)[number]>(feedbackResponses.map((r) => [r._id, r]))
    const stats = new Map<string, { name: string; ratings: number[]; complaints: number }>()
    for (const s of staffList) stats.set(s._id, { name: s.name, ratings: [], complaints: 0 })
    for (const resp of responsesCurr) {
      const entry = stats.get(resp.therapistId)
      if (entry) entry.ratings.push(resp.rating)
    }
    for (const c of complaintsCurr) {
      const resp = responseById.get(c.feedbackResponseId)
      const entry = resp && stats.get(resp.therapistId)
      if (entry) entry.complaints++
    }
    return [...stats.values()]
      .filter((s) => s.ratings.length > 0 || s.complaints > 0)
      .map((s) => ({
        name: s.name,
        avgRating: s.ratings.length > 0 ? (s.ratings.reduce((sum, r) => sum + r, 0) / s.ratings.length).toFixed(1) : '—',
        responses: s.ratings.length,
        complaints: s.complaints,
      }))
      .sort((a, b) => b.responses - a.responses)
  }, [feedbackResponses, staffList, responsesCurr, complaintsCurr])

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">Reputation and feedback health.</p>
          </div>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as RangeKey)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {(Object.keys(RANGE_LABELS) as RangeKey[]).map((key) => (
              <option key={key} value={key}>
                {RANGE_LABELS[key]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((m) => (
            <Card key={m.label}>
              <CardContent className="p-5">
                <div className="flex items-baseline text-2xl font-semibold">
                  {m.value}
                  <DeltaBadge delta={m.delta} />
                </div>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Rating distribution</CardTitle>
              <CardDescription>{RANGE_LABELS[range]}</CardDescription>
            </CardHeader>
            <CardContent>
              {responsesCurr.length === 0 ? (
                <p className="text-sm text-muted-foreground">No feedback in this range yet.</p>
              ) : (
                <BarList rows={ratingDistribution} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Complaint status</CardTitle>
              <CardDescription>{RANGE_LABELS[range]}</CardDescription>
            </CardHeader>
            <CardContent>
              {complaintsCurr.length === 0 ? (
                <p className="text-sm text-muted-foreground">No complaints in this range.</p>
              ) : (
                <BarList rows={complaintFunnel} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Trends</h2>
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

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Average rating trend</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">Loading chart…</div>}>
                <RatingTrendChart data={trend} />
              </Suspense>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Response rate trend</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">Loading chart…</div>}>
                <PercentTrendChart data={responseRateTrend} />
              </Suspense>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Rating by service</CardTitle>
            <CardDescription>{RANGE_LABELS[range]} · which treatments generate the happiest (or unhappiest) feedback</CardDescription>
          </CardHeader>
          <CardContent>
            {ratingByService.length === 0 ? (
              <p className="text-sm text-muted-foreground">No feedback in this range yet.</p>
            ) : (
              <BarList rows={ratingByService.map((r) => ({ ...r, value: r.value }))} unit=" / 5" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Per-clinician breakdown</CardTitle>
            <CardDescription>{RANGE_LABELS[range]}</CardDescription>
          </CardHeader>
          <CardContent>
            {clinicianStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">No feedback in this range yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">Clinician</th>
                      <th className="pb-2 font-medium">Avg. rating</th>
                      <th className="pb-2 font-medium">Responses</th>
                      <th className="pb-2 font-medium">Complaints</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clinicianStats.map((c) => (
                      <tr key={c.name} className="border-b border-border last:border-0">
                        <td className="py-2.5 font-medium">{c.name}</td>
                        <td className="py-2.5">{c.avgRating}</td>
                        <td className="py-2.5">{c.responses}</td>
                        <td className="py-2.5">{c.complaints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
  path: '/analytics',
  component: AnalyticsPage,
})
