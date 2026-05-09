'use client'

import { useState } from 'react'
import { getDeviceId } from '@/lib/device-id'

interface FeedbackWidgetProps {
  type: 'sleep' | 'digest'
  drinkName?: string
  foodName?: string
}

const SLEEP_ISSUES = [
  { value: 'wrong_name', label: '饮品识别错了' },
  { value: 'wrong_caffeine', label: '咖啡因数值不对' },
  { value: 'wrong_prediction', label: '预测结果感觉不准' },
  { value: 'other', label: '以上都不是' },
]

const DIGEST_ISSUES = [
  { value: 'wrong_name', label: '食物识别错了' },
  { value: 'wrong_prediction', label: '预测结果感觉不准' },
  { value: 'other', label: '以上都不是' },
]

const DIRECTION_OPTIONS = {
  sleep: [
    { value: 'up', label: '比预测更严重，实际更难入睡' },
    { value: 'down', label: '比预测轻，实际睡得还不错' },
  ],
  digest: [
    { value: 'up', label: '比预测更不舒服' },
    { value: 'down', label: '比预测轻，消化挺好' },
  ],
}

export default function FeedbackWidget({ type, drinkName, foodName }: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [direction, setDirection] = useState<'up' | 'down' | null>(null)
  const [correctValue, setCorrectValue] = useState('')
  const [customText, setCustomText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [profileUpdated, setProfileUpdated] = useState(false)
  const [loading, setLoading] = useState(false)

  const issues = type === 'sleep' ? SLEEP_ISSUES : DIGEST_ISSUES
  const directionOptions = DIRECTION_OPTIONS[type]

  const isSubmitDisabled =
    !selected ||
    (selected === 'wrong_prediction' && !direction) ||
    loading

  const handleSubmit = async () => {
    if (isSubmitDisabled) return
    setLoading(true)
    try {
      const deviceId = getDeviceId()
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          drinkName,
          foodName,
          issue: selected,
          direction: selected === 'wrong_prediction' ? direction : null,
          deviceId,
          correctValue: correctValue.trim() || null,
          customText: selected === 'other' ? customText.trim() || null : null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        // EWMA 触发时更新 localStorage
        if (data.updatedProfile) {
          const raw = localStorage.getItem('shishi_user_profile')
          const current = raw ? JSON.parse(raw) : {}
          localStorage.setItem('shishi_user_profile', JSON.stringify({
            ...current,
            ...data.updatedProfile,
          }))
          setProfileUpdated(true)
        }
        setSubmitted(true)
      } else {
        alert('提交失败，请稍后重试')
      }
    } catch {
      alert('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <p className="text-center text-xs text-gray-400 mt-1">
        {profileUpdated ? '体质档案已根据反馈更新 ✓' : '感谢反馈，我们会持续改进 ✓'}
      </p>
    )
  }

  return (
    <>
      <p className="text-center text-xs text-gray-300 mt-1">
        结果有误？
        <button
          onClick={() => setOpen(true)}
          className="underline underline-offset-2 ml-0.5 active:text-gray-400 transition-colors"
        >
          点此反馈
        </button>
      </p>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl p-6 pb-24 shadow-2xl">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <p className="font-semibold text-gray-800 mb-4">哪里不准？</p>

            <div className="space-y-2 mb-4">
              {issues.map((item) => (
                <button
                  key={item.value}
                  onClick={() => { setSelected(item.value); setDirection(null) }}
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

            {/* 预测不准 → 追加方向选择（触发 EWMA） */}
            {selected === 'wrong_prediction' && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">实际情况是？</p>
                <div className="space-y-2">
                  {directionOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDirection(opt.value as 'up' | 'down')}
                      className={`w-full text-left px-4 py-2.5 rounded-xl border-2 text-sm transition-all ${
                        direction === opt.value
                          ? 'border-violet-400 bg-violet-50 text-violet-700 font-medium'
                          : 'border-gray-100 text-gray-500'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 咖啡因数值不对 → mg 输入 */}
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

            {/* 以上都不是 → 文字输入 */}
            {selected === 'other' && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">能告诉我哪里不对吗？（可选）</p>
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="随便写，帮助我们改进..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
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
