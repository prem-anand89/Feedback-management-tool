import { createRoute } from '@tanstack/react-router'
import { Route as FRoute } from '../'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

function SorryPage() {
  return (
    <Card>
      <CardHeader className="space-y-2 text-center">
        <div className="flex justify-center">
          <AlertCircle className="h-12 w-12 text-yellow-500" />
        </div>
        <CardTitle>We're Sorry to Hear That</CardTitle>
        <CardDescription>Your feedback has been received</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 rounded-lg bg-yellow-50 p-4">
          <p className="text-sm text-yellow-900">
            Thank you for sharing your honest feedback. We take your concerns seriously and a member of our team will reach out to you within 24 hours to discuss how we can improve your experience.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">What happens next:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1">✓</span>
              <span>Our team will review your feedback</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1">✓</span>
              <span>We'll reach out to discuss your concerns</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1">✓</span>
              <span>We'll work to resolve the issue</span>
            </li>
          </ul>
        </div>

        <Button variant="outline" className="w-full" size="lg" asChild>
          <a href="/">Close</a>
        </Button>

        <p className="text-center text-xs text-muted-foreground">We appreciate your feedback and the opportunity to improve.</p>
      </CardContent>
    </Card>
  )
}

export const Route = createRoute({
  getParentRoute: () => FRoute,
  path: '/sorry',
  component: SorryPage,
})
