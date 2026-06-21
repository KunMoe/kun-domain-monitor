import { prisma } from '~~/prisma/prisma'
import { checkDomain } from '~~/server/utils/domain/check'

/**
 * In-stack poller. Nitro's scheduler (nuxt.config -> nitro.scheduledTasks) fires
 * this every minute. Each tick pulls the domains whose next_check_at has passed
 * and re-queries them. Cadence is per-domain (see computeNextCheckAt), so a far-
 * from-expiry domain is only touched weekly while one in pendingDelete is hit
 * every minute near the predicted drop.
 *
 * Sequential processing keeps us well-mannered toward RDAP servers; batchSize
 * caps work per tick. Raise both once the watchlist grows.
 */
export default defineTask({
  meta: {
    name: 'domain:tick',
    description: 'Poll due watched domains via RDAP/WHOIS'
  },
  async run() {
    const config = useRuntimeConfig()
    const due = await prisma.domain.findMany({
      where: { enabled: true, next_check_at: { lte: new Date() } },
      orderBy: { next_check_at: 'asc' },
      take: config.monitor.batchSize
    })

    let checked = 0
    for (const d of due) {
      try {
        await checkDomain(d)
        checked++
      } catch (e) {
        console.error(`[domain:tick] ${d.domain} failed:`, e)
      }
    }

    if (due.length) {
      console.log(`[domain:tick] checked ${checked}/${due.length} due domains`)
    }
    return { result: { due: due.length, checked } }
  }
})
