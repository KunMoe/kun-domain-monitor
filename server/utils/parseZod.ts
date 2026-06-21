import { type H3Event, getQuery, readBody } from 'h3'
import type { z, ZodType } from 'zod'

export const kunParseGetQuery = <T extends ZodType>(
  event: H3Event,
  schema: T
): z.infer<T> | string => {
  const result = schema.safeParse(getQuery(event))
  if (!result.success) return result.error.message
  return result.data
}

export const kunParsePostBody = async <T extends ZodType>(
  event: H3Event,
  schema: T
): Promise<z.infer<T> | string> => {
  const result = schema.safeParse(await readBody(event))
  if (!result.success) return result.error.message
  return result.data
}

export const kunParsePutBody = kunParsePostBody
