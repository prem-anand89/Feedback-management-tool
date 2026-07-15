import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { StaffLayout } from '@/components/staff-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Star } from 'lucide-react'
import { mockFeedback } from '@/lib/mock-data'

function FeedbackPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? mockFeedback.find((f) => f.id === selectedId) : null

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
              <CardDescription>{mockFeedback.length} responses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockFeedback.map((feedback) => (
                  <button
                    key={feedback.id}
                    onClick={() => setSelectedId(feedback.id)}
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${
                      selectedId === feedback.id ? 'border-primary bg-primary/5' : 'border-input hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{feedback.patientName}</p>
                        <p className="text-sm text-muted-foreground">{feedback.therapistName}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < feedback.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{feedback.date}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {selected && (
            <Card>
              <CardHeader>
                <CardTitle>Feedback Details</CardTitle>
                <CardDescription>{selected.patientName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Patient</p>
                  <p className="font-medium">{selected.patientName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Therapist</p>
                  <p className="font-medium">{selected.therapistName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date</p>
                  <p className="font-medium">{selected.date}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overall Rating</p>
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < selected.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Questions</p>
                  <div className="space-y-1 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">How satisfied were you?</p>
                      <p className="font-medium">{selected.satisfaction}/5</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Did we explain your condition clearly?</p>
                      <p className="font-medium">{selected.explanationClarity}/5</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Was the treatment helpful?</p>
                      <p className="font-medium">{selected.treatmentHelpfulness}/5</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Would you recommend us?</p>
                      <p className="font-medium">{selected.recommendation}/5</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Comments</p>
                  <p className="text-sm mt-1">{selected.comments}</p>
                </div>
                <Button className="w-full" variant="outline">
                  View Full Response
                </Button>
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
