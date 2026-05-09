import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

const EWMA_ALPHA = 0.3
const EWMA_DELTA = 20 // 每次反馈调整的信号幅度

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, drinkName, foodName, issue, correctValue, customText, direction, deviceId } = body

    if (!type || !issue) {
      return NextResponse.json({ success: false, error: '缺少必要字段' }, { status: 400 })
    }

    const { error } = await supabase.from('feedbacks').insert({
      type,
      drink_name: drinkName ?? null,
      food_name: foodName ?? null,
      issue,
      correct_value: correctValue ?? null,
      custom_text: customText ?? null,
    })

    if (error) throw error

    // EWMA 更新：仅在 wrong_prediction + 方向明确 + 有 deviceId 时触发
    if (issue === 'wrong_prediction' && direction && deviceId) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('caffeine_sensitivity, gi_sensitivity, feedback_count')
        .eq('device_id', deviceId)
        .single()

      if (profile) {
        const field = type === 'sleep' ? 'caffeine_sensitivity' : 'gi_sensitivity'
        const oldVal: number = type === 'sleep'
          ? profile.caffeine_sensitivity
          : profile.gi_sensitivity

        // 信号值：方向 × 幅度
        const signal = direction === 'up'
          ? Math.min(100, oldVal + EWMA_DELTA)
          : Math.max(0, oldVal - EWMA_DELTA)

        // EWMA 公式：new = α × signal + (1-α) × old
        const newVal = Math.round(EWMA_ALPHA * signal + (1 - EWMA_ALPHA) * oldVal)
        const newFeedbackCount = (profile.feedback_count ?? 0) + 1

        await supabase.from('user_profiles').upsert({
          device_id: deviceId,
          [field]: newVal,
          feedback_count: newFeedbackCount,
          last_updated: new Date().toISOString(),
        })

        // 返回更新后的值供前端同步 localStorage
        const profileKey = type === 'sleep' ? 'caffeineSensitivity' : 'giSensitivity'
        return NextResponse.json({
          success: true,
          updatedProfile: {
            [profileKey]: newVal,
            feedbackCount: newFeedbackCount,
            lastUpdated: new Date().toISOString(),
          },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('反馈提交失败:', error)
    return NextResponse.json(
      { success: false, error: '提交失败，请稍后重试' },
      { status: 500 }
    )
  }
}
