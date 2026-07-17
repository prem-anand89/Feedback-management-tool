# EMR / External System Integration

CareConnect exposes a single webhook that any EMR, booking system, or other
external tool can call to trigger the feedback pipeline once a patient visit
is finished. This endpoint already exists and works today — this document
just describes how to use it.

## How it fits together

A `visits` record must already exist in CareConnect before this webhook is
called — the webhook only **marks an existing visit complete**, it does not
create one from scratch. In practice this means one of two things is true
before you call it:

- Staff logged the visit in the CareConnect dashboard (e.g. via "Log Visit"
  on a patient's page), which creates a `visits` row with no `completedAt`
  yet, or
- The visit came from a CareConnect appointment that hasn't been marked
  complete in-app yet.

Once you have that visit's ID, calling this webhook marks it complete and
fires the same automated feedback pipeline (delayed WhatsApp feedback
request, follow-up reminder) that an in-app "Complete" action would.

If your EMR is the system of record and you want it to be the sole trigger
for visit completion, coordinate with whoever manages the CareConnect side
so a `visits` row is created (staff logging it manually, for now) before
your system calls this endpoint. A dedicated "create + complete a visit in
one call" endpoint would be a reasonable future addition if this becomes a
bottleneck, but is out of scope today.

## Endpoint

```
POST {CONVEX_SITE_URL}/api/visitComplete
```

`CONVEX_SITE_URL` is this deployment's Convex HTTP Actions domain — the
`.convex.site` counterpart to the `.convex.cloud` client URL (e.g. if your
`VITE_CONVEX_URL` is `https://descriptive-quail-833.eu-west-1.convex.cloud`,
the HTTP Actions URL is `https://descriptive-quail-833.eu-west-1.convex.site`).

## Authentication

Send the shared secret in a header on every request:

```
x-webhook-secret: <your VISIT_COMPLETE_SECRET value>
```

Requests with a missing or incorrect secret get `401 Unauthorized`.

### Obtaining / setting the secret

The secret is a Convex-side environment variable (not a frontend/Vite one).
Set or rotate it with the Convex CLI:

```
npx convex env set VISIT_COMPLETE_SECRET <a-long-random-value>
```

or via the Convex Dashboard's Environment Variables page. Share the value
out-of-band with whoever configures the calling EMR/booking system — it's
a bearer credential, not something to commit to source control (see
`.env.example` for the local-dev placeholder).

## Request

```json
{
  "visitId": "<the visits._id of an existing, not-yet-completed visit>"
}
```

`visitId` is the only required field.

## Response

**Success — `200 OK`:**

```json
{ "success": true, "visitId": "<the visit id>" }
```

**Missing/invalid secret — `401 Unauthorized`:**

```json
{ "error": "Unauthorized" }
```

**Missing `visitId` — `400 Bad Request`:**

```json
{ "error": "visitId required" }
```

**Other failures (e.g. `visitId` doesn't exist) — `500 Internal Server Error`:**

```json
{ "error": "<error message>" }
```

## Example

```bash
curl -X POST "https://descriptive-quail-833.eu-west-1.convex.site/api/visitComplete" \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $VISIT_COMPLETE_SECRET" \
  -d '{"visitId": "j57abc123..."}'
```

## Idempotency

Calling this endpoint twice for the same `visitId` is safe — completing an
already-completed visit is a no-op and will not fire a second feedback
request.
