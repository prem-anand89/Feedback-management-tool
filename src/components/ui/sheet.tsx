import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SheetContextType {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SheetContext = React.createContext<SheetContextType | undefined>(undefined)

function Sheet({ children, open = false, onOpenChange }: { children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [isOpen, setIsOpen] = React.useState(open)

  React.useEffect(() => {
    setIsOpen(open)
  }, [open])

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  return (
    <SheetContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange }}>
      {children}
    </SheetContext.Provider>
  )
}

function useSheet() {
  const context = React.useContext(SheetContext)
  if (!context) throw new Error('Sheet components must be used within Sheet')
  return context
}

const SheetTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>(
  ({ asChild, ...props }, ref) => {
    const { onOpenChange } = useSheet()
    const Component = asChild ? React.Fragment : 'button'

    if (asChild && React.isValidElement(props.children)) {
      return React.cloneElement(props.children as React.ReactElement, {
        onClick: () => onOpenChange(true),
      })
    }

    return <Component ref={ref} onClick={() => onOpenChange(true)} {...props} />
  }
)
SheetTrigger.displayName = 'SheetTrigger'

const SheetClose = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  (props, ref) => {
    const { onOpenChange } = useSheet()
    return <button ref={ref} onClick={() => onOpenChange(false)} {...props} />
  }
)
SheetClose.displayName = 'SheetClose'

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'top' | 'right' | 'bottom' | 'left'
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side = 'left', className, children, ...props }, ref) => {
    const { open, onOpenChange } = useSheet()

    if (!open) return null

    const sideClasses = {
      top: 'inset-x-0 top-0 border-b',
      bottom: 'inset-x-0 bottom-0 border-t',
      left: 'inset-y-0 left-0 border-r w-64',
      right: 'inset-y-0 right-0 border-l w-64',
    }

    return (
      <>
        <div className="fixed inset-0 z-40 bg-background/80" onClick={() => onOpenChange(false)} />
        <div
          ref={ref}
          className={cn('fixed z-50 bg-background shadow-lg', sideClasses[side], className)}
          {...props}
        >
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
          {children}
        </div>
      </>
    )
  }
)
SheetContent.displayName = 'SheetContent'

export { Sheet, SheetTrigger, SheetClose, SheetContent }
