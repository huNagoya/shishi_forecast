import { supabase } from './db'

// 每个客户端每日预测次数上限（sleep + digest 合计）。软上限，仅防公开后被刷爆 token，不是安全级防护。
export const DAILY_LIMIT = 30

/**
 * 生成限频 key：优先用小程序传来的 clientId（稳定设备标识），否则退化为请求 IP。
 * 加前缀区分来源，避免 device id 与 IP 串号。
 */
export function getClientKey(clientId: unknown, req: Request): string {
  if (typeof clientId === 'string' && clientId.trim()) {
    return 'dev:' + clientId.trim().slice(0, 64)
  }
  const fwd = req.headers.get('x-forwarded-for') || ''
  const ip = fwd.split(',')[0].trim() || 'unknown'
  return 'ip:' + ip
}

/**
 * 统计该 client 当天（UTC 自然日）已写入 predictions 的行数，判断是否超限。
 * 查询失败时放行（fail-open），避免限频依赖故障误伤正常用户。
 */
export async function checkRateLimit(
  clientKey: string
): Promise<{ allowed: boolean; count: number; limit: number }> {
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from('predictions')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientKey)
    .gte('created_at', start.toISOString())

  if (error) {
    console.warn('限频查询失败，放行:', error.message)
    return { allowed: true, count: 0, limit: DAILY_LIMIT }
  }

  const c = count ?? 0
  return { allowed: c < DAILY_LIMIT, count: c, limit: DAILY_LIMIT }
}
