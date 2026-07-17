# Architecture & Build Plan — Patient Feedback & Reputation Management Module

This document translates the PRD (`Patient Feedback Management Tool.rtf`) into a concrete technical plan: recommended stack, free-tier cost estimate, and how this module relates to appointment booking, clinic websites, EMR systems, and the eventual TheraNet merge.

## Goals for this phase

Build a **standalone, multi-clinic-ready app** — usable by any clinic type, not TheraNet-specific — designed so it can be embedded into or merged with TheraNet later.

- **Target scale**: small multi-clinic beta (~5-20 clinics)
- **Patient notification channel**: WhatsApp only for MVP
- **Booking**: separate app/module, loosely integrated (not this codebase)
- **Website/EMR**: embeddable widget now; EMR integration designed as a pluggable future phase
- **Backend/hosting**: Convex + Clerk (Supabase/Vercel project quotas were already in use elsewhere)

---

## 1. Recommended Architecture

**Stack**: React (Vite) + TypeScript + Tailwind — backed by **Convex** (database, server functions, real-time, scheduled jobs/cron) and **Clerk** (auth). Hosted on GitHub Pages via GitHub Actions.

**Why this combination**:
- Convex + Clerk avoid needing more Supabase/Vercel project slots, on genuinely free tiers (Convex: 1M function calls/mo free, no project-count cap; Clerk: free up to 10k users).
- Convex's TypeScript-native functions + built-in scheduled jobs replace a separate cron/worker service — the automation engine (delays, reminders) is just Convex scheduled functions.
- **Trade-off to accept**: Convex is not SQL/Postgres — its data model is TypeScript-defined documents/tables. Merging into TheraNet later will need an export/transform step if TheraNet's backend expects relational Postgres (common for clinic/EMR-style software), rather than a simple `pg_dump`/restore. This is a deliberate trade for build speed now.

**Multi-tenancy**: single deployment serving all clinics, `clinicId` on every table (not one deployment per clinic). Clinic staff authenticate via Clerk (email/password or magic link) with a `role` (owner/therapist/receptionist) stored in Clerk metadata or a Convex `staffUsers` table. Patients never log in — they interact via unique tokenized links sent over WhatsApp, matching the PRD's "no spam / minimal friction" design principle.

