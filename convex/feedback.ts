import { mutation, query, internalQuery, internalMutation, internalAction } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import { requireStaffUser } from './lib/auth'

export const generateToken = () => {
  return crypto
    .getRandomValues(new Uint8Array(16))
    .reduce((a, b) => a + b.toString(16).padStart(2, '0'), '')
}

export const listFeedbackRequests = query({
  args: {},
  handler: async (ctx) => {
    const staffUser = await requireStaffUser(ctx)
    return await ctx.db
      .query('feedbackRequests')
      .withIndex('by_clinic', (q) => q.eq('clinicId', staffUser.clinicId))
      .collect()
  },
})

export const listFeedbackResponses = query({
  args: {},
  handler: async (ctx) => {
    const staffUser = await requireStaffUser(ctx)
    return await ctx.db
      .query('feedbackResponses')
      .withIndex('by_clinic', (q) => q.eq('clinicId', staffUser.clinicId))
      .collect()
  },
})

export const getFeedbackResponse = query({
  args: { responseId: v.id('feedbackResponses') },
  handler: async (ctx, { responseId }) => {
    const staffUser = await requireStaffUser(ctx)
    const response = await ctx.db.get(responseId)
    if (!response || response.clinicId !== staffUser.clinicId) return null
    return response
  },
})

export const getFeedbackRequestByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    return await ctx.db
      .query('feedbackRequests')
      .withIndex('by_token', (q) => q.eq('token', token))
      .first()
  },
})

// Internal-only: used by server-side workflows (WhatsApp reminders) that
// need the feedback request without a caller identity.
export const getFeedbackRequestInternal = internalQuery({
  args: { feedbackRequestId: v.id('feedbackRequests') },
  handler: async (ctx, { feedbackRequestId }) => {
    return await ctx.db.get(feedbackRequestId)
  },
})

export const scheduleFollowUp = internalAction({
  args: {
    visitId: v.id('visits'),
    clinicId: v.id('clinics'),
    patientId: v.id('patients'),
  },
  handler: async (ctx, { visitId, clinicId, patientId }) => {
    const clinic = await ctx.runQuery(internal.clinics.getClinic, { clinicId })
    if (!clinic) return

    const token = generateToken()
    const feedbackRequestId = await ctx.runMutation(internal.feedback.createFeedbackRequest, {
      clinicId,
      visitId,
      patientId,
      token,
    })

    // Schedule the feedback request to be sent after the configured delay
    const delayMs = clinic.feedbackDelay * 60 * 60 * 1000
    await ctx.scheduler.runAfter(delayMs, internal.whatsapp.sendFeedbackRequest, {
      feedbackRequestId,
      clinicId,
      patientId,
      token,
    })
  },
})

export const createFeedbackRequest = internalMutation({
  args: {
    clinicId: v.id('clinics'),
    visitId: v.id('visits'),
    patientId: v.id('patients'),
    token: v.string(),
  },
  handler: async (ctx, { clinicId, visitId, patientId, token }) => {
    const feedbackRequestId = await ctx.db.insert('feedbackRequests', {
      clinicId,
      visitId,
      patientId,
      token,
      status: 'pending',
      sentAt: Date.now(),
    })
    return feedbackRequestId
  },
})

export const submitFeedback = mutation({
  args: {
    feedbackRequestId: v.id('feedbackRequests'),
    rating: v.number(),
    satisfaction: v.number(),
    explanationClarity: v.number(),
    treatmentHelpfulness: v.number(),
    recommendation: v.number(),
    comments: v.string(),
  },
  handler: async (ctx, { feedbackRequestId, rating, satisfaction, explanationClarity, treatmentHelpfulness, recommendation, comments }) => {
    const feedbackRequest = await ctx.db.get(feedbackRequestId)
    if (!feedbackRequest) throw new Error('Feedback request not found')
    if (feedbackRequest.status === 'responded') {
      throw new Error('This feedback link has already been submitted')
    }

    const visit = await ctx.db.get(feedbackRequest.visitId)
    if (!visit) throw new Error('Visit not found')

    const responseId = await ctx.db.insert('feedbackResponses', {
      clinicId: feedbackRequest.clinicId,
      feedbackRequestId,
      patientId: feedbackRequest.patientId,
      therapistId: visit.therapistId,
      rating,
      satisfaction,
      explanationClarity,
      treatmentHelpfulness,
      recommendation,
      comments,
      submittedAt: Date.now(),
    })

    // Update feedback request status
    await ctx.db.patch(feedbackRequestId, {
      status: 'responded',
      respondedAt: Date.now(),
    })

    // If rating is low, create a complaint
    if (rating <= 2) {
      await ctx.scheduler.runAfter(0, internal.complaints.createComplaintFromFeedback, {
        feedbackResponseId: responseId,
        clinicId: feedbackRequest.clinicId,
        patientId: feedbackRequest.patientId,
      })
    }

    return responseId
  },
})
