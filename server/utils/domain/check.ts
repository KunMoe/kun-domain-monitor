import type { Domain } from '~~/prisma/generated/prisma/client'
import type { DomainPhaseName } from '~~/shared/types/domain'
import { prisma } from '~~/prisma/prisma'
import { lookupDomain } from './rdap'
import {
  derivePhase,
  computeNextCheckAt,
  computePredictedDrop
} from './lifecycle'
import { notify } from '~~/server/utils/notify'

/** Re-query one domain, persist the new snapshot, emit events + notifications. */
export const checkDomain = async (d: Domain): Promise<void> => {
  const config = useRuntimeConfig()
  const prevPhase = d.phase as DomainPhaseName
  const snap = await lookupDomain(d.domain, config.monitor.lookupTimeoutMs)

  // ---- lookup failed: back off, record once per failure streak ----
  if (!snap.ok) {
    const errors = d.consecutive_errors + 1
    await prisma.domain.update({
      where: { id: d.id },
      data: {
        last_checked_at: new Date(),
        last_error: snap.error ?? 'unknown error',
        consecutive_errors: errors,
        next_check_at: computeNextCheckAt('UNKNOWN', {
          expirationDate: d.expiration_date?.toISOString() ?? null,
          predictedDropAt: d.predicted_drop_at,
          consecutiveErrors: errors
        })
      }
    })
    if (d.consecutive_errors === 0) {
      await prisma.domainEvent.create({
        data: {
          domain_id: d.id,
          type: 'CHECK_ERROR',
          message: snap.error ?? 'lookup failed'
        }
      })
    }
    return
  }

  // ---- success: classify + persist ----
  const phase = derivePhase(snap)
  const predictedDrop = computePredictedDrop(phase, prevPhase, d.predicted_drop_at)

  await prisma.domain.update({
    where: { id: d.id },
    data: {
      is_registered: snap.isRegistered,
      phase,
      statuses: snap.statuses,
      registrar: snap.registrar,
      registrar_url: snap.registrarUrl,
      registrar_iana_id: snap.registrarIanaId,
      expiration_date: snap.expirationDate ? new Date(snap.expirationDate) : null,
      creation_date: snap.creationDate ? new Date(snap.creationDate) : null,
      updated_date: snap.updatedDate ? new Date(snap.updatedDate) : null,
      nameservers: snap.nameservers,
      dnssec: snap.dnssec,
      transfer_lock: snap.transferLock,
      predicted_drop_at: predictedDrop,
      source: snap.source,
      last_checked_at: new Date(),
      last_error: null,
      consecutive_errors: 0,
      next_check_at: computeNextCheckAt(phase, {
        expirationDate: snap.expirationDate,
        predictedDropAt: predictedDrop,
        consecutiveErrors: 0
      })
    }
  })

  if (phase !== prevPhase) {
    await emitPhaseEvents(d.id, d.domain, prevPhase, phase, predictedDrop)
  }
}

/** Write the audit event(s) for a phase transition and alert on the big ones. */
const emitPhaseEvents = async (
  id: number,
  domain: string,
  from: DomainPhaseName,
  to: DomainPhaseName,
  predictedDrop: Date | null
): Promise<void> => {
  await prisma.domainEvent.create({
    data: { domain_id: id, type: 'PHASE_CHANGE', from_phase: from, to_phase: to }
  })

  // First successful classification (we were UNKNOWN): record only, no alert.
  if (from === 'UNKNOWN') return

  if (to === 'REDEMPTION') {
    await prisma.domainEvent.create({
      data: {
        domain_id: id,
        type: 'ENTERED_REDEMPTION',
        from_phase: from,
        to_phase: to,
        message: '已过期，进入赎回期'
      }
    })
    await notify({
      domain,
      type: 'ENTERED_REDEMPTION',
      fromPhase: from,
      toPhase: to,
      message: '已过期进入赎回期，预计随后进入待删除阶段'
    })
  }

  if (to === 'PENDING_DELETE') {
    const drop = predictedDrop?.toISOString() ?? null
    await prisma.domainEvent.create({
      data: {
        domain_id: id,
        type: 'ENTERED_PENDING_DELETE',
        from_phase: from,
        to_phase: to,
        message: '已进入待删除阶段',
        payload: { predictedDropAt: drop }
      }
    })
    await notify({
      domain,
      type: 'ENTERED_PENDING_DELETE',
      fromPhase: from,
      toPhase: to,
      message: `已进入待删除，预计 ${drop ?? '约 5 天后'} 掉落`,
      predictedDropAt: drop
    })
  }

  if (to === 'AVAILABLE') {
    await prisma.domainEvent.create({
      data: {
        domain_id: id,
        type: 'NOW_AVAILABLE',
        from_phase: from,
        to_phase: to,
        message: '已掉落，立即可注册'
      }
    })
    await notify({
      domain,
      type: 'NOW_AVAILABLE',
      fromPhase: from,
      toPhase: to,
      message: '已掉落，立即可抢注！'
    })
  }
}
