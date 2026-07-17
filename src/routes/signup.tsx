import { SignUp } from '@clerk/clerk-react'
import { Route as RootRoute } from './__root'
import { createRoute } from '@tanstack/react-router'
import { Logo } from '@/components/logo'

function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Logo markClassName="h-10 w-10" className="[&_span]:text-2xl" />
          <p className="text-xs text-muted-foreground">Patient feedback &amp; booking</p>
        </div>

        <SignUp
          afterSignUpUrl="/setup"
          signInUrl="/login"
        />
      </div>
    </div>
  )
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/signup',
  component: SignUpPage,
})
