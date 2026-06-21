<script setup lang="ts">
useHead({
  htmlAttrs: { lang: 'zh-Hans' },
  titleTemplate: (title) => (title ? `${title} - 域名监控` : '域名监控')
})

useSeoMeta({
  description: '监控已注册域名的生命周期状态与到期时间，在掉落可抢注时第一时间提醒。'
})
</script>

<template>
  <div>
    <KunMessageProvider />

    <NuxtLayout>
      <NuxtLoadingIndicator color="var(--color-primary-600)" />
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
