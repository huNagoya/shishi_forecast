const ZHIPU_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4'

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
