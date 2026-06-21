import type { DomainDTO } from '~~/shared/types/domain'
import { prisma } from '~~/prisma/prisma'
import { requireRen } from '~~/server/utils/requireRen'
import { defineKunApi } from '~~/server/utils/wrap'
import { checkDomain } from '~~/server/utils/domain/check'
import { toDomainDTO } from '~~/server/utils/domain/dto'

// Force an immediate re-check (the "立即检查" button), bypassing the schedule.
export default defineKunApi(async (event): Promise<DomainDTO | string> => {
  await requireRen(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) return '无效的 id'

  const d = await prisma.domain.findUnique({ where: { id } })
  if (!d) return '未找到该域名'

  await checkDomain(d)

  const updated = await prisma.domain.findUnique({ where: { id } })
  return toDomainDTO(updated!)
})
