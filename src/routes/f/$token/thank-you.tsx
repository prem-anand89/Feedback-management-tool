import { createRoute } from '@tanstack/react-router'
import { Route as FRoute } from '../'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, ExternalLink } from 'lucide-react'

// Convex's HTTP Actions live on the .convex.site domain for a given
// deployment, derived from the .convex.cloud client URL — there's no
// separate env var for it on the client.
const CONVEX_SITE_URL = (import.meta.env.VITE_CONVEX_URL || '').replace(/\.convex\.cloud\/?$/, '.convex.site')

function ThankYouPage() {
  // No router-level search validation is configured for this route (see
  // routeTree.gen.ts / __root.tsx), so read the param directly rather than
  // fight TanStack Router's generic search typing for a single optional field.
  const reviewRequestId = new URLSearchParams(window.location.search).get('reviewRequestId')
  const reviewLink = reviewRequestId ? `${CONVEX_SITE_URL}/api/trackReviewClick?reviewRequestId=${reviewRequestId}` : null

  return (
    <Card>
      <CardHeader className="space-y-2 text-center">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <CheckCircle className="h-9 w-9 text-primary" />
          </div>
        </div>
        <CardTitle>Thank You!</CardTitle>
        <CardDescription>Your feedback has been submitted successfully</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {reviewLink && (
          <>
            <div className="space-y-2 rounded-2xl bg-accent p-4">
              <p className="text-sm font-semibold text-accent-foreground">Support Our Clinic</p>
              <p className="text-sm text-muted-foreground">If you'd like to help future patients find us, we'd greatly appreciate a Google Review.</p>
            </div>

            <Button asChild className="w-full" size="lg">
              <a href={reviewLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                <span>Leave Google Review</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">or</p>
            </div>
          </>
        )}

        <Button variant="outline" className="w-full" size="lg" asChild>
          <a href={import.meta.env.BASE_URL}>Close</a>
        </Button>

        <p className="text-center text-xs text-muted-foreground">A member of our team may reach out to follow up on your feedback.</p>
      </CardContent>
    </Card>
  )
}

export const Route = createRoute({
  getParentRoute: () => FRoute,
  path: '/thank-you',
  component: ThankYouPage,
})
