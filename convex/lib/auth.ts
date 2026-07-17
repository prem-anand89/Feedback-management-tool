import { QueryCtx, MutationCtx } from '../_generated/server'
import { Doc } from '../_generated/dataModel'

// Resolves the calling Clerk user to their staffUsers row. Throws if there's
// no authenticated identity or no staff record for it — callers should only
// invoke this from functions where being staff is required to proceed.
export async function requireStaffUser(ctx: QueryCtx | MutationCtx): Promise<Doc<'staffUsers'>> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error('Not authenticated')

  const staffUser = await ctx.db
    .query('staffUsers')
    .withIndex('by_user', (q) => q.eq('userId', identity.subject))
    .first()

  if (!staffUser) throw new Error('No staff record found for this user')

  return staffUser
}

export async function requireOwner(ctx: QueryCtx | MutationCtx): Promise<Doc<'staffUsers'>> {
  const staffUser = await requireStaffUser(ctx)
  if (staffUser.role !== 'owner') throw new Error('Only clinic owners can perform this action')
  return staffUser
}
