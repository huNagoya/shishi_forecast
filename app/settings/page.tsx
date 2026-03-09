'use client'

import { useState, useEffect } from 'react'
import { UserSettings } from '@/lib/types'
import { getSettings, saveSettings } from '@/lib/storage'

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    tolerance: 'medium',
    gutType: 'normal',
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSettings(getSettings())
  }, [])

  const handleSave = () => {
    saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-bold text-gray-800 mb-6">个人设置</h1>

      {/* 咖啡因耐受度 */}
      <div className="glass-card-amber rounded-2xl p-4 mb-4">
        <h2 className="font-semibold text-gray-800 mb-1">咖啡因耐受度</h2>
        <p className="text-xs text-gray-400 mb-3">影响睡眠预测的准确性</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'low', label: '低', desc: '喝一杯就失眠', icon: '🫖' },
            { value: 'medium', label: '中', desc: '普通敏感度', icon: '☕' },
            { value: 'high', label: '高', desc: '影响不大', icon: '⚡' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setSettings({ ...settings, tolerance: item.value as UserSettings['tolerance'] })}
              className={`rounded-xl p-3 text-center border-2 transition-all ${
                settings.tolerance === item.value
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-gray-100'
              }`}
            >
              <div className="text-xl mb-1">{item.icon}</div>
              <div className="text-sm font-semibold text-gray-800">{item.label}</div>
              <div className="text-xs text-gray-400 leading-tight mt-0.5">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 肠胃类型 */}
      <div className="glass-card-emerald rounded-2xl p-4 mb-6">
        <h2 className="font-semibold text-gray-800 mb-1">肠胃类型</h2>
        <p className="text-xs text-gray-400 mb-3">影响消化预测的准确性</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'constipation', label: '易便秘', desc: '排便偏慢', icon: '😣' },
            { value: 'normal', label: '正常', desc: '消化正常', icon: '😊' },
            { value: 'diarrhea', label: '易腹泻', desc: '肠胃敏感', icon: '💨' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setSettings({ ...settings, gutType: item.value as UserSettings['gutType'] })}
              className={`rounded-xl p-3 text-center border-2 transition-all ${
                settings.gutType === item.value
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-gray-100'
              }`}
            >
              <div className="text-xl mb-1">{item.icon}</div>
              <div className="text-xs font-semibold text-gray-800">{item.label}</div>
              <div className="text-xs text-gray-400 leading-tight mt-0.5">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 保存按钮 */}
      <button
        onClick={handleSave}
        className={`w-full font-bold py-4 rounded-2xl text-base transition-all ${
          saved
            ? 'bg-green-500 text-white'
            : 'bg-gray-800 text-white active:scale-95'
        }`}
      >
        {saved ? '✅ 已保存' : '保存设置'}
      </button>

      {/* 说明 */}
      <div className="mt-6 glass-card rounded-2xl p-4">
        <p className="text-xs text-gray-400 leading-relaxed">
          设置将保存在本设备浏览器中。数据不会上传到服务器，完全本地存储，请放心使用。
        </p>
      </div>
    </div>
  )
}
