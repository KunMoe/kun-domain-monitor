import { prisma } from '~~/prisma/prisma'
import { requireRen } from '~~/server/utils/requireRen'
import { defineKunApi } from '~~/server/utils/wrap'

export default defineKunApi(async (event) => {
  await requireRen(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) return '无效的 id'

  await prisma.domain.delete({ where: { id } }).catch(() => null)
  return { ok: true }
})
