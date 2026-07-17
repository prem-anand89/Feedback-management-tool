import { SignIn } from '@clerk/clerk-react'
import { Route as RootRoute } from './__root'
import { createRoute } from '@tanstack/react-router'
import { Logo } from '@/components/logo'

function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Logo markClassName="h-10 w-10" className="[&_span]:text-2xl" />
          <p className="text-xs text-muted-foreground">Patient feedback &amp; booking</p>
        </div>

        <SignIn
          afterSignInUrl={`${import.meta.env.BASE_URL}dashboard`}
          signUpUrl={`${import.meta.env.BASE_URL}signup`}
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
