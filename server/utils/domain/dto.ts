import type { Domain, DomainEvent } from '~~/prisma/generated/prisma/client'
import type {
  DomainDTO,
  DomainEventDTO,
  DomainPhaseName
} from '~~/shared/types/domain'

export const toDomainDTO = (d: Domain): DomainDTO => ({
  id: d.id,
  domain: d.domain,
  tld: d.tld,
  note: d.note,
  enabled: d.enabled,
  isRegistered: d.is_registered,
  phase: d.phase as DomainPhaseName,
  statuses: d.statuses,
  registrar: d.registrar,
  expirationDate: d.expiration_date?.toISOString() ?? null,
  predictedDropAt: d.predicted_drop_at?.toISOString() ?? null,
  source: d.source,
  lastCheckedAt: d.last_checked_at?.toISOString() ?? null,
  nextCheckAt: d.next_check_at?.toISOString() ?? null,
  lastError: d.last_error,
  createdAt: d.created_at.toISOString(),
  updatedAt: d.updated_at.toISOString()
})

export const toDomainEventDTO = (e: DomainEvent): DomainEventDTO => ({
  id: e.id,
  type: e.type,
  fromPhase: (e.from_phase as DomainPhaseName | null) ?? null,
  toPhase: (e.to_phase as DomainPhaseName | null) ?? null,
  message: e.message,
  createdAt: e.created_at.toISOString()
})
