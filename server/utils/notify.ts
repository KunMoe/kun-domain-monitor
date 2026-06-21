export interface DomainNotification {
  domain: string
  type: string
  fromPhase?: string | null
  toPhase?: string | null
  message: string
  predictedDropAt?: string | null
}

/**
 * Fan out a status-change notification. Always logs; additionally POSTs to an
 * optional webhook (Telegram/Slack/Discord/email-bridge). This is the single
 * seam to extend — add a Telegram `sendMessage` call or an email send here.
 */
export const notify = async (n: DomainNotification): Promise<void> => {
  console.log(`[domain:notify] ${n.type} ${n.domain} — ${n.message}`)

  const config = useRuntimeConfig()
  const webhook = config.monitor?.notifyWebhook
  if (!webhook) return

  try {
    await $fetch(webhook, {
      method: 'POST',
      body: {
        text: `[域名监控] ${n.domain}：${n.message}`,
        event: n
      }
    })
  } catch (e) {
    console.error('[domain:notify] webhook failed:', e)
  }
}