**Components**:
1. **Staff dashboard** (Clerk-gated) — feedback list, analytics, complaint management, settings (PRD §4, §7, §10)
2. **Patient feedback flow** (public, token-based URL, mobile-first) — check-in buttons, rating form, Google Review CTA (PRD §5, FR-002–FR-005)
3. **Embeddable website widget** — a small `<script>`/iframe snippet clinics paste into their own site for a "Leave Feedback" / review CTA — no EMR access needed
4. **Visit-completion trigger** — a Convex mutation exposed as an HTTP action (e.g. `POST /visits/complete`), callable manually from the dashboard for MVP. Single extension point: a future booking module or EMR adapter calls the same endpoint later with zero rearchitecture
5. **Automation engine** — Convex scheduled functions (`ctx.scheduler`) firing due follow-ups and reminders based on configurable delays (FR-001, FR-006); handles Automations 1–5 from PRD §10
6. **WhatsApp integration** — WhatsApp Business API (Meta Cloud API, or Twilio's WhatsApp wrapper), invoked from a Convex action, for check-ins, reminders, and complaint alerts (FR-002, FR-006, FR-007)
7. **Staff notifications** (PRD §11) — in-app (via Convex real-time subscriptions) + free email (e.g. Resend) rather than WhatsApp, keeping WhatsApp spend limited to patient-facing messages only

**Database**: Convex tables mirroring PRD §9 (`patients`, `visits`, `feedbackRequests`, `feedbackResponses`, `complaints`, `reviewRequests`, `automationLogs`, `clinicSettings`) plus `clinics` and `staffUsers` for multi-tenancy, with `clinicId` references throughout.

---

## 2. Free-Tier Feasibility & Cost Estimate

Estimated for the target beta scale (~10 clinics, ~50 visits/clinic/week ≈ 2,000 feedback requests/month):

| Component | Free tier | Cost beyond free tier |
|---|---|---|
| Convex (DB/functions/cron/real-time) | 1M function calls/mo, 0.5GB storage — comfortably covers this scale | ~$25/mo once outgrown |
| Clerk (auth) | Free up to 10,000 monthly active users | Paid tiers start ~$25/mo beyond that |
| GitHub Pages (hosting) | Free for public repos, covers typical beta traffic | N/A |
| WhatsApp messaging | Meta Cloud API: ~1,000 free service conversations/month | ~$0.005–$0.10/conversation beyond that — for 2,000/mo, expect **~$15–50/mo** |
| Email (staff alerts) | Resend/SendGrid free tier (100-3,000/mo) | Effectively $0 at this scale |
| Domain | Optional — free subdomain during beta | ~$10-15/year for a custom domain |

**Bottom line**: infrastructure can realistically stay free during the beta. **WhatsApp messaging is the one unavoidable, volume-scaling cost** regardless of provider — budget roughly **$15-50/month** for a 10-clinic beta, dominated by message volume rather than clinic count.

**Lead-time flag**: WhatsApp Business API setup requires Meta Business verification, which can take days to weeks — start this early since it's the main lead-time risk, not the coding.

---

## 3. Appointment Booking: Build Separately

Keep booking as a **separate app/module**, not merged into this codebase. Both apps share the same `clinics`/`patients`/`visits` data (same or connected Convex deployment); the booking app triggers `visits.completed`, and this app's trigger function (`POST /visits/complete`) is what it calls when a visit finishes. This keeps the two domains decoupled and mirrors the PRD's "modular architecture" principle (§3) — the shape TheraNet will most likely want when absorbing both modules later.

---

## 4. Website & EMR Integration

- **Website**: ship a lightweight embeddable widget (JS snippet or iframe) any clinic can drop into their site for feedback/review CTAs — no EMR or booking system required. Doubles as the mechanism for embedding views into TheraNet later.
- **EMR**: not required for MVP. The visit-completion trigger is a generic Convex HTTP action (`POST /visits/complete`) from day one specifically so EMR integrations can be added later as per-vendor adapters (FHIR/HL7 or vendor API) calling the same endpoint — no rearchitecture when that phase starts.

---

## 5. TheraNet Merge-Back: What to Expect

Choosing Convex trades away a trivial `pg_dump`/restore path. When the merge happens later:
- If TheraNet is Postgres-based (likely for clinic/EMR-style software): export Convex tables and transform into relational tables matching TheraNet's schema — a one-time ETL script, not a rearchitecture of this app.
- If TheraNet is itself JS/TS-based and flexible on backend choice: this module could plug in largely as-is, with Convex functions called from or alongside TheraNet's existing backend.
- Keeping the visit-completion trigger, feedback schema, and automation logic cleanly scoped (per PRD §9 field names) now minimizes mapping work later either way.

---

## 6. Phased Build Plan (adapted from PRD §18)

1. **Foundation** — React/Vite/TypeScript/Tailwind app scaffold, Convex schema (multi-tenant, `clinicId` on all tables), Clerk auth, deploy skeleton (GitHub Pages via GitHub Actions)
2. **Feedback core** — visit-completion Convex function, patient-facing token-based feedback form, internal storage (FR-003, FR-004)
3. **Automation engine** — Convex scheduled functions, configurable delays, 48h reminder (FR-001, FR-006)
4. **WhatsApp integration** — start Meta Business verification immediately (longest lead time); send check-ins/reminders (FR-002)
5. **Complaint handling** — detection rules, therapist follow-up actions, staff email notifications (FR-007–FR-009, §11)
6. **Dashboard + analytics** — cards, patient timeline, reports (§7, §8, §10, §13)
7. **Google Review integration** — configurable URL, click tracking (FR-005)
8. **Embeddable website widget**
9. **Pilot rollout** with real clinics + testing
10. **Future**: EMR adapters, TheraNet embed/merge (per §5), connect to the separate booking module
