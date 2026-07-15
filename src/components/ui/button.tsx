import * as React from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = {
  default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow active:scale-[0.98]',
  destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98]',
  outline: 'border border-input bg-card hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
  secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/90 active:scale-[0.98]',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
}

const sizeVariants = {
  default: 'h-11 px-5 py-2',
  sm: 'h-9 rounded-lg px-3.5 text-sm',
  lg: 'h-12 rounded-xl px-8 text-base',
  icon: 'h-11 w-11',
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants
  size?: keyof typeof sizeVariants
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <button
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        buttonVariants[variant],
        sizeVariants[size],
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Button.displayName = 'Button'

export { Button }
