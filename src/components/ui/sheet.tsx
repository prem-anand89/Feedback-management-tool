import * as React from 'react'
import * as SheetPrimitive from '@radix-ui/react-sheet'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const Sheet = SheetPrimitive.Root
const SheetTrigger = SheetPrimitive.Trigger
const SheetClose = SheetPrimitive.Close

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & {
    side?: 'top' | 'right' | 'bottom' | 'left'
  }
>(({ side = 'right', className, children, ...props }, ref) => {
  const sideClasses = {
    top: 'inset-x-0 top-0 border-b',
    bottom: 'inset-x-0 bottom-0 border-t',
    left: 'inset-y-0 left-0 border-r w-3/4',
    right: 'inset-y-0 right-0 border-l w-3/4',
  }

  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />
      <SheetPrimitive.Content
        ref={ref}
        className={cn(
          'fixed z-50 gap-4 bg-background p-4 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
          sideClasses[side],
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
})
SheetContent.displayName = SheetPrimitive.Content.displayName

export { Sheet, SheetTrigger, SheetClose, SheetContent }
