import { internalAction } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const DASHBOARD_URL = process.env.VITE_DASHBOARD_URL || 'http://localhost:5173'
// `onboarding@resend.dev` is Resend's built-in sandbox sender that works
// without domain verification — use it as a safe default. Production
// deployments should set RESEND_FROM_EMAIL to a verified custom domain.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'CareConnect <onboarding@resend.dev>'

async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log('[Email] Resend API key not configured, skipping email send')
    return false
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[Email] Send failed:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('[Email] Error sending email:', err)
    return false
  }
}

export const notifyComplaintCreated = internalAction({
  args: {
    complaintId: v.string(),
    clinicId: v.id('clinics'),
    patientId: v.id('patients'),
    priority: v.string(),
    staffEmail: v.string(),
    staffName: v.string(),
    clinicName: v.string(),
  },
  handler: async (ctx, { complaintId, clinicName, staffEmail, staffName, priority }) => {
    const subject = `New Complaint: ${priority.toUpperCase()} Priority`
    const html = `
      <h2>New Complaint Alert</h2>
      <p>Hi ${staffName},</p>
      <p>A new complaint has been created in <strong>${clinicName}</strong>.</p>
      <p><strong>Priority:</strong> ${priority}</p>
      <p>
        <a href="${DASHBOARD_URL}/complaints" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          View Complaint
        </a>
      </p>
      <p>Please review and take appropriate action.</p>
    `

    const success = await sendEmail(staffEmail, subject, html)
    return { success, complaintId }
  },
})

// Resolves clinic/staff itself, mirroring notifyComplaintCreated's caller
// (createComplaintFromFeedback) — so this can be scheduled directly from the
// submitFeedback mutation, which has no query/mutation access of its own to
// look staff up beforehand.
export const notifyFeedbackResponse = internalAction({
  args: {
    clinicId: v.id('clinics'),
    rating: v.number(),
  },
  handler: async (ctx, { clinicId, rating }) => {
    const clinic = await ctx.runQuery(internal.clinics.getClinic, { clinicId })
    const staffUsers = await ctx.runQuery(internal.clinics.listStaffInternal, { clinicId })
    const recipient = staffUsers.find((s) => s.role === 'owner') || staffUsers[0]
    if (!clinic || !recipient) return { success: false }

    const staffEmail = recipient.email
    const staffName = recipient.name
    const clinicName = clinic.name

    const ratingText = rating >= 4 ? '⭐ Positive' : rating >= 3 ? '👌 Neutral' : '⚠️ Low'
    const subject = `New Feedback Received: ${ratingText}`
    const html = `
      <h2>New Feedback Received</h2>
      <p>Hi ${staffName},</p>
      <p>You've received new feedback for <strong>${clinicName}</strong>.</p>
      <p><strong>Rating:</strong> ${rating}/5 ${ratingText}</p>
      <p>
        <a href="${DASHBOARD_URL}/feedback" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          View Feedback
        </a>
      </p>
    `

    const success = await sendEmail(staffEmail, subject, html)
    return { success }
  },
})

export const sendWelcomeEmail = internalAction({
  args: {
    staffEmail: v.string(),
    staffName: v.string(),
    clinicName: v.string(),
  },
  handler: async (ctx, { staffEmail, staffName, clinicName }) => {
    const subject = `Welcome to ${clinicName}!`
    const html = `
      <h2>Welcome to CareConnect!</h2>
      <p>Hi ${staffName},</p>
      <p>Your clinic <strong>${clinicName}</strong> is now set up and ready to collect patient feedback.</p>
      <h3>Next Steps:</h3>
      <ul>
        <li>Add your clinic's Google Review URL in Settings</li>
        <li>Create patient profiles</li>
        <li>Start scheduling visits</li>
        <li>Monitor feedback and complaints</li>
      </ul>
      <p>
        <a href="${DASHBOARD_URL}/dashboard" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Go to Dashboard
        </a>
      </p>
      <p>Questions? Check our documentation or contact support.</p>
    `

    const success = await sendEmail(staffEmail, subject, html)
    return { success }
  },
})
