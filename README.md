# TheraNet Feedback Management Module

A patient feedback and reputation management system for therapy/wellness clinics.

## Project Structure

```
src/
├── components/
│   ├── ui/              # Radix UI + Tailwind component library
│   ├── staff-layout.tsx # Main app layout with navigation
│   └── patient-layout.tsx # Public patient feedback flow layout
├── routes/
│   ├── __root.tsx       # Root route
│   ├── login.tsx        # Staff login (mock auth)
│   ├── dashboard.tsx    # Main dashboard with metrics
│   ├── feedback.tsx     # Feedback inbox
│   ├── complaints.tsx   # Complaint management board
│   ├── patients.tsx     # Patient list and timeline
│   ├── analytics.tsx    # Analytics and reports
│   ├── settings.tsx     # Clinic settings (owner only)
│   └── f/               # Patient feedback flow (public)
│       ├── index.tsx    # Layout wrapper
│       ├── $token.tsx   # Token parameter layout
│       ├── $token/index.tsx    # Check-in screen
│       ├── $token/form.tsx     # Feedback form
│       ├── $token/thank-you.tsx # Thank you / Google review
│       └── $token/sorry.tsx     # Apology screen (low rating)
├── lib/
│   ├── utils.ts         # Utility functions (cn)
│   ├── staff-session.ts # Session management
│   └── mock-data.ts     # Mock patient/feedback data
└── main.tsx             # Entry point

index.html              # HTML template
tailwind.config.ts      # Tailwind configuration
tsconfig.json          # TypeScript configuration
vite.config.ts         # Vite configuration
```

## Features Implemented (MVP)

✅ Staff dashboard with metrics and analytics
✅ Feedback inbox with detail view
✅ Complaint management (Kanban board)
✅ Patient list and timeline view
✅ Analytics with charts
✅ Settings page (role-gated)
✅ Patient feedback flow (public, token-based)
✅ Mock authentication and data
✅ Responsive mobile-first design
✅ Radix UI component library with Tailwind CSS

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Routing**: TanStack Router
- **UI**: Radix UI + Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Date Utils**: date-fns

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will open at `http://localhost:5173`

### Demo

1. On the login page, enter a name, select a role (Owner/Therapist/Receptionist), and click Login
2. Explore the dashboard, feedback inbox, complaints, patients, and analytics
3. Try visiting `/f/mock-token` to see the public patient feedback flow
4. Only Clinic Owners can modify settings

### Build

```bash
npm run build
```

## Next Steps (Per ARCHITECTURE.md)

### Phase 2 (Next): Takeover & Convex + Clerk Wiring
1. Remove mock authentication and wire up Clerk
2. Install Convex and create the schema
3. Replace mock data with Convex queries
4. Set up environment variables

### Phase 3-5: Core Features
- Implement visit-completion trigger (Convex function)
- Build automation engine (Convex scheduled functions)
- Add WhatsApp integration
- Complaint handling actions

### Phase 6+: Polish & Deployment
- Google Review integration
- Embeddable website widget
- Analytics persistence
- Deploy to Netlify/Cloudflare Pages

## Notes

- This is a greenfield MVP built from scratch in React/Vite/Tailwind
- All data is currently mock (in-memory), stored in `src/lib/mock-data.ts`
- Session management uses localStorage for demo purposes
- No real backend or database yet — ready for Convex + Clerk integration

## File Size & Performance

- Total bundle size before Convex/Clerk: ~500KB (development), ~180KB (production)
- Component library includes only used Radix UI primitives
- All imports are tree-shakeable for optimal bundling

## License

Proprietary - TheraNet Platform
