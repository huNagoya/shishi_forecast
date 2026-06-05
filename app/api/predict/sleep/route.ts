import { NextRequest, NextResponse } from 'next/server'
import { callQwen, extractJSON } from '@/lib/zhipu'
import { SleepPrediction } from '@/lib/types'
import { buildKnowledgeHint } from '@/lib/caffeine-lookup'
import { buildUserHint } from '@/lib/user-hint'
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
    const { imageBase64, imageMimeType, drinkDesc, drinkTime, tolerance, userProfile } = body
    const userHint = buildUserHint(userProfile, 'sleep')

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
      // 第一步：用 Qwen 视觉模型优先读取杯身文字标签识别品名
      const identifyPrompt = `请识别图片中饮品杯子或包装上的品牌名和产品名。

识别规则（按优先级严格执行）：
1. 如果杯身/包装上有清晰可读的品牌名和产品名文字 → 以文字为准，直接返回文字内容
2. 如果文字模糊或完全无法识别 → 根据杯子外观、颜色、配料判断品类
3. 如果视觉外观和文字标签矛盾（看起来像A但文字写B）→ 以文字为准，文字比视觉更可靠

只返回"品牌+产品名"，例如：霸王茶姬伯牙绝弦
不要返回任何其他内容。`

      const identifiedName = await callQwen([
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${imageMimeType};base64,${imageBase64}` } },
            { type: 'text', text: identifyPrompt },
          ],
        },
      ], 'qwen2.5-vl-max-latest')

      const knowledgeHint = buildKnowledgeHint(identifiedName.trim()) ?? '暂无该饮品的精确数据，请根据饮品类型合理估算咖啡因含量。'

      const prompt = `你是专业营养师。请分析图片中饮品对睡眠的影响。
识别到的饮品：${identifiedName.trim()}
${knowledgeHint}
饮用时间：${drinkTimeText}，当前时间：${currentTime}，咖啡因耐受度：${toleranceText}${userHint ? '\n' + userHint : ''}
请用中文，只返回以下格式的JSON：
{"drinkName":"饮品名称","caffeineContent":数字,"estimatedSleepTime":"预计能入睡的时间段如23:30-01:00（1-2小时范围）","insomniaRisk":数字0到100,"wakeTimes":数字0到5,"nextDayScore":数字0到100,"analysis":"50字内分析",${tipsFormat}}
不要其他文字。`

      rawResponse = await callQwen([
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${imageMimeType};base64,${imageBase64}` } },
            { type: 'text', text: prompt },
          ],
        },
      ], 'qwen2.5-vl-max-latest')
    } else {
      // 文字模式：直接查知识库
      const knowledgeHint = buildKnowledgeHint(drinkDesc) ?? '暂无该饮品的精确数据，请根据饮品类型合理估算咖啡因含量。'

      const prompt = `你是专业营养师。用户喝了"${drinkDesc}"，分析对今晚睡眠的影响。
${knowledgeHint}
饮用时间：${drinkTimeText}，当前时间：${currentTime}，咖啡因耐受度：${toleranceText}${userHint ? '\n' + userHint : ''}
请用中文，只返回以下格式的JSON：
{"drinkName":"饮品名称","caffeineContent":数字,"estimatedSleepTime":"预计能入睡的时间段如23:30-01:00（1-2小时范围）","insomniaRisk":数字0到100,"wakeTimes":数字0到5,"nextDayScore":数字0到100,"analysis":"50字内分析",${tipsFormat}}
不要其他文字。`

      rawResponse = await callQwen([
        { role: 'user', content: prompt },
      ], 'qwen-plus-latest')
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

    // 埋点：写入 predictions 表（await 确保 serverless 函数关闭前完成）
    const { error: dbError } = await supabase.from('predictions').insert({
      type: 'sleep',
      input_method: imageBase64 ? 'image' : 'text',
      drink_name: prediction.drinkName,
      result_score: prediction.insomniaRisk,
    })
    if (dbError) console.warn('埋点写入失败:', dbError.message)

    return NextResponse.json({ success: true, data: prediction })
  } catch (error) {
    console.error('睡眠预测API错误:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '预测失败，请重试' },
      { status: 500 }
    )
  }
}
