"use client"

import { useState, useEffect } from "react"
import { X, Sparkles, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { FamilyEvent } from "@/types"

/* ── helpers ─────────────────────────────────── */
const BANNER_URLS_KEY = "hp_banner_urls"
const DISMISS_KEY     = "hp_ann_dismissed"  // { "eventId_YYYY-MM-DD": true }

function loadBannerUrl(id: string): string | null {
  if (typeof window === "undefined") return null
  try { return JSON.parse(localStorage.getItem(BANNER_URLS_KEY) ?? "{}")[id] ?? null } catch { return null }
}
function isDismissed(id: string): boolean {
  if (typeof window === "undefined") return false
  try {
    const key = `${id}_${format(new Date(), "yyyy-MM-dd")}`
    return !!JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "{}")[key]
  } catch { return false }
}
function saveDismiss(id: string) {
  if (typeof window === "undefined") return
  try {
    const map = JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "{}")
    map[`${id}_${format(new Date(), "yyyy-MM-dd")}`] = true
    localStorage.setItem(DISMISS_KEY, JSON.stringify(map))
  } catch {}
}

const EV_EMOJI: Record<string, string> = {
  birthday: "🎂", anniversary: "💍", holiday: "🎉", custom: "⭐",
}
const EV_HEADLINE: Record<string, (n: string) => string> = {
  birthday:    n => `Happy Birthday, ${n}!`,
  anniversary: n => `Happy Anniversary, ${n}!`,
  holiday:     n => n,
  custom:      n => n,
}

