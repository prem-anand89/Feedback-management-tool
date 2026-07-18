# WhatsApp Setup (Meta Cloud API)

CareConnect sends patient feedback requests, appointment reminders (to both
patients and, if a phone is on file, therapists — see Settings > Clinic
Profile > Team), and low-rating follow-ups over WhatsApp using Meta's own
WhatsApp Business Cloud API.

**Each clinic brings its own Meta Business account and enters their own
credentials in Settings > Booking & Reminders > WhatsApp Business API.**
Nothing needs to change in the app's code, and no CLI/Convex Dashboard
access is needed — this is entirely account setup + two fields any clinic
owner can fill in themselves. Messages send from the clinic's own WhatsApp
number, and Meta bills the clinic directly for their own usage — not the app
operator.

Until a clinic sets this up, WhatsApp sends are skipped (logged, not sent)
for that clinic and:
- Patient feedback-request/reminder messages simply never go out — staff
  can use the "Copy Link" / "WhatsApp" buttons on a patient's timeline in
  the Patients page to share a feedback link manually instead.
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

## 4. Enter your credentials in Settings

In the app, as the clinic owner: **Settings > Booking & Reminders >
WhatsApp Business API**, paste in the Phone Number ID and Access Token from
step 3, then Save. The card shows "Connected" once both fields are filled
in. The access token is only ever shown to the clinic owner — other staff
never see it, even though they can see everything else in Settings.

No code, redeploy, or Convex CLI access needed — this takes effect
immediately on save, and each clinic manages their own independently of any
other clinic on the same deployment.

## 5. Verify a real business phone number (for production use)

The free test number only works for a short allow-list of phone numbers you
manually add in the Meta dashboard. To message real patients, add and
verify your clinic's actual WhatsApp Business number: WhatsApp > API Setup
> "Add phone number," then follow Meta's verification flow (SMS/call code).
**This step has the longest lead time** — start it early, independent of
the Settings entry above, since Meta's business verification can take
anywhere from a day to a couple of weeks.

## 6. App-operator setup (once, not per-clinic)

Two Convex env vars control the links CareConnect puts inside the messages
it sends — these are set once by whoever operates the deployment, not by
each clinic, since they're about the app's own URLs rather than a specific
clinic's WhatsApp account:

```
npx convex env set FEEDBACK_FORM_URL https://your-deployed-app-url
npx convex env set DASHBOARD_URL https://your-deployed-app-url
```

`WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` can still be set the
same way as a **deployment-wide fallback** — used only for a clinic that
hasn't entered their own credentials in Settings yet. This exists for
backward compatibility with a single-clinic deployment set up before
per-clinic credentials existed; it is not the intended path once more than
one clinic shares a deployment, since every clinic without their own
credentials would send through — and be billed to — this shared account.

## Testing

Once a clinic's credentials are saved, trigger a real send by completing an
appointment or visit for a test patient with a real phone number — that
fires the feedback-request pipeline. Check `automationLogs` in the Convex
dashboard (or the Convex function logs) for `send_feedback_request` /
`send_appointment_reminder` entries to confirm `result: "success"` rather
than `"failure"`.
