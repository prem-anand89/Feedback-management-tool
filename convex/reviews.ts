import { query, internalMutation, MutationCtx } from './_generated/server'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'
import { requireStaffUser } from './lib/auth'

export const listReviewRequests = query({
  args: {},
  handler: async (ctx) => {
    const staffUser = await requireStaffUser(ctx)
    return await ctx.db
      .query('reviewRequests')
      .withIndex('by_clinic', (q) => q.eq('clinicId', staffUser.clinicId))
      .collect()
  },
})

// Called directly (not via ctx.runMutation) from feedback.submitFeedback,
// which is itself a mutation — mutations can't call other Convex functions,
// only plain TS, same pattern as insertScheduledAppointment/insertCompletedVisit.
export async function insertReviewRequest(
  ctx: MutationCtx,
  args: { clinicId: Id<'clinics'>; patientId: Id<'patients'>; googleReviewUrl: string },
) {
  return await ctx.db.insert('reviewRequests', { ...args, createdAt: Date.now() })
}

export const createReviewRequest = internalMutation({
  args: {
    clinicId: v.id('clinics'),
    patientId: v.id('patients'),
    googleReviewUrl: v.string(),
  },
  handler: async (ctx, args) => insertReviewRequest(ctx, args),
})

// Returns the updated doc (rather than just the id) so the /api/trackReviewClick
// HTTP action can redirect straight to its googleReviewUrl.
export const trackReviewClick = internalMutation({
  args: {
    reviewRequestId: v.id('reviewRequests'),
  },
  handler: async (ctx, { reviewRequestId }) => {
    const reviewRequest = await ctx.db.get(reviewRequestId)
    if (!reviewRequest) return null

    await ctx.db.patch(reviewRequestId, { clickedAt: Date.now() })
    return { ...reviewRequest, clickedAt: Date.now() }
  },
})

export const getReviewStats = query({
  args: {},
  handler: async (ctx) => {
    const staffUser = await requireStaffUser(ctx)
    const reviews = await ctx.db
      .query('reviewRequests')
      .withIndex('by_clinic', (q) => q.eq('clinicId', staffUser.clinicId))
      .collect()

    const clicked = reviews.filter((r) => r.clickedAt).length
    const total = reviews.length
    const clickRate = total > 0 ? Math.round((clicked / total) * 100) : 0

    return { total, clicked, clickRate }
  },
})

export const createWidgetFeedback = internalMutation({
  args: {
    clinicId: v.id('clinics'),
    rating: v.number(),
    comment: v.string(),
  },
  handler: async (ctx, { clinicId, rating, comment }) => {
    return await ctx.db.insert('widgetFeedback', {
      clinicId,
      rating,
      comment,
      createdAt: Date.now(),
    })
  },
})

export const listWidgetFeedback = query({
  args: {},
  handler: async (ctx) => {
    const staffUser = await requireStaffUser(ctx)
    return await ctx.db
      .query('widgetFeedback')
      .withIndex('by_clinic', (q) => q.eq('clinicId', staffUser.clinicId))
      .collect()
  },
})
