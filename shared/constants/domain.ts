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

// EPP status code → 中文说明。RDAP 返回的状态可能是 'pendingDelete' 或
// 'pending delete'，统一去掉非字母再查表。
const EPP_STATUS_DESC: Record<string, string> = {
  ok: '正常，无任何限制',
  active: '正常，无任何限制',
  inactive: '未设置域名服务器，当前无法解析',
  clienthold: '注册商已暂停解析（clientHold）',
  serverhold: '注册局已暂停解析（serverHold）',
  clienttransferprohibited: '注册商锁定，禁止转移注册商（防劫持，常态）',
  servertransferprohibited: '注册局锁定，禁止转移注册商',
  clientdeleteprohibited: '注册商禁止删除该域名',
  serverdeleteprohibited: '注册局禁止删除该域名',
  clientupdateprohibited: '注册商禁止修改该域名信息',
  serverupdateprohibited: '注册局禁止修改该域名信息',
  clientrenewprohibited: '注册商禁止续费',
  serverrenewprohibited: '注册局禁止续费',
  addperiod: '新注册宽限期（数天内删除可全额退款）',
  autorenewperiod: '自动续费宽限期（过期后注册商自动续费，可原价撤销）',
  renewperiod: '手动续费宽限期',
  transferperiod: '转移后宽限期',
  redemptionperiod: '赎回期：已过期，仅原主可高价赎回，他人不可注册',
  pendingrestore: '正在从赎回期恢复',
  pendingdelete: '待删除：赎回期结束，约 5 天后从注册局删除并开放注册',
  pendingcreate: '等待创建',
  pendingrenew: '等待续费',
  pendingtransfer: '等待转移',
  pendingupdate: '等待更新'
}

export const eppStatusDesc = (status: string): string =>
  EPP_STATUS_DESC[status.toLowerCase().replace(/[^a-z]/g, '')] ?? '未知状态码'
