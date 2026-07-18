import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface WeekAppointment {
  _id: string
  scheduledAt: number
  patientId: string
  therapistId: string
}

interface WeekViewProps {
  weekStart: Date
  appointments: WeekAppointment[]
  patientName: (id: string) => string
  therapistName: (id: string) => string
  onPrevWeek: () => void
  onNextWeek: () => void
  onToday: () => void
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

export function WeekView({ weekStart, appointments, patientName, therapistName, onPrevWeek, onNextWeek, onToday }: WeekViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
  const today = new Date()

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">
          {weekStart.toLocaleDateString([], { month: 'short', day: 'numeric' })} – {days[6].toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </CardTitle>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={onPrevWeek} aria-label="Previous week">
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={onToday}>
            Today
          </Button>
          <Button size="sm" variant="outline" onClick={onNextWeek} aria-label="Next week">
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {days.map((day) => {
            const dayAppts = appointments
              .filter((a) => isSameDay(new Date(a.scheduledAt), day))
              .sort((a, b) => a.scheduledAt - b.scheduledAt)
            const isToday = isSameDay(day, today)
            return (
              <div
                key={day.toDateString()}
                className={`min-h-32 rounded-xl border p-2 ${isToday ? 'border-primary bg-primary/5' : 'border-border'}`}
              >
                <p className="mb-2 text-center">
                  <span className="block text-xs font-semibold">{day.toLocaleDateString([], { weekday: 'short' })}</span>
                  <span className="block text-[10px] font-normal text-muted-foreground">
                    {day.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </p>
                <div className="space-y-1.5">
                  {dayAppts.length === 0 ? (
                    <p className="py-4 text-center text-[10px] text-muted-foreground">No appointments</p>
                  ) : (
                    dayAppts.map((appt) => (
                      <div key={appt._id} className="rounded-lg bg-chipBlue px-2 py-1.5 text-[10px] leading-tight text-chipBlue-foreground">
                        <p className="font-semibold">
                          {new Date(appt.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </p>
                        <p className="truncate">{patientName(appt.patientId)}</p>
                        <p className="truncate opacity-80">{therapistName(appt.therapistId)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
