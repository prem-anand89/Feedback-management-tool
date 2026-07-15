import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { StaffLayout } from '@/components/staff-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { monthlyTrendData, mockFeedback } from '@/lib/mock-data'

function AnalyticsPage() {
  const ratingDistribution = [
    { rating: '5 stars', count: mockFeedback.filter((f) => f.rating === 5).length, color: '#10b981' },
    { rating: '4 stars', count: mockFeedback.filter((f) => f.rating === 4).length, color: '#3b82f6' },
    { rating: '3 stars', count: mockFeedback.filter((f) => f.rating === 3).length, color: '#f59e0b' },
    { rating: '2 stars', count: mockFeedback.filter((f) => f.rating === 2).length, color: '#ef4444' },
    { rating: '1 star', count: mockFeedback.filter((f) => f.rating === 1).length, color: '#6f42c1' },
  ]

  const responseRateData = monthlyTrendData.map((item) => ({
    ...item,
    responseRate: Math.round((item.responses / item.requests) * 100),
  }))

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Detailed insights and performance metrics</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="ratings">Rating Distribution</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Response Rate Trend</CardTitle>
                  <CardDescription>Percentage of patients responding to feedback</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={responseRateData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Line type="monotone" dataKey="responseRate" stroke="#0ea5e9" name="Response Rate %" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Average Rating Trend</CardTitle>
                  <CardDescription>Patient satisfaction over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 5]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="avgRating" stroke="#06b6d4" name="Avg Rating" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ratings">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Rating Distribution</CardTitle>
                  <CardDescription>Breakdown of all feedback ratings</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={ratingDistribution} cx="50%" cy="50%" labelLine={false} label={({ rating }) => rating} outerRadius={80} fill="#8884d8" dataKey="count">
                        {ratingDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ratings Summary</CardTitle>
                  <CardDescription>Detailed breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {ratingDistribution.map((item) => (
                      <div key={item.rating} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded" style={{ backgroundColor: item.color }} />
                          <span className="text-sm font-medium">{item.rating}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{item.count} responses</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Metrics</CardTitle>
                <CardDescription>Requests, responses, and ratings</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="requests" fill="#0ea5e9" name="Requests" />
                    <Bar dataKey="responses" fill="#06b6d4" name="Responses" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </StaffLayout>
  )
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/analytics',
  component: AnalyticsPage,
})
