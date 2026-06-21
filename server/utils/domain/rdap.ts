import { lookup } from 'rdapper'

// rdapper is RDAP-first (the ICANN-mandated standard since 2025-01-28) with
// automatic WHOIS fallback for TLDs that don't yet serve RDAP. It returns a
// normalized record, so we don't parse registry-specific text ourselves.

// IANA's RDAP bootstrap registry maps each TLD → its authoritative RDAP server.
// rdapper would refetch this ~200KB file on every lookup; cache it for 24h.
let bootstrapCache: unknown = null
let bootstrapExpiry = 0
const BOOTSTRAP_TTL_MS = 24 * 60 * 60 * 1000

const getBootstrap = async (): Promise<unknown> => {
  const now = Date.now()
  if (bootstrapCache && now < bootstrapExpiry) {
    return bootstrapCache
  }
  try {
    const res = await fetch('https://data.iana.org/rdap/dns.json')
    if (res.ok) {
      bootstrapCache = await res.json()
      bootstrapExpiry = now + BOOTSTRAP_TTL_MS
    }
  } catch {
    // Non-fatal: if our cache fetch fails, rdapper fetches bootstrap itself.
  }
  return bootstrapCache
}

export interface RdapLookupResult {
  ok: boolean
  isRegistered: boolean | null
  /** Raw EPP status codes, e.g. ['clientTransferProhibited', 'pendingDelete']. */
  statuses: string[]
  registrar: string | null
  /** ISO 8601 UTC, or null. */
  expirationDate: string | null
  source: 'rdap' | 'whois' | null
  error?: string
}

export const lookupDomain = async (
  domain: string,
  timeoutMs: number
): Promise<RdapLookupResult> => {
  const bootstrap = await getBootstrap()

  const { ok, record, error } = await lookup(domain, {
    timeoutMs,
    ...(bootstrap ? { customBootstrapData: bootstrap as never } : {})
  })

  if (!ok || !record) {
    return {
      ok: false,
      isRegistered: null,
      statuses: [],
      registrar: null,
      expirationDate: null,
      source: null,
      error: error || 'RDAP/WHOIS lookup failed'
    }
  }

  return {
    ok: true,
    isRegistered: record.isRegistered ?? null,
    statuses: (record.statuses ?? []).map((s: { status: string }) => s.status),
    registrar: record.registrar?.name ?? null,
    expirationDate: record.expirationDate ?? null,
    source: record.source ?? null
  }
}
