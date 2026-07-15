import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { StaffLayout } from '@/components/staff-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, MessageSquare, AlertCircle, CheckCircle, Star, ThumbsUp } from 'lucide-react'
import { mockFeedback, recentActivity, monthlyTrendData } from '@/lib/mock-data'

function DashboardPage() {
  const todayFeedback = 2
  const pendingFeedback = mockFeedback.filter((f) => f.status === 'submitted').length
  const avgRating = (mockFeedback.reduce((sum, f) => sum + f.rating, 0) / mockFeedback.length).toFixed(1)
  const googleReviews = 12
  const complaints = 1
  const resolved = 5

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
              <div className="text-2xl font-bold">{complaints}</div>
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
