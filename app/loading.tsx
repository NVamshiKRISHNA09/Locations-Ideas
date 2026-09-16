import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="orb orb-purple" />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-brand-100 border border-brand-200 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
        <p className="text-sm text-slate-500 animate-pulse">Loading...</p>
      </div>
    </div>
  )
}
