import { createError } from 'h3'
import type { H3Event } from 'h3'
import type { SessionUser } from '~~/shared/types/domain'
import { getSessionUser } from './session'

export const requireUser = async (event: H3Event): Promise<SessionUser> => {
  const user = await getSessionUser(event)
  if (!user) {
    throw createError({ statusCode: 401, data: { code: 401, message: '未登录' } })
  }
  return user
}

/**
 * Server-side `ren` gate. The frontend store's `isRen` only drives UI; this is
 * where access is actually enforced. Use at the top of every protected route.
 */
export const requireRen = async (event: H3Event): Promise<SessionUser> => {
  const user = await requireUser(event)
  if (!user.isRen) {
    throw createError({
      statusCode: 403,
      data: { code: 403, message: '需要 ren 角色权限' }
    })
  }
  return user
}
