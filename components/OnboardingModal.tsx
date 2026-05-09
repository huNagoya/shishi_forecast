'use client'

import { useState, useEffect } from 'react'
import { getDeviceId } from '@/lib/device-id'

type Answer = number | string[]

interface Question {
  id: string
  category: string
  question: string
  options: { label: string; value: number | string }[]
  multi: boolean
}

const QUESTIONS: Question[] = [
  {
    id: 'q1',
    category: '☕ 咖啡因敏感度',
    question: '喝完咖啡 / 奶茶后，多久心跳会加快？',
    options: [
      { label: '很少，几乎感觉不到', value: 30 },
      { label: '1-2 小时后', value: 50 },
      { label: '30 分钟内就有感觉', value: 70 },
    ],
    multi: false,
  },
  {
    id: 'q2',
    category: '😴 睡眠影响',
    question: '下午 3 点后喝咖啡，当晚入睡会推迟多久？',
    options: [
      { label: '不影响，照常入睡', value: 30 },
      { label: '大约 1 小时', value: 50 },
      { label: '2 小时以上 / 直接失眠', value: 70 },
    ],
    multi: false,
  },
  {
    id: 'q3',
    category: '🫃 肠胃反应',
    question: '吃了高油高辣食物后，肠胃反应如何？',
    options: [
      { label: '正常，没什么感觉', value: 30 },
      { label: '有点不舒服，能接受', value: 50 },
      { label: '明显不适 / 容易腹泻', value: 70 },
    ],
    multi: false,
  },
  {
    id: 'q4',
    category: '⚠️ 特殊体质',
    question: '以下情况你有吗？',
    options: [
      { label: '乳糖不耐受', value: 'lactose' },
      { label: 'IBS（肠易激综合征）', value: 'ibs' },
      { label: '以上都没有', value: 'none' },
    ],
    multi: true,
  },
  {
    id: 'q5',
    category: '🌙 作息规律',
    question: '你平时大概几点入睡？',
    options: [
      { label: '11 点前，比较规律', value: 23.0 },
      { label: '12 点前后，工作日规律', value: 0.0 },
      { label: '1 点以后 / 完全不规律', value: 1.0 },
    ],
    multi: false,
  },
]

function calcProfile(answers: Record<string, Answer>) {
  const q1 = answers.q1 as number
  const q2 = answers.q2 as number
  const q3 = answers.q3 as number
  const q4 = answers.q4 as string[]
  const q5 = answers.q5 as number

  const caffeineSensitivity = Math.round((q1 + q2) / 2)
  const hasCondition = Array.isArray(q4) && !q4.includes('none') && q4.length > 0
  const giSensitivity = Math.min(100, q3 + (hasCondition ? 15 : 0))

  return { caffeineSensitivity, giSensitivity, typicalSleepHour: q5 }
}

function saveAndClose(profile: { caffeineSensitivity: number; giSensitivity: number; typicalSleepHour: number }) {
  const deviceId = getDeviceId()
  localStorage.setItem('shishi_user_profile', JSON.stringify({ ...profile, deviceId }))
  localStorage.setItem('shishi_onboarding_done', 'true')
  fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, ...profile }),
  }).catch(() => {})
}

export default function OnboardingModal() {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('shishi_onboarding_done')) {
      setShow(true)
    }
  }, [])

  if (!show) return null

  const isDone = step >= QUESTIONS.length
  const q = QUESTIONS[step]
  const isLast = step === QUESTIONS.length - 1

  function selectOption(value: number | string) {
    if (!q) return
    if (q.multi) {
      const prev = (answers[q.id] as string[]) ?? []
      let next: string[]
      if (value === 'none') {
        next = prev.includes('none') ? [] : ['none']
      } else {
        const filtered = prev.filter((v) => v !== 'none')
        next = filtered.includes(value as string)
          ? filtered.filter((v) => v !== value)
          : [...filtered, value as string]
      }
      setAnswers({ ...answers, [q.id]: next })
    } else {
      setAnswers({ ...answers, [q.id]: value as number })
    }
  }

  function isSelected(value: number | string): boolean {
    if (!q) return false
    if (q.multi) return ((answers[q.id] as string[]) ?? []).includes(value as string)
    return answers[q.id] === value
  }

  function hasAnswer(): boolean {
    if (!q) return false
    if (q.multi) return ((answers[q.id] as string[]) ?? []).length > 0
    return answers[q.id] !== undefined
  }

  async function handleNext() {
    if (!hasAnswer()) return
    if (isLast) {
      setSaving(true)
      const profile = calcProfile(answers)
      saveAndClose(profile)
      setSaving(false)
      setStep(QUESTIONS.length)
    } else {
      setStep(step + 1)
    }
  }

  function handleSkip() {
    saveAndClose({ caffeineSensitivity: 50, giSensitivity: 50, typicalSleepHour: 23.5 })
    setShow(false)
  }

  if (isDone) {
    return (
      <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl sm:rounded-3xl p-8 pb-20 sm:pb-8 text-center shadow-2xl">
          <div className="text-5xl mb-4">🎉</div>
          <p className="font-bold text-gray-800 text-lg mb-2">体质档案已建立！</p>
          <p className="text-sm text-gray-400 mb-6">预测结果会根据你的体质持续优化</p>
          <button
            onClick={() => setShow(false)}
            className="w-full bg-gray-800 text-white font-medium py-3 rounded-2xl text-sm active:scale-95 transition-transform"
          >
            开始使用
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl sm:rounded-3xl p-6 pb-10 sm:pb-6 shadow-2xl">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />

        {/* Progress */}
        <div className="flex gap-1 mb-5">
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                i <= step ? 'bg-amber-400' : 'bg-gray-100'
              }`}
            />
          ))}
        </div>

        <p className="text-xs text-amber-500 font-medium mb-1">{q.category}</p>
        <p className="font-semibold text-gray-800 mb-4 text-base leading-snug">{q.question}</p>

        {q.multi && (
          <p className="text-xs text-gray-400 mb-3">可多选</p>
        )}

        <div className="space-y-2 mb-5">
          {q.options.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => selectOption(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-2xl border-2 text-sm transition-all ${
                isSelected(opt.value)
                  ? 'border-amber-400 bg-amber-50 text-amber-700 font-medium'
                  : 'border-gray-100 text-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={!hasAnswer() || saving}
          className="w-full bg-gray-800 text-white font-medium py-3 rounded-2xl text-sm disabled:opacity-40 active:scale-95 transition-transform mb-3"
        >
          {saving ? '保存中...' : isLast ? '完成' : '下一步'}
        </button>

        <div className="flex items-center justify-between text-xs text-gray-300">
          <button onClick={handleSkip} className="underline underline-offset-2 active:text-gray-400">
            跳过，使用默认设置
          </button>
          <span>{step + 1} / {QUESTIONS.length}</span>
        </div>
      </div>
    </div>
  )
}
