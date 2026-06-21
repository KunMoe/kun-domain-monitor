import { destroySession } from '~~/server/utils/session'
import { revokeToken } from '~~/server/utils/oauth'
import { defineKunApi } from '~~/server/utils/wrap'

export default defineKunApi(async (event) => {
  const rec = await destroySession(event)
  if (rec?.refresh_token) {
    await revokeToken(rec.refresh_token)
  }
  return { ok: true }
})
