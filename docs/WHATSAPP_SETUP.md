# WhatsApp Setup (Meta Cloud API)

CareConnect sends patient feedback requests, appointment reminders (to both
patients and, if a phone is on file, therapists — see Settings > Clinic
Profile > Team), and low-rating follow-ups over WhatsApp using Meta's own
WhatsApp Business Cloud API. Nothing needs to change in the app's code —
this is entirely account setup + two Convex environment variables.

Until this is set up, WhatsApp sends are skipped (logged, not sent) and:
- Patient feedback-request/reminder messages simply never go out — you'd
  need to use the "Copy Link" / "WhatsApp" buttons on a patient's timeline
  in the Patients page to share a feedback link manually instead.
- Therapist reminders fall back to email automatically (see
  `convex/whatsapp.ts`'s `sendTherapistReminder`) — no action needed there,
  it degrades gracefully.

## 1. Create a Meta Business account (if you don't have one)

Go to [business.facebook.com](https://business.facebook.com) and create a
Business Account for your clinic, if you don't already have one.

## 2. Create a Meta App with WhatsApp

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps)
   and create a new app, type "Business."
2. Add the **WhatsApp** product to the app.
3. This gives you a **test phone number** for free, immediately — good
   enough to test the integration before your real number is verified.

## 3. Get your credentials

In the app's WhatsApp > API Setup page, you'll find:

- **Phone number ID** — a numeric ID (not the phone number itself) for the
  WhatsApp number you'll send from.
- **Temporary access token** — valid for 24 hours, fine for testing. For
  production, generate a **permanent token** instead: System Users (in
  Meta Business Settings) > create a system user > assign it to your app
  with `whatsapp_business_messaging` permission > generate a token with no
  expiration.

## 4. Set the Convex environment variables

Both of these are **Convex-side** (backend) variables — not Vite/frontend
ones, so they don't get a `VITE_` prefix. Set them with the Convex CLI:

```
npx convex env set WHATSAPP_ACCESS_TOKEN <your permanent access token>
npx convex env set WHATSAPP_PHONE_NUMBER_ID <your phone number ID>
```

or via the Convex Dashboard's Environment Variables page (same place
`CLERK_JWT_ISSUER_DOMAIN` and `VISIT_COMPLETE_SECRET` were set earlier).

No redeploy step is needed beyond the normal one — the next scheduled
WhatsApp send (or the next `npx convex deploy`, which already runs
automatically in CI on every push to `main`) will pick these up.

## 5. Verify a real business phone number (for production use)

The free test number only works for a short allow-list of phone numbers you
manually add in the Meta dashboard. To message real patients, add and
verify your clinic's actual WhatsApp Business number: WhatsApp > API Setup
> "Add phone number," then follow Meta's verification flow (SMS/call code).
**This step has the longest lead time** — start it early, independent of
the code/env-var setup above, since Meta's business verification can take
anywhere from a day to a couple of weeks.

## 6. Also worth setting while you're here

Two related Convex env vars control the links CareConnect puts inside the
messages it sends — if these aren't set, they silently default to
`http://localhost:5173`, which will be a dead link for every real patient
or staff member:

```
npx convex env set FEEDBACK_FORM_URL https://your-username.github.io/Feedback-management-tool
npx convex env set DASHBOARD_URL https://your-username.github.io/Feedback-management-tool
```

(Replace with your actual deployed URL.)

## Testing

Once the env vars are set, trigger a real send by completing an appointment
or visit for a test patient with a real phone number — that fires the
feedback-request pipeline. Check `automationLogs` in the Convex dashboard
(or the Convex function logs) for `send_feedback_request` /
`send_appointment_reminder` entries to confirm `result: "success"` rather
than `"failure"`.
