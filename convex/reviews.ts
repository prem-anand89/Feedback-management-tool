import { query, internalMutation } from './_generated/server'
import { v } from 'convex/values'
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

export const createReviewRequest = internalMutation({
  args: {
    clinicId: v.id('clinics'),
    patientId: v.id('patients'),
    googleReviewUrl: v.string(),
  },
  handler: async (ctx, { clinicId, patientId, googleReviewUrl }) => {
    const reviewRequestId = await ctx.db.insert('reviewRequests', {
      clinicId,
      patientId,
      googleReviewUrl,
      createdAt: Date.now(),
    })
    return reviewRequestId
  },
})

export const trackReviewClick = internalMutation({
  args: {
    reviewRequestId: v.id('reviewRequests'),
  },
  handler: async (ctx, { reviewRequestId }) => {
    const reviewRequest = await ctx.db.get(reviewRequestId)
    if (!reviewRequest) throw new Error('Review request not found')

    await ctx.db.patch(reviewRequestId, {
      clickedAt: Date.now(),
    })

    return reviewRequestId
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
