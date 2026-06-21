import type { DomainDTO } from '~~/shared/types/domain'
import { prisma } from '~~/prisma/prisma'
import { requireRen } from '~~/server/utils/requireRen'
import { defineKunApi } from '~~/server/utils/wrap'
import { toDomainDTO } from '~~/server/utils/domain/dto'

export default defineKunApi(async (event): Promise<DomainDTO[]> => {
  await requireRen(event)
  const rows = await prisma.domain.findMany({ orderBy: { created_at: 'desc' } })
  return rows.map(toDomainDTO)
})
