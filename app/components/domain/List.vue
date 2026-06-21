<script setup lang="ts">
import {
  PHASE_META,
  PHASE_ORDER,
  eppStatusDesc
} from '~~/shared/constants/domain'
import type { DomainDTO } from '~~/shared/types/domain'

const { data: domains, refresh } = await useFetch<DomainDTO[]>('/api/domain', {
  default: () => []
})

// Float the actionable phases (AVAILABLE / PENDING_DELETE) to the top.
const sorted = computed(() =>
  [...(domains.value ?? [])].sort(
    (a, b) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase)
  )
)

// ---- add ----
const newDomain = ref('')
const newNote = ref('')
const adding = ref(false)

const addDomain = async () => {
  const domain = newDomain.value.trim()
  if (!domain) return
  adding.value = true
  try {
    await $fetch('/api/domain', {
      method: 'POST',
      body: { domain, note: newNote.value.trim() || undefined }
    })
    newDomain.value = ''
    newNote.value = ''
    useKunMessage('已加入监控', 'success')
    await refresh()
  } catch (e) {
    useKunMessage(getApiError(e) ?? '添加失败', 'error')
  } finally {
    adding.value = false
  }
}

// ---- per-row actions ----
const checkingId = ref<number | null>(null)
const checkNow = async (d: DomainDTO) => {
  checkingId.value = d.id
  try {
    await $fetch(`/api/domain/${d.id}/check`, { method: 'POST' })
    useKunMessage('已刷新', 'success')
    await refresh()
  } catch (e) {
    useKunMessage(getApiError(e) ?? '检查失败', 'error')
  } finally {
    checkingId.value = null
  }
}

const removeDomain = async (d: DomainDTO) => {
  try {
    await $fetch(`/api/domain/${d.id}`, { method: 'DELETE' })
    await refresh()
  } catch {
    useKunMessage('删除失败', 'error')
  }
}

// kunError sends { data: { code, message } }; ofetch wraps it at e.data.data.
const getApiError = (e: unknown): string | undefined =>
  (e as { data?: { data?: { message?: string } } })?.data?.data?.message

// ---- formatting ----
const DAY = 86_400_000

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('zh-CN', { hour12: false }) : '—'
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('zh-CN') : '—'

// "4 年 2 个月" — how long the domain has been registered.
const ageText = (iso: string | null): string => {
  if (!iso) return ''
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY)
  if (days < 0) return ''
  const years = Math.floor(days / 365)
  const months = Math.floor((days % 365) / 30)
  if (years > 0) return `${years} 年${months > 0 ? ` ${months} 个月` : ''}`
  if (months > 0) return `${months} 个月`
  return `${days} 天`
}

// "12 天后" / "已过期 65 天"
const expiryRel = (iso: string | null): string => {
  if (!iso) return ''
  const ms = new Date(iso).getTime() - Date.now()
  const days = Math.round(Math.abs(ms) / DAY)
  return ms >= 0 ? `${days} 天后` : `已过期 ${days} 天`
}

const boolText = (v: boolean | null, on: string, off: string): string =>
  v == null ? '未知' : v ? on : off

const dropCountdown = (iso: string | null): string => {
  if (!iso) return ''
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return '即将掉落'
  const days = Math.floor(ms / DAY)
  const hours = Math.floor((ms % DAY) / 3_600_000)
  return days > 0 ? `约 ${days} 天 ${hours} 小时后掉落` : `约 ${hours} 小时后掉落`
}
</script>

