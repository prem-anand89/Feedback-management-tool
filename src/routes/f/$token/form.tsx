import { useNavigate, createRoute, useParams } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Route as FRoute } from '../'
import { useState } from 'react'
import { Star, AlertCircle } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

// Rating of 4-5 submits immediately (fast path for happy patients). Anything
// lower expands in place to ask what went wrong before submitting, so we can
// capture actionable detail instead of a bare low score.
const HAPPY_THRESHOLD = 4

function PatientFeedbackFormPage() {
  const navigate = useNavigate()
  const { token } = useParams({ from: '/f/$token/form' })

  const feedbackRequest = useQuery(api.feedback.getFeedbackRequestByToken, { token })
  const clinicName = useQuery(api.feedback.getClinicNameForToken, { token })
  const submitFeedback = useMutation(api.feedback.submitFeedback)

  const [rating, setRating] = useState(0)
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (value: number, comment: string) => {
    if (!feedbackRequest) {
      setError('This feedback link could not be found.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await submitFeedback({
        feedbackRequestId: feedbackRequest._id,
        rating: value,
        comments: comment,
      })
      navigate({ to: `/f/$token/${value >= HAPPY_THRESHOLD ? 'thank-you' : 'sorry'}`, params: { token } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback')
      setSubmitting(false)
    }
  }

  const handleStarClick = (value: number) => {
    if (submitting) return
    setRating(value)
    if (value >= HAPPY_THRESHOLD) {
      submit(value, '')
    }
  }

  const handleLowRatingSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submit(rating, comments)
  }

  if (feedbackRequest === undefined) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </CardContent>
      </Card>
    )
  }

  if (feedbackRequest === null) {
    return (
      <Card>
        <CardContent className="space-y-2 pt-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">This feedback link is invalid or has expired.</p>
        </CardContent>
      </Card>
    )
  }

  const showLowRatingDetail = rating > 0 && rating < HAPPY_THRESHOLD

  return (
    <Card>
      <CardHeader className="space-y-1.5 text-center">
        <CardTitle>{clinicName ? `How was your visit to ${clinicName}?` : 'How was your visit?'}</CardTitle>
        <CardDescription>Takes under a minute — your feedback helps us improve.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <div className="mb-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <div className="flex justify-center gap-2 py-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleStarClick(star)}
              disabled={submitting}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
              className="transition-transform hover:scale-110 disabled:opacity-60"
            >
              <Star className={`h-11 w-11 ${star <= rating ? 'fill-primary text-primary' : 'text-muted'}`} />
            </button>
          ))}
        </div>

        {submitting && !showLowRatingDetail && (
          <p className="mt-2 text-center text-sm text-muted-foreground">Submitting…</p>
        )}

        {showLowRatingDetail && (
          <form onSubmit={handleLowRatingSubmit} className="mt-6 space-y-4 border-t border-border pt-6">
            <div className="space-y-1">
              <p className="text-sm font-semibold">We're sorry to hear that.</p>
              <label htmlFor="improve" className="text-sm text-muted-foreground">
                What could we improve?
              </label>
            </div>
            <textarea
              id="improve"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Share details (optional)"
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Feedback'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

export const Route = createRoute({
  getParentRoute: () => FRoute,
  path: '/form',
  component: PatientFeedbackFormPage,
})
