import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { StaffLayout } from '@/components/staff-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { MessageSquare, AlertCircle, CheckCircle, Star, Percent, TrendingUp } from 'lucide-react'
import { useQuery, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'

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
  const respondedFeedback = feedbackRequests.filter((f) => f.status === 'responded').length
  const responseRate = feedbackRequests.length > 0
    ? Math.round((respondedFeedback / feedbackRequests.length) * 100)
    : 0

  const avgRating = feedbackResponses.length > 0
    ? (feedbackResponses.reduce((sum, f) => sum + f.rating, 0) / feedbackResponses.length).toFixed(1)
    : '0'

  const highRatings = feedbackResponses.filter((f) => f.rating >= 4).length
  const lowRatings = feedbackResponses.filter((f) => f.rating <= 2).length

  const complaintCount = complaints.filter((c) => c.status === 'pending' || c.status === 'in-progress').length
  const resolved = complaints.filter((c) => c.status === 'resolved').length
  const totalComplaints = complaints.length

  const recentActivity = [
    ...feedbackResponses.map((f) => ({
      id: f._id,
      message: `Feedback received: ${f.rating}★ rating`,
      timestamp: new Date(f.submittedAt).getTime(),
      type: 'feedback' as const,
    })),
    ...complaints.map((c) => ({
      id: c._id,
      message: `Complaint: ${c.priority} priority`,
      timestamp: c.createdAt,
      type: 'complaint' as const,
    })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5)
    .map((a) => ({
      ...a,
      timestamp: new Date(a.timestamp).toLocaleString(),
    }))

  const monthlyData = [
    {
      month: 'Last 7 days',
      requests: feedbackRequests.filter((f) => Date.now() - f.sentAt < 7 * 24 * 60 * 60 * 1000).length,
      responses: feedbackResponses.filter((f) => Date.now() - f.submittedAt < 7 * 24 * 60 * 60 * 1000).length,
    },
  ]

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
          <p className="text-muted-foreground">Welcome back! Here's your clinic's feedback overview.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Feedback</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayFeedback}</div>
              <p className="text-xs text-muted-foreground">feedback requests sent</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
              <Percent className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{responseRate}%</div>
              <p className="text-xs text-muted-foreground">{respondedFeedback} of {feedbackRequests.length} responses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgRating}</div>
              <p className="text-xs text-muted-foreground">out of 5 stars ({feedbackResponses.length} total)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Google Reviews</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reviewStats?.clickRate ?? 0}%</div>
              <p className="text-xs text-muted-foreground">{reviewStats?.clicked ?? 0} of {reviewStats?.total ?? 0} clicked</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Complaints</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{complaintCount}</div>
              <p className="text-xs text-muted-foreground">{resolved} resolved of {totalComplaints} total</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest feedback and interactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 border-b pb-3 last:border-0">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <div className="flex-1 text-sm">
                      <p className="font-medium">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Trend</CardTitle>
              <CardDescription>Feedback requests and responses</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="requests" fill="#0ea5e9" />
                    <Bar dataKey="responses" fill="#06b6d4" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No data yet
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
