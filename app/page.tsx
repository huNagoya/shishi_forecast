import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  return (
    <div className="px-4 pt-8 pb-4">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <Image src="/icon.png" alt="食事预报局" width={64} height={64} className="rounded-2xl shadow-md" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">食事预报局</h1>
        <p className="text-sm text-gray-400">喝什么吃什么，身体后续一手掌握</p>
      </div>

      <div className="space-y-4 mb-6">
        <Link href="/sleep" className="block">
          <div className="relative rounded-3xl p-6 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-xl active:scale-95 transition-transform overflow-hidden">
            {/* 装饰圆 */}
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
            <div className="absolute bottom-2 right-12 w-16 h-16 bg-white/8 rounded-full" />
            <div className="absolute top-4 right-20 w-6 h-6 bg-white/15 rounded-full" />
            <div className="relative flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xl font-bold mb-1">熬夜预警机</h2>
                <p className="text-amber-100 text-sm">拍饮品，预测失眠风险</p>
              </div>
              <span className="text-5xl drop-shadow-sm">😴</span>
            </div>
            <div className="relative flex gap-2 text-xs flex-wrap">
              <span className="bg-white/25 px-2 py-1 rounded-full backdrop-blur-sm">咖啡因分析</span>
              <span className="bg-white/25 px-2 py-1 rounded-full backdrop-blur-sm">入睡预测</span>
              <span className="bg-white/25 px-2 py-1 rounded-full backdrop-blur-sm">次日状态</span>
            </div>
          </div>
        </Link>

        <Link href="/digest" className="block">
          <div className="relative rounded-3xl p-6 bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-xl active:scale-95 transition-transform overflow-hidden">
            {/* 装饰圆 */}
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
            <div className="absolute bottom-2 right-12 w-16 h-16 bg-white/8 rounded-full" />
            <div className="absolute top-4 right-20 w-6 h-6 bg-white/15 rounded-full" />
            <div className="relative flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xl font-bold mb-1">如厕预测官</h2>
                <p className="text-emerald-100 text-sm">拍食物，预测排便时机</p>
              </div>
              <span className="text-5xl drop-shadow-sm">🚽</span>
            </div>
            <div className="relative flex gap-2 text-xs flex-wrap">
              <span className="bg-white/25 px-2 py-1 rounded-full backdrop-blur-sm">消化分析</span>
              <span className="bg-white/25 px-2 py-1 rounded-full backdrop-blur-sm">黄金时间</span>
              <span className="bg-white/25 px-2 py-1 rounded-full backdrop-blur-sm">风险预警</span>
            </div>
          </div>
        </Link>
      </div>

      <Link href="/history">
        <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 p-4 flex items-center justify-between shadow-md active:bg-white/90 transition-colors" style={{boxShadow:'0 2px 16px rgba(0,0,0,0.07)'}}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl">📋</div>
            <div>
              <p className="font-medium text-gray-800 text-sm">历史记录</p>
              <p className="text-xs text-gray-400">查看过往预测记录</p>
            </div>
          </div>
          <span className="text-gray-300 text-lg">›</span>
        </div>
      </Link>

      <p className="text-center text-xs text-gray-300 mt-8">
        由智谱 GLM-4V 驱动 · 结果仅供参考
      </p>
    </div>
  )
}
