<script setup lang="ts">
const route = useRoute()

const ERROR_MAP: Record<string, string> = {
  forbidden: '该账号没有 ren 角色权限，无法使用本系统',
  invalid_callback: '登录校验失败，请重试',
  oauth_failed: '与 OAuth 服务通信失败，请稍后重试'
}

const errorText = computed(() => {
  const e = route.query.error
  if (typeof e !== 'string') return ''
  return ERROR_MAP[e] ?? '登录失败，请重试'
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-4">
    <KunCard class="w-full max-w-sm p-8 text-center">
      <Icon name="lucide:radar" class="text-primary-500 mx-auto mb-3 text-4xl" />
      <h1 class="mb-1 text-xl font-bold">域名监控</h1>
      <p class="text-default-500 mb-6 text-sm">
        使用 KUN 账号登录（需 <span class="text-primary-500 font-medium">ren</span>
        角色）
      </p>

      <p
        v-if="errorText"
        class="bg-danger-50 text-danger-600 mb-4 rounded-lg px-3 py-2 text-sm"
      >
        {{ errorText }}
      </p>

      <!-- Full navigation (not client routing): /api/auth/login is a server
           route that 302s to the OAuth provider. -->
      <a href="/api/auth/login" class="block">
        <KunButton class="w-full" color="primary"> 使用 KUN 账号登录 </KunButton>
      </a>
    </KunCard>
  </div>
</template>
