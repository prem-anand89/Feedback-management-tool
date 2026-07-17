/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { ApiFromModules, FilterApi, FunctionReference } from 'convex/server'
import { anyApi } from 'convex/server'
import type * as appointmentRequests from '../appointmentRequests'
import type * as appointments from '../appointments'
import type * as auth_config from '../auth.config'
import type * as clinics from '../clinics'
import type * as complaints from '../complaints'
import type * as emails from '../emails'
import type * as feedback from '../feedback'
import type * as http from '../http'
import type * as lib_auth from '../lib/auth'
import type * as patients from '../patients'
import type * as reviews from '../reviews'
import type * as visits from '../visits'
import type * as whatsapp from '../whatsapp'

const fullApi: ApiFromModules<{
  appointmentRequests: typeof appointmentRequests
  appointments: typeof appointments
  'auth.config': typeof auth_config
  clinics: typeof clinics
  complaints: typeof complaints
  emails: typeof emails
  feedback: typeof feedback
  http: typeof http
  'lib/auth': typeof lib_auth
  patients: typeof patients
  reviews: typeof reviews
  visits: typeof visits
  whatsapp: typeof whatsapp
}> = anyApi as any

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export const api: FilterApi<typeof fullApi, FunctionReference<any, 'public'>> = anyApi as any

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export const internal: FilterApi<typeof fullApi, FunctionReference<any, 'internal'>> = anyApi as any
