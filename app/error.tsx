'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, ArrowLeft } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative">
      <div className="orb orb-purple" />

      <div className="relative z-10 text-center max-w-lg">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-200 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-rose-600" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-3">Something Went Wrong</h1>
        <p className="text-slate-600 mb-2 leading-relaxed">
          An unexpected error occurred. This might be a temporary issue.
        </p>

        {error.message && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-6 text-left">
            <p className="text-xs font-mono text-rose-600 break-all">{error.message}</p>
            {error.digest && (
              <p className="text-xs text-rose-600 mt-1">Digest: {error.digest}</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <button onClick={reset} className="btn-primary flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
          <a href="/" className="btn-secondary flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Go Home
          </a>
        </div>
      </div>
    </div>
  )
}
