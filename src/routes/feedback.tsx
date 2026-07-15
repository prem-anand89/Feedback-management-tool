import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { StaffLayout } from '@/components/staff-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Star } from 'lucide-react'
import { useQuery, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'

function FeedbackPage() {
  const { isAuthenticated } = useConvexAuth()
  const responses = useQuery(api.feedback.listFeedbackResponses, isAuthenticated ? {} : 'skip') ?? []
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = selectedId ? responses.find((f) => f._id === selectedId) : null

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feedback Inbox</h1>
          <p className="text-muted-foreground">View and manage patient feedback responses</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>All Feedback</CardTitle>
              <CardDescription>{responses.length} responses</CardDescription>
            </CardHeader>
            <CardContent>
              {responses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No feedback responses yet</p>
              ) : (
                <div className="space-y-2">
                  {responses.map((feedback) => (
                    <button
                      key={feedback._id}
                      onClick={() => setSelectedId(feedback._id)}
                      className={`w-full rounded-lg border p-4 text-left transition-colors ${
                        selectedId === feedback._id ? 'border-primary bg-primary/5' : 'border-input hover:bg-accent'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">Patient {feedback.patientId.slice(0, 8)}</p>
                          <p className="text-sm text-muted-foreground">{new Date(feedback.submittedAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < feedback.rating ? 'fill-secondary text-secondary' : 'text-muted'}`} />
                          ))}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {selected && (
            <Card>
              <CardHeader>
                <CardTitle>Feedback Details</CardTitle>
                <CardDescription>{new Date(selected.submittedAt).toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date Submitted</p>
                  <p className="font-medium">{new Date(selected.submittedAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overall Rating</p>
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < selected.rating ? 'fill-secondary text-secondary' : 'text-muted'}`} />
                    ))}
                  </div>
                </div>
                {selected.feedback && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Comments</p>
                    <p className="text-sm mt-1">{selected.feedback}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </StaffLayout>
  )
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/feedback',
  component: FeedbackPage,
})
