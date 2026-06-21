import type { DomainEventDTO } from '~~/shared/types/domain'
import { prisma } from '~~/prisma/prisma'
import { requireRen } from '~~/server/utils/requireRen'
import { defineKunApi } from '~~/server/utils/wrap'
import { toDomainEventDTO } from '~~/server/utils/domain/dto'

export default defineKunApi(async (event): Promise<DomainEventDTO[]> => {
  await requireRen(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) return []

  const events = await prisma.domainEvent.findMany({
    where: { domain_id: id },
    orderBy: { created_at: 'desc' },
    take: 50
  })
  return events.map(toDomainEventDTO)
})
