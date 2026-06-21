import { randomBytes } from 'node:crypto'
import { getCookie, setCookie, deleteCookie } from 'h3'
import type { H3Event } from 'h3'
import type { SessionUser } from '~~/shared/types/domain'
import { SESSION_COOKIE, APP_REDIS_PREFIX } from '~~/shared/app'

interface SessionRecord {
  id: number
  sub: string
  name: string
  picture: string
  roles: string[]
  access_token: string
  refresh_token: string
  /** ms epoch when the access_token expires. */
  expires_at: number
}

// Align session lifetime with the refresh token (7d). Re-login after that.
const SESSION_TTL_SEC = 7 * 24 * 60 * 60

const sessionKey = (sid: string) => `${APP_REDIS_PREFIX}:session:${sid}`

export const createSession = async (
  event: H3Event,
  rec: SessionRecord
): Promise<void> => {
  const sid = randomBytes(32).toString('base64url')
  // Store the object directly — unstorage JSON-(de)serializes it for us.
  // (Do NOT JSON.stringify here: getItem runs destr() and would return a
  // parsed object, so a manual JSON.parse on read would then throw.)
  await useStorage('redis').setItem(sessionKey(sid), rec, { ttl: SESSION_TTL_SEC })
  setCookie(event, SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SEC
  })
}

const getSessionRecord = async (
  event: H3Event
): Promise<SessionRecord | null> => {
  const sid = getCookie(event, SESSION_COOKIE)
  if (!sid) return null
  return (await useStorage('redis').getItem<SessionRecord>(sessionKey(sid))) ?? null
}

export const getSessionUser = async (
  event: H3Event
): Promise<SessionUser | null> => {
  const rec = await getSessionRecord(event)
  if (!rec) return null
  return {
    id: rec.id,
    sub: rec.sub,
    name: rec.name,
    picture: rec.picture,
    roles: rec.roles,
    isRen: rec.roles.includes('ren')
  }
}

export const destroySession = async (
  event: H3Event
): Promise<SessionRecord | null> => {
  const sid = getCookie(event, SESSION_COOKIE)
  if (!sid) return null
  const rec = await getSessionRecord(event)
  await useStorage('redis').removeItem(sessionKey(sid))
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
  return rec
}
