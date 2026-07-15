import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const getClinic = query({
  args: { clinicId: v.id('clinics') },
  handler: async (ctx, { clinicId }) => {
    return await ctx.db.get(clinicId)
  },
})

export const listClinics = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query('clinics')
      .withIndex('by_owner', (q) => q.eq('ownerUserId', userId))
      .collect()
  },
})

export const createClinic = mutation({
  args: {
    ownerUserId: v.string(),
    name: v.string(),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    googleReviewUrl: v.optional(v.string()),
  },
  handler: async (ctx, { ownerUserId, name, contactEmail, contactPhone, googleReviewUrl }) => {
    const clinicId = await ctx.db.insert('clinics', {
      ownerUserId,
      name,
      contactEmail,
      contactPhone,
      googleReviewUrl,
      feedbackDelay: 24,
      reminderDelay: 48,
      checkInMessage: `Thank you for visiting {clinic_name}. How are you feeling after today's session?`,
      reminderMessage: `We'd love to hear about your experience. Have you had a chance to share your feedback?`,
      createdAt: Date.now(),
    })
    return clinicId
  },
})

export const updateClinicSettings = mutation({
  args: {
    clinicId: v.id('clinics'),
    name: v.optional(v.string()),
    feedbackDelay: v.optional(v.number()),
    reminderDelay: v.optional(v.number()),
    googleReviewUrl: v.optional(v.string()),
    checkInMessage: v.optional(v.string()),
    reminderMessage: v.optional(v.string()),
  },
  handler: async (ctx, { clinicId, ...updates }) => {
    await ctx.db.patch(clinicId, updates)
    return clinicId
  },
})

export const addStaffMember = mutation({
  args: {
    clinicId: v.id('clinics'),
    userId: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal('owner'), v.literal('therapist'), v.literal('receptionist')),
  },
  handler: async (ctx, { clinicId, userId, name, email, role }) => {
    const staffId = await ctx.db.insert('staffUsers', {
      clinicId,
      userId,
      name,
      email,
      role,
      createdAt: Date.now(),
    })
    return staffId
  },
})

export const getStaffUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query('staffUsers')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first()
  },
})

export const listStaff = query({
  args: { clinicId: v.id('clinics') },
  handler: async (ctx, { clinicId }) => {
    return await ctx.db
      .query('staffUsers')
      .withIndex('by_clinic', (q) => q.eq('clinicId', clinicId))
      .collect()
  },
})
