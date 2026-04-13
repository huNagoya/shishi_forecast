import caffeineDB from './caffeine-db.json'

interface CaffeineEntry {
  caffeine_mg: number
  brand: string
  product_name: string
  category: string
  confidence: string
  source: string
  aliases: string[]
  notes?: string
}

type DB = Record<string, CaffeineEntry>
const db = caffeineDB as unknown as DB

/**
 * 根据饮品名在知识库中查找咖啡因数据
 * 匹配优先级：aliases 精确匹配 > product_name 精确匹配 > aliases 包含匹配 > product_name 包含匹配
 */
export function lookupCaffeine(drinkName: string): CaffeineEntry | null {
  if (!drinkName) return null

  const name = drinkName.trim().toLowerCase()

  // 跳过 meta/note 键
  const entries = Object.entries(db).filter(([k]) => !k.startsWith('_'))

  // 1. aliases 精确匹配
  for (const [, entry] of entries) {
    if (entry.aliases?.some(a => a.toLowerCase() === name)) return entry
  }

  // 2. product_name 精确匹配
  for (const [, entry] of entries) {
    if (entry.product_name?.toLowerCase() === name) return entry
  }

  // 3. aliases 包含匹配
  for (const [, entry] of entries) {
    if (entry.aliases?.some(a => name.includes(a.toLowerCase()) || a.toLowerCase().includes(name))) {
      return entry
    }
  }

  // 4. product_name 包含匹配
  for (const [, entry] of entries) {
    if (
      entry.product_name?.toLowerCase().includes(name) ||
      name.includes(entry.product_name?.toLowerCase())
    ) {
      return entry
    }
  }

  return null
}

/**
 * 生成注入 prompt 的知识库提示文字
 * 命中时返回精确数据提示，未命中时返回 null
 */
export function buildKnowledgeHint(drinkName: string): string | null {
  const entry = lookupCaffeine(drinkName)
  if (!entry) return null

  const confidenceLabel: Record<string, string> = {
    official: '官方公布数据',
    tested:   '第三方检测数据',
    reported: '媒体报道数据',
    estimated: '推算数据',
  }

  return [
    `【知识库命中】`,
    `饮品：${entry.product_name}（${entry.brand}）`,
    `咖啡因含量：${entry.caffeine_mg}mg/杯（${confidenceLabel[entry.confidence] || entry.confidence}）`,
    `数据来源：${entry.source}`,
    `请以此数值为准，不要自行估算咖啡因含量。`,
  ].join('\n')
}
