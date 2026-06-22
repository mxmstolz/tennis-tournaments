// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  future: { compatibilityVersion: 4 },
  devtools: { enabled: true },

  modules: ['nuxt-auth-utils'],

  css: ['~/assets/css/main.css'],

  nitro: {
    preset: 'netlify',
  },

  runtimeConfig: {
    databaseUrl: '', // NUXT_DATABASE_URL
    adminPassword: '', // NUXT_ADMIN_PASSWORD
    session: {
      // NUXT_SESSION_PASSWORD (>= 32 chars), used by nuxt-auth-utils
      password: '',
    },
  },

  app: {
    head: {
      title: 'Stadtmeisterschaften',
      htmlAttrs: { lang: 'de' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },
})
