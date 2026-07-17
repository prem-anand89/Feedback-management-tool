import { cn } from '@/lib/utils'

/**
 * CareConnect logo mark — calendar (appointments) + speech bubble (feedback)
 * + check (resolution), the three pillars of the product. Drawn with theme
 * tokens (plum = primary, green = secondary, halos = background) so it reads
 * correctly in both light and dark modes.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('h-8 w-8', className)} role="img" aria-label="CareConnect">
      {/* calendar */}
      <path d="M25 7 v6 M40 7 v6" fill="none" className="stroke-secondary" strokeWidth={2.6} strokeLinecap="round" />
      <rect x="17" y="12" width="31" height="30" rx="5.5" className="fill-card stroke-secondary" strokeWidth={2.6} />
      <path d="M17.6 20.5 h29.8" className="stroke-secondary" strokeWidth={2.4} />
      <g className="fill-secondary" opacity={0.85}>
        <rect x="22" y="25" width="4.4" height="4.4" rx="1.2" />
        <rect x="29.8" y="25" width="4.4" height="4.4" rx="1.2" />
        <rect x="37.6" y="25" width="4.4" height="4.4" rx="1.2" />
        <rect x="22" y="32" width="4.4" height="4.4" rx="1.2" />
        <rect x="29.8" y="32" width="4.4" height="4.4" rx="1.2" />
      </g>
      {/* check circle */}
      <circle cx="45" cy="44" r="11" className="fill-background" />
      <circle cx="45" cy="44" r="9" className="fill-secondary" />
      <path d="M41 44 l2.8 2.8 L50 41" fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      {/* speech bubble */}
      <path
        d="M11 32 H25 A6.5 6.5 0 0 1 31.5 38.5 V44 A6.5 6.5 0 0 1 25 50.5 H16 L10 56 V50.5 A6.5 6.5 0 0 1 4.5 44 V38.5 A6.5 6.5 0 0 1 11 32 Z"
        className="fill-background"
      />
      <path
        d="M12 33 H24.6 A5.5 5.5 0 0 1 30.1 38.5 V44 A5.5 5.5 0 0 1 24.6 49.5 H16 L11 54 V49.5 A5.5 5.5 0 0 1 5.5 44 V38.5 A5.5 5.5 0 0 1 11 33 Z"
        className="fill-primary"
      />
      <g className="fill-background">
        <circle cx="12.4" cy="41.2" r="1.6" />
        <circle cx="17.8" cy="41.2" r="1.6" />
        <circle cx="23.2" cy="41.2" r="1.6" />
      </g>
    </svg>
  )
}

/** Mark + "CareConnect" wordmark (Care in plum, Connect in sage green). */
export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LogoMark className={markClassName} />
      <span className="text-lg font-extrabold tracking-tight leading-none">
        <span className="text-primary">Care</span>
        <span className="text-secondary">Connect</span>
      </span>
    </div>
  )
}
