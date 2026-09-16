'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import IdeaCard from '@/components/IdeaCard'
import ApiKeyModal from '@/components/ApiKeyModal'
import { getSavedIdeas, type Idea } from '@/lib/chat-store'
import { Bookmark, Sparkles, ChevronLeft } from 'lucide-react'

export default function SavedIdeasPage() {
  const router = useRouter()
  const [savedIdeas, setSavedIdeas] = useState<Idea[]>([])
  const [apiKeyOpen, setApiKeyOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setSavedIdeas(getSavedIdeas())
  }, [])

  if (!mounted) return null

  return (
    <>
      <div className="orb orb-purple" />
      <div className="orb orb-teal" />
      <div className="orb orb-pink" />

      <Navbar onOpenApiKey={() => setApiKeyOpen(true)} />

      <main className="relative z-10 min-h-screen pt-24 px-4 pb-24 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/')}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <Bookmark className="w-7 h-7 text-brand-500" />
              Saved Projects
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Your bookmarked hackathon ideas and build plans.
            </p>
          </div>
        </div>

        {savedIdeas.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {savedIdeas.map((idea, i) => (
              <div
                key={idea.id}
                className="animate-slide-up"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {/* 
                  Note: We pass undefined as location because a saved idea might not belong to the current active location, 
                  but the card works fine without a location object.
                */}
                <IdeaCard idea={idea} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 glass-card max-w-2xl mx-auto border-slate-200 bg-white/60">
            <div className="w-20 h-20 rounded-3xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-6">
              <Bookmark className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No saved projects yet</h3>
            <p className="text-slate-600 mb-6 text-sm max-w-sm mx-auto">
              When you see an AI-generated idea you like, click the bookmark icon to save it here forever.
            </p>
            <button
              onClick={() => router.push('/')}
              className="btn-primary inline-flex items-center gap-2 text-sm"
            >
              <Sparkles className="w-4 h-4" />
              Find Ideas
            </button>
          </div>
        )}
      </main>

      <ApiKeyModal
        isOpen={apiKeyOpen}
        onClose={() => setApiKeyOpen(false)}
      />
    </>
  )
}
