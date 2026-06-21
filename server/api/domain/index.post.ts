import { toRegistrableDomain } from 'rdapper'
import type { DomainDTO } from '~~/shared/types/domain'
import { prisma } from '~~/prisma/prisma'
import { requireRen } from '~~/server/utils/requireRen'
import { defineKunApi } from '~~/server/utils/wrap'
import { kunParsePostBody } from '~~/server/utils/parseZod'
import { toDomainDTO } from '~~/server/utils/domain/dto'
import { createDomainSchema } from '~~/shared/validations/domain'

export default defineKunApi(async (event): Promise<DomainDTO | string> => {
  const user = await requireRen(event)

  const input = await kunParsePostBody(event, createDomainSchema)
  if (typeof input === 'string') return input

  // Normalize to the registrable domain (strips scheme/subdomain/path, lowercases).
  const normalized = toRegistrableDomain(input.domain)?.toLowerCase()
  if (!normalized || !normalized.includes('.')) {
    return '无法解析为有效的可注册域名'
  }
  const tld = normalized.split('.').slice(1).join('.')

  const existing = await prisma.domain.findUnique({ where: { domain: normalized } })
  if (existing) return '该域名已在监控列表中'

  const row = await prisma.domain.create({
    data: {
      domain: normalized,
      tld,
      added_by_uuid: user.sub,
      note: input.note ?? null,
      // Pick it up on the very next tick.
      next_check_at: new Date()
    }
  })
  return toDomainDTO(row)
})
