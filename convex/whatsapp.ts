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

export const sendAppointmentReminder = internalAction({
  args: {
    appointmentId: v.id('appointments'),
    clinicId: v.id('clinics'),
    patientId: v.id('patients'),
  },
  handler: async (ctx, { appointmentId, clinicId, patientId }) => {
    const appointment = await ctx.runQuery(internal.appointments.getAppointmentInternal, {
      appointmentId,
    })
    // Skip silently if the appointment was cancelled/rescheduled since this
    // reminder was scheduled — the job wasn't cancelled in time, or this is
    // a stale run.
    if (!appointment || appointment.status !== 'scheduled') {
      return { success: false, error: 'Appointment no longer scheduled' }
    }

    const patient = await ctx.runQuery(internal.patients.getPatientInternal, { patientId })
    if (!patient) {
      return { success: false, error: 'Patient not found' }
    }

    const clinic = await ctx.runQuery(internal.clinics.getClinic, { clinicId })
    if (!clinic) {
      return { success: false, error: 'Clinic not found' }
    }

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.VITE_WHATSAPP_PHONE_NUMBER_ID

    const when = new Date(appointment.scheduledAt).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })

    const template =
      clinic.appointmentReminderMessage ||
      `Hi {patient_name}, this is a reminder of your appointment at {clinic_name} on {appointment_time}.`

    const message = template
      .replace('{patient_name}', patient.name)
      .replace('{clinic_name}', clinic.name)
      .replace('{appointment_time}', when)

    const success = await sendWhatsAppMessage(patient.phone, message, accessToken, phoneNumberId)

    await ctx.runMutation(internal.whatsapp.logAutomation, {
      clinicId,
      workflow: 'send_appointment_reminder',
      entityId: appointmentId,
      result: success ? 'success' : 'failure',
      errorMessage: success ? undefined : 'WhatsApp send failed or not configured',
    })

    return { success, appointmentId }
  },
})

// Companion reminder to the assigned therapist/doctor. Prefers WhatsApp
// (same Cloud API and credentials as the patient reminder above) when the
// therapist has a phone on file; falls back to
// emails.sendTherapistAppointmentReminder otherwise, or if the WhatsApp
// send itself fails (e.g. credentials not configured yet) — so a therapist
// still gets *a* reminder either way, not silence.
export const sendTherapistReminder = internalAction({
  args: {
    appointmentId: v.id('appointments'),
    clinicId: v.id('clinics'),
    patientId: v.id('patients'),
    therapistId: v.id('staffUsers'),
  },
  handler: async (ctx, { appointmentId, clinicId, patientId, therapistId }): Promise<{ success: boolean; appointmentId?: string; error?: string }> => {
    const therapist = await ctx.runQuery(internal.clinics.getStaffUserInternal, { staffId: therapistId })

    if (therapist?.phone) {
      const appointment = await ctx.runQuery(internal.appointments.getAppointmentInternal, { appointmentId })
      if (!appointment || appointment.status !== 'scheduled') {
        return { success: false, error: 'Appointment no longer scheduled' }
      }
      const patient = await ctx.runQuery(internal.patients.getPatientInternal, { patientId })
      const clinic = await ctx.runQuery(internal.clinics.getClinic, { clinicId })

      if (patient && clinic) {
        const when = new Date(appointment.scheduledAt).toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
        const message = `Hi ${therapist.name}, reminder: you have an appointment with ${patient.name} (${patient.phone}) at ${clinic.name} on ${when}${appointment.serviceContext ? ` for ${appointment.serviceContext}` : ''}.`

        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
        const phoneNumberId = process.env.VITE_WHATSAPP_PHONE_NUMBER_ID
        const success = await sendWhatsAppMessage(therapist.phone, message, accessToken, phoneNumberId)

        await ctx.runMutation(internal.whatsapp.logAutomation, {
          clinicId,
          workflow: 'send_therapist_reminder_whatsapp',
          entityId: appointmentId,
          result: success ? 'success' : 'failure',
          errorMessage: success ? undefined : 'WhatsApp send failed or not configured',
        })

        if (success) return { success: true, appointmentId }
      }
    }

    // No phone on file, or the WhatsApp send above failed/wasn't
    // configured — fall back to email so the therapist still hears
    // something rather than nothing.
    return await ctx.runAction(internal.emails.sendTherapistAppointmentReminder, {
      appointmentId,
      clinicId,
      patientId,
      therapistId,
    })
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
    // Already responded (or somehow already reminded) by the time this
    // fires — nothing to nudge.
    if (!feedbackRequest || feedbackRequest.status !== 'pending') {
      return { success: false, error: 'Feedback already responded to or not found' }
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

    if (success) {
      await ctx.runMutation(internal.feedback.markReminded, { feedbackRequestId })
    }

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
