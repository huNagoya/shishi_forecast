import { NextRequest, NextResponse } from 'next/server'
import { callZhipu, extractJSON } from '@/lib/zhipu'
import { DigestPrediction } from '@/lib/types'

function toStringArray(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val.map((item) => {
      if (typeof item === 'string') return item
      if (typeof item === 'object' && item !== null) {
        const strVals = Object.values(item as Record<string, unknown>)
          .filter((v): v is string => typeof v === 'string')
        return strVals[0] ?? ''
      }
      return String(item)
    }).filter(Boolean)
  }
  if (val && typeof val === 'object') {
    return Object.values(val as Record<string, unknown>).map((v) =>
      typeof v === 'string' ? v : String(v)
    )
  }
  if (typeof val === 'string') return [val]
  return []
}

function toStr(val: unknown): string {
  if (typeof val === 'string') return val
  if (typeof val === 'number') return String(val)
  return ''
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { imageBase64, imageMimeType, eatTime, gutType, foodText } = body

    const now = new Date()
    const currentTime = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`

    const gutTypeMap: Record<string, string> = {
      constipation: '易便秘（消化慢）',
      diarrhea: '易腹泻（肠胃敏感）',
      normal: '正常',
    }
    const gutText = gutTypeMap[gutType] || gutTypeMap['normal']
    const eatTimeText = eatTime || currentTime

    const suggestionsFormat = '"suggestions": ["第一条建议文字", "第二条建议文字", "第三条建议文字"]'

    let rawResponse: string

    if (imageBase64 && imageMimeType) {
      const extraText = foodText?.trim() ? `\n用户备注：${foodText.trim()}` : ''
      const prompt = `你是专业营养师。请识别图片中的食物，分析对消化排便的影响。${extraText}
进食时间：${eatTimeText}，当前时间：${currentTime}，肠胃类型：${gutText}
请用中文，只返回以下格式的JSON：
{"foodName":"食物概括","smoothnessScore":数字0到100,"goldenTimeStart":"如明早7:00","goldenTimeEnd":"如明早9:00","constipationRisk":数字0到100,"diarrheaRisk":数字0到100,"analysis":"50字内分析",${suggestionsFormat}}
不要其他文字。`

      rawResponse = await callZhipu([
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${imageMimeType};base64,${imageBase64}` } },
            { type: 'text', text: prompt },
          ],
        },
      ], 'glm-4v')
    } else {
      const foodDesc = foodText?.trim() || '普通外卖套餐'
      const prompt = `你是专业营养师。用户吃了"${foodDesc}"，分析对消化排便的影响。
进食时间：${eatTimeText}，当前时间：${currentTime}，肠胃类型：${gutText}
请用中文，只返回以下格式的JSON：
{"foodName":"食物概括","smoothnessScore":数字0到100,"goldenTimeStart":"如明早7:00","goldenTimeEnd":"如明早9:00","constipationRisk":数字0到100,"diarrheaRisk":数字0到100,"analysis":"50字内分析",${suggestionsFormat}}
不要其他文字。`

      rawResponse = await callZhipu([
        { role: 'user', content: prompt },
      ], 'glm-4-flash')
    }

    const prediction = extractJSON(rawResponse) as DigestPrediction

    prediction.suggestions = toStringArray(prediction.suggestions)
    prediction.foodName = toStr(prediction.foodName) || '识别的食物'
    prediction.goldenTimeStart = toStr(prediction.goldenTimeStart)
    prediction.goldenTimeEnd = toStr(prediction.goldenTimeEnd)
    prediction.analysis = toStr(prediction.analysis)
    prediction.smoothnessScore = Math.min(100, Math.max(0, Math.round(Number(prediction.smoothnessScore)))) || 0
    prediction.constipationRisk = Math.min(100, Math.max(0, Math.round(Number(prediction.constipationRisk)))) || 0
    prediction.diarrheaRisk = Math.min(100, Math.max(0, Math.round(Number(prediction.diarrheaRisk)))) || 0

    return NextResponse.json({ success: true, data: prediction })
  } catch (error) {
    console.error('消化预测API错误:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '预测失败，请重试' },
      { status: 500 }
    )
  }
}
