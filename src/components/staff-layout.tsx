import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useUser, useSignOut } from '@clerk/clerk-react'
import {
  LayoutDashboard,
  Inbox,
  AlertTriangle,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Stethoscope,
  Menu,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/feedback', label: 'Feedback Inbox', icon: Inbox },
  { to: '/complaints', label: 'Complaints', icon: AlertTriangle },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
] as const

export function StaffLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { user, isLoaded } = useUser()
  const { signOut } = useSignOut()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (isLoaded && !user) {
      navigate({ to: '/login' })
    }
  }, [isLoaded, user, navigate])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    await signOut()
    navigate({ to: '/login' })
  }

  if (!isLoaded || !user) return null

  const userEmail = user.emailAddresses[0]?.emailAddress || ''
  const userName = user.fullName || user.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User'

  const NavList = () => (
    <nav className="flex flex-col gap-1 px-3">
      {nav.map((item) => {
        const active = pathname.startsWith(item.to)
        const Icon = item.icon
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )

  const Brand = () => (
    <div className="flex items-center gap-2 px-5 py-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Stethoscope className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold">TheraNet</div>
        <div className="text-xs text-muted-foreground">Feedback</div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto py-2">
          <NavList />
        </div>
        <div className="border-t p-3 text-xs text-muted-foreground">v0.2 · Clerk + Convex</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur">
          <div className="flex items-center gap-2 md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <Brand />
                <NavList />
              </SheetContent>
            </Sheet>
            <span className="text-sm font-semibold">TheraNet</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-right leading-tight">
              <div className="text-sm font-medium">{userName}</div>
              <div className="text-xs text-muted-foreground">{userEmail}</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {userName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
