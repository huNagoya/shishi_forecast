'use client'

import { useState, useEffect } from 'react'
import ImageUpload from '@/components/ImageUpload'
import SleepResult from '@/components/SleepResult'
import { SleepPrediction, UserSettings } from '@/lib/types'
import { fileToBase64 } from '@/lib/utils'
import { saveHistory, getSettings } from '@/lib/storage'

export default function SleepPage() {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [drinkDesc, setDrinkDesc] = useState('')
  const [drinkTime, setDrinkTime] = useState('')
  const [tolerance, setTolerance] = useState<'low' | 'medium' | 'high'>('medium')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<SleepPrediction | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const s: UserSettings = getSettings()
    setTolerance(s.tolerance)
    const now = new Date()
    setDrinkTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
  }, [])

  const hasInput = imageFile !== null || drinkDesc.trim().length > 0

  const handlePredict = async () => {
    if (!hasInput) {
      setError('请上传饮品图片或描述你喝了什么')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      let imageBase64: string | null = null
      let imageMimeType: string | null = null

      if (imageFile) {
        imageBase64 = await fileToBase64(imageFile)
        imageMimeType = imageFile.type
      }

      const res = await fetch('/api/predict/sleep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          imageMimeType,
          drinkDesc: drinkDesc.trim(),
          drinkTime,
          tolerance,
        }),
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error || '预测失败')

      setResult(data.data)
      saveHistory({
        id: Date.now().toString(),
        type: 'sleep',
        createdAt: new Date().toISOString(),
        input: { drinkTime, tolerance },
        result: data.data,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-3xl">😴</span>
        <div>
          <h1 className="text-xl font-bold text-gray-800">熬夜预警机</h1>
          <p className="text-xs text-gray-400">分析你的饮品，预测今晚睡眠</p>
        </div>
      </div>

      {/* 输入区卡片 */}
      <div className="glass-card-amber rounded-3xl p-4 mb-5 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            第一步：拍摄或上传饮品图片
            <span className="text-gray-400 font-normal ml-1">（与文字描述二选一）</span>
          </label>
          <ImageUpload
            onImageSelect={(file, dataUrl) => {
              setImageFile(file)
              setImagePreview(dataUrl)
              setDrinkDesc('')
            }}
            onClear={() => {
              setImageFile(null)
              setImagePreview(null)
            }}
            preview={imagePreview}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            或文字描述你喝了什么
          </label>
          <textarea
            value={drinkDesc}
            onChange={(e) => {
              setDrinkDesc(e.target.value)
              if (e.target.value.trim()) {
                setImageFile(null)
                setImagePreview(null)
              }
            }}
            placeholder="例如：星巴克大杯拿铁、蜜雪冰城奶茶、红牛一罐..."
            rows={2}
            className="w-full border border-amber-100 rounded-2xl px-4 py-3 text-sm bg-white/70 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 resize-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            第二步：饮用时间
          </label>
          <input
            type="time"
            value={drinkTime}
            onChange={(e) => setDrinkTime(e.target.value)}
            className="w-full border border-amber-100 rounded-2xl px-4 py-3 text-base bg-white/70 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            第三步：咖啡因耐受度
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'low', label: '低', desc: '敏感型', icon: '🫖' },
              { value: 'medium', label: '中', desc: '普通型', icon: '☕' },
              { value: 'high', label: '高', desc: '耐受型', icon: '⚡' },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setTolerance(item.value as 'low' | 'medium' | 'high')}
                className={`rounded-2xl p-3 text-center border-2 transition-all ${
                  tolerance === item.value
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-amber-100/50 bg-white/60'
                }`}
              >
                <div className="text-xl mb-1">{item.icon}</div>
                <div className="text-sm font-semibold text-gray-800">{item.label}</div>
                <div className="text-xs text-gray-400">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 预测按钮 */}
      <button
        onClick={handlePredict}
        disabled={isLoading || !hasInput}
        className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold py-4 rounded-2xl text-base shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span> AI分析中...
          </span>
        ) : (
          '预测睡眠影响 ✨'
        )}
      </button>

      {!hasInput && (
        <p className="text-center text-xs text-gray-300 mt-2">请先上传图片或填写饮品描述</p>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-100 rounded-2xl p-4">
          <p className="text-sm text-red-600">❌ {error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6">
          <h2 className="text-base font-bold text-gray-800 mb-4">预测结果</h2>
          <SleepResult data={result} />
        </div>
      )}
    </div>
  )
}
