import { mutation, query, internalMutation, internalAction } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'

export const listComplaints = query({
  args: { clinicId: v.id('clinics'), status: v.optional(v.string()) },
  handler: async (ctx, { clinicId, status }) => {
    const query = ctx.db.query('complaints').withIndex('by_clinic', (q) => q.eq('clinicId', clinicId))

    if (status) {
      // Note: Convex doesn't have a way to filter further after index, so we collect and filter in memory for MVP
      const allComplaints = await query.collect()
      return allComplaints.filter((c) => c.status === status)
    }

    return await query.collect()
  },
})

export const getComplaint = query({
  args: { complaintId: v.id('complaints') },
  handler: async (ctx, { complaintId }) => {
    return await ctx.db.get(complaintId)
  },
})

export const createComplaintFromFeedback = internalAction({
  args: {
    feedbackResponseId: v.id('feedbackResponses'),
    clinicId: v.id('clinics'),
    patientId: v.id('patients'),
  },
  handler: async (ctx, { feedbackResponseId, clinicId, patientId }) => {
    const complaintId = await ctx.runMutation(internal.complaints.createComplaint, {
      clinicId,
      feedbackResponseId,
      patientId,
    })

    // TODO: Send notification to clinic owner/therapist
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
    const complaintId = await ctx.db.insert('complaints', {
      clinicId,
      feedbackResponseId,
      patientId,
      priority: 'medium',
      status: 'pending',
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
    return complaintId
  },
})

export const updateComplaintStatus = mutation({
  args: {
    complaintId: v.id('complaints'),
    status: v.union(v.literal('pending'), v.literal('in-progress'), v.literal('resolved'), v.literal('closed')),
  },
  handler: async (ctx, { complaintId, status }) => {
    await ctx.db.patch(complaintId, { status, updatedAt: Date.now() })
    return complaintId
  },
})

export const addComplaintNote = mutation({
  args: {
    complaintId: v.id('complaints'),
    note: v.string(),
    authorId: v.id('staffUsers'),
  },
  handler: async (ctx, { complaintId, note, authorId }) => {
    const complaint = await ctx.db.get(complaintId)
    if (!complaint) throw new Error('Complaint not found')

    const notes = JSON.parse(complaint.notes)
    notes.push({
      author: authorId,
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
