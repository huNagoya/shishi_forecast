'use client'

import { useState, useEffect } from 'react'
import { HistoryItem, SleepPrediction, DigestPrediction } from '@/lib/types'
import { getHistory, clearHistory } from '@/lib/storage'
import { formatDate } from '@/lib/utils'

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    setHistory(getHistory())
  }, [])

  const handleClear = () => {
    if (confirm('确认清空所有历史记录？')) {
      clearHistory()
      setHistory([])
    }
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
          className="text-xs text-red-400 hover:text-red-500 px-3 py-1 rounded-full border border-red-100 hover:bg-red-50 transition-colors"
        >
          清空
        </button>
      </div>

      <div className="space-y-3">
        {history.map((item) => {
          const isSleep = item.type === 'sleep'
          const isOpen = expanded === item.id

          return (
            <div
              key={item.id}
              className="glass-card rounded-2xl overflow-hidden"
            >
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
                  {isSleep ? (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        (item.result as SleepPrediction).insomniaRisk >= 70
                          ? 'bg-red-100 text-red-500'
                          : (item.result as SleepPrediction).insomniaRisk >= 40
                          ? 'bg-amber-100 text-amber-500'
                          : 'bg-green-100 text-green-500'
                      }`}
                    >
                      失眠{(item.result as SleepPrediction).insomniaRisk}%
                    </span>
                  ) : (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        (item.result as DigestPrediction).smoothnessScore >= 70
                          ? 'bg-green-100 text-green-500'
                          : (item.result as DigestPrediction).smoothnessScore >= 40
                          ? 'bg-amber-100 text-amber-500'
                          : 'bg-red-100 text-red-500'
                      }`}
                    >
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
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