/* ── Component ───────────────────────────────── */
export function AnnouncementBanner({ events }: { events: FamilyEvent[] }) {
  const [dismissed,   setDismissed]   = useState(true)   // start hidden to avoid flash
  const [bannerUrl,   setBannerUrl]   = useState<string | null>(null)
  const [imgLoaded,   setImgLoaded]   = useState(false)
  const [generating,  setGenerating]  = useState(false)
  const [mounted,     setMounted]     = useState(false)

  // Find today's event
  const todayMD = `${String(new Date().getMonth()+1).padStart(2,"0")}-${String(new Date().getDate()).padStart(2,"0")}`
  const todayEvent = events.find(e => e.date === todayMD)

  useEffect(() => {
    setMounted(true)
    if (!todayEvent) return
    setDismissed(isDismissed(todayEvent.id))
    setBannerUrl(loadBannerUrl(todayEvent.id))
  }, [todayEvent?.id])

  // Listen for new banner generated from Settings
  useEffect(() => {
    if (!todayEvent) return
    const h = () => {
      const url = loadBannerUrl(todayEvent.id)
      setBannerUrl(url)
      setImgLoaded(false)
    }
    window.addEventListener("hp-banner-updated", h)
    return () => window.removeEventListener("hp-banner-updated", h)
  }, [todayEvent?.id])

  async function generateBanner() {
    if (!todayEvent) return
    setGenerating(true)
    try {
      const res  = await fetch("/api/banner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personName: todayEvent.personName,
          eventType:  todayEvent.eventType,
          notes:      todayEvent.notes,
          hasPhoto:   !!todayEvent.headshotDataUrl,
        }),
      })
      const data = await res.json()
      if (data.bannerUrl) {
        const existing = JSON.parse(localStorage.getItem(BANNER_URLS_KEY) ?? "{}")
        existing[todayEvent.id] = data.bannerUrl
        localStorage.setItem(BANNER_URLS_KEY, JSON.stringify(existing))
        setBannerUrl(data.bannerUrl)
        setImgLoaded(false)
        window.dispatchEvent(new Event("hp-banner-updated"))
      }
    } finally {
      setGenerating(false)
    }
  }

  if (!mounted || !todayEvent || dismissed) return null

  const headline = EV_HEADLINE[todayEvent.eventType]?.(todayEvent.personName) ?? todayEvent.personName
  const emoji    = EV_EMOJI[todayEvent.eventType] ?? "⭐"

  return (
    <div className="relative w-full shrink-0 overflow-hidden" style={{ height: "168px" }}>

      {/* ── Background layers ──────────────────── */}
      {/* Fallback gradient always present */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#1a1206] via-[#2d1f07] to-[#1a1206]" />

      {/* AI banner fills entire background */}
      {bannerUrl && (
        <img
          src={bannerUrl}
          alt=""
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-700",
            imgLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setImgLoaded(true)}
        />
      )}

      {/* Readable overlay — stronger on left where text lives */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />
      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/30" />

      {/* Gold borders */}
      <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-[#B8960C] via-[#D4AF37] to-[#B8960C]" />
      <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#B8960C]/60 to-transparent" />

      {/* ── Content ─────────────────────────────── */}
      <div className="relative h-full flex items-center gap-5 px-6">

        {/* Headshot — large prominent circle */}
        <div className="shrink-0 relative" style={{ marginTop: "8px" }}>
          {todayEvent.headshotDataUrl ? (
            <>
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-full bg-[#D4AF37]/30 blur-xl scale-110" />
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-[3px] border-[#D4AF37] shadow-2xl">
                <img
                  src={todayEvent.headshotDataUrl}
                  alt={todayEvent.personName}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Emoji badge */}
              <span className="absolute -bottom-1 -right-2 text-3xl leading-none drop-shadow-lg">
                {emoji}
              </span>
            </>
          ) : (
            <div className="w-24 h-24 rounded-full bg-white/10 border-2 border-[#D4AF37]/60 flex items-center justify-center text-[56px] leading-none shadow-xl">
              {emoji}
            </div>
          )}
        </div>

        {/* Text block */}
        <div className="flex-1 min-w-0">
          <p className="text-[#D4AF37]/80 text-[10px] font-bold uppercase tracking-[0.35em] mb-1">
            {format(new Date(), "MMMM d, yyyy")} &nbsp;·&nbsp; Special Announcement
          </p>
          <h2 className="masthead text-white leading-tight drop-shadow-2xl mb-1.5"
            style={{ fontSize: "clamp(24px, 3.5vw, 44px)" }}>
            {headline}
          </h2>
          {todayEvent.notes && (
            <p className="text-white/65 text-sm font-medium line-clamp-1">{todayEvent.notes}</p>
          )}
        </div>

        {/* Right: Generate / regenerate button + decorative */}
        <div className="shrink-0 flex flex-col items-end gap-3">
          <div className="hidden xl:flex flex-col items-end gap-1">
            <div className="h-px w-20 bg-gradient-to-l from-[#D4AF37] to-transparent" />
            <p className="text-[#D4AF37]/70 text-[9px] font-bold uppercase tracking-[0.3em]">HOME PAGE</p>
            <div className="h-px w-20 bg-gradient-to-l from-[#D4AF37] to-transparent" />
          </div>
          <button
            onClick={generateBanner}
            disabled={generating}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all",
              generating
                ? "bg-white/10 text-white/40 cursor-wait"
                : bannerUrl
                  ? "bg-white/10 hover:bg-white/20 text-white/60 hover:text-white border border-white/20"
                  : "bg-gradient-to-r from-[#B8960C] to-[#D4AF37] text-black hover:opacity-90 shadow-lg"
            )}
          >
            {generating
              ? <><RefreshCw className="h-3 w-3 animate-spin" /> Generating…</>
              : bannerUrl
                ? <><RefreshCw className="h-3 w-3" /> New banner</>
                : <><Sparkles className="h-3 w-3" /> Generate banner</>
            }
          </button>
        </div>
      </div>

      {/* Dismiss */}
      <button
        onClick={() => { saveDismiss(todayEvent.id); setDismissed(true) }}
        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white/50 hover:text-white transition-all"
        title="Dismiss for today"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
