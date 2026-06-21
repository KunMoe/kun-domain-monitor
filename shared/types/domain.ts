export type DomainPhaseName =
  | 'ACTIVE'
  | 'AUTO_RENEW'
  | 'REDEMPTION'
  | 'PENDING_DELETE'
  | 'AVAILABLE'
  | 'UNKNOWN'

// Trimmed, serializable view of a Domain row returned by the API.
export interface DomainDTO {
  id: number
  domain: string
  tld: string
  note: string | null
  enabled: boolean
  isRegistered: boolean | null
  phase: DomainPhaseName
  statuses: string[]
  registrar: string | null
  registrarUrl: string | null
  registrarIanaId: string | null
  expirationDate: string | null
  creationDate: string | null
  updatedDate: string | null
  nameservers: string[]
  dnssec: boolean | null
  transferLock: boolean | null
  predictedDropAt: string | null
  source: string | null
  lastCheckedAt: string | null
  nextCheckAt: string | null
  lastError: string | null
  createdAt: string
  updatedAt: string
}

export interface DomainEventDTO {
  id: number
  type: string
  fromPhase: DomainPhaseName | null
  toPhase: DomainPhaseName | null
  message: string | null
  createdAt: string
}

// The authenticated user, derived from the OAuth session.
export interface SessionUser {
  id: number
  sub: string
  name: string
  picture: string
  roles: string[]
  isRen: boolean
}
