const ZHIPU_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4'
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

// model: 'glm-4v'（有图片）或 'glm-4-flash'（纯文字）
export async function callZhipu(messages: Message[], model = 'glm-4-flash'): Promise<string> {
  const apiKey = process.env.ZHIPU_API_KEY
  if (!apiKey) {
    throw new Error('未配置 ZHIPU_API_KEY，请检查 .env.local 文件')
  }

  const response = await fetch(`${ZHIPU_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 1500,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`智谱API调用失败: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.choices[0].message.content as string
}

// 千问视觉模型（OCR 能力更强，用于图片识别场景）
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

  throw new Error(`AI响应格式异常。原始内容：${text.substring(0, 200)}`)
}
