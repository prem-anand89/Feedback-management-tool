import { ReactNode } from 'react'
import { Stethoscope } from 'lucide-react'

export function PatientLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-accent/60 to-background">
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-center gap-2 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">TheraNet</div>
            <div className="text-xs text-muted-foreground">Feedback</div>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="border-t bg-card/50 py-3 text-center text-xs text-muted-foreground">
        <p>Your feedback helps us improve. Thank you for your time.</p>
      </footer>
    </div>
  )
}
