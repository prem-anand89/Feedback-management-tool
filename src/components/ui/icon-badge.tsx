import * as React from 'react'
import { cn } from '@/lib/utils'

// A single shared size scale for icon-in-a-colored-box badges, standardized
// on a consistent ~42-45% icon-fill ratio across every tier — replacing 6+
// ad hoc container/icon size pairs that had drifted as high as 56% fill
// (visibly oversized icons) with no shared component to prevent it.
export type IconBadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const sizeClasses: Record<IconBadgeSize, { container: string; icon: string }> = {
  xs: { container: 'h-8 w-8 rounded-lg', icon: 'h-3.5 w-3.5' },
  sm: { container: 'h-9 w-9 rounded-xl', icon: 'h-4 w-4' },
  md: { container: 'h-12 w-12 rounded-2xl', icon: 'h-5 w-5' },
  lg: { container: 'h-14 w-14 rounded-2xl', icon: 'h-6 w-6' },
  xl: { container: 'h-16 w-16 rounded-2xl', icon: 'h-7 w-7' },
}

interface IconBadgeProps {
  icon: React.ComponentType<{ className?: string }>
  size?: IconBadgeSize
  colorClassName?: string
  className?: string
}

function IconBadge({ icon: Icon, size = 'md', colorClassName = 'bg-muted text-muted-foreground', className }: IconBadgeProps) {
  const { container, icon } = sizeClasses[size]
  return (
    <div className={cn('flex shrink-0 items-center justify-center', container, colorClassName, className)}>
      <Icon className={icon} />
    </div>
  )
}

export { IconBadge }
