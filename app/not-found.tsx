import Link from 'next/link'
import { MapPin, Sparkles, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative">
      {/* Background orbs */}
      <div className="orb orb-purple" />
      <div className="orb orb-teal" />

      <div className="relative z-10 text-center max-w-md">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500/20 to-accent-purple/10 border border-brand-200 flex items-center justify-center mx-auto mb-6 animate-float">
          <MapPin className="w-10 h-10 text-brand-400" />
        </div>

        {/* 404 */}
        <div className="text-8xl font-black bg-gradient-to-r from-brand-400 to-accent-purple bg-clip-text text-transparent mb-4">
          404
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-3">Page Not Found</h1>
        <p className="text-slate-600 mb-8 leading-relaxed">
          This idea or page doesn&apos;t exist (or it may have expired from your session).
          Head back home to explore local project ideas.
        </p>

        <Link
          href="/"
          className="btn-primary inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Ideas
        </Link>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-600">
          <Sparkles className="w-3.5 h-3.5" />
          Locality Ideas — AI-powered local innovation
        </div>
      </div>
    </div>
  )
}
