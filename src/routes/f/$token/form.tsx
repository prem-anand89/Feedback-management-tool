import { useNavigate, createRoute, useSearch, useParams } from '@tanstack/react-router'
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
  const search = useSearch({ from: '/f/$token/form' })
  const feeling = (search?.feeling as string) || 'no-value'

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
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-yellow-600" />
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
          className="transition-transform hover:scale-125"
        >
          <Star className={`h-6 w-6 ${star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
        </button>
      ))}
    </div>
  )

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle>Your Feedback</CardTitle>
        <CardDescription>Help us improve your experience</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium">Overall Rating</label>
            {renderStarRating(ratings.overall, (v) => setRatings({ ...ratings, overall: v }))}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">How satisfied were you?</label>
            {renderStarRating(ratings.satisfaction, (v) => setRatings({ ...ratings, satisfaction: v }))}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Did we explain your condition clearly?</label>
            {renderStarRating(ratings.clarity, (v) => setRatings({ ...ratings, clarity: v }))}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Was the treatment helpful?</label>
            {renderStarRating(ratings.helpfulness, (v) => setRatings({ ...ratings, helpfulness: v }))}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Would you recommend us?</label>
            {renderStarRating(ratings.recommendation, (v) => setRatings({ ...ratings, recommendation: v }))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Additional Comments (optional)</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              placeholder="Share any additional thoughts or suggestions..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
