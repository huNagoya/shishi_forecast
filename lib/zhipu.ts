const QWEN_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'

type MessageContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: MessageContent
}

// model: 'qwen3-vl-plus'（视觉）或 'qwen-plus-latest'（纯文字）
export async function callQwen(messages: Message[], model = 'qwen3-vl-plus'): Promise<string> {
  const apiKey = process.env.QWEN_API_KEY
  if (!apiKey) throw new Error('未配置 QWEN_API_KEY，请在 .env.local 和 Vercel 环境变量中添加')

  const response = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.1,
      max_tokens: 4000,
      enable_thinking: false,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`千问API调用失败: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices[0].message.content as string
  // 剥离 qwen3 系列可能输出的 <think>...</think> 深度思考块
  return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

// 从AI返回的文本中提取JSON
export function extractJSON(text: string): unknown {
  if (!text || text.trim() === '') {
    throw new Error('AI返回了空响应')
  }

  // 1. 直接解析
  try {
    return JSON.parse(text.trim())
  } catch { /* continue */ }

  // 2. 提取 ```json ... ``` 或 ``` ... ``` 块
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim())
    } catch { /* continue */ }
  }

  // 3. 字符级大括号匹配
  let braceStart = -1
  let depth = 0
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (depth === 0) braceStart = i
      depth++
    } else if (text[i] === '}') {
      depth--
      if (depth === 0 && braceStart !== -1) {
        try {
          return JSON.parse(text.substring(braceStart, i + 1))
        } catch { /* continue */ }
        braceStart = -1
      }
    }
  }

  // 4. 括号栈修复：模型偶尔把结尾 `}` 写成 `]`（或截断），导致括号不配对，
  //    上面三步全失败。这里按栈重建：遇闭合符强制匹配栈顶应有的闭合符，
  //    末尾补齐未闭合的。可救回 `...]]`→`...]}`、截断等常见畸形。
  const repaired = repairJSON(text)
  if (repaired !== null) return repaired

  throw new Error(`AI响应格式异常。原始内容：${text.substring(0, 500)}`)
}

// 括号栈修复：仅在标准解析全部失败后作为兜底调用
function repairJSON(text: string): unknown {
  const start = text.indexOf('{')
  if (start === -1) return null
  const s = text.slice(start)
  const stack: string[] = []
  let out = ''
  let inStr = false
  let esc = false
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (inStr) {
      out += ch
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') { inStr = true; out += ch; continue }
    if (ch === '{' || ch === '[') { stack.push(ch); out += ch; continue }
    if (ch === '}' || ch === ']') {
      if (stack.length === 0) continue // 丢弃多余闭合符
      const open = stack.pop()!
      out += open === '{' ? '}' : ']' // 强制匹配栈顶，纠正 ] / } 写反
      if (stack.length === 0) break // 顶层对象已闭合，忽略后续多余内容
      continue
    }
    out += ch
  }
  if (inStr) out += '"'
  while (stack.length) {
    const open = stack.pop()!
    out += open === '{' ? '}' : ']'
  }
  try {
    return JSON.parse(out)
  } catch {
    return null
  }
}
