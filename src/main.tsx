import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { ClerkProvider } from '@clerk/clerk-react'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { routeTree } from './routeTree.gen'
import './index.css'

const router = createRouter({ routeTree })
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <ConvexProvider client={convex}>
        <RouterProvider router={router} />
      </ConvexProvider>
    </ClerkProvider>
  </React.StrictMode>,
)
