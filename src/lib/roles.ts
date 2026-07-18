// Selectable job-title roles for a staffUsers row. 'owner' is a legacy
// backend value (see convex/schema.ts) never offered here — clinic
// ownership is a separate, invisible permission (clinics.ownerUserId), so
// the owner picks a real job title like everyone else.
export const STAFF_ROLES = ['therapist', 'receptionist', 'admin', 'staff'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

// Covers 'owner' too, so legacy rows written before the ownership/role
// split still render a sensible label instead of the raw value.
export const ROLE_LABELS: Record<string, string> = {
  therapist: 'Clinician/Therapist',
  owner: 'Clinician/Therapist',
  receptionist: 'Receptionist',
  admin: 'Admin',
  staff: 'Staff',
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role
}
