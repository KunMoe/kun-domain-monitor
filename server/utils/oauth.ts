import { createHash, randomBytes } from 'node:crypto'
import { createError, getRequestURL } from 'h3'
import type { H3Event } from 'h3'

// OAuth 2.0 Authorization Code + PKCE (S256) client against ../kun-galgame-infra.
// Confidential client: client_secret stays server-side; the whole dance runs in
// Nitro so the PKCE verifier never reaches the browser's JS.

export interface OAuthTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  scope?: string
}

export interface OAuthUserInfo {
  id: number
  sub: string
  name?: string
  email?: string
  picture?: string
  roles?: string[]
  updated_at?: number
}

const upstreamError = (code: number, message: string) =>
  createError({ statusCode: 502, data: { code, message } })

/**
 * Read a body from one of the OAuth server's *protocol* endpoints
 * (/oauth/token, /oauth/userinfo, /oauth/revoke). These speak RFC 6749 / 6750:
 * bare top-level JSON on success, `{ error, error_description }` on failure.
 * The house `{ code, message, data }` envelope lives on house endpoints only
 * and never appears here. `$fetch` already throws on non-2xx, so the error
 * branch below is a belt-and-braces guard.
 */
const readWire = <T>(res: unknown): T => {
  if (res === null || typeof res !== 'object') {
    throw upstreamError(-1, 'OAuth upstream returned a non-object body')
  }
  const body = res as Record<string, unknown>
  if (typeof body.error === 'string') {
    throw upstreamError(-1, String(body.error_description ?? body.error))
  }
  return body as T
}

export const generatePkce = () => {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const state = randomBytes(16).toString('hex')
  return { verifier, challenge, state }
}

// authorize + token must use the SAME redirect_uri. Configured value wins;
// otherwise derive it from the incoming request origin (same host either way).
export const resolveRedirectUri = (event: H3Event): string => {
  const config = useRuntimeConfig()
  if (config.OAUTH_REDIRECT_URI) return config.OAUTH_REDIRECT_URI
  return `${getRequestURL(event).origin}/api/auth/callback`
}

export const buildAuthorizeUrl = (
  event: H3Event,
  challenge: string,
  state: string
): string => {
  const config = useRuntimeConfig()
  const params = new URLSearchParams({
    client_id: config.OAUTH_CLIENT_ID,
    redirect_uri: resolveRedirectUri(event),
    response_type: 'code',
    scope: config.OAUTH_SCOPE,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256'
  })
  return `${config.OAUTH_SERVER_URL}/oauth/authorize?${params}`
}

export const exchangeCode = async (
  event: H3Event,
  code: string,
  verifier: string
): Promise<OAuthTokens> => {
  const config = useRuntimeConfig()
  const res = await $fetch<unknown>(`${config.OAUTH_SERVER_URL}/oauth/token`, {
    method: 'POST',
    body: {
      grant_type: 'authorization_code',
      code,
      redirect_uri: resolveRedirectUri(event),
      client_id: config.OAUTH_CLIENT_ID,
      client_secret: config.OAUTH_CLIENT_SECRET,
      code_verifier: verifier
    }
  })
  return readWire<OAuthTokens>(res)
}

export const fetchUserInfo = async (
  accessToken: string
): Promise<OAuthUserInfo> => {
  const config = useRuntimeConfig()
  const res = await $fetch<unknown>(`${config.OAUTH_SERVER_URL}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  return readWire<OAuthUserInfo>(res)
}

// RFC 7009: best-effort, always succeeds from the caller's POV.
export const revokeToken = async (refreshToken: string): Promise<void> => {
  const config = useRuntimeConfig()
  try {
    await $fetch(`${config.OAUTH_SERVER_URL}/oauth/revoke`, {
      method: 'POST',
      body: { token: refreshToken }
    })
  } catch {
    // ignore
  }
}
