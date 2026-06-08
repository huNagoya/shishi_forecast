/**
 * 高彦作品集 RAG 入库脚本
 * 运行：npm run ingest
 *
 * 做的事：把 CHUNKS 里每段文字向量化（text-embedding-v3），存入 Supabase portfolio_docs 表
 * 重复运行是安全的，使用 upsert（按 chunk_id 冲突更新）
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

// ── 知识片段定义 ──────────────────────────────────────────────────────────────
const CHUNKS = [
  {
    chunk_id: 'intro',
    content: '高彦（Yan Gao），AI产品经理求职者。理工科 × 神经网络/机器学习研究背景，独立完成两款AI产品从0到上线全流程。联系方式：电话 18943734655，邮箱 yan.gao01@outlook.com。个人作品集：gaoyan.me',
    metadata: { section: 'intro' },
  },
  {
    chunk_id: 'education',
    content: '教育背景：自然资源部第二海洋研究所在读硕士（2023.9–2026.6），地球探测与信息技术，工学硕士。吉林大学本科（2019.9–2023.6），勘查技术与工程（应用地球物理），工学学士。荣誉：发明专利3项，学业一等奖学金（2024–2025年度），优秀学生干部（2025），优秀团员（2024），海洋二所研会副主席（2025.7–2026.6）。',
    metadata: { section: 'education' },
  },
  {
    chunk_id: 'project1-overview',
    content: '食事预报局（shishi-forecast.gaoyan.me）：基于多模态AI的个人代谢节律预测工具，面向关注健康的年轻用户。核心价值：将日常饮食行为转化为可量化的身体节律预测。用户无需下载App，网页端直接访问，拍照或文字描述即可使用。半天独立完成核心Demo全流程，包括产品设计、AI对接、前端开发、云端部署。',
    metadata: { section: 'project1', project: '食事预报局' },
  },
  {
    chunk_id: 'project1-sleep',
    content: '熬夜预警机（食事预报局功能模块一）：用户拍摄或描述所喝饮品，结合饮用时间与个人咖啡因耐受度，AI预测今晚入睡时间、夜间清醒次数、失眠风险百分比、次日状态评分四个维度，并给出3条针对性睡眠补救建议。支持图片上传和文字描述两种输入方式。',
    metadata: { section: 'project1', feature: '熬夜预警机' },
  },
  {
    chunk_id: 'project1-toilet',
    content: '消化预测官（食事预报局功能模块二）：用户拍摄或描述所吃食物，结合进食时间与肠胃类型，AI预测消化通畅度（0-100分环形评分）、黄金如厕时间区间、便秘/腹泻双维度风险。支持上传食物图片或粘贴外卖订单，并提供针对性饮食搭配建议。',
    metadata: { section: 'project1', feature: '消化预测官' },
  },
  {
    chunk_id: 'project1-ewma',
    content: 'EWMA个性化学习引擎（食事预报局核心设计亮点）：5题Onboarding问卷初始化0-100分体质档案；用户每次使用后在历史页对预测结果打分，触发EWMA（α=0.3）动态更新敏感度，5次反馈后解锁精准模式。关键设计决策：反馈入口放在历史页而非结果页——预测验证有时间差，喝完咖啡要几小时后才知道入睡时间，用户睡醒后自然回来评价，收集的才是真实事后数据，而非即时主观感受。',
    metadata: { section: 'project1', feature: 'EWMA' },
  },
  {
    chunk_id: 'project1-privacy',
    content: '食事预报局隐私方案：crypto.randomUUID()生成匿名设备ID存入LocalStorage，体质档案全部本地存储，用户无需注册账号。预测行为（不含个人信息）写入Supabase用于产品分析。这是有意识的设计选择：降低使用门槛的同时保护用户隐私。',
    metadata: { section: 'project1', feature: 'privacy' },
  },
  {
    chunk_id: 'project1-tech',
    content: '食事预报局技术栈：Next.js 14 + TypeScript（前端框架与类型安全）、阿里云百炼Qwen2.5-VL（OCR优先的多模态分析引擎）、Tailwind CSS v4（响应式UI）、Vercel全球CDN（一键部署+自动CI/CD）、Supabase + LocalStorage（预测行为埋点+体质档案本地存储）、Canvas API（客户端图片压缩优化）。',
    metadata: { section: 'project1', type: 'tech' },
  },
  {
    chunk_id: 'project2-overview',
    content: '跨境选品分析师（selector.gaoyan.me）：AI选品工具Demo，输入商品关键词，3秒生成市场机会报告和买家洞察。核心定位：传统选品工具给数字，这个工具给结论——这个品类值不值得进、从哪个角度切入。面向中小跨境卖家，解决信息碎片化、决策前置成本高、数据有了不知道怎么用三大痛点。',
    metadata: { section: 'project2', project: '跨境选品分析师' },
  },
  {
    chunk_id: 'project2-features',
    content: '跨境选品分析师两大模块：①市场机会分析（7维结构化输出：市场评分/需求趋势/竞争强度/目标人群/核心卖点/推荐平台/风险提示）②买家洞察VOC分析（买家痛点×3 + 买家好评点×3 + 未被满足需求 + 差异化切入角度），共11个结构化字段。通过Prompt Engineering控制JSON格式输出。',
    metadata: { section: 'project2', type: 'features' },
  },
  {
    chunk_id: 'project2-tech',
    content: '跨境选品分析师技术栈：Next.js + TypeScript、阿里云百炼Qwen-Plus（AI推理引擎，兼容OpenAI SDK格式）、Tailwind CSS v4、Vercel（部署在selector.gaoyan.me，国内直接可访问）、Prompt Engineering（JSON格式控制与输出校验）。独立完成2大模块设计和落地，11个字段AI结构化输出。',
    metadata: { section: 'project2', type: 'tech' },
  },
  {
    chunk_id: 'skills',
    content: '高彦技能图谱——产品能力：AI需求转化（90%）、MVP规划落地（88%）、用户场景分析（82%）、功能优先级排序（78%）。技术能力：Python/MATLAB（85%）、AI API集成（80%）、数值建模仿真（88%）、Web开发部署（72%）。工具：Visio/XMind（85%）、Office数据分析（88%）、Vercel CI/CD（78%）、英语CET-6（75%）。',
    metadata: { section: 'skills' },
  },
  {
    chunk_id: 'tech-background',
    content: '高彦的技术背景：本硕都是理工科，做过神经网络和机器学习方向的研究，能和工程师直接对齐技术细节。但技术对我来说是手段，核心是把技术转化成产品——逻辑思维和数据分析能力，才是做产品的底层能力。独立完成两款AI产品全流程（食事预报局、跨境选品分析师）正是这种思路的体现。',
    metadata: { section: 'tech-background' },
  },
  {
    chunk_id: 'philosophy',
    content: '高彦的产品理念与背景优势："懂技术的AI产品经理，不是会写代码，而是知道AI能做什么、不能做什么、以及如何用它解决真实问题。"理工科数值建模与神经网络的科研背景带来将复杂问题转化为可计算模型的思维方式，独立完成两款AI产品全流程体现快速落地执行力，逻辑严谨性与产品直觉并重。',
    metadata: { section: 'philosophy' },
  },
  {
    chunk_id: 'why-pm',
    content: '高彦为什么想做产品经理：比起执行，我更想在决策侧做事——能主导一件完整的事情、把一个产品从无到有做出来，这个过程对我吸引力很大。加上本身沟通协作能力不差（有学生工作和拉赞助经历），也习惯从用户角度思考设计，所以产品这个方向是技术背景和软性能力比较自然的交汇点。选择AI产品经理，是因为这个方向最能把我的技术理解和产品直觉结合起来。',
    metadata: { section: 'why-pm' },
  },
]

// ── Embedding API ─────────────────────────────────────────────────────────────
async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.QWEN_API_KEY
  if (!apiKey) throw new Error('缺少 QWEN_API_KEY，请在 .env.local 中添加')

  const res = await fetch(
    'https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-v3',
        input: text,
        dimensions: 1024,
        encoding_format: 'float',
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Embedding API 失败: ${res.status} - ${err}`)
  }

  const data = await res.json()
  return data.data[0].embedding as number[]
}

// ── 主流程 ────────────────────────────────────────────────────────────────────
async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) throw new Error('缺少 Supabase 环境变量')

  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log(`开始处理 ${CHUNKS.length} 个知识片段...\n`)

  for (const chunk of CHUNKS) {
    process.stdout.write(`  向量化 [${chunk.chunk_id}]... `)

    const embedding = await getEmbedding(chunk.content)

    const { error } = await supabase
      .from('portfolio_docs')
      .upsert(
        { chunk_id: chunk.chunk_id, content: chunk.content, embedding, metadata: chunk.metadata },
        { onConflict: 'chunk_id' }
      )

    if (error) {
      console.error(`✗ 失败: ${error.message}`)
    } else {
      console.log(`✓ 完成（${embedding.length}维）`)
    }

    // 避免 API 限速，间隔 300ms
    await new Promise(r => setTimeout(r, 300))
  }

  console.log('\n全部完成！运行以下 SQL 确认数量：')
  console.log('  select count(*) from portfolio_docs;\n')
}

main().catch(e => { console.error(e); process.exit(1) })
