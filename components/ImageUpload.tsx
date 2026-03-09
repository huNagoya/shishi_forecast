'use client'

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  onImageSelect: (file: File, dataUrl: string) => void
  onClear: () => void
  preview: string | null
  className?: string
}

export default function ImageUpload({
  onImageSelect,
  onClear,
  preview,
  className,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      onImageSelect(file, reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className={cn('w-full', className)}>
      {preview ? (
        // 已选图片预览
        <div className="relative rounded-2xl overflow-hidden bg-gray-100">
          <img
            src={preview}
            alt="预览"
            className="w-full max-h-64 object-cover"
          />
          <button
            onClick={onClear}
            className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-black/70 transition-colors"
          >
            ✕
          </button>
        </div>
      ) : (
        // 上传区域
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
            isDragging
              ? 'border-amber-400 bg-amber-50'
              : 'border-gray-200 bg-gray-50 hover:border-amber-300 hover:bg-amber-50/50'
          )}
        >
          <div className="text-4xl mb-3">📷</div>
          <p className="font-medium text-gray-700 mb-1">点击上传或拍照</p>
          <p className="text-sm text-gray-400">支持 JPG、PNG、HEIC 格式</p>
          {/* 手机相机快捷按钮 */}
          <div className="flex gap-3 justify-center mt-4">
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (fileInputRef.current) {
                  fileInputRef.current.setAttribute('capture', 'environment')
                  fileInputRef.current.click()
                }
              }}
              className="text-sm bg-amber-500 text-white px-4 py-2 rounded-full font-medium hover:bg-amber-600 transition-colors"
            >
              拍照
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (fileInputRef.current) {
                  fileInputRef.current.removeAttribute('capture')
                  fileInputRef.current.click()
                }
              }}
              className="text-sm bg-white text-gray-600 border border-gray-200 px-4 py-2 rounded-full font-medium hover:bg-gray-50 transition-colors"
            >
              相册
            </button>
          </div>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
    </div>
  )
}
