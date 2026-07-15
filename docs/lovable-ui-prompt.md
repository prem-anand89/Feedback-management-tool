# Lovable Prompt — UI Scaffolding (Step 1)

Paste the block below into Lovable to generate the frontend. After Lovable finishes, sync the project to GitHub (Lovable's GitHub integration button) and share the repo URL so it can be pulled into this codebase for the Convex + Clerk takeover (step 2 of `ARCHITECTURE.md`).

---

## Prompt to paste into Lovable

```
Build a React + TypeScript + Tailwind web app called "TheraNet Feedback" — a patient
feedback and reputation management tool for therapy/wellness clinics.

IMPORTANT CONSTRAINTS:
- Frontend only. Do NOT connect Supabase or any backend/database integration.
- Use local mock data (hardcoded arrays/objects) and React state for everything —
  no real persistence, no real auth provider. I will wire up a real backend myself
  afterward.
- Mobile-first, clean, professional healthcare-appropriate design. Light theme,
  calm color palette (blues/greens), rounded cards, good whitespace.

The app has two audiences with completely separate flows:

=== PART A: STAFF APP (requires login) ===

1. Login screen — simple email/password form (mock only, no real auth logic needed,
   just navigate to dashboard on submit). Include a role selector for demo purposes:
   Clinic Owner / Therapist / Receptionist.

2. Dashboard (home after login) — a grid of stat cards showing:
   - Today's Feedback (count)
   - Pending Feedback (count)
   - Average Rating (e.g. 4.6 / 5 with stars)
   - Google Reviews (count this month)
   - Complaints (open count)
   - Resolved Issues (count)
   Plus a "Recent Activity" feed list below (mock entries like "Sarah left 5-star
   feedback", "New complaint from John D.") and a simple "Monthly Trend" line/bar
   chart (mock data) showing feedback volume over the last 6 months.

3. Feedback Inbox — a table/list of all feedback responses with columns: Patient
   name, Therapist, Date, Rating (stars), Comments (truncated), Status. Support
   filtering by rating and date range. Clicking a row opens a detail panel/modal
   showing full feedback: patient, therapist, clinic, visit date, rating, all
   question answers, comments, and an optional uploaded image thumbnail.

4. Complaints — a Kanban-style or list view of complaints with status columns:
   Pending, In Progress, Resolved, Closed. Each complaint card shows patient name,
   priority, assigned staff member, and a snippet of the triggering feedback.
   Clicking a complaint opens a detail view where staff can: see full complaint
   context, add notes (timeline of notes), change status, and see actions like
   "Call Patient" / "Send Message" / "Mark Resolved" as buttons.

5. Patient Timeline / Profile — pick a patient and see a vertical timeline:
   Visit → Feedback → Complaint (if any) → Resolution → Review Submitted, each
   as a timeline node with date and short description.

6. Analytics — a reports page with charts/numbers for: Feedback Requests sent,
   Response rate %, Average Rating trend, Google Review Clicks, Reviews Submitted,
   Complaint count, Average Resolution Time. Include a toggle for Daily / Weekly /
   Monthly view (mock data changes are fine).

7. Settings — a form page (Clinic Owner role only — hide/disable for other roles)
   to configure: Feedback Delay (dropdown: Immediate / 2 Hours / 6 Hours / 24
   Hours), Reminder Delay (default 48 Hours), Google Review URL (text input),
   Message Templates (textarea for the check-in message and reminder message,
   with a live preview), Clinic Name, Logo upload, Contact Details.

Include a persistent left sidebar nav (Dashboard, Feedback Inbox, Complaints,
Patients, Analytics, Settings) and a top bar showing the logged-in user's name
and role, with a logout button.

=== PART B: PATIENT APP (public, no login, mobile-first, opened via a link) ===

This is a separate, very simple, mobile-optimized flow — assume it's opened from
a link on a patient's phone. No sidebar, no navigation chrome, just a clean
centered card layout.

1. Check-in screen — "Hi [Name], thank you for visiting [Clinic Name] today. How
   are you feeling after today's session?" with 4 large tappable buttons: Much
   Better / Better / No Change / Worse (with simple emoji or icons).

2. Feedback form screen (shown after tapping a check-in button) — a 5-star rating
   selector at the top, followed by these questions each with their own rating or
   text input: "How satisfied were you?", "Did we explain your condition
   clearly?", "Was the treatment helpful?", "Would you recommend us?", and a
   free-text "Additional comments" box. Include an optional "Upload a photo"
   button. A prominent "Submit Feedback" button at the bottom.

3. Thank-you / Google Review screen (shown after submitting, only reachable if
   rating was high in the mock flow) — "Thank you for your feedback! If you'd
   like to support our clinic, we'd appreciate a Google Review." with a large
   "Leave Google Review" button.

4. If the mock rating was low (2 stars or below), instead show a "We're sorry to
   hear that — a member of our team will reach out to you shortly" confirmation
   screen instead of the Google Review screen.

Use React Router (or Lovable's default routing) with distinct routes for the
staff app (e.g. /dashboard, /feedback, /complaints, /patients, /analytics,
/settings, /login) and the patient app (e.g. /f/:token as the entry point for
the check-in flow). Keep components modular and well-named so they're easy to
hook up to real data sources later — one component per screen/section, clear
props for data that will eventually come from an API.
```

---

## After Lovable finishes

1. Use Lovable's **GitHub sync** to push the generated project to a repo (or export it).
2. Share the repo URL / branch here.
3. Next steps (per `ARCHITECTURE.md` §6, steps 2-3): pull the code into this repo, strip any accidental Supabase scaffolding, and wire up Convex (schema + functions) and Clerk (auth) in place of the mock data and mock login.
