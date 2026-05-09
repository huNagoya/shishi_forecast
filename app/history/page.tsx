'use client'

import { useState, useEffect } from 'react'
import { HistoryItem, SleepPrediction, DigestPrediction } from '@/lib/types'
import { getHistory, clearHistory, updateHistoryItemRating } from '@/lib/storage'
import { getDeviceId } from '@/lib/device-id'
import { formatDate } from '@/lib/utils'

const SLEEP_OPTIONS = [
  { value: 'up', label: '更难入睡' },
  { value: 'neutral', label: '差不多' },
  { value: 'down', label: '睡得更好' },
] as const

const DIGEST_OPTIONS = [
  { value: 'up', label: '更不舒服' },
  { value: 'neutral', label: '差不多' },
  { value: 'down', label: '消化更好' },
] as const

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [ratings, setRatings] = useState<Record<string, 'up' | 'neutral' | 'down'>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)

  useEffect(() => {
    const h = getHistory()
    setHistory(h)
    const init: Record<string, 'up' | 'neutral' | 'down'> = {}
    h.forEach((item) => { if (item.ewmaRating) init[item.id] = item.ewmaRating })
    setRatings(init)
  }, [])

  const handleClear = () => {
    if (confirm('确认清空所有历史记录？')) {
      clearHistory()
      setHistory([])
    }
  }

  async function handleRating(item: HistoryItem, direction: 'up' | 'neutral' | 'down') {
    setSubmitting(item.id)
    updateHistoryItemRating(item.id, direction)
    setRatings((prev) => ({ ...prev, [item.id]: direction }))

    if (direction !== 'neutral') {
      try {
        const deviceId = getDeviceId()
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: item.type,
            issue: 'prediction_outcome',
            direction,
            deviceId,
          }),
        })
        const data = await res.json()
        if (data.updatedProfile) {
          const raw = localStorage.getItem('shishi_user_profile')
          const current = raw ? JSON.parse(raw) : {}
          localStorage.setItem('shishi_user_profile', JSON.stringify({
            ...current,
            ...data.updatedProfile,
          }))
        }
      } catch { /* fire-and-forget */ }
    }

    setSubmitting(null)
  }

  if (history.length === 0) {
    return (
      <div className="px-4 pt-6">
        <h1 className="text-xl font-bold text-gray-800 mb-6">历史记录</h1>
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-gray-400">暂无记录</p>
          <p className="text-sm text-gray-300 mt-1">预测结果会自动保存在这里</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">历史记录</h1>
        <button
          onClick={handleClear}
          className="text-xs text-red-400 px-3 py-1 rounded-full border border-red-100 hover:bg-red-50 transition-colors"
        >
          清空
        </button>
      </div>

      <div className="space-y-3">
        {history.map((item) => {
          const isSleep = item.type === 'sleep'
          const isOpen = expanded === item.id
          const rating = ratings[item.id]
          const options = isSleep ? SLEEP_OPTIONS : DIGEST_OPTIONS

          return (
            <div key={item.id} className="glass-card rounded-2xl overflow-hidden">
              {/* 摘要行 */}
              <button
                className="w-full p-4 flex items-center justify-between text-left active:bg-gray-50"
                onClick={() => setExpanded(isOpen ? null : item.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{isSleep ? '😴' : '🚽'}</span>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">
                      {isSleep
                        ? String((item.result as SleepPrediction).drinkName || '')
                        : String((item.result as DigestPrediction).foodName || '')}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(item.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* 已反馈标记 */}
                  {rating && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-500">
                      已验证
                    </span>
                  )}
                  {isSleep ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      (item.result as SleepPrediction).insomniaRisk >= 70
                        ? 'bg-red-100 text-red-500'
                        : (item.result as SleepPrediction).insomniaRisk >= 40
                        ? 'bg-amber-100 text-amber-500'
                        : 'bg-green-100 text-green-500'
                    }`}>
                      失眠{(item.result as SleepPrediction).insomniaRisk}%
                    </span>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      (item.result as DigestPrediction).smoothnessScore >= 70
                        ? 'bg-green-100 text-green-500'
                        : (item.result as DigestPrediction).smoothnessScore >= 40
                        ? 'bg-amber-100 text-amber-500'
                        : 'bg-red-100 text-red-500'
                    }`}>
                      通畅{(item.result as DigestPrediction).smoothnessScore}分
                    </span>
                  )}
                  <span className="text-gray-300">{isOpen ? '∧' : '∨'}</span>
                </div>
              </button>

              {/* 详情展开 */}
              {isOpen && (
                <div className="px-4 pb-4 border-t border-gray-50">
                  <p className="text-sm text-gray-600 pt-3">
                    {String((item.result as SleepPrediction | DigestPrediction).analysis || '')}
                  </p>
                  {isSleep && (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <span>入睡时间：{String((item.result as SleepPrediction).estimatedSleepTime || '')}</span>
                      <span>次日状态：{Number((item.result as SleepPrediction).nextDayScore) || 0}分</span>
                    </div>
                  )}
                  {!isSleep && (
                    <div className="mt-2 text-xs text-gray-500">
                      黄金时间：{String((item.result as DigestPrediction).goldenTimeStart || '')} — {String((item.result as DigestPrediction).goldenTimeEnd || '')}
                    </div>
                  )}

                  {/* 事后验证反馈 */}
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    {rating ? (
                      <p className="text-xs text-center text-gray-400">
                        {rating === 'neutral'
                          ? '✓ 已记录：预测较准'
                          : '✓ 已记录：体质档案已根据此次反馈更新'}
                      </p>
                    ) : (
                      <>
                        <p className="text-xs text-gray-400 mb-2">
                          {isSleep ? '实际睡眠如何？' : '实际消化如何？'}
                        </p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {options.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => handleRating(item, opt.value)}
                              disabled={submitting === item.id}
                              className="text-xs py-2 rounded-xl border border-gray-100 text-gray-500 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-40"
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
