import { supabase } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const { error } = await supabase.from('predictions').select('id').limit(1)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
