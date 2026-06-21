import type { KunUIColor } from '@kungal/ui-core'
import type { DomainPhaseName } from '~~/shared/types/domain'

// UI metadata per lifecycle phase. `color` maps to KunUI semantic colors.
export const PHASE_META: Record<
  DomainPhaseName,
  { label: string; color: KunUIColor; hint: string }
> = {
  ACTIVE: {
    label: '正常',
    color: 'success',
    hint: '已注册，正常解析'
  },
  AUTO_RENEW: {
    label: '续费宽限',
    color: 'warning',
    hint: '已过期，处于注册商自动续费宽限期，原主仍可原价续费'
  },
  REDEMPTION: {
    label: '赎回期',
    color: 'warning',
    hint: '原主可高价赎回，他人暂不可注册'
  },
  PENDING_DELETE: {
    label: '待删除',
    color: 'danger',
    hint: '5 天后掉落，已进入可注册倒计时'
  },
  AVAILABLE: {
    label: '可注册',
    color: 'primary',
    hint: '已掉落，立即可抢注！'
  },
  UNKNOWN: {
    label: '未知',
    color: 'default',
    hint: '查询失败或状态不明确，将很快重试'
  }
}

export const PHASE_ORDER: DomainPhaseName[] = [
  'AVAILABLE',
  'PENDING_DELETE',
  'REDEMPTION',
  'AUTO_RENEW',
  'ACTIVE',
  'UNKNOWN'
]
