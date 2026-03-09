'use client'

import { useState, useEffect } from 'react'
import ImageUpload from '@/components/ImageUpload'
import DigestResult from '@/components/DigestResult'
import { DigestPrediction, UserSettings } from '@/lib/types'
import { fileToBase64 } from '@/lib/utils'
import { saveHistory, getSettings } from '@/lib/storage'

export default function DigestPage() {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [foodText, setFoodText] = useState('')
  const [eatTime, setEatTime] = useState('')
  const [gutType, setGutType] = useState<'constipation' | 'diarrhea' | 'normal'>('normal')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<DigestPrediction | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const s: UserSettings = getSettings()
    setGutType(s.gutType)
    const now = new Date()
    setEatTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
  }, [])

  const handlePredict = async () => {
    if (!imageFile && !foodText.trim()) {
      setError('请上传食物图片或粘贴外卖订单描述')
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

      const res = await fetch('/api/predict/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          imageMimeType,
          foodText: foodText.trim(),
          eatTime,
          gutType,
          noImage: !imageFile,
        }),
      })

      if (res.status === 413) {
        throw new Error('图片文件太大，请选择更小的图片（建议2MB以内）')
      }

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || '预测失败')
      }

      setResult(data.data)

      saveHistory({
        id: Date.now().toString(),
        type: 'digest',
        createdAt: new Date().toISOString(),
        input: { eatTime, gutType, foodText: foodText.trim() },
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
        <span className="text-3xl">🚽</span>
        <div>
          <h1 className="text-xl font-bold text-gray-800">如厕预测官</h1>
          <p className="text-xs text-gray-400">分析你的食物，预测消化节律</p>
        </div>
      </div>

      {/* 输入区卡片 */}
      <div className="glass-card-emerald rounded-3xl p-4 mb-5 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            第一步：拍摄食物图片
            <span className="text-gray-400 font-normal ml-1">（与订单文字二选一）</span>
          </label>
          <ImageUpload
            onImageSelect={(file, dataUrl) => {
              setImageFile(file)
              setImagePreview(dataUrl)
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
            或粘贴外卖订单 / 描述食物
          </label>
          <textarea
            value={foodText}
            onChange={(e) => setFoodText(e.target.value)}
            placeholder="例如：麻辣烫 + 奶茶一杯 + 炸鸡两块，辛辣重口..."
            rows={3}
            className="w-full border border-emerald-100 rounded-2xl px-4 py-3 text-sm bg-white/70 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            第二步：进食时间
          </label>
          <input
            type="time"
            value={eatTime}
            onChange={(e) => setEatTime(e.target.value)}
            className="w-full border border-emerald-100 rounded-2xl px-4 py-3 text-base bg-white/70 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            第三步：你的肠胃类型
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'constipation', label: '易便秘', icon: '😣' },
              { value: 'normal', label: '正常', icon: '😊' },
              { value: 'diarrhea', label: '易腹泻', icon: '💨' },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setGutType(item.value as 'constipation' | 'diarrhea' | 'normal')}
                className={`rounded-2xl p-3 text-center border-2 transition-all ${
                  gutType === item.value
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-emerald-100/50 bg-white/60'
                }`}
              >
                <div className="text-xl mb-1">{item.icon}</div>
                <div className="text-xs font-semibold text-gray-800">{item.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 预测按钮 */}
      <button
        onClick={handlePredict}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-bold py-4 rounded-2xl text-base shadow-lg active:scale-95 transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span> AI分析中...
          </span>
        ) : (
          '预测消化节律 ✨'
        )}
      </button>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-100 rounded-2xl p-4">
          <p className="text-sm text-red-600">❌ {error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6">
          <h2 className="text-base font-bold text-gray-800 mb-4">预测结果</h2>
          <DigestResult data={result} />
        </div>
      )}
    </div>
  )
}
