import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useUser, useClerk } from '@clerk/clerk-react'
import {
  LayoutDashboard,
  Inbox,
  Users,
  CalendarClock,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  Sun,
  Moon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Logo } from '@/components/logo'
import { cn } from '@/lib/utils'
import { getEffectiveTheme, setTheme, type Theme } from '@/lib/theme'

// Grouped so the two halves of the app read clearly in the sidebar:
// front-desk scheduling vs. the feedback/reputation loop. Dashboard (the
// cross-domain "today" view) and Settings sit ungrouped, top and bottom.
const navSections = [
  { label: null, items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    label: 'Scheduling',
    items: [
      { to: '/appointments', label: 'Appointments', icon: CalendarClock },
      { to: '/patients', label: 'Patients', icon: Users },
    ],
  },
  {
    label: 'Reputation',
    items: [
      { to: '/feedback', label: 'Feedback', icon: Inbox },
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  { label: null, items: [{ to: '/settings', label: 'Settings', icon: SettingsIcon }] },
] as const

export function StaffLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, setThemeState] = useState<Theme>('light')

  useEffect(() => {
    setThemeState(getEffectiveTheme())
  }, [])

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setThemeState(next)
  }

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
      {navSections.map((section, i) => (
        <div key={section.label ?? `section-${i}`} className={cn('flex flex-col gap-1', i > 0 && 'mt-4')}>
          {section.label && (
            <span className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              {section.label}
            </span>
          )}
          {section.items.map((item) => {
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
        </div>
      ))}
    </nav>
  )

  const Brand = () => (
    <div className="px-5 py-5">
      <Logo markClassName="h-9 w-9" />
    </div>
  )

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto py-2">
          <NavList />
        </div>
        <div className="border-t p-3 text-xs text-muted-foreground">CareConnect · v0.3</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur">
          <div className="flex items-center gap-2 md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <Logo markClassName="h-7 w-7" className="[&_span]:text-base" />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
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

      {/* Rendered as a sibling of <header>, not a descendant — the header's
          backdrop-blur establishes a CSS containing block for fixed-position
          descendants in Chromium, which was clipping this sheet's fixed
          inset-0 backdrop/panel to the header's own 56px-tall box instead of
          the viewport. */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <Brand />
          <NavList />
        </SheetContent>
      </Sheet>
    </div>
  )
}
