import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// twMerge so a className passed to a UI primitive actually overrides the
// primitive's base classes (e.g. a `p-4` on CardContent replacing its base
// `p-6 pt-0`) instead of both shipping and letting Tailwind's source order
// decide — which silently zeroed out overridden padding.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
