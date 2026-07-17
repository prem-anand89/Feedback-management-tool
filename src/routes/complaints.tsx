import { createRoute, redirect } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'

// Feedback and Complaints were merged into a single unified list at
// /feedback. This route is kept as a redirect (not deleted) since
// convex/emails.ts's older complaint-notification emails and any staff
// bookmarks may still point here.
export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/complaints',
  beforeLoad: () => {
    throw redirect({ to: '/feedback' })
  },
})
