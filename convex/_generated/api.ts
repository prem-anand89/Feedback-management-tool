/* eslint-disable */
/**
 * Hand-written stand-in for Convex's generated `api` utility — this sandbox
 * has no network access to run `npx convex dev`, which would normally
 * produce this file. Deliberately untyped (`any`) rather than derived via
 * `ApiFromModules`: deriving real types from the sibling modules produced a
 * circular type reference once `complaints.ts` referenced `internal` on
 * itself. Run `npx convex dev` once real codegen is possible to replace this
 * with a fully-typed version.
 *
 * @module
 */

import { anyApi } from 'convex/server'

export const api: any = anyApi
export const internal: any = anyApi
