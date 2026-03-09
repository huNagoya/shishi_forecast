import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 将File对象压缩后转为base64字符串（最长边不超过1024px，JPEG质量0.82）
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const MAX = 1024
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width >= height) {
            height = Math.round((height * MAX) / width)
            width = MAX
          } else {
            width = Math.round((width * MAX) / height)
            height = MAX
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
        resolve(dataUrl.split(',')[1])
      }
      img.src = reader.result as string
    }
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
