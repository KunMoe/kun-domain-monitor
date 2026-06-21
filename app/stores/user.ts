import { defineStore } from 'pinia'
import type { SessionUser } from '~~/shared/types/domain'

export const useUserStore = defineStore(
  'kdm-user',
  () => {
    const user = ref<SessionUser | null>(null)

    const isLoggedIn = computed(() => !!user.value)
    const isRen = computed(() => user.value?.isRen ?? false)

    const setUser = (u: SessionUser | null): void => {
      user.value = u
    }

    return { user, isLoggedIn, isRen, setUser }
  },
  { persist: true }
)
