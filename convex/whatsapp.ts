import { action, internalMutation } from './_generated/server'
import { v } from 'convex/values'

const FEEDBACK_FORM_URL = process.env.VITE_FEEDBACK_FORM_URL || 'http://localhost:5173'

async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string,
  accessToken: string,
  phoneNumberId: string
): Promise<boolean> {
  if (!accessToken || !phoneNumberId) {
    console.log('[WhatsApp] Credentials not configured, skipping send')
    return false
  }

  try {
    const response = await fetch(`https://graph.instagram.com/v18.0/${phoneNumberId}/messages`, {
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
    type: v.string(),
    status: v.string(),
    details: v.string(),
  },
  handler: async (ctx, { clinicId, type, status, details }) => {
    await ctx.db.insert('automationLogs', {
      clinicId,
      type,
      status,
      details,
      timestamp: Date.now(),
    })
  },
})

export const sendFeedbackRequest = action({
  args: {
    feedbackRequestId: v.id('feedbackRequests'),
    clinicId: v.id('clinics'),
    patientId: v.id('patients'),
    token: v.string(),
  },
  handler: async (ctx, { feedbackRequestId, clinicId, patientId, token }) => {
    const patient = await ctx.runQuery(async () => {
      const p = await ctx.db.get(patientId)
      return p
    })

    if (!patient) {
      console.error('[WhatsApp] Patient not found')
      return { success: false, error: 'Patient not found' }
    }

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.VITE_WHATSAPP_PHONE_NUMBER_ID

    const feedbackLink = `${FEEDBACK_FORM_URL}/f/${token}`
    const message = `Hi ${patient.name}! We'd love to hear about your recent visit. Please share your feedback: ${feedbackLink}`

    const success = await sendWhatsAppMessage(patient.phone, message, accessToken, phoneNumberId)

    await ctx.runMutation(async () => {
      await ctx.db.insert('automationLogs', {
        clinicId,
        type: 'feedback_request',
        status: success ? 'sent' : 'failed',
        details: `Sent to ${patient.phone}`,
        timestamp: Date.now(),
      })
    })

    return { success, feedbackRequestId }
  },
})

export const sendReminder = action({
  args: {
    feedbackRequestId: v.id('feedbackRequests'),
    clinicId: v.id('clinics'),
    patientId: v.id('patients'),
  },
  handler: async (ctx, { feedbackRequestId, clinicId, patientId }) => {
    const feedbackRequest = await ctx.runQuery(async () => {
      return await ctx.db.get(feedbackRequestId)
    })

    if (!feedbackRequest) {
      return { success: false, error: 'Feedback request not found' }
    }

    const patient = await ctx.runQuery(async () => {
      return await ctx.db.get(patientId)
    })

    if (!patient) {
      return { success: false, error: 'Patient not found' }
    }

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.VITE_WHATSAPP_PHONE_NUMBER_ID

    const feedbackLink = `${FEEDBACK_FORM_URL}/f/${feedbackRequest.token}`
    const message = `Hi ${patient.name}, just checking in! We'd still love to hear your feedback about your visit: ${feedbackLink}`

    const success = await sendWhatsAppMessage(patient.phone, message, accessToken, phoneNumberId)

    await ctx.runMutation(async () => {
      await ctx.db.insert('automationLogs', {
        clinicId,
        type: 'feedback_reminder',
        status: success ? 'sent' : 'failed',
        details: `Reminder sent to ${patient.phone}`,
        timestamp: Date.now(),
      })
    })

    return { success, feedbackRequestId }
  },
})

export const notifyComplaint = action({
  args: {
    complaintId: v.id('complaints'),
    clinicId: v.id('clinics'),
  },
  handler: async (ctx, { complaintId, clinicId }) => {
    const complaint = await ctx.runQuery(async () => {
      return await ctx.db.get(complaintId)
    })

    if (!complaint) {
      return { success: false, error: 'Complaint not found' }
    }

    const clinic = await ctx.runQuery(async () => {
      const c = await ctx.db.query('clinics').filter((q) => q.eq(q.field('_id'), clinicId)).first()
      return c
    })

    if (!clinic) {
      return { success: false, error: 'Clinic not found' }
    }

    const staffUsers = await ctx.runQuery(async () => {
      return await ctx.db
        .query('staffUsers')
        .filter((q) => q.eq(q.field('clinicId'), clinicId))
        .collect()
    })

    const ownerOrTherapist = staffUsers.find((s) => s.role === 'owner') || staffUsers[0]

    if (!ownerOrTherapist) {
      return { success: false, error: 'No staff found' }
    }

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.VITE_WHATSAPP_PHONE_NUMBER_ID

    const message = `Alert: New complaint in ${clinic.name}. Priority: ${complaint.priority}. Please review in the app.`

    const success = await sendWhatsAppMessage(
      ownerOrTherapist.phone || '',
      message,
      accessToken,
      phoneNumberId
    )

    await ctx.runMutation(async () => {
      await ctx.db.insert('automationLogs', {
        clinicId,
        type: 'complaint_notification',
        status: success ? 'sent' : 'failed',
        details: `Notification sent to ${ownerOrTherapist.name}`,
        timestamp: Date.now(),
      })
    })

    return { success, complaintId }
  },
})
