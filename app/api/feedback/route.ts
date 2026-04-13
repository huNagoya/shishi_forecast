import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, drinkName, foodName, issue, correctValue } = body

    if (!type || !issue) {
      return NextResponse.json({ success: false, error: '缺少必要字段' }, { status: 400 })
    }

    const { error } = await supabase.from('feedbacks').insert({
      type,
      drink_name: drinkName ?? null,
      food_name: foodName ?? null,
      issue,
      correct_value: correctValue ?? null,
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('反馈提交失败:', error)
    return NextResponse.json(
      { success: false, error: '提交失败，请稍后重试' },
      { status: 500 }
    )
  }
}
