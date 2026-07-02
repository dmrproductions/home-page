"use client"

import { useState, useRef } from "react"
import { Camera, Send, CheckCircle, ImagePlus, X } from "lucide-react"
import { cn } from "@/lib/utils"

type Category = "friends" | "family"

export default function ShareContent({ token }: { token: string }) {
  const [name,       setName]       = useState("")
  const [message,    setMessage]    = useState("")
  const [category,   setCategory]   = useState<Category>("family")
  const [imageData,  setImageData]  = useState<string | null>(null)
  const [imageThumb, setImageThumb] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done,       setDone]       = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handlePhoto = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const full = e.target?.result as string
      const img = new Image()
      img.onload = () => {
        const MAX = 800
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const canvas = document.createElement("canvas")
        canvas.width  = Math.round(img.width  * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const compressed = canvas.toDataURL("image/jpeg", 0.7)
        setImageData(compressed)
        setImageThumb(compressed)
      }
      img.src = full
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!name.trim() || !message.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/wall", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ authorName: name, message, category, imageDataUrl: imageData, token }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Something went wrong")
      }
      setDone(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle className="h-14 w-14 text-emerald-500 mb-4" />
        <h2 className="text-2xl font-black text-gray-900 mb-2">You&apos;re on the feed! 🎉</h2>
        <p className="text-gray-500 text-sm max-w-xs">Your post will appear on the HOME PAGE feed right away. Thanks for sharing!</p>
        <button onClick={() => { setDone(false); setName(""); setMessage(""); setImageData(null); setImageThumb(null) }}
          className="mt-8 text-xs text-gray-400 underline hover:text-gray-600">Post another update</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-5 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-900 rounded flex items-center justify-center">
          <span className="text-white text-xs font-black">H</span>
        </div>
        <div>
          <h1 className="text-sm font-black text-gray-900 uppercase tracking-widest">HOME PAGE</h1>
          <p className="text-[11px] text-gray-400">Share with the feed</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-5 py-8">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center mb-2">
            <p className="text-base font-bold text-gray-800">Post an update 👋</p>
            <p className="text-xs text-gray-400 mt-1">Your name and message will show up live in the feed</p>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Your Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Aunt Sandra"
              className="w-full h-11 px-3 text-sm border border-gray-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
              maxLength={80} />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder="What's going on? Share a quick update…"
              className="w-full px-3 py-2 text-sm border border-gray-200 bg-white rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-gray-400"
              rows={4} maxLength={500} />
            <p className="text-[11px] text-gray-300 text-right mt-1">{message.length}/500</p>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2 block">You are...</label>
            <div className="grid grid-cols-2 gap-2">
              {(["friends","family"] as Category[]).map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className={cn("py-2.5 rounded-xl border-2 text-sm font-semibold capitalize transition-all",
                    category === cat ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-400")}>
                  {cat === "friends" ? "🤝 Friend" : "🏡 Family"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2 block">Add a Photo (optional)</label>
            {imageThumb ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200 aspect-video">
                <img src={imageThumb} alt="preview" className="w-full h-full object-cover" />
                <button onClick={() => { setImageData(null); setImageThumb(null) }}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 flex flex-col items-center gap-2 hover:border-gray-400 hover:bg-white transition-all text-gray-400">
                <ImagePlus className="h-7 w-7" />
                <span className="text-sm font-medium">Tap to add a photo</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(f) }} />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <button onClick={handleSubmit} disabled={!name.trim() || !message.trim() || submitting}
            className="w-full h-12 text-sm font-bold bg-gray-900 hover:bg-gray-700 text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {submitting ? <><Camera className="h-4 w-4 animate-pulse" />Posting…</> : <><Send className="h-4 w-4" />Post to Feed</>}
          </button>

          <p className="text-center text-[11px] text-gray-300">Only visible on the private HOME PAGE feed</p>
        </div>
      </div>
    </div>
  )
}
