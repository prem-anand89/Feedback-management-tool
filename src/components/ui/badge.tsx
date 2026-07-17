import * as React from 'react'
import { cn } from '@/lib/utils'

// Status/priority pill colors, lifted from complaints.tsx's old
// columnAccent/priorityClass maps — both feedback.tsx and complaints.tsx
// used to hand-roll this markup inline.
export type BadgeVariant =
  | 'status-pending'
  | 'status-in-progress'
  | 'status-resolved'
  | 'status-closed'
  | 'priority-high'
  | 'priority-medium'
  | 'priority-low'

const variantClasses: Record<BadgeVariant, string> = {
  'status-pending': 'bg-chipAmber text-chipAmber-foreground',
  'status-in-progress': 'bg-chipBlue text-chipBlue-foreground',
  'status-resolved': 'bg-chipGreen text-chipGreen-foreground',
  'status-closed': 'bg-muted text-muted-foreground',
  'priority-high': 'bg-chipPink text-chipPink-foreground',
  'priority-medium': 'bg-chipAmber text-chipAmber-foreground',
  'priority-low': 'bg-chipGreen text-chipGreen-foreground',
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: BadgeVariant
}

function Badge({ variant, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize', variantClasses[variant], className)}
      {...props}
    >
      {children}
    </span>
  )
}

export { Badge }
