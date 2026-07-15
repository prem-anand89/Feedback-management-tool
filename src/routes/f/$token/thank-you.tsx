import { createRoute } from '@tanstack/react-router'
import { Route as FRoute } from '../'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, ExternalLink } from 'lucide-react'

function ThankYouPage() {
  return (
    <Card>
      <CardHeader className="space-y-2 text-center">
        <div className="flex justify-center">
          <CheckCircle className="h-12 w-12 text-green-500" />
        </div>
        <CardTitle>Thank You!</CardTitle>
        <CardDescription>Your feedback has been submitted successfully</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 rounded-lg bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-900">Support Our Clinic</p>
          <p className="text-sm text-blue-800">If you'd like to support our clinic and help future patients find us, we'd greatly appreciate a Google Review.</p>
        </div>

        <Button asChild className="w-full" size="lg">
          <a href="https://google.com/maps" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
            <span>Leave Google Review</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">or</p>
        </div>

        <Button variant="outline" className="w-full" size="lg" asChild>
          <a href="/">Close</a>
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
