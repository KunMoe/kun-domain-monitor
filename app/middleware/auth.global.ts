import type { SessionUser } from '~~/shared/types/domain'

// Gate the whole app behind a logged-in `ren`. /login is the only public route.
// This is UX only — every protected API route independently calls requireRen().
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  const store = useUserStore()

  if (!store.user) {
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const user = await $fetch<SessionUser>('/api/auth/me', { headers })
      store.setUser(user)
    } catch {
      return navigateTo('/login')
    }
  }

  if (!store.user?.isRen) {
    return navigateTo('/login?error=forbidden')
  }
})
