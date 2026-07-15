import { useNavigate, createRoute } from '@tanstack/react-router'
import { Route as FRoute } from '../'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

function PatientCheckInPage() {
  const navigate = useNavigate()
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null)

  const options = [
    { emoji: '😄', label: 'Much Better', value: 'much-better' },
    { emoji: '🙂', label: 'Better', value: 'better' },
    { emoji: '😐', label: 'No Change', value: 'no-change' },
    { emoji: '😞', label: 'Worse', value: 'worse' },
  ]

  const handleNext = () => {
    if (selectedEmoji) {
      navigate({ to: '/f/$token/form', params: { token: 'mock-token' }, search: { feeling: selectedEmoji } })
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle>Thank You for Your Visit!</CardTitle>
        <CardDescription>We'd like to know how you're feeling after today's session</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="text-center text-sm text-muted-foreground">Hi Sarah, thank you for visiting Beyond Mechanics today.</p>
          <p className="text-center text-sm text-muted-foreground">How are you feeling after today's session?</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedEmoji(option.value)}
              className={`flex flex-col items-center gap-3 rounded-lg border-2 p-4 transition-all ${
                selectedEmoji === option.value ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/50'
              }`}
            >
              <span className="text-4xl">{option.emoji}</span>
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>

        <Button onClick={handleNext} disabled={!selectedEmoji} className="w-full" size="lg">
          Next
        </Button>

        <p className="text-center text-xs text-muted-foreground">This takes about 2 minutes to complete</p>
      </CardContent>
    </Card>
  )
}

export const Route = createRoute({
  getParentRoute: () => FRoute,
  path: '/',
  component: PatientCheckInPage,
})
