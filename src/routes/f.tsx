import { Outlet, createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import { PatientLayout } from '@/components/patient-layout'

function PatientLayoutRoute() {
  return (
    <PatientLayout>
      <Outlet />
    </PatientLayout>
  )
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/f',
  component: PatientLayoutRoute,
})
