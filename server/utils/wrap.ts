import { defineEventHandler, isError } from 'h3'
import type { H3Event } from 'h3'
import { kunError } from './kunError'

/**
 * Wrap a route handler. Handlers should return either:
 * - a value (object/array/number/etc.) → returned as-is
 * - a string → treated as a business error and sent via kunError(233)
 *
 * No need to use try/catch inside individual handlers.
 */
export const defineKunApi = <T = unknown>(
  handler: (event: H3Event) => T | string | Promise<T | string>
) =>
  defineEventHandler(async (event) => {
    try {
      const result = await handler(event)
      if (typeof result === 'string') {
        return kunError(event, result, 233, 233)
      }
      return result
    } catch (e) {
      // Intentional HTTP errors (401/403 from requireRen, etc.) must surface to
      // the client, not be flattened to 500.
      if (isError(e)) {
        throw e
      }
      console.error('[api] unhandled error:', e)
      return kunError(event, 'Server internal error', 233, 500)
    }
  })
