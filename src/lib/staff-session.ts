export type StaffRole = 'owner' | 'therapist' | 'receptionist'

export interface StaffSession {
  id: string
  name: string
  email: string
  role: StaffRole
  clinicId: string
}

export const roleLabels: Record<StaffRole, string> = {
  owner: 'Clinic Owner',
  therapist: 'Therapist',
  receptionist: 'Receptionist',
}

const SESSION_KEY = 'staff_session'

export function saveSession(session: StaffSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function readSession(): StaffSession | null {
  const stored = localStorage.getItem(SESSION_KEY)
  return stored ? JSON.parse(stored) : null
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function createMockSession(role: StaffRole, name: string = 'Dr. Sarah'): StaffSession {
  return {
    id: crypto.randomUUID(),
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@clinic.com`,
    role,
    clinicId: 'clinic-001',
  }
}
