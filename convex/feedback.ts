import { mutation, query, internalQuery, internalMutation, internalAction } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import { requireStaffUser } from './lib/auth'
import { insertReviewRequest } from './reviews'

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

// Public, unauthenticated: the patient-facing feedback page needs the clinic
// name to personalize the form, but the patient never signs in. Only the
// clinic name is exposed — nothing else from the clinic record.
export const getClinicNameForToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const feedbackRequest = await ctx.db
      .query('feedbackRequests')
      .withIndex('by_token', (q) => q.eq('token', token))
      .first()
    if (!feedbackRequest) return null

    const clinic = await ctx.db.get(feedbackRequest.clinicId)
    return clinic ? clinic.name : null
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

    // Follow-up nudge if the patient still hasn't responded — fires
    // reminderDelay hours after the initial request went out (i.e.
    // feedbackDelay + reminderDelay hours after the visit). sendReminder
    // checks the request is still 'pending' before sending anything.
    const reminderDelayMs = (clinic.reminderDelay ?? 48) * 60 * 60 * 1000
    await ctx.scheduler.runAfter(delayMs + reminderDelayMs, internal.whatsapp.sendReminder, {
      feedbackRequestId,
      clinicId,
      patientId,
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

// Public, unauthenticated — the happy-path threshold that also decides
// whether to offer a Google review CTA (mirrors HAPPY_THRESHOLD in the
// patient-facing form).
const HAPPY_RATING_THRESHOLD = 4

export const submitFeedback = mutation({
  args: {
    feedbackRequestId: v.id('feedbackRequests'),
    rating: v.number(),
    satisfaction: v.optional(v.number()),
    explanationClarity: v.optional(v.number()),
    treatmentHelpfulness: v.optional(v.number()),
    recommendation: v.optional(v.number()),
    comments: v.string(),
  },
  handler: async (ctx, { feedbackRequestId, rating, satisfaction, explanationClarity, treatmentHelpfulness, recommendation, comments }) => {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error('Rating must be an integer between 1 and 5')
    }

    const feedbackRequest = await ctx.db.get(feedbackRequestId)
    if (!feedbackRequest) throw new Error('Feedback request not found')
    if (feedbackRequest.status === 'responded') {
      throw new Error('This feedback link has already been submitted')
    }

    const visit = await ctx.db.get(feedbackRequest.visitId)
    if (!visit) throw new Error('Visit not found')

    // Only persist sub-ratings that are actually valid 1-5 answers, so
    // unanswered optional questions (or bad input) don't pollute analytics.
    const subRating = (value: number | undefined) =>
      value !== undefined && Number.isInteger(value) && value >= 1 && value <= 5 ? value : undefined

    const responseId = await ctx.db.insert('feedbackResponses', {
      clinicId: feedbackRequest.clinicId,
      feedbackRequestId,
      patientId: feedbackRequest.patientId,
      therapistId: visit.therapistId,
      rating,
      satisfaction: subRating(satisfaction),
      explanationClarity: subRating(explanationClarity),
      treatmentHelpfulness: subRating(treatmentHelpfulness),
      recommendation: subRating(recommendation),
      comments,
      submittedAt: Date.now(),
    })

    // Update feedback request status
    await ctx.db.patch(feedbackRequestId, {
      status: 'responded',
      respondedAt: Date.now(),
    })

    if (rating <= 2) {
      // Low rating — raise a complaint. Its own action emails staff, so we
      // don't also send the generic "new feedback" notification below.
      await ctx.scheduler.runAfter(0, internal.complaints.createComplaintFromFeedback, {
        feedbackResponseId: responseId,
        clinicId: feedbackRequest.clinicId,
        patientId: feedbackRequest.patientId,
      })
    } else {
      await ctx.scheduler.runAfter(0, internal.emails.notifyFeedbackResponse, {
        clinicId: feedbackRequest.clinicId,
        rating,
      })
    }

    // Happy patient + clinic has a review link configured -> create a
    // trackable review request so the thank-you page can send them there
    // through /api/trackReviewClick (which also records the click).
    let reviewRequestId: string | undefined
    if (rating >= HAPPY_RATING_THRESHOLD) {
      const clinic = await ctx.db.get(feedbackRequest.clinicId)
      if (clinic?.googleReviewUrl) {
        reviewRequestId = await insertReviewRequest(ctx, {
          clinicId: feedbackRequest.clinicId,
          patientId: feedbackRequest.patientId,
          googleReviewUrl: clinic.googleReviewUrl,
        })
      }
    }

    return { responseId, reviewRequestId }
  },
})

// Internal-only: called by whatsapp.sendReminder once it has actually sent
// the nudge, so the request doesn't get reminded twice.
export const markReminded = internalMutation({
  args: { feedbackRequestId: v.id('feedbackRequests') },
  handler: async (ctx, { feedbackRequestId }) => {
    await ctx.db.patch(feedbackRequestId, { status: 'reminded', remindedAt: Date.now() })
  },
})
