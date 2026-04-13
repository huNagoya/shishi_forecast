'use client'

import { useState } from 'react'

interface FeedbackWidgetProps {
  type: 'sleep' | 'digest'
  drinkName?: string
  foodName?: string
}

const SLEEP_ISSUES = [
  { value: 'wrong_name', label: '饮品识别错了' },
  { value: 'wrong_caffeine', label: '咖啡因数值不对' },
  { value: 'wrong_prediction', label: '预测结果感觉不准' },
]

const DIGEST_ISSUES = [
  { value: 'wrong_name', label: '食物识别错了' },
  { value: 'wrong_prediction', label: '预测结果感觉不准' },
]

export default function FeedbackWidget({ type, drinkName, foodName }: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [correctValue, setCorrectValue] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const issues = type === 'sleep' ? SLEEP_ISSUES : DIGEST_ISSUES

  const handleSubmit = async () => {
    if (!selected) return
    setLoading(true)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          drinkName,
          foodName,
          issue: selected,
          correctValue: correctValue.trim() || null,
        }),
      })
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <p className="text-center text-xs text-gray-400 mt-1">
        感谢反馈，我们会持续改进 ✓
      </p>
    )
  }

  return (
    <>
      {/* 触发入口 */}
      <p className="text-center text-xs text-gray-300 mt-1">
        结果有误？
        <button
          onClick={() => setOpen(true)}
          className="underline underline-offset-2 ml-0.5 active:text-gray-400 transition-colors"
        >
          点此反馈
        </button>
      </p>

      {/* 半屏弹窗遮罩 */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl p-6 shadow-2xl">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <p className="font-semibold text-gray-800 mb-4">哪里不准？</p>

            <div className="space-y-2 mb-4">
              {issues.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setSelected(item.value)}
                  className={`w-full text-left px-4 py-3 rounded-2xl border-2 text-sm transition-all ${
                    selected === item.value
                      ? 'border-amber-400 bg-amber-50 text-amber-700 font-medium'
                      : 'border-gray-100 text-gray-600'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* 咖啡因数值不对时，追加输入框 */}
            {selected === 'wrong_caffeine' && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">实际大约多少 mg？（可选）</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={correctValue}
                    onChange={(e) => setCorrectValue(e.target.value)}
                    placeholder="例如：45"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-sm text-gray-400">mg</span>
                </div>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!selected || loading}
              className="w-full bg-gray-800 text-white font-medium py-3 rounded-2xl text-sm disabled:opacity-40 active:scale-95 transition-transform"
            >
              {loading ? '提交中...' : '提交反馈'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
