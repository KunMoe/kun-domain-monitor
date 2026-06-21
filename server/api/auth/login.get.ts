import { generatePkce, buildAuthorizeUrl } from '~~/server/utils/oauth'
import { OAUTH_VERIFIER_COOKIE, OAUTH_STATE_COOKIE } from '~~/shared/app'

// Start of the OAuth dance. Generate PKCE, stash verifier + state in short-lived
// httpOnly cookies (scoped to /api/auth so they ride along to the callback),
// then 302 the browser to the OAuth provider's authorize endpoint.
export default defineEventHandler((event) => {
  const { verifier, challenge, state } = generatePkce()

  const cookieOpts = {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax' as const,
    path: '/api/auth',
    maxAge: 600 // 10 min — the authorize round-trip
  }
  setCookie(event, OAUTH_VERIFIER_COOKIE, verifier, cookieOpts)
  setCookie(event, OAUTH_STATE_COOKIE, state, cookieOpts)

  return sendRedirect(event, buildAuthorizeUrl(event, challenge, state), 302)
})
