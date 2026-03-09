'use client'

import { HistoryItem, UserSettings } from './types'

const HISTORY_KEY = 'shishi_history'
const SETTINGS_KEY = 'shishi_settings'

// 默认设置
export const DEFAULT_SETTINGS: UserSettings = {
  tolerance: 'medium',
  gutType: 'normal',
}

// 读取历史记录
export function getHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const items: HistoryItem[] = JSON.parse(raw)
    // 过滤掉结构损坏的记录
    return items.filter(
      (item) => item && item.id && item.type && item.result && typeof item.result === 'object'
    )
  } catch {
    return []
  }
}

// 保存一条历史记录（新记录插入最前面）
export function saveHistory(item: HistoryItem): void {
  const history = getHistory()
  history.unshift(item)
  // 最多保留50条
  const trimmed = history.slice(0, 50)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed))
}

// 清空历史记录
export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY)
}

// 读取用户设置
export function getSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

// 保存用户设置
export function saveSettings(settings: UserSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
