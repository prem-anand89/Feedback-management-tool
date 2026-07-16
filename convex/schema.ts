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
    // Clinic-defined list of services/treatments. Staff pick one from this list
    // when logging a visit. Universal across specialties (e.g. 'Consultation',
    // 'Cleaning', 'Physio session') and editable in Settings.
    services: v.optional(v.array(v.string())),
    // How long before a scheduled appointment to send the WhatsApp reminder.
    appointmentReminderLeadHours: v.optional(v.number()), // hours
    appointmentReminderMessage: v.optional(v.string()),
    // Public appointment-request booking form (embeddable on the clinic's own
    // website). The WhatsApp number the patient's own device messages when
    // requesting — deliberately per-clinic, not the platform's shared number.
    whatsappNumber: v.optional(v.string()),
    bookingTimeSlots: v.optional(v.array(v.string())),
    // Days of week closed to booking requests, 0 = Sunday ... 6 = Saturday.
    bookingClosedDays: v.optional(v.array(v.number())),
    bookingWindowDays: v.optional(v.number()),
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
    // Email is rarely collected in practice — phone is the primary contact.
    email: v.optional(v.string()),
    phone: v.string(),
    createdAt: v.number(),
  })
    .index('by_clinic', ['clinicId'])
    .index('by_email', ['clinicId', 'email']),

  visits: defineTable({
    clinicId: v.id('clinics'),
    patientId: v.id('patients'),
    therapistId: v.id('staffUsers'),
    // What service/treatment the patient underwent this visit. Free text so it
    // works for any specialty (dental, physio, derma, etc.).
    serviceContext: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_clinic', ['clinicId'])
    .index('by_patient', ['patientId'])
    .index('by_therapist', ['therapistId'])
    .index('by_completed', ['clinicId', 'completedAt']),

  appointments: defineTable({
    clinicId: v.id('clinics'),
    patientId: v.id('patients'),
    therapistId: v.id('staffUsers'),
    serviceContext: v.optional(v.string()),
    scheduledAt: v.number(), // ms epoch of the appointment start time
    durationMinutes: v.optional(v.number()),
    status: v.union(
      v.literal('scheduled'),
      v.literal('completed'),
      v.literal('cancelled'),
      v.literal('no-show'),
    ),
    notes: v.optional(v.string()),
    // Set once the appointment is completed and a visit has been created for it.
    visitId: v.optional(v.id('visits')),
    completedAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    cancelReason: v.optional(v.string()),
    // The scheduled reminder job's id, so it can be cancelled if the
    // appointment is rescheduled or cancelled before the reminder fires.
    // Stored as a string (not v.id) since it references a system table.
    reminderJobId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_clinic', ['clinicId'])
    .index('by_clinic_scheduled', ['clinicId', 'scheduledAt'])
    .index('by_patient', ['patientId'])
    .index('by_therapist', ['therapistId']),

  // Patient-initiated appointment requests — submitted from the public,
  // no-login embeddable booking form. Deliberately NOT the same as
  // `appointments`: a request is a preference the patient submitted, not a
  // confirmed booking. Staff review and either confirm it (which creates a
  // real `appointments` row) or reject/mark it, per the "Request, not
  // Confirmation" booking philosophy.
  appointmentRequests: defineTable({
    clinicId: v.id('clinics'),
    patientName: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    preferredDate: v.string(), // "YYYY-MM-DD"
    preferredTime: v.string(), // e.g. "09:00 AM", from the clinic's slot list
    reason: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.union(
      v.literal('pending'),
      v.literal('confirmed'),
      v.literal('completed'),
      v.literal('cancelled'),
      v.literal('no-response'),
      v.literal('rejected'),
    ),
    source: v.optional(v.string()),
    // Set once staff confirm the request into a real appointment.
    appointmentId: v.optional(v.id('appointments')),
    reviewedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_clinic', ['clinicId'])
    .index('by_clinic_status', ['clinicId', 'status']),

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
    rating: v.number(), // 1-5, overall (required)
    // Optional sub-ratings. The simplified universal form may collect only the
    // overall rating; these are filled in when the patient opts to rate more.
    satisfaction: v.optional(v.number()), // 1-5
    explanationClarity: v.optional(v.number()), // 1-5
    treatmentHelpfulness: v.optional(v.number()), // 1-5
    recommendation: v.optional(v.number()), // 1-5
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
