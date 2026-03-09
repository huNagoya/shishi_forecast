// 睡眠预测结果
export interface SleepPrediction {
  drinkName: string
  caffeineContent: number
  estimatedSleepTime: string
  insomniaRisk: number // 0-100
  wakeTimes: number // 0-5
  nextDayScore: number // 0-100
  analysis: string
  tips: string[]
}

// 消化预测结果
export interface DigestPrediction {
  foodName: string
  smoothnessScore: number // 0-100，100最顺畅
  goldenTimeStart: string
  goldenTimeEnd: string
  constipationRisk: number // 0-100
  diarrheaRisk: number // 0-100
  analysis: string
  suggestions: string[]
}

// 历史记录条目
export interface HistoryItem {
  id: string
  type: 'sleep' | 'digest'
  createdAt: string
  input: {
    drinkTime?: string
    tolerance?: string
    eatTime?: string
    gutType?: string
    foodText?: string
    imagePreview?: string // base64缩略图（可选）
  }
  result: SleepPrediction | DigestPrediction
}

// 用户设置
export interface UserSettings {
  tolerance: 'low' | 'medium' | 'high' // 咖啡因耐受度
  gutType: 'constipation' | 'diarrhea' | 'normal' // 肠胃类型
}
