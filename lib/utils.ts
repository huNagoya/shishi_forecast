import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 将File对象转为base64字符串
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // 返回去掉前缀 "data:image/jpeg;base64," 的纯base64
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// 将File转为完整data URL（含前缀，用于图片预览）
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// 风险等级颜色
export function getRiskColor(score: number): string {
  if (score >= 70) return 'text-red-500'
  if (score >= 40) return 'text-amber-500'
  return 'text-green-500'
}

// 风险等级文字
export function getRiskLabel(score: number): string {
  if (score >= 70) return '高风险'
  if (score >= 40) return '中等风险'
  return '低风险'
}

// 通畅度颜色
export function getSmoothnessColor(score: number): string {
  if (score >= 70) return 'text-green-500'
  if (score >= 40) return 'text-amber-500'
  return 'text-red-500'
}

// 格式化时间
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
