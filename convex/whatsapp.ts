import { internalAction, internalMutation } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'

const FEEDBACK_FORM_URL = process.env.VITE_FEEDBACK_FORM_URL || 'http://localhost:5173'

async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string,
  accessToken: string | undefined,
  phoneNumberId: string | undefined
): Promise<boolean> {
  if (!accessToken || !phoneNumberId) {
    console.log('[WhatsApp] Credentials not configured, skipping send')
    return false
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber.replace(/\D/g, ''),
        type: 'text',
        text: { body: message },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[WhatsApp] Send failed:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('[WhatsApp] Error sending message:', err)
    return false
  }
}

export const logAutomation = internalMutation({
  args: {
    clinicId: v.id('clinics'),
    workflow: v.string(),
    entityId: v.optional(v.string()),
    result: v.union(v.literal('success'), v.literal('failure')),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, { clinicId, workflow, entityId, result, errorMessage }) => {
    await ctx.db.insert('automationLogs', {
      clinicId,
      workflow,
      entityId,
      result,
      errorMessage,
      timestamp: Date.now(),
    })
  },
})

export const sendFeedbackRequest = internalAction({
  args: {
    feedbackRequestId: v.id('feedbackRequests'),
    clinicId: v.id('clinics'),
    patientId: v.id('patients'),
    token: v.string(),
  },
  handler: async (ctx, { feedbackRequestId, clinicId, patientId, token }) => {
    const patient = await ctx.runQuery(internal.patients.getPatientInternal, { patientId })
    if (!patient) {
      console.error('[WhatsApp] Patient not found')
      return { success: false, error: 'Patient not found' }
    }

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.VITE_WHATSAPP_PHONE_NUMBER_ID

    const feedbackLink = `${FEEDBACK_FORM_URL}/f/${token}`
    const message = `Hi ${patient.name}! We'd love to hear about your recent visit. Please share your feedback: ${feedbackLink}`

    const success = await sendWhatsAppMessage(patient.phone, message, accessToken, phoneNumberId)

    await ctx.runMutation(internal.whatsapp.logAutomation, {
      clinicId,
      workflow: 'send_feedback_request',
      entityId: feedbackRequestId,
      result: success ? 'success' : 'failure',
      errorMessage: success ? undefined : 'WhatsApp send failed or not configured',
    })

    return { success, feedbackRequestId }
  },
})

export const sendReminder = internalAction({
  args: {
    feedbackRequestId: v.id('feedbackRequests'),
    clinicId: v.id('clinics'),
    patientId: v.id('patients'),
  },
  handler: async (ctx, { feedbackRequestId, clinicId, patientId }) => {
    const feedbackRequest = await ctx.runQuery(internal.feedback.getFeedbackRequestInternal, {
      feedbackRequestId,
    })
    if (!feedbackRequest) {
      return { success: false, error: 'Feedback request not found' }
    }

    const patient = await ctx.runQuery(internal.patients.getPatientInternal, { patientId })
    if (!patient) {
      return { success: false, error: 'Patient not found' }
    }

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.VITE_WHATSAPP_PHONE_NUMBER_ID

    const feedbackLink = `${FEEDBACK_FORM_URL}/f/${feedbackRequest.token}`
    const message = `Hi ${patient.name}, just checking in! We'd still love to hear your feedback about your visit: ${feedbackLink}`

    const success = await sendWhatsAppMessage(patient.phone, message, accessToken, phoneNumberId)

    await ctx.runMutation(internal.whatsapp.logAutomation, {
      clinicId,
      workflow: 'send_reminder',
      entityId: feedbackRequestId,
      result: success ? 'success' : 'failure',
      errorMessage: success ? undefined : 'WhatsApp send failed or not configured',
    })

    return { success, feedbackRequestId }
  },
})
