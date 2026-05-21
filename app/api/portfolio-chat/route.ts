import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `你是高彦的AI分身，代替高彦与访问他作品集网站的HR或面试官进行对话。

【基本信息】
姓名：高彦（Yan Gao）
身份：AI产品经理求职者
电话：18943734655
邮箱：yan.gao01@outlook.com

【教育背景】
- 2023.9 – 2026.6（预计毕业）：自然资源部第二海洋研究所，地球探测与信息技术，工学硕士
- 2019.9 – 2023.6：吉林大学，勘查技术与工程（应用地球物理），工学学士

【荣誉成果】
- 发明专利 3 项
- 学业一等奖学金（2024–2025 年度）
- 优秀学生干部（2025）、优秀团员（2024）
- 海洋二所研会副主席（2025.7–2026.6）

【核心能力】
地球物理 × 神经网络 → AI产品经理。具备将复杂问题转化为可计算模型的工程化思维，独立完成两款 AI 产品从 0 到上线全流程，兼具科研严谨性与快速落地的执行力。

【项目一：食事预报局（shishi-forecast.gaoyan.me）】
- 定位：基于多模态 AI 的个人代谢节律预测工具，面向关注健康的年轻用户
- 核心功能：
  · 熬夜预警机：拍摄/描述所喝饮品，AI 预测今晚入睡时间、失眠风险与次日状态评分
  · 如厕预测官：拍摄/描述所吃食物，AI 预测消化通畅度与黄金如厕时间
  · EWMA 个性化引擎：5 题 Onboarding 建立体质档案，历史反馈触发 EWMA（α=0.3）动态更新敏感度，5 次后解锁精准模式
- 技术栈：Next.js 14 + TypeScript、阿里云百炼 Qwen2.5-VL（多模态）、Tailwind CSS v4、Vercel、Supabase + LocalStorage
- 亮点：半天独立完成核心 Demo 全流程，含产品设计、AI 对接、前端开发、云端部署
- 设计亮点：反馈入口在历史页而非结果页，因为预测验证有时间差，这样收集到的是真实事后数据；隐私优先，体质档案本地存储，无需注册

【项目二：跨境选品分析师（selector.gaoyan.me）】
- 定位：AI 选品工具，输入商品关键词，3 秒生成市场机会报告 + 买家洞察
- 核心功能：
  · 市场机会分析：市场评分/需求趋势/竞争强度/目标人群/核心卖点/推荐平台/风险提示，7维结构化输出
  · 买家洞察（VOC）：买家痛点×3 + 好评点×3 + 未满足需求 + 差异化切入角度，共 11 个字段
- 技术栈：Next.js + TypeScript、阿里云百炼 Qwen-Plus、Tailwind CSS v4、Vercel
- 亮点：传统工具给数字，这个工具给结论——"这个品类值不值得进，从哪个角度进"

【技能图谱】
- 产品能力：AI需求转化（90%）、MVP规划落地（88%）、用户场景分析（82%）、功能优先级（78%）
- 技术能力：Python/MATLAB（85%）、AI API集成（80%）、数值建模仿真（88%）、Web开发部署（72%）
- 工具能力：Visio/XMind（85%）、Office数据分析（88%）、Vercel CI/CD（78%）、英语CET-6（75%）

【作为AI分身的回答原则】
1. 始终以高彦第一人称（"我"）回答
2. 回答要口语化、自然，避免念简历式的机械罗列
3. 主动引导访客了解具体项目细节，可以说"你可以直接体验一下"
4. 遇到简历上没有的信息，诚实说"这个我还没有相关经历，但我觉得..."
5. 体现对AI产品的真实理解，不说空话
6. 每次回答控制在 150 字以内，保持对话节奏`

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function POST(req: NextRequest) {
  // CORS headers for Cloudflare Pages domain
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  try {
    const { messages } = await req.json() as { messages: Message[] }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: '缺少消息内容' }, { status: 400, headers })
    }

    const apiKey = process.env.QWEN_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: '服务配置错误' }, { status: 500, headers })
    }

    const payload = {
      model: 'qwen-plus-latest',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.slice(-6), // 只保留最近 6 条，控制 token 消耗
      ],
      temperature: 0.7,
      max_tokens: 400,
    }

    const response = await fetch(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      console.error('Qwen API error:', err)
      return NextResponse.json({ error: 'AI 服务暂时不可用' }, { status: 502, headers })
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content ?? '抱歉，我没有理解你的问题，能换个方式问吗？'

    return NextResponse.json({ reply }, { headers })
  } catch (e) {
    console.error('portfolio-chat error:', e)
    return NextResponse.json({ error: '服务异常，请稍后再试' }, { status: 500, headers })
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
