export interface Patient {
  id: string
  name: string
  email: string
  phone: string
}

export interface Feedback {
  id: string
  patientId: string
  patientName: string
  therapistName: string
  date: string
  rating: number
  satisfaction: number
  explanationClarity: number
  treatmentHelpfulness: number
  recommendation: number
  comments: string
  status: 'submitted' | 'reviewed'
}

export interface Complaint {
  id: string
  patientName: string
  feedback: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in-progress' | 'resolved' | 'closed'
  assignedTo?: string
  createdAt: string
}

export interface TimelineEvent {
  type: 'visit' | 'feedback' | 'complaint' | 'resolution' | 'review'
  date: string
  title: string
  description: string
}

export const mockPatients: Patient[] = [
  { id: '1', name: 'Sarah Johnson', email: 'sarah@example.com', phone: '+1-555-0101' },
  { id: '2', name: 'Michael Chen', email: 'michael@example.com', phone: '+1-555-0102' },
  { id: '3', name: 'Emma Davis', email: 'emma@example.com', phone: '+1-555-0103' },
]

export const mockFeedback: Feedback[] = [
  {
    id: '1',
    patientId: '1',
    patientName: 'Sarah Johnson',
    therapistName: 'Dr. Williams',
    date: '2024-01-15',
    rating: 5,
    satisfaction: 5,
    explanationClarity: 5,
    treatmentHelpfulness: 5,
    recommendation: 5,
    comments: 'Excellent service, very professional and caring staff.',
    status: 'submitted',
  },
  {
    id: '2',
    patientId: '2',
    patientName: 'Michael Chen',
    therapistName: 'Dr. Smith',
    date: '2024-01-14',
    rating: 3,
    satisfaction: 3,
    explanationClarity: 3,
    treatmentHelpfulness: 2,
    recommendation: 3,
    comments: 'Treatment was okay, but felt rushed during the session.',
    status: 'submitted',
  },
  {
    id: '3',
    patientId: '3',
    patientName: 'Emma Davis',
    therapistName: 'Dr. Brown',
    date: '2024-01-13',
    rating: 4,
    satisfaction: 4,
    explanationClarity: 4,
    treatmentHelpfulness: 4,
    recommendation: 4,
    comments: 'Good experience overall, very helpful and supportive.',
    status: 'submitted',
  },
]

export const mockComplaints: Complaint[] = [
  {
    id: '1',
    patientName: 'Michael Chen',
    feedback: 'Treatment was okay, but felt rushed during the session.',
    priority: 'medium',
    status: 'pending',
    createdAt: '2024-01-14',
  },
]

export const mockTimeline: TimelineEvent[] = [
  { type: 'visit', date: '2024-01-15', title: 'Visit Completed', description: 'Treatment session with Dr. Williams' },
  { type: 'feedback', date: '2024-01-15', title: 'Feedback Submitted', description: '5-star rating received' },
  { type: 'review', date: '2024-01-16', title: 'Google Review', description: 'Patient left positive review' },
]

export const recentActivity = [
  { id: '1', message: 'Sarah left 5-star feedback', timestamp: '2 hours ago' },
  { id: '2', message: 'New complaint from Michael Chen', timestamp: '4 hours ago' },
  { id: '3', message: 'Emma submitted feedback', timestamp: '1 day ago' },
  { id: '4', message: 'Dr. Williams resolved complaint', timestamp: '1 day ago' },
  { id: '5', message: 'Google review submitted', timestamp: '2 days ago' },
]

export const monthlyTrendData = [
  { month: 'Jun', requests: 45, responses: 32, avgRating: 4.2 },
  { month: 'Jul', requests: 52, responses: 38, avgRating: 4.3 },
  { month: 'Aug', requests: 48, responses: 35, avgRating: 4.1 },
  { month: 'Sep', requests: 61, responses: 44, avgRating: 4.4 },
  { month: 'Oct', requests: 55, responses: 42, avgRating: 4.5 },
  { month: 'Nov', requests: 68, responses: 51, avgRating: 4.6 },
]
