import { createError } from 'h3'
import type { SessionUser } from '~~/shared/types/domain'
import { getSessionUser } from '~~/server/utils/session'
import { defineKunApi } from '~~/server/utils/wrap'

export default defineKunApi(async (event): Promise<SessionUser> => {
  const user = await getSessionUser(event)
  if (!user) {
    throw createError({ statusCode: 401, data: { code: 401, message: '未登录' } })
  }
  return user
})
