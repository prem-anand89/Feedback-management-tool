import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  clinics: defineTable({
    name: v.string(),
    ownerUserId: v.string(),
    logo: v.optional(v.string()),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    googleReviewUrl: v.optional(v.string()),
    feedbackDelay: v.number(), // hours
    reminderDelay: v.number(), // hours
    checkInMessage: v.string(),
    reminderMessage: v.string(),
    createdAt: v.number(),
  })
    .index('by_owner', ['ownerUserId'])
    .searchIndex('search_name', { searchField: 'name' }),

  staffUsers: defineTable({
    clinicId: v.id('clinics'),
    userId: v.string(), // Clerk user ID
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal('owner'), v.literal('therapist'), v.literal('receptionist')),
    createdAt: v.number(),
  })
    .index('by_clinic', ['clinicId'])
    .index('by_user', ['userId']),

  patients: defineTable({
    clinicId: v.id('clinics'),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    createdAt: v.number(),
  })
    .index('by_clinic', ['clinicId'])
    .index('by_email', ['clinicId', 'email']),

  visits: defineTable({
    clinicId: v.id('clinics'),
    patientId: v.id('patients'),
    therapistId: v.id('staffUsers'),
    completedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_clinic', ['clinicId'])
    .index('by_patient', ['patientId'])
    .index('by_therapist', ['therapistId'])
    .index('by_completed', ['clinicId', 'completedAt']),

  feedbackRequests: defineTable({
    clinicId: v.id('clinics'),
    visitId: v.id('visits'),
    patientId: v.id('patients'),
    sentAt: v.number(),
    token: v.string(),
    status: v.union(v.literal('pending'), v.literal('responded'), v.literal('reminded')),
    remindedAt: v.optional(v.number()),
    respondedAt: v.optional(v.number()),
  })
    .index('by_visit', ['visitId'])
    .index('by_token', ['token'])
    .index('by_clinic', ['clinicId', 'status']),

  feedbackResponses: defineTable({
    clinicId: v.id('clinics'),
    feedbackRequestId: v.id('feedbackRequests'),
    patientId: v.id('patients'),
    therapistId: v.id('staffUsers'),
    rating: v.number(), // 1-5
    satisfaction: v.number(), // 1-5
    explanationClarity: v.number(), // 1-5
    treatmentHelpfulness: v.number(), // 1-5
    recommendation: v.number(), // 1-5
    comments: v.string(),
    imageUrl: v.optional(v.string()),
    submittedAt: v.number(),
  })
    .index('by_clinic', ['clinicId'])
    .index('by_feedback_request', ['feedbackRequestId'])
    .index('by_patient', ['patientId']),

  complaints: defineTable({
    clinicId: v.id('clinics'),
    feedbackResponseId: v.id('feedbackResponses'),
    patientId: v.id('patients'),
    priority: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
    status: v.union(v.literal('pending'), v.literal('in-progress'), v.literal('resolved'), v.literal('closed')),
    assignedToId: v.optional(v.id('staffUsers')),
    notes: v.string(), // JSON array of note objects with timestamp/author
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_clinic', ['clinicId', 'status'])
    .index('by_patient', ['patientId'])
    .index('by_assigned', ['assignedToId']),

  reviewRequests: defineTable({
    clinicId: v.id('clinics'),
    patientId: v.id('patients'),
    googleReviewUrl: v.string(),
    clickedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_clinic', ['clinicId'])
    .index('by_patient', ['patientId']),

  widgetFeedback: defineTable({
    clinicId: v.id('clinics'),
    rating: v.number(), // 1-5
    comment: v.string(),
    createdAt: v.number(),
  })
    .index('by_clinic', ['clinicId']),

  automationLogs: defineTable({
    clinicId: v.id('clinics'),
    workflow: v.string(), // e.g., 'send_feedback_request', 'send_reminder'
    entityId: v.optional(v.string()),
    result: v.union(v.literal('success'), v.literal('failure')),
    errorMessage: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index('by_clinic', ['clinicId'])
    .index('by_workflow', ['clinicId', 'workflow']),
})
