// Namespace for everything this app writes into the shared Redis instance
// (sessions, rate-limit buckets, …). Keep it unique across the kun fleet so
// co-located apps on one Redis don't collide.
export const APP_REDIS_PREFIX = 'kun:domain:monitor'

// httpOnly cookie carrying the Redis session id after OAuth login.
export const SESSION_COOKIE = 'kdm_session'

// Short-lived httpOnly cookies holding the PKCE verifier + CSRF state during
// the OAuth round-trip (scoped to /api/auth).
export const OAUTH_VERIFIER_COOKIE = 'kdm_oauth_verifier'
export const OAUTH_STATE_COOKIE = 'kdm_oauth_state'
