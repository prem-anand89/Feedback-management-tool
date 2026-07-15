import { action } from './_generated/server'
import { v } from 'convex/values'

export const sendFeedbackRequest = action({
  args: {
    feedbackRequestId: v.id('feedbackRequests'),
    clinicId: v.id('clinics'),
    patientId: v.id('patients'),
    token: v.string(),
  },
  handler: async (ctx, { feedbackRequestId, clinicId, patientId, token }) => {
    // TODO: Implement WhatsApp Business API integration
    // 1. Get patient phone number from DB
    // 2. Send check-in message with feedback link
    // 3. Log the attempt in automationLogs

    console.log(`[WhatsApp] Would send feedback request to patient ${patientId} with token ${token}`)

    // For now, just return success for MVP
    return { success: true, feedbackRequestId }
  },
})

export const sendReminder = action({
  args: {
    feedbackRequestId: v.id('feedbackRequests'),
    clinicId: v.id('clinics'),
    patientId: v.id('patients'),
  },
  handler: async (ctx, { feedbackRequestId, clinicId, patientId }) => {
    // TODO: Send reminder message via WhatsApp
    console.log(`[WhatsApp] Would send reminder to patient ${patientId}`)
    return { success: true, feedbackRequestId }
  },
})

export const notifyComplaint = action({
  args: {
    complaintId: v.id('complaints'),
    clinicId: v.id('clinics'),
  },
  handler: async (ctx, { complaintId, clinicId }) => {
    // TODO: Send complaint notification to therapist/owner via WhatsApp or email
    console.log(`[Notification] Would notify clinic ${clinicId} about complaint ${complaintId}`)
    return { success: true, complaintId }
  },
})
