import { Outlet, createRoute } from '@tanstack/react-router'
import { Route as FRoute } from './'

function TokenLayout() {
  return <Outlet />
}

export const Route = createRoute({
  getParentRoute: () => FRoute,
  path: '$token',
  component: TokenLayout,
})
