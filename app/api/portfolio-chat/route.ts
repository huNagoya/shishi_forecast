import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

// 不依赖 RAG 的兜底 system prompt（RAG 失败时仍可正常对话）
const BASE_SYSTEM_PROMPT = `你是高彦的AI分身，代替高彦与访问他作品集网站的HR或面试官进行对话。

【基本信息】
姓名：高彦（Yan Gao）｜ 电话：18943734655 ｜ 邮箱：yan.gao01@outlook.com

【教育背景】
- 2023.9–2026.6：自然资源部第二海洋研究所，地球探测与信息技术，工学硕士
- 2019.9–2023.6：吉林大学，应用地球物理，工学学士
- 荣誉：发明专利3项，学业一等奖学金（2024–2025），优秀学生干部，研会副主席

【核心项目】
- 食事预报局（shishi-forecast.gaoyan.me）：多模态AI健康预测工具，熬夜预警+如厕预测，含EWMA个性化引擎，半天独立完成
- 跨境选品分析师（selector.gaoyan.me）：AI选品工具，输入关键词3秒生成11字段结构化报告

【回答原则】
1. 以高彦第一人称（"我"）回答，语气自信、干练，不卑不亢，不念简历
2. 直接给结论，不用"我觉得""可能"等模糊措辞，有观点就明确说
3. 避免语气词（"～""哈""呢"），避免过度热情，保持专业感
4. 遇到项目问题，用一句话点出核心价值，再说"可以直接体验"
5. 没有的信息直接说没有，不绕弯
6. 每次回答控制在 120 字以内`

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// ── Embedding 调用 ────────────────────────────────────────────────────────────
async function getEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.QWEN_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'text-embedding-v3',
          input: text,
          dimensions: 1024,
          encoding_format: 'float',
        }),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.data[0].embedding as number[]
  } catch {
    return null
  }
}

// ── RAG 检索 ──────────────────────────────────────────────────────────────────
async function retrieveContext(question: string): Promise<string> {
  const embedding = await getEmbedding(question)
  if (!embedding) return ''

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase.rpc('match_portfolio_docs', {
    query_embedding: embedding,
    match_count: 3,
    min_similarity: 0.45,
  })

  if (error || !data || data.length === 0) return ''

  return (data as Array<{ content: string; similarity: number }>)
    .map((d, i) => `[${i + 1}] ${d.content}`)
    .join('\n\n')
}

// ── 主处理函数 ────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json() as { messages: Message[] }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: '缺少消息内容' }, { status: 400, headers: CORS_HEADERS })
    }

    const apiKey = process.env.QWEN_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: '服务配置错误' }, { status: 500, headers: CORS_HEADERS })
    }

    // 取最后一条用户消息用于 RAG 检索
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content ?? ''
    const context = await retrieveContext(lastUserMsg)

    // 有检索结果时，拼入系统 prompt
    const systemPrompt = context
      ? `${BASE_SYSTEM_PROMPT}\n\n【与本次问题最相关的背景资料，请优先参考】\n${context}`
      : BASE_SYSTEM_PROMPT

    const res = await fetch(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'qwen-plus-latest',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-6),
          ],
          temperature: 0.7,
          max_tokens: 400,
        }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      console.error('Qwen API error:', err)
      return NextResponse.json({ error: 'AI 服务暂时不可用' }, { status: 502, headers: CORS_HEADERS })
    }

    const data = await res.json()
    const reply = data.choices?.[0]?.message?.content ?? '抱歉，我没有理解你的问题，能换个方式问吗？'

    return NextResponse.json({ reply, rag_used: context.length > 0 }, { headers: CORS_HEADERS })
  } catch (e) {
    console.error('portfolio-chat error:', e)
    return NextResponse.json({ error: '服务异常，请稍后再试' }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
