import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { deviceId, caffeineSensitivity, giSensitivity, typicalSleepHour } = body

    if (!deviceId) {
      return NextResponse.json({ success: false, error: '缺少 deviceId' }, { status: 400 })
    }

    const { error } = await supabase.from('user_profiles').upsert({
      device_id: deviceId,
      caffeine_sensitivity: caffeineSensitivity ?? 50,
      gi_sensitivity: giSensitivity ?? 50,
      typical_sleep_hour: typicalSleepHour ?? 23.5,
      last_updated: new Date().toISOString(),
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('保存用户档案失败:', error)
    return NextResponse.json({ success: false, error: '保存失败' }, { status: 500 })
  }
}
