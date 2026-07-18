import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Same lazy-split rationale as rating-trend-chart.tsx — kept as a separate
// component (rather than generalizing that one) since the Y domain and
// tooltip formatting differ (0-100%, not 0-5 stars).
interface PercentTrendChartProps {
  data: { label: string; value: number | null }[]
}

export default function PercentTrendChart({ data }: PercentTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v}%`} />
        <Tooltip
          formatter={(value: number) => [`${value}%`, 'Response rate']}
          contentStyle={{
            background: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 12,
            color: 'hsl(var(--popover-foreground))',
            fontSize: 12,
          }}
        />
        <Line type="monotone" dataKey="value" stroke="hsl(var(--secondary))" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(var(--secondary))', strokeWidth: 0 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}
