import { SignIn } from '@clerk/clerk-react'
import { Route as RootRoute } from './__root'
import { createRoute } from '@tanstack/react-router'
import { Stethoscope } from 'lucide-react'

function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">TheraNet</h1>
              <p className="text-xs text-muted-foreground">Feedback Management</p>
            </div>
          </div>
        </div>

        <SignIn
          afterSignInUrl="/dashboard"
          signUpUrl="/signup"
        />
      </div>
    </div>
  )
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/login',
  component: LoginPage,
})
