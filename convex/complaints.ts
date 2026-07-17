import { mutation, query, internalMutation, internalAction } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import { requireStaffUser } from './lib/auth'

export const listComplaints = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, { status }) => {
    const staffUser = await requireStaffUser(ctx)
    const complaintsQuery = ctx.db.query('complaints').withIndex('by_clinic', (q) => q.eq('clinicId', staffUser.clinicId))

    if (status) {
      return await complaintsQuery.filter((q) => q.eq(q.field('status'), status)).collect()
    }

    return await complaintsQuery.collect()
  },
})

export const getComplaint = query({
  args: { complaintId: v.id('complaints') },
  handler: async (ctx, { complaintId }) => {
    const staffUser = await requireStaffUser(ctx)
    const complaint = await ctx.db.get(complaintId)
    if (!complaint || complaint.clinicId !== staffUser.clinicId) return null
    return complaint
  },
})

export const createComplaintFromFeedback = internalAction({
  args: {
    feedbackResponseId: v.id('feedbackResponses'),
    clinicId: v.id('clinics'),
    patientId: v.id('patients'),
  },
  handler: async (ctx, { feedbackResponseId, clinicId, patientId }) => {
    const { complaintId, priority } = await ctx.runMutation(internal.complaints.createComplaint, {
      clinicId,
      feedbackResponseId,
      patientId,
    })

    const clinic = await ctx.runQuery(internal.clinics.getClinic, { clinicId })
    const staffUsers = await ctx.runQuery(internal.clinics.listStaffInternal, { clinicId })
    const ownerOrTherapist = staffUsers.find((s) => s.role === 'owner') || staffUsers[0]

    if (clinic && ownerOrTherapist) {
      await ctx.scheduler.runAfter(0, internal.emails.notifyComplaintCreated, {
        complaintId: complaintId.toString(),
        clinicId,
        patientId,
        priority,
        staffEmail: ownerOrTherapist.email,
        staffName: ownerOrTherapist.name,
        clinicName: clinic.name,
      })
    }

    return complaintId
  },
})

export const createComplaint = internalMutation({
  args: {
    clinicId: v.id('clinics'),
    feedbackResponseId: v.id('feedbackResponses'),
    patientId: v.id('patients'),
  },
  handler: async (ctx, { clinicId, feedbackResponseId, patientId }) => {
    // Default the assignee to the therapist involved in the visit that
    // triggered this complaint — they're the natural first point of
    // follow-up. Staff can reassign from the board.
    const feedbackResponse = await ctx.db.get(feedbackResponseId)
    // This path only ever fires for rating <= 2 (see feedback.submitFeedback),
    // so the worst score (1) gets flagged high priority, the rest medium.
    const priority = feedbackResponse && feedbackResponse.rating <= 1 ? 'high' : 'medium'

    const complaintId = await ctx.db.insert('complaints', {
      clinicId,
      feedbackResponseId,
      patientId,
      priority,
      status: 'pending',
      assignedToId: feedbackResponse?.therapistId,
      notes: JSON.stringify([
        {
          author: 'system',
          timestamp: Date.now(),
          text: 'Complaint created from low feedback rating',
        },
      ]),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    return { complaintId, priority }
  },
})

export const assignComplaint = mutation({
  args: {
    complaintId: v.id('complaints'),
    staffId: v.optional(v.id('staffUsers')),
  },
  handler: async (ctx, { complaintId, staffId }) => {
    const staffUser = await requireStaffUser(ctx)
    const complaint = await ctx.db.get(complaintId)
    if (!complaint || complaint.clinicId !== staffUser.clinicId) {
      throw new Error('Complaint not found')
    }

    if (staffId) {
      const targetStaff = await ctx.db.get(staffId)
      if (!targetStaff || targetStaff.clinicId !== staffUser.clinicId) {
        throw new Error('Staff member not found in this clinic')
      }
    }

    await ctx.db.patch(complaintId, { assignedToId: staffId, updatedAt: Date.now() })
    return complaintId
  },
})

export const updateComplaintStatus = mutation({
  args: {
    complaintId: v.id('complaints'),
    status: v.union(v.literal('pending'), v.literal('in-progress'), v.literal('resolved'), v.literal('closed')),
  },
  handler: async (ctx, { complaintId, status }) => {
    const staffUser = await requireStaffUser(ctx)
    const complaint = await ctx.db.get(complaintId)
    if (!complaint || complaint.clinicId !== staffUser.clinicId) {
      throw new Error('Complaint not found')
    }

    await ctx.db.patch(complaintId, { status, updatedAt: Date.now() })
    return complaintId
  },
})

export const addComplaintNote = mutation({
  args: {
    complaintId: v.id('complaints'),
    note: v.string(),
  },
  handler: async (ctx, { complaintId, note }) => {
    const staffUser = await requireStaffUser(ctx)
    const complaint = await ctx.db.get(complaintId)
    if (!complaint || complaint.clinicId !== staffUser.clinicId) {
      throw new Error('Complaint not found')
    }

    const notes = JSON.parse(complaint.notes)
    notes.push({
      author: staffUser._id,
      timestamp: Date.now(),
      text: note,
    })

    await ctx.db.patch(complaintId, {
      notes: JSON.stringify(notes),
      updatedAt: Date.now(),
    })

    return complaintId
  },
})
