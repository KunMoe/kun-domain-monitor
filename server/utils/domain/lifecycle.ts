import type { DomainPhaseName } from '~~/shared/types/domain'
import type { RdapLookupResult } from './rdap'

// Normalize an EPP status string for comparison: 'pendingDelete' -> 'pendingdelete'.
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')

const PENDING_DELETE_CODES = new Set(['pendingdelete'])
const REDEMPTION_CODES = new Set(['redemptionperiod', 'pendingrestore'])
const AUTO_RENEW_CODES = new Set(['autorenewperiod'])

/**
 * Map an RDAP snapshot to a lifecycle phase. Order matters: the closer-to-drop
 * phases win. When in doubt we return UNKNOWN rather than guess — a wrong
 * AVAILABLE would fire a false "go register now" alert.
 */
export const derivePhase = (snap: RdapLookupResult): DomainPhaseName => {
  if (!snap.ok) return 'UNKNOWN'
  if (snap.isRegistered === false) return 'AVAILABLE'
  if (snap.isRegistered !== true) return 'UNKNOWN'

  const codes = snap.statuses.map(norm)
  if (codes.some((c) => PENDING_DELETE_CODES.has(c))) return 'PENDING_DELETE'
  if (codes.some((c) => REDEMPTION_CODES.has(c))) return 'REDEMPTION'
  if (codes.some((c) => AUTO_RENEW_CODES.has(c))) return 'AUTO_RENEW'

  // Some registries keep status `ok` through the auto-renew grace window and
  // only signal it via an expiration date already in the past. Best-effort:
  // "registered but already past expiry" => grace phase.
  if (snap.expirationDate) {
    const exp = new Date(snap.expirationDate).getTime()
    if (!Number.isNaN(exp) && exp < Date.now()) return 'AUTO_RENEW'
  }
  return 'ACTIVE'
}

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const PENDING_DELETE_DAYS = 5

// ±15% jitter so domains added in the same batch don't resync into a herd.
const jitter = (ms: number) => Math.round(ms * (0.85 + Math.random() * 0.3))

/**
 * Adaptive cadence: cheap when far from any action, aggressive near the drop.
 * Returns the next time this domain should be re-queried.
 */
export const computeNextCheckAt = (
  phase: DomainPhaseName,
  opts: {
    expirationDate: string | null
    predictedDropAt: Date | null
    consecutiveErrors: number
  }
): Date => {
  const now = Date.now()

  if (phase === 'UNKNOWN') {
    // Exponential backoff with jitter: 15m, 30m, 1h, … capped at 24h.
    const base = 15 * 60 * 1000
    const backoff = Math.min(
      base * 2 ** Math.min(opts.consecutiveErrors, 7),
      DAY
    )
    return new Date(now + jitter(backoff))
  }

  if (phase === 'AVAILABLE') {
    // Job done — but re-confirm daily in case someone else grabs it.
    return new Date(now + jitter(DAY))
  }

  if (phase === 'PENDING_DELETE') {
    if (opts.predictedDropAt) {
      const untilDrop = opts.predictedDropAt.getTime() - now
      if (untilDrop <= HOUR) return new Date(now + jitter(60 * 1000)) // T-1h: every ~1 min
      if (untilDrop <= DAY) return new Date(now + jitter(5 * 60 * 1000)) // T-24h: every ~5 min
    }
    return new Date(now + jitter(15 * 60 * 1000)) // otherwise every ~15 min
  }

  if (phase === 'REDEMPTION') return new Date(now + jitter(6 * HOUR))
  if (phase === 'AUTO_RENEW') return new Date(now + jitter(DAY))

  // ACTIVE: cadence tightens as expiry approaches.
  if (opts.expirationDate) {
    const untilExpiry = new Date(opts.expirationDate).getTime() - now
    if (!Number.isNaN(untilExpiry) && untilExpiry < 90 * DAY) {
      return new Date(now + jitter(DAY))
    }
  }
  return new Date(now + jitter(7 * DAY))
}

/**
 * The first time we observe PENDING_DELETE, lock in an estimated drop time of
 * now + 5 days (the registry pendingDelete window for gTLDs) and hold it stable
 * on subsequent checks. It's an upper bound — we may have observed mid-window —
 * good enough to drive the countdown alerts. (gTLD releases cluster around
 * 14:00 UTC; refine per-TLD later if needed.)
 */
export const computePredictedDrop = (
  phase: DomainPhaseName,
  prevPhase: DomainPhaseName,
  existing: Date | null
): Date | null => {
  if (phase !== 'PENDING_DELETE') return null
  if (prevPhase === 'PENDING_DELETE' && existing) return existing
  return new Date(Date.now() + PENDING_DELETE_DAYS * DAY)
}
