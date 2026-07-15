import { useNavigate, createRoute, useParams } from '@tanstack/react-router'
import { Route as FRoute } from '../'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { Star, AlertCircle } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

function PatientFeedbackFormPage() {
  const navigate = useNavigate()
  const { token } = useParams({ from: '/f/$token/form' })

  const feedbackRequest = useQuery(api.feedback.getFeedbackRequestByToken, { token })
  const submitFeedback = useMutation(api.feedback.submitFeedback)

  const [ratings, setRatings] = useState({
    overall: 0,
    satisfaction: 0,
    clarity: 0,
    helpfulness: 0,
    recommendation: 0,
  })
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedbackRequest) {
      setError('Feedback request not found')
      return
    }

    if (!ratings.overall) {
      setError('Please provide an overall rating')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await submitFeedback({
        feedbackRequestId: feedbackRequest._id,
        rating: ratings.overall,
        satisfaction: ratings.satisfaction,
        explanationClarity: ratings.clarity,
        treatmentHelpfulness: ratings.helpfulness,
        recommendation: ratings.recommendation,
        comments,
      })

      const thankYouPath = ratings.overall >= 4 ? 'thank-you' : 'sorry'
      navigate({ to: `/f/$token/${thankYouPath}`, params: { token } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback')
      setSubmitting(false)
    }
  }

  if (!feedbackRequest) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-secondary" />
          <p className="text-sm text-muted-foreground">Loading feedback form...</p>
        </CardContent>
      </Card>
    )
  }

  const renderStarRating = (value: number, onChange: (v: number) => void) => (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          type="button"
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
          className="transition-transform hover:scale-125"
        >
          <Star className={`h-9 w-9 ${star <= value ? 'fill-secondary text-secondary' : 'text-muted'}`} />
        </button>
      ))}
    </div>
  )

  return (
    <Card>
      <CardHeader className="space-y-2 text-center">
        <CardTitle>How was your visit?</CardTitle>
        <CardDescription>Your feedback takes less than a minute and helps us care for you better.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-7">
          <div className="space-y-3 rounded-2xl bg-muted/50 p-4 text-center">
            <label className="text-base font-semibold">Overall, how was your visit?</label>
            <div className="flex justify-center">
              {renderStarRating(ratings.overall, (v) => setRatings({ ...ratings, overall: v }))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">How satisfied were you overall?</label>
            {renderStarRating(ratings.satisfaction, (v) => setRatings({ ...ratings, satisfaction: v }))}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Was everything explained clearly?</label>
            {renderStarRating(ratings.clarity, (v) => setRatings({ ...ratings, clarity: v }))}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Did the service meet your needs?</label>
            {renderStarRating(ratings.helpfulness, (v) => setRatings({ ...ratings, helpfulness: v }))}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Would you recommend us to others?</label>
            {renderStarRating(ratings.recommendation, (v) => setRatings({ ...ratings, recommendation: v }))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Anything you'd like to share? (optional)</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              placeholder="Tell us what went well or how we can improve..."
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export const Route = createRoute({
  getParentRoute: () => FRoute,
  path: '/form',
  component: PatientFeedbackFormPage,
})
