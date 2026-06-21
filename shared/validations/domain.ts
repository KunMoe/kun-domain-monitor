import { z } from 'zod'

export const createDomainSchema = z.object({
  domain: z.string().trim().min(3).max(253),
  note: z.string().trim().max(500).optional()
})

export const updateDomainSchema = z.object({
  enabled: z.boolean().optional(),
  note: z.string().trim().max(500).nullable().optional()
})
