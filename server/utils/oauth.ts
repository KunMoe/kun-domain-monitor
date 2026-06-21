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

interface Envelope<T> {
  code: number
  message: string
  data: T
}

const unwrap = <T>(res: Envelope<T>): T => {
  if (!res || res.code !== 0) {
    throw createError({
      statusCode: 502,
      data: { code: res?.code ?? -1, message: res?.message ?? 'OAuth upstream error' }
    })
  }
  return res.data
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
  const res = await $fetch<Envelope<OAuthTokens>>(
    `${config.OAUTH_SERVER_URL}/oauth/token`,
    {
      method: 'POST',
      body: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: resolveRedirectUri(event),
        client_id: config.OAUTH_CLIENT_ID,
        client_secret: config.OAUTH_CLIENT_SECRET,
        code_verifier: verifier
      }
    }
  )
  return unwrap(res)
}

export const fetchUserInfo = async (
  accessToken: string
): Promise<OAuthUserInfo> => {
  const config = useRuntimeConfig()
  const res = await $fetch<Envelope<OAuthUserInfo>>(
    `${config.OAUTH_SERVER_URL}/oauth/userinfo`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  return unwrap(res)
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
