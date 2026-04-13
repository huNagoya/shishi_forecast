'use client'

import { SleepPrediction } from '@/lib/types'
import { getRiskColor, getRiskLabel } from '@/lib/utils'
import FeedbackWidget from '@/components/FeedbackWidget'

interface SleepResultProps {
  data: SleepPrediction
}

export default function SleepResult({ data }: SleepResultProps) {
  const insomniaColor = getRiskColor(data.insomniaRisk)
  const insomniaLabel = getRiskLabel(data.insomniaRisk)

  // 次日状态颜色（评分越高越好）
  const nextDayColor =
    data.nextDayScore >= 70
      ? 'text-green-500'
      : data.nextDayScore >= 40
      ? 'text-amber-500'
      : 'text-red-500'

  return (
    <div className="space-y-4">
      {/* 饮品信息 */}
      <div className="bg-amber-50 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">☕</span>
          <span className="font-bold text-gray-800">{data.drinkName}</span>
        </div>
        <p className="text-sm text-gray-500 ml-8">
          咖啡因含量：约 <strong className="text-amber-600">{data.caffeineContent}mg</strong>
        </p>
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 预计入睡时间 */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
          <div className="text-3xl mb-1">🌙</div>
          <p className="text-xs text-gray-400 mb-1">预计入睡</p>
          <p className="font-bold text-gray-800 text-sm">{data.estimatedSleepTime}</p>
        </div>

        {/* 夜间清醒次数 */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
          <div className="text-3xl mb-1">😵</div>
          <p className="text-xs text-gray-400 mb-1">夜间清醒</p>
          <p className="font-bold text-gray-800 text-sm">{data.wakeTimes} 次</p>
        </div>

        {/* 失眠风险 */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
          <div className="text-3xl mb-1">⚡</div>
          <p className="text-xs text-gray-400 mb-1">失眠风险</p>
          <p className={`font-bold text-lg ${insomniaColor}`}>{data.insomniaRisk}%</p>
          <p className={`text-xs ${insomniaColor}`}>{insomniaLabel}</p>
        </div>

        {/* 次日状态 */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
          <div className="text-3xl mb-1">🌟</div>
          <p className="text-xs text-gray-400 mb-1">次日状态</p>
          <p className={`font-bold text-lg ${nextDayColor}`}>{data.nextDayScore}分</p>
          <p className={`text-xs ${nextDayColor}`}>
            {data.nextDayScore >= 70 ? '状态不错' : data.nextDayScore >= 40 ? '一般般' : '会很惨'}
          </p>
        </div>
      </div>

      {/* AI分析 */}
      <div className="bg-blue-50 rounded-2xl p-4">
        <p className="text-sm font-medium text-blue-700 mb-2">AI分析</p>
        <p className="text-sm text-blue-600">{data.analysis}</p>
      </div>

      {/* 补救建议 */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <p className="text-sm font-medium text-gray-700 mb-3">补救建议</p>
        <ul className="space-y-2">
          {data.tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="text-amber-500 font-bold mt-0.5">{i + 1}.</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 免责声明 + 反馈 */}
      <p className="text-xs text-center text-gray-300">
        基于通用模型，个体差异存在偏差，仅供参考
      </p>
      <FeedbackWidget type="sleep" drinkName={data.drinkName} />
    </div>
  )
}
