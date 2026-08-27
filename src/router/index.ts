import { createRouter, createWebHistory } from 'vue-router'
import { authGuard } from '@auth0/auth0-vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

declare module 'vue-router' {
  interface RouteMeta {
    titleKey?: string
    requiresAuth?: boolean
    secondaryNav?: 'settings'
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/callback',
      name: 'callback',
      component: () => import('@/views/CallbackView.vue'),
    },
    {
      path: '/',
      component: DefaultLayout,
      children: [
        { path: '', redirect: '/dashboard' },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { titleKey: 'common.nav.home', requiresAuth: true },
        },
        {
          path: 'timestamp',
          name: 'timestamp',
          component: () => import('@/views/TimestampView.vue'),
          meta: { titleKey: 'common.nav.timestamp', requiresAuth: true },
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/ProfileView.vue'),
          meta: {
            titleKey: 'profile.pageTitle',
            requiresAuth: true,
            secondaryNav: 'settings',
          },
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth) return authGuard(to)
  return true
})

export default router
