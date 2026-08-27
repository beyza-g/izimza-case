import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useAuth0 } from '@auth0/auth0-vue'

export const useAuthStore = defineStore('auth', () => {
  const auth0 = useAuth0()

  const isAuthenticated = computed(() => auth0.isAuthenticated.value)
  const isLoading = computed(() => auth0.isLoading.value)
  const user = computed(() => auth0.user.value)

  function login(target?: string) {
    return auth0.loginWithRedirect({
      appState: { target: target ?? window.location.pathname },
    })
  }

  function logout() {
    return auth0.logout({ logoutParams: { returnTo: window.location.origin } })
  }

  function getAccessToken() {
    return auth0.getAccessTokenSilently()
  }

  return { isAuthenticated, isLoading, user, login, logout, getAccessToken }
})
