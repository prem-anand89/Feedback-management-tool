import { Route as RootRoute } from './routes/__root'
import { Route as IndexRoute } from './routes/index'
import { Route as LoginRoute } from './routes/login'
import { Route as SignUpRoute } from './routes/signup'
import { Route as SetupRoute } from './routes/setup'
import { Route as DashboardRoute } from './routes/dashboard'
import { Route as AppointmentsRoute } from './routes/appointments'
import { Route as FeedbackRoute } from './routes/feedback'
import { Route as ComplaintsRoute } from './routes/complaints'
import { Route as PatientsRoute } from './routes/patients'
import { Route as AnalyticsRoute } from './routes/analytics'
import { Route as SettingsRoute } from './routes/settings'
import { Route as BookRoute } from './routes/book.$clinicId'
import { Route as FRoute } from './routes/f'
import { Route as FTokenRoute } from './routes/f/$token'
import { Route as FTokenIndexRoute } from './routes/f/$token/index'
import { Route as FTokenFormRoute } from './routes/f/$token/form'
import { Route as FTokenThankYouRoute } from './routes/f/$token/thank-you'
import { Route as FTokenSorryRoute } from './routes/f/$token/sorry'

export const routeTree = RootRoute.addChildren([
  IndexRoute,
  LoginRoute,
  SignUpRoute,
  SetupRoute,
  DashboardRoute,
  AppointmentsRoute,
  FeedbackRoute,
  ComplaintsRoute,
  PatientsRoute,
  AnalyticsRoute,
  SettingsRoute,
  BookRoute,
  FRoute.addChildren([
    FTokenRoute.addChildren([
      FTokenIndexRoute,
      FTokenFormRoute,
      FTokenThankYouRoute,
      FTokenSorryRoute,
    ]),
  ]),
])
