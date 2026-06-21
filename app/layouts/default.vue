<script setup lang="ts">
const store = useUserStore()
const router = useRouter()

const loggingOut = ref(false)
const onLogout = async () => {
  loggingOut.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
  } catch {
    // ignore — clear locally regardless
  } finally {
    store.setUser(null)
    await router.push('/login')
  }
}
</script>

<template>
  <div class="min-h-screen">
    <header
      class="border-default-200 bg-background/80 sticky top-0 z-30 border-b backdrop-blur"
    >
      <div
        class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3"
      >
        <NuxtLink to="/" class="flex items-center gap-2 font-bold">
          <Icon name="lucide:radar" class="text-primary-500 text-xl" />
          <span>域名监控</span>
        </NuxtLink>

        <div v-if="store.user" class="flex items-center gap-3 text-sm">
          <span class="text-default-500 hidden sm:inline">{{
            store.user.name
          }}</span>
          <KunChip size="sm" color="primary">ren</KunChip>
          <KunButton
            size="sm"
            variant="light"
            color="default"
            :loading="loggingOut"
            @click="onLogout"
          >
            退出
          </KunButton>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-5xl px-4 py-6">
      <slot />
    </main>
  </div>
</template>
