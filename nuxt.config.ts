import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' }
      ]
    }
  },

  devServer: {
    host: '127.0.0.1',
    port: 3970
  },

  // KunUI Nuxt layer: auto-imports the Kun* components + injects
  // NuxtLink / @nuxt/icon / @nuxt/image bindings.
  extends: ['@kungal/ui-nuxt'],

  modules: [
    '@nuxt/image',
    '@nuxt/icon',
    '@nuxt/eslint',
    '@nuxtjs/color-mode',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt'
  ],

  colorMode: {
    preference: 'system',
    fallback: 'light',
    classPrefix: 'kun-',
    classSuffix: '-mode',
    storage: 'cookie'
  },

  icon: {
    mode: 'svg',
    serverBundle: { collections: [] },
    clientBundle: { icons: [], scan: false }
  },

  css: ['~/assets/css/tailwind.css'],
  vite: {
    plugins: [tailwindcss()]
  },

  nitro: {
    // Self-contained Node server build (.output/server/index.mjs) for the
    // PM2 / Dokploy deployment, identical to the other kun Nuxt apps.
    preset: 'node-server',

    // In-stack scheduler. The `domain:tick` task wakes every minute, pulls the
    // domains whose next_check_at has passed and re-queries them via RDAP. No
    // external cron / queue — see server/tasks/domain/tick.ts.
    experimental: { tasks: true },
    scheduledTasks: {
      '* * * * *': ['domain:tick']
    }
  },

  runtimeConfig: {
    KUN_DATABASE_URL: process.env.KUN_DATABASE_URL,

    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,

    // OAuth client against ../kun-galgame-infra (confidential client, server
    // side only). Register the redirect_uri `${origin}/api/auth/callback`.
    OAUTH_SERVER_URL: process.env.OAUTH_SERVER_URL,
    OAUTH_CLIENT_ID: process.env.OAUTH_CLIENT_ID,
    OAUTH_CLIENT_SECRET: process.env.OAUTH_CLIENT_SECRET,
    OAUTH_REDIRECT_URI: process.env.OAUTH_REDIRECT_URI,
    OAUTH_SCOPE: process.env.OAUTH_SCOPE || 'openid profile',

    monitor: {
      // Max domains re-queried per minute tick. 20/min ≈ 0.33 q/s, far under
      // any RDAP rate limit; raise once the watchlist grows.
      batchSize: Number(process.env.MONITOR_BATCH_SIZE ?? 20),
      // Per-lookup network timeout (ms).
      lookupTimeoutMs: Number(process.env.MONITOR_LOOKUP_TIMEOUT_MS ?? 15000),
      // Optional outbound webhook fired on every DomainEvent (status change /
      // entered redemption / entered pending-delete / now available). Leave
      // empty to only log. Telegram / email can be wired in server/utils/notify.ts.
      notifyWebhook: process.env.MONITOR_NOTIFY_WEBHOOK || ''
    },

    public: {
      WEBSITE_URL: process.env.WEBSITE_URL || ''
    }
  }
})
