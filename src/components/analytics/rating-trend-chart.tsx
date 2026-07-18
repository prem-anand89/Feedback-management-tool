import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Isolated into its own module (rather than living inline in analytics.tsx)
// so recharts can be code-split via React.lazy — it's the single heaviest
// dependency in the app, and analytics.tsx was previously the only place
// pulling it in, but since everything eagerly imports everything else here,
// it was still ending up in the one shared bundle every route (including
// the public, unauthenticated booking/feedback pages) had to download.
interface RatingTrendChartProps {
  data: { label: string; rating: number | null }[]
}

export default function RatingTrendChart({ data }: RatingTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 12,
            color: 'hsl(var(--popover-foreground))',
            fontSize: 12,
          }}
        />
        <Line type="monotone" dataKey="rating" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}
