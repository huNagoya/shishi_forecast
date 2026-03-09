'use client'

import { DigestPrediction } from '@/lib/types'
import { getRiskColor, getRiskLabel, getSmoothnessColor } from '@/lib/utils'

interface DigestResultProps {
  data: DigestPrediction
}

export default function DigestResult({ data }: DigestResultProps) {
  const smoothnessColor = getSmoothnessColor(data.smoothnessScore)
  const constipationColor = getRiskColor(data.constipationRisk)
  const diarrheaColor = getRiskColor(data.diarrheaRisk)

  const smoothnessLabel =
    data.smoothnessScore >= 70 ? '顺畅' : data.smoothnessScore >= 40 ? '一般' : '不太好'

  return (
    <div className="space-y-4">
      {/* 食物信息 */}
      <div className="bg-green-50 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🍱</span>
          <span className="font-bold text-gray-800">{data.foodName}</span>
        </div>
      </div>

      {/* 通畅度评分 - 核心指标 */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm">
        <p className="text-sm text-gray-400 mb-2">通畅度评分</p>
        {/* 环形进度条 */}
        <div className="relative inline-flex items-center justify-center">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="10" />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={
                data.smoothnessScore >= 70
                  ? '#22c55e'
                  : data.smoothnessScore >= 40
                  ? '#f59e0b'
                  : '#ef4444'
              }
              strokeWidth="10"
              strokeDasharray={`${(data.smoothnessScore / 100) * 251.2} 251.2`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute text-center">
            <p className={`text-2xl font-bold ${smoothnessColor}`}>{data.smoothnessScore}</p>
          </div>
        </div>
        <p className={`font-medium mt-1 ${smoothnessColor}`}>{smoothnessLabel}</p>
      </div>

      {/* 黄金如厕时间 */}
      <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4 text-center">
        <p className="text-sm text-yellow-600 font-medium mb-1">黄金如厕时间 ⏰</p>
        <p className="font-bold text-yellow-700 text-lg">
          {data.goldenTimeStart} — {data.goldenTimeEnd}
        </p>
        <p className="text-xs text-yellow-500 mt-1">此时段如厕成功率最高</p>
      </div>

      {/* 风险指标 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
          <div className="text-2xl mb-1">😣</div>
          <p className="text-xs text-gray-400 mb-1">便秘风险</p>
          <p className={`font-bold text-lg ${constipationColor}`}>{data.constipationRisk}%</p>
          <p className={`text-xs ${constipationColor}`}>{getRiskLabel(data.constipationRisk)}</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
          <div className="text-2xl mb-1">🚽</div>
          <p className="text-xs text-gray-400 mb-1">腹泻风险</p>
          <p className={`font-bold text-lg ${diarrheaColor}`}>{data.diarrheaRisk}%</p>
          <p className={`text-xs ${diarrheaColor}`}>{getRiskLabel(data.diarrheaRisk)}</p>
        </div>
      </div>

      {/* AI分析 */}
      <div className="bg-blue-50 rounded-2xl p-4">
        <p className="text-sm font-medium text-blue-700 mb-2">AI分析</p>
        <p className="text-sm text-blue-600">{data.analysis}</p>
      </div>

      {/* 饮食建议 */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <p className="text-sm font-medium text-gray-700 mb-3">饮食建议</p>
        <ul className="space-y-2">
          {data.suggestions.map((suggestion, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="text-green-500 font-bold mt-0.5">{i + 1}.</span>
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 免责声明 */}
      <p className="text-xs text-center text-gray-300">
        基于通用模型，个体差异存在偏差，仅供参考
      </p>
    </div>
  )
}
