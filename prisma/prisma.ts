import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client'

declare global {
  var __kunDomainMonitorPrisma: PrismaClient | undefined
}

const GLOBAL_KEY = '__kunDomainMonitorPrisma'

const getConnectionString = (): string => {
  // Try process.env first (works in dev with dotenv loaded by Nuxt)
  if (process.env.KUN_DATABASE_URL) {
    return process.env.KUN_DATABASE_URL
  }

  // Fallback to runtimeConfig (works in the production build)
  try {
    const config = useRuntimeConfig()
    if (config.KUN_DATABASE_URL) {
      return config.KUN_DATABASE_URL
    }
  } catch {
    // useRuntimeConfig may not be available in all contexts
  }

  throw new Error('Database URL is not configured (KUN_DATABASE_URL)')
}

const getPrismaClient = (): PrismaClient => {
  if (globalThis[GLOBAL_KEY]) {
    return globalThis[GLOBAL_KEY] as PrismaClient
  }

  const connectionString = getConnectionString()
  const adapter = new PrismaPg({ connectionString })
  const client = new PrismaClient({ adapter })

  globalThis[GLOBAL_KEY] = client
  return client
}

// Proxy for lazy initialization — the client is only built on first access.
const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return getPrismaClient()[prop as keyof PrismaClient]
  }
})

export { prisma, getPrismaClient }
