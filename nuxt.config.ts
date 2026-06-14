/// <reference types="node" />
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  css: ['~/assets/css/tokens.css'],

  modules: [
    '@nuxtjs/supabase',
    '@vite-pwa/nuxt',
  ],

  // vue-toastification is CommonJS — transpile so its named exports (useToast)
  // resolve during SSR (Vercel prod build), not just in dev.
  build: {
    transpile: ['vue-toastification'],
  },

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: 'Zen Coffee',
      meta: [
        { name: 'theme-color', content: '#ffffff' },
        { name: 'description', content: 'Zen Coffee internal finance tracker' },
      ],
    },
  },

  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/login'],
    },
  },

  pwa: {
    manifest: {
      name: 'Zen Coffee',
      short_name: 'Zen Coffee',
      theme_color: '#ffffff',
      background_color: '#ffffff',
      display: 'standalone',
      lang: 'id',
      icons: [
        { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      navigateFallback: '/',
    },
    devOptions: {
      enabled: true,
      type: 'module',
    },
  },

  runtimeConfig: {
    geminiApiKey: process.env.GEMINI_API_KEY ?? '',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
    botPin: process.env.BOT_PIN ?? '',
    cronSecret: process.env.CRON_SECRET ?? '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  },
})
