import type { DomainDTO } from '~~/shared/types/domain'
import { prisma } from '~~/prisma/prisma'
import { requireRen } from '~~/server/utils/requireRen'
import { defineKunApi } from '~~/server/utils/wrap'
import { kunParsePutBody } from '~~/server/utils/parseZod'
import { toDomainDTO } from '~~/server/utils/domain/dto'
import { updateDomainSchema } from '~~/shared/validations/domain'

export default defineKunApi(async (event): Promise<DomainDTO | string> => {
  await requireRen(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) return '无效的 id'

  const input = await kunParsePutBody(event, updateDomainSchema)
  if (typeof input === 'string') return input

  const row = await prisma.domain.update({
    where: { id },
    data: {
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.note !== undefined ? { note: input.note } : {})
    }
  })
  return toDomainDTO(row)
})
