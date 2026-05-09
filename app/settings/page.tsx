'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserSettings } from '@/lib/types'
import { getSettings, saveSettings } from '@/lib/storage'

interface UserProfile {
  caffeineSensitivity: number
  giSensitivity: number
  typicalSleepHour: number
  feedbackCount: number
  lastUpdated?: string
}

const DEFAULT_PROFILE: UserProfile = {
  caffeineSensitivity: 50,
  giSensitivity: 50,
  typicalSleepHour: 23.5,
  feedbackCount: 0,
}

function sensitivityLabel(v: number): { text: string; color: string } {
  if (v <= 35) return { text: '低敏', color: 'text-blue-500' }
  if (v <= 45) return { text: '偏低', color: 'text-blue-400' }
  if (v <= 55) return { text: '中等', color: 'text-gray-500' }
  if (v <= 65) return { text: '偏高', color: 'text-orange-400' }
  return { text: '高敏', color: 'text-red-500' }
}

function ScoreBar({
  value,
  accent,
}: {
  value: number
  accent: 'amber' | 'emerald'
}) {
  const label = sensitivityLabel(value)
  const barColor = accent === 'amber' ? 'bg-amber-400' : 'bg-emerald-400'
  const textAccent = accent === 'amber' ? 'text-amber-600' : 'text-emerald-600'

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-gray-300">低</span>
        <span className={`text-sm font-bold ${label.color}`}>
          {label.text} · <span className={textAccent}>{value}</span>
        </span>
        <span className="text-xs text-gray-300">高</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function LearningProgress({ count }: { count: number }) {
  const max = 5
  const pct = Math.min(count / max, 1) * 100
  const remaining = Math.max(0, max - count)

  return (
    <div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-violet-400 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">
        {count >= max
          ? '✅ 精准模式已解锁，预测基于你的个人体质'
          : remaining === max
          ? '完成第一次反馈开始个性化学习'
          : `再反馈 ${remaining} 次解锁精准预测模式`}
      </p>
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE)
  const [settings, setSettings] = useState<UserSettings>({ tolerance: 'medium', gutType: 'normal' })
  const [showManual, setShowManual] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasProfile, setHasProfile] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('shishi_user_profile')
    if (raw) {
      const parsed = JSON.parse(raw)
      setProfile({ ...DEFAULT_PROFILE, ...parsed })
      setHasProfile(true)
    }
    setSettings(getSettings())
  }, [])

  function handleRetakeOnboarding() {
    localStorage.removeItem('shishi_onboarding_done')
    router.push('/')
  }

  function handleSaveManual() {
    saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const lastUpdated = profile.lastUpdated
    ? new Date(profile.lastUpdated).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
    : null

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="text-xl font-bold text-gray-800 mb-1">我的体质档案</h1>
      <p className="text-xs text-gray-400 mb-6">预测结果基于以下参数持续优化</p>

      {!hasProfile && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 text-center">
          <p className="text-sm text-amber-700 mb-3">还没有建立体质档案，做5题快速问卷开始个性化预测</p>
          <button
            onClick={handleRetakeOnboarding}
            className="bg-amber-400 text-white text-sm font-medium px-5 py-2 rounded-xl active:scale-95 transition-transform"
          >
            立即建立档案
          </button>
        </div>
      )}

      {/* 咖啡因敏感度 */}
      <div className="glass-card-amber rounded-2xl p-4 mb-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">☕</span>
          <div>
            <h2 className="font-semibold text-gray-800 text-sm">咖啡因敏感度</h2>
            <p className="text-xs text-gray-400">影响睡眠预测准确性</p>
          </div>
        </div>
        <ScoreBar value={profile.caffeineSensitivity} accent="amber" />
      </div>

      {/* 肠胃敏感度 */}
      <div className="glass-card-emerald rounded-2xl p-4 mb-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🫃</span>
          <div>
            <h2 className="font-semibold text-gray-800 text-sm">肠胃敏感度</h2>
            <p className="text-xs text-gray-400">影响消化预测准确性</p>
          </div>
        </div>
        <ScoreBar value={profile.giSensitivity} accent="emerald" />
      </div>

      {/* 学习进度 */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📈</span>
            <h2 className="font-semibold text-gray-800 text-sm">学习进度</h2>
          </div>
          <span className="text-xs text-gray-400">{profile.feedbackCount} / 5 次反馈</span>
        </div>
        <LearningProgress count={profile.feedbackCount} />
      </div>

      {/* 上次更新 + 重做问卷 */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs text-gray-300">
          {lastUpdated ? `上次更新：${lastUpdated}` : '尚未建立档案'}
        </p>
        <button
          onClick={handleRetakeOnboarding}
          className="text-xs text-gray-400 underline underline-offset-2 active:text-gray-600"
        >
          重新做问卷
        </button>
      </div>

      {/* 手动微调（折叠） */}
      <button
        onClick={() => setShowManual(!showManual)}
        className="w-full flex items-center justify-between text-xs text-gray-400 py-2 mb-1"
      >
        <span>⚙️ 手动微调偏好</span>
        <span>{showManual ? '▲' : '▼'}</span>
      </button>

      {showManual && (
        <div className="bg-gray-50 rounded-2xl p-4 mb-4">
          <p className="text-xs text-gray-400 mb-3">以下选项直接影响本次预测，优先级高于档案分值</p>

          <p className="text-xs font-medium text-gray-600 mb-2">咖啡因耐受度</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { value: 'low', label: '低', desc: '喝一杯就失眠', icon: '🫖' },
              { value: 'medium', label: '中', desc: '普通敏感度', icon: '☕' },
              { value: 'high', label: '高', desc: '影响不大', icon: '⚡' },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setSettings({ ...settings, tolerance: item.value as UserSettings['tolerance'] })}
                className={`rounded-xl p-2.5 text-center border-2 transition-all ${
                  settings.tolerance === item.value ? 'border-amber-400 bg-amber-50' : 'border-gray-200'
                }`}
              >
                <div className="text-base mb-0.5">{item.icon}</div>
                <div className="text-xs font-semibold text-gray-800">{item.label}</div>
                <div className="text-xs text-gray-400 leading-tight">{item.desc}</div>
              </button>
            ))}
          </div>

          <p className="text-xs font-medium text-gray-600 mb-2">肠胃类型</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { value: 'constipation', label: '易便秘', desc: '排便偏慢', icon: '😣' },
              { value: 'normal', label: '正常', desc: '消化正常', icon: '😊' },
              { value: 'diarrhea', label: '易腹泻', desc: '肠胃敏感', icon: '💨' },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setSettings({ ...settings, gutType: item.value as UserSettings['gutType'] })}
                className={`rounded-xl p-2.5 text-center border-2 transition-all ${
                  settings.gutType === item.value ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200'
                }`}
              >
                <div className="text-base mb-0.5">{item.icon}</div>
                <div className="text-xs font-semibold text-gray-800">{item.label}</div>
                <div className="text-xs text-gray-400 leading-tight">{item.desc}</div>
              </button>
            ))}
          </div>

          <button
            onClick={handleSaveManual}
            className={`w-full font-medium py-2.5 rounded-xl text-sm transition-all ${
              saved ? 'bg-green-500 text-white' : 'bg-gray-800 text-white active:scale-95'
            }`}
          >
            {saved ? '✅ 已保存' : '保存偏好'}
          </button>
        </div>
      )}

      <p className="text-xs text-gray-300 leading-relaxed text-center mt-4">
        体质档案存储在本设备，不关联账号
      </p>
    </div>
  )
}
