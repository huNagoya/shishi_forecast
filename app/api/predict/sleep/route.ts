import { NextRequest, NextResponse } from 'next/server'
import { callZhipu, extractJSON } from '@/lib/zhipu'
import { SleepPrediction } from '@/lib/types'
import { buildKnowledgeHint } from '@/lib/caffeine-lookup'
import { supabase } from '@/lib/db'

function toStr(val: unknown): string {
  if (typeof val === 'string') return val
  if (typeof val === 'number') return String(val)
  return ''
}

// 将任意格式的值规范化为字符串数组（兼容对象元素）
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { imageBase64, imageMimeType, drinkDesc, drinkTime, tolerance } = body

    const now = new Date()
    const currentTime = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`

    const toleranceMap: Record<string, string> = {
      low: '低（非常敏感，少量就失眠）',
      medium: '中（普通敏感度）',
      high: '高（耐受性强）',
    }
    const toleranceText = toleranceMap[tolerance] || toleranceMap['medium']
    const drinkTimeText = drinkTime || currentTime

    // 明确要求tips是字符串数组
    const tipsFormat = '"tips": ["第一条建议文字", "第二条建议文字", "第三条建议文字"]'

    let rawResponse: string

    if (imageBase64 && imageMimeType) {
      // 图片模式：先让 AI 识别饮品名，再查知识库注入精确咖啡因值
      const identifyPrompt = `请识别图片中的饮品品牌和产品名称，只返回名称，不要其他内容。例如：霸王茶姬伯牙绝弦`
      const identifiedName = await callZhipu([
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${imageMimeType};base64,${imageBase64}` } },
            { type: 'text', text: identifyPrompt },
          ],
        },
      ], 'glm-4v')

      const knowledgeHint = buildKnowledgeHint(identifiedName.trim()) ?? '暂无该饮品的精确数据，请根据饮品类型合理估算咖啡因含量。'

      const prompt = `你是专业营养师。请分析图片中饮品对睡眠的影响。
${knowledgeHint}
饮用时间：${drinkTimeText}，当前时间：${currentTime}，咖啡因耐受度：${toleranceText}
请用中文，只返回以下格式的JSON：
{"drinkName":"饮品名称","caffeineContent":数字,"estimatedSleepTime":"xx:xx-xx:xx","insomniaRisk":数字0到100,"wakeTimes":数字0到5,"nextDayScore":数字0到100,"analysis":"50字内分析",${tipsFormat}}
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
      // 文字模式：直接查知识库
      const knowledgeHint = buildKnowledgeHint(drinkDesc) ?? '暂无该饮品的精确数据，请根据饮品类型合理估算咖啡因含量。'

      const prompt = `你是专业营养师。用户喝了"${drinkDesc}"，分析对今晚睡眠的影响。
${knowledgeHint}
饮用时间：${drinkTimeText}，当前时间：${currentTime}，咖啡因耐受度：${toleranceText}
请用中文，只返回以下格式的JSON：
{"drinkName":"饮品名称","caffeineContent":数字,"estimatedSleepTime":"xx:xx-xx:xx","insomniaRisk":数字0到100,"wakeTimes":数字0到5,"nextDayScore":数字0到100,"analysis":"50字内分析",${tipsFormat}}
不要其他文字。`

      rawResponse = await callZhipu([
        { role: 'user', content: prompt },
      ], 'glm-4-flash')
    }

    const prediction = extractJSON(rawResponse) as SleepPrediction

    prediction.tips = toStringArray(prediction.tips)
    prediction.drinkName = toStr(prediction.drinkName) || '识别的饮品'
    prediction.analysis = toStr(prediction.analysis)
    prediction.estimatedSleepTime = toStr(prediction.estimatedSleepTime)
    if (prediction.insomniaRisk > 0 && prediction.insomniaRisk <= 1) {
      prediction.insomniaRisk = Math.round(prediction.insomniaRisk * 100)
    }
    prediction.insomniaRisk = Math.min(100, Math.max(0, Math.round(Number(prediction.insomniaRisk))))
    prediction.nextDayScore = Math.min(100, Math.max(0, Math.round(Number(prediction.nextDayScore))))
    prediction.wakeTimes = Math.min(5, Math.max(0, Math.round(Number(prediction.wakeTimes))))
    prediction.caffeineContent = Math.max(0, Math.round(Number(prediction.caffeineContent)))

    // 埋点：写入 predictions 表，失败不影响主流程
    supabase.from('predictions').insert({
      type: 'sleep',
      input_method: imageBase64 ? 'image' : 'text',
      drink_name: prediction.drinkName,
      result_score: prediction.insomniaRisk,
    }).then(({ error }) => { if (error) console.warn('埋点写入失败:', error.message) })

    return NextResponse.json({ success: true, data: prediction })
  } catch (error) {
    console.error('睡眠预测API错误:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '预测失败，请重试' },
      { status: 500 }
    )
  }
}
