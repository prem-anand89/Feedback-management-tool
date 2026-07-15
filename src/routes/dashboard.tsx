import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { StaffLayout } from '@/components/staff-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, MessageSquare, AlertCircle, CheckCircle, Star, ThumbsUp } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { monthlyTrendData } from '@/lib/mock-data'

function DashboardPage() {
  // TODO: Get clinicId from user's staff record via Clerk metadata
  const clinicId = 'clinic_placeholder' as any

  const feedbackRequests = useQuery(api.feedback.listFeedbackRequests, { clinicId }) ?? []
  const feedbackResponses = useQuery(api.feedback.listFeedbackResponses, { clinicId }) ?? []
  const complaints = useQuery(api.complaints.listComplaints, { clinicId }) ?? []

  const todayFeedback = feedbackRequests.filter((f) => {
    const today = new Date()
    const sentDate = new Date(f.sentAt)
    return sentDate.toDateString() === today.toDateString()
  }).length

  const pendingFeedback = feedbackRequests.filter((f) => f.status === 'pending').length
  const avgRating = feedbackResponses.length > 0
    ? (feedbackResponses.reduce((sum, f) => sum + f.rating, 0) / feedbackResponses.length).toFixed(1)
    : '0'
  const googleReviews = 12
  const complaintCount = complaints.filter((c) => c.status === 'pending' || c.status === 'in_progress').length
  const resolved = complaints.filter((c) => c.status === 'resolved').length

  const recentActivity = [
    ...feedbackResponses.slice(-3).map((f) => ({
      id: f._id,
      message: `New feedback received: ${f.rating}★ rating`,
      timestamp: new Date(f.submittedAt).toLocaleString(),
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5)

  return (
    <StaffLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your clinic's feedback overview.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Feedback</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayFeedback}</div>
              <p className="text-xs text-muted-foreground">feedback requests</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Feedback</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingFeedback}</div>
              <p className="text-xs text-muted-foreground">awaiting response</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgRating}</div>
              <p className="text-xs text-muted-foreground">out of 5 stars</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Google Reviews</CardTitle>
              <ThumbsUp className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{googleReviews}</div>
              <p className="text-xs text-muted-foreground">this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Complaints</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{complaintCount}</div>
              <p className="text-xs text-muted-foreground">open issues</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resolved}</div>
              <p className="text-xs text-muted-foreground">this month</p>
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
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="requests" stroke="#0ea5e9" />
                  <Line type="monotone" dataKey="responses" stroke="#06b6d4" />
                </LineChart>
              </ResponsiveContainer>
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
