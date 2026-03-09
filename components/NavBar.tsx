'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: '首页', icon: '🏠' },
  { href: '/sleep', label: '熬夜预警', icon: '😴' },
  { href: '/digest', label: '如厕预测', icon: '🚽' },
  { href: '/history', label: '历史', icon: '📋' },
  { href: '/settings', label: '设置', icon: '⚙️' },
]

export default function NavBar() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/75 backdrop-blur-md border-t border-white/60 z-50 safe-area-bottom" style={{boxShadow:'0 -1px 24px rgba(0,0,0,0.06)'}}>
      <div className="max-w-lg mx-auto flex justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 px-3 flex-1 text-center transition-colors',
                isActive ? 'text-amber-500' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span className={cn('text-xs', isActive ? 'font-semibold' : 'font-normal')}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
