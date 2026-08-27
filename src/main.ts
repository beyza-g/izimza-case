import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createAuth0 } from '@auth0/auth0-vue'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import './assets/main.css'

import App from './App.vue'
import router from './router'
import { i18n } from './i18n'

const app = createApp(App)

app.use(i18n)
app.use(createPinia())
// Router must be installed before the Auth0 plugin: the plugin reads
// app.config.globalProperties.$router (set by vue-router's own install)
// to navigate back to the original destination after the login redirect.
app.use(router)
app.use(
  createAuth0({
    domain: import.meta.env.VITE_AUTH0_DOMAIN,
    clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
    authorizationParams: {
      redirect_uri: `${window.location.origin}/callback`,
    },
    // Default cacheLocation ('memory') loses the session on every hard
    // reload, forcing a fresh Auth0 redirect on any direct URL navigation
    // (not just SPA route changes). localStorage persists it across reloads.
    cacheLocation: 'localstorage',
  }),
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Account/document data doesn't change on its own between our own
      // mutations, so tabs/route switches shouldn't trigger a refetch.
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
})
app.use(VueQueryPlugin, { queryClient })

app.mount('#app')