<template>
  <div class="space-y-6">
    <!-- add form -->
    <KunCard class="p-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <KunInput
          v-model.trim="newDomain"
          class="flex-1"
          placeholder="要监控的域名，如 example.com"
          @keydown.enter="addDomain"
        />
        <KunInput
          v-model.trim="newNote"
          class="flex-1"
          placeholder="备注（可选）"
          @keydown.enter="addDomain"
        />
        <KunButton color="primary" :loading="adding" @click="addDomain">
          <Icon name="lucide:plus" class="mr-1" />
          添加监控
        </KunButton>
      </div>
    </KunCard>

    <!-- empty state -->
    <KunCard v-if="!sorted.length" class="p-10 text-center">
      <Icon name="lucide:radar" class="text-default-300 mx-auto mb-2 text-4xl" />
      <p class="text-default-500">
        还没有监控任何域名。添加一个已被注册的域名，它到期掉落时会第一时间提醒你抢注。
      </p>
    </KunCard>

    <!-- list -->
    <div v-else class="space-y-3">
      <KunCard v-for="d in sorted" :key="d.id" class="p-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1 space-y-3">
            <!-- header -->
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-lg font-semibold break-all">{{ d.domain }}</span>
              <KunChip size="sm" :color="PHASE_META[d.phase].color">
                {{ PHASE_META[d.phase].label }}
              </KunChip>
              <KunChip v-if="d.isRegistered === false" size="xs" color="primary">
                未注册
              </KunChip>
              <KunChip v-if="d.source" size="xs" color="default">
                {{ d.source }}
              </KunChip>
            </div>

            <p class="text-default-500 text-sm">{{ PHASE_META[d.phase].hint }}</p>

            <!-- drop countdown highlight -->
            <p
              v-if="d.phase === 'PENDING_DELETE' && d.predictedDropAt"
              class="text-danger-600 text-sm font-medium"
            >
              <Icon name="lucide:alarm-clock" class="mr-1 inline" />
              {{ dropCountdown(d.predictedDropAt) }}（预计 {{ fmt(d.predictedDropAt) }}）
            </p>

            <!-- facts grid -->
            <dl
              class="text-default-500 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-3 lg:grid-cols-4"
            >
              <div class="truncate">
                <dt class="text-default-400 inline">注册商：</dt>
                <dd class="inline">
                  <a
                    v-if="d.registrarUrl"
                    :href="d.registrarUrl"
                    target="_blank"
                    rel="noopener"
                    class="text-primary-500 hover:underline"
                    >{{ d.registrar ?? '—' }}</a
                  >
                  <span v-else>{{ d.registrar ?? '—' }}</span>
                  <span v-if="d.registrarIanaId" class="text-default-400">
                    (IANA {{ d.registrarIanaId }})</span
                  >
                </dd>
              </div>
              <div>
                <dt class="text-default-400 inline">注册时间：</dt>
                <dd class="inline">
                  {{ fmtDate(d.creationDate) }}
                  <span v-if="ageText(d.creationDate)" class="text-default-400"
                    >（已 {{ ageText(d.creationDate) }}）</span
                  >
                </dd>
              </div>
              <div>
                <dt class="text-default-400 inline">到期：</dt>
                <dd class="inline">
                  {{ fmtDate(d.expirationDate) }}
                  <span v-if="expiryRel(d.expirationDate)" class="text-default-400"
                    >（{{ expiryRel(d.expirationDate) }}）</span
                  >
                </dd>
              </div>
              <div>
                <dt class="text-default-400 inline">最近更新：</dt>
                <dd class="inline">{{ fmtDate(d.updatedDate) }}</dd>
              </div>
              <div>
                <dt class="text-default-400 inline">DNSSEC：</dt>
                <dd class="inline">{{ boolText(d.dnssec, '已开启', '未开启') }}</dd>
              </div>
              <div>
                <dt class="text-default-400 inline">转移锁：</dt>
                <dd class="inline">{{ boolText(d.transferLock, '已锁定', '未锁定') }}</dd>
              </div>
              <div>
                <dt class="text-default-400 inline">上次检查：</dt>
                <dd class="inline">{{ fmt(d.lastCheckedAt) }}</dd>
              </div>
              <div>
                <dt class="text-default-400 inline">下次检查：</dt>
                <dd class="inline">{{ fmt(d.nextCheckAt) }}</dd>
              </div>
            </dl>

            <!-- nameservers -->
            <div v-if="d.nameservers.length" class="flex flex-wrap items-center gap-1">
              <span class="text-default-400 text-xs">DNS：</span>
              <KunChip v-for="ns in d.nameservers" :key="ns" size="xs" color="default">
                {{ ns }}
              </KunChip>
            </div>

            <!-- EPP statuses + explanations -->
            <div v-if="d.statuses.length" class="space-y-1">
              <div class="flex flex-wrap items-center gap-1">
                <span class="text-default-400 text-xs">状态：</span>
                <KunChip
                  v-for="s in d.statuses"
                  :key="s"
                  size="xs"
                  color="default"
                  :title="eppStatusDesc(s)"
                  class="cursor-help"
                >
                  {{ s }}
                </KunChip>
              </div>
              <ul class="text-default-400 space-y-0.5 text-xs">
                <li v-for="s in d.statuses" :key="s">
                  <span class="text-default-500">{{ s }}</span> — {{ eppStatusDesc(s) }}
                </li>
              </ul>
            </div>

            <p v-if="d.note" class="text-default-400 text-xs">备注：{{ d.note }}</p>
            <p v-if="d.lastError" class="text-warning-600 text-xs">
              <Icon name="lucide:triangle-alert" class="mr-1 inline" />
              {{ d.lastError }}
            </p>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <KunButton
              size="sm"
              variant="light"
              :loading="checkingId === d.id"
              @click="checkNow(d)"
            >
              <Icon name="lucide:refresh-cw" class="mr-1" />
              立即检查
            </KunButton>
            <KunButton
              size="sm"
              variant="light"
              color="danger"
              @click="removeDomain(d)"
            >
              <Icon name="lucide:trash-2" />
            </KunButton>
          </div>
        </div>
      </KunCard>
    </div>
  </div>
</template>
