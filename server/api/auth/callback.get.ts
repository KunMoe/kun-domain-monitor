import { exchangeCode, fetchUserInfo } from '~~/server/utils/oauth'
import { createSession } from '~~/server/utils/session'
import { OAUTH_VERIFIER_COOKIE, OAUTH_STATE_COOKIE } from '~~/shared/app'

// OAuth provider redirects here with ?code&state. Validate state, exchange the
// code for tokens, read userinfo, enforce the `ren` gate, then mint a session.
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = typeof query.code === 'string' ? query.code : ''
  const returnedState = typeof query.state === 'string' ? query.state : ''
  const verifier = getCookie(event, OAUTH_VERIFIER_COOKIE)
  const savedState = getCookie(event, OAUTH_STATE_COOKIE)

  // One-shot cookies — clear regardless of outcome.
  deleteCookie(event, OAUTH_VERIFIER_COOKIE, { path: '/api/auth' })
  deleteCookie(event, OAUTH_STATE_COOKIE, { path: '/api/auth' })

  if (!code || !returnedState || !verifier || returnedState !== savedState) {
    return sendRedirect(event, '/login?error=invalid_callback', 302)
  }

  try {
    const tokens = await exchangeCode(event, code, verifier)
    const info = await fetchUserInfo(tokens.access_token)
    const roles = info.roles ?? []

    // The `ren` gate: anyone else is refused at the door.
    if (!roles.includes('ren')) {
      return sendRedirect(event, '/login?error=forbidden', 302)
    }

    await createSession(event, {
      id: info.id,
      sub: info.sub,
      name: info.name ?? '',
      picture: info.picture ?? '',
      roles,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000
    })

    return sendRedirect(event, '/', 302)
  } catch (e) {
    console.error('[auth] callback failed:', e)
    return sendRedirect(event, '/login?error=oauth_failed', 302)
  }
})
