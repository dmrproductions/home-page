"use client"

import React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, Settings, ExternalLink, X, Bell, Sparkles, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { feedCache, type CachedItem } from "@/lib/feed-cache"
import { cn } from "@/lib/utils"
import type { FamilyEvent, FamilyPhoto } from "@/types"

interface TopBarProps {
  onSettingsClick: () => void
  events?: FamilyEvent[]
  userName?: string
  ticker?: React.ReactNode
}

/* ── Event banner helpers ─────────────────────── */
const EV_EMOJI: Record<string, string> = {
  birthday: "🎂", anniversary: "💍", holiday: "🎉", custom: "⭐",
}
const EV_MSG: Record<string, (name: string) => string> = {
  birthday:    n => `Happy Birthday, ${n}!`,
  anniversary: n => `Happy Anniversary, ${n}!`,
  holiday:     n => n,
  custom:      n => n,
}
const BANNER_KEY = "hp_banner_urls"
const BANNER_MSG_KEY = "hp_banner_messages"
function loadBannerMessages(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try { return JSON.parse(localStorage.getItem(BANNER_MSG_KEY) ?? "{}") } catch { return {} }
}
function loadBannerUrls(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try { return JSON.parse(localStorage.getItem(BANNER_KEY) ?? "{}") } catch { return {} }
}
function resolveEventBanner(
  events: FamilyEvent[],
  bannerUrls: Record<string, string>
): { event: FamilyEvent; daysUntil: number } | null {
  if (!events.length) return null
  const today   = new Date()
  const todayMD = `${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`

  // 1. Today's event — always wins
  const todayEv = events.find(e => e.date === todayMD)
  if (todayEv) return { event: todayEv, daysUntil: 0 }

  // 2. Any event that has a banner URL already generated — show it regardless of date
  //    (user explicitly generated it, so they want to see it)
  const withBanner = events.find(e => bannerUrls[e.id])
  if (withBanner) {
    const [mm, dd] = withBanner.date.split("-")
    const dt = new Date(today.getFullYear(), parseInt(mm)-1, parseInt(dd))
    if (dt < today) dt.setFullYear(today.getFullYear()+1)
    const daysUntil = Math.ceil((dt.getTime()-today.getTime())/(864e5))
    return { event: withBanner, daysUntil: Math.min(daysUntil, 365) }
  }

  // 3. Upcoming within 14 days
  const upcoming = events.map(e => {
    const [mm, dd] = e.date.split("-")
    const dt = new Date(today.getFullYear(), parseInt(mm)-1, parseInt(dd))
    if (dt < today) dt.setFullYear(today.getFullYear()+1)
    return { event: e, daysUntil: Math.ceil((dt.getTime()-today.getTime())/(864e5)) }
  }).filter(x => x.daysUntil <= 14 && x.daysUntil > 0).sort((a,b) => a.daysUntil-b.daysUntil)
  return upcoming[0] ?? null
}

/* ── Video player services ──────────────────────── */



function ago(m: number) {
  if (m < 1) return "Just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m/60); return h < 24 ? `${h}h ago` : `${Math.floor(h/24)}d ago`
}

/* ══════════════════════════════════════════════
   TOP BAR
══════════════════════════════════════════════ */
export function TopBar({ onSettingsClick, events = [], userName = "", ticker }: TopBarProps) {
  const [currentTime,    setCurrentTime]    = useState(new Date())
  const [query,          setQuery]          = useState("")
  const [results,        setResults]        = useState<CachedItem[]>([])
  const [open,           setOpen]           = useState(false)
  const [selected,       setSelected]       = useState(-1)
  const [searchVisible,  setSearchVisible]  = useState(false)
  const [bannerUrls,     setBannerUrls]     = useState<Record<string,string>>({})
  const [bannerMessages, setBannerMessages] = useState<Record<string,string>>({})
  const [generating,     setGenerating]     = useState(false)
  const [generalPhotos,     setGeneralPhotos]     = useState<FamilyPhoto[]>([])
  const [selectedBannerIds, setSelectedBannerIds] = useState<string[]>([])
  const [bannerCrops,       setBannerCrops]       = useState<Record<string,string>>({})
  const [generalBannerIdx,  setGeneralBannerIdx]  = useState(0)
  const [bannerTextOverlays, setBannerTextOverlays] = useState<Record<string,{text:string;position:"top"|"center"|"bottom"}>>({})

  const inputRef    = useRef<HTMLInputElement>(null)
  const wrapRef     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    setBannerUrls(loadBannerUrls())
    setBannerMessages(loadBannerMessages())
  }, [])
  useEffect(() => {
    const h = () => { setBannerUrls(loadBannerUrls()); setBannerMessages(loadBannerMessages()) }
    window.addEventListener("hp-banner-updated", h)
    return () => window.removeEventListener("hp-banner-updated", h)
  }, [])

  function loadGeneralBannerData() {
    try {
      const photos    = JSON.parse(localStorage.getItem("hp_family_photos") ?? "[]") as FamilyPhoto[]
      const selIds    = JSON.parse(localStorage.getItem("hp_general_banners_selected") ?? "[]") as string[]
      const crops     = JSON.parse(localStorage.getItem("hp_banner_crops") ?? "{}") as Record<string,string>
      const overlays  = JSON.parse(localStorage.getItem("hp_banner_text_overlays") ?? "{}") as Record<string,{text:string;position:"top"|"center"|"bottom"}>
      setGeneralPhotos(photos)
      setSelectedBannerIds(selIds)
      setBannerCrops(crops)
      setBannerTextOverlays(overlays)
    } catch {}
  }
  useEffect(() => { loadGeneralBannerData() }, [])
  useEffect(() => {
    const h = () => loadGeneralBannerData()
    window.addEventListener("hp-general-banner-updated", h)
    return () => window.removeEventListener("hp-general-banner-updated", h)
  }, [])
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { setOpen(false); setSelected(-1) }
    }
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h)
  }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { setSearchVisible(false); setQuery(""); setOpen(false) } }
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h)
  }, [])

  const handleChange = useCallback((val: string) => {
    setQuery(val); setSelected(-1)
    if (val.trim().length < 2) { setResults([]); setOpen(false); return }
    setResults(feedCache.search(val)); setOpen(true)
  }, [])

  function openGoogle(q: string) {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, "_blank")
    setQuery(""); setOpen(false); setSelected(-1); setSearchVisible(false)
  }
  function openArticle(item: CachedItem) {
    if (item.link) window.open(item.link, "_blank", "noopener,noreferrer")
    setQuery(""); setOpen(false); setSelected(-1); setSearchVisible(false)
  }
  function handleKeyDown(e: React.KeyboardEvent) {
    const total = results.length + 1
    if (e.key === "ArrowDown")  { e.preventDefault(); setSelected(s => Math.min(s+1, total-1)) }
    else if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s-1, -1)) }
    else if (e.key === "Enter") {
      e.preventDefault()
      if (selected >= 0 && selected < results.length) openArticle(results[selected])
      else if (query.trim()) openGoogle(query)
    }
  }







  async function generateBanner(eventId: string, personName: string, eventType: string, notes?: string, hasPhoto?: boolean) {
    setGenerating(true)
    try {
      const res = await fetch("/api/banner", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personName, eventType, notes, hasPhoto }),
      })
      const data = await res.json()
      if (data.bannerUrl) {
        const existing = JSON.parse(localStorage.getItem(BANNER_KEY) ?? "{}")
        existing[eventId] = data.bannerUrl
        localStorage.setItem(BANNER_KEY, JSON.stringify(existing))
        setBannerUrls({ ...existing })
        window.dispatchEvent(new Event("hp-banner-updated"))
      }
    } finally { setGenerating(false) }
  }

  const bannerEvent     = resolveEventBanner(events, bannerUrls)
  const activeBannerUrl = bannerEvent ? bannerUrls[bannerEvent.event.id] : null
  const showDropdown    = open && query.trim().length >= 2

  // General banner rotation (only active when no event banner)
  const selectedGeneralBanners = generalPhotos
    .filter(p => selectedBannerIds.includes(p.id))
    .map(p => bannerCrops[p.id] ?? p.dataUrl)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedGeneralBanners.length <= 1 || !!bannerEvent) return
    const id = setInterval(() => setGeneralBannerIdx(i => (i + 1) % selectedGeneralBanners.length), 8000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGeneralBanners.length, !!bannerEvent])
  const safeIdx          = selectedGeneralBanners.length > 0 ? generalBannerIdx % selectedGeneralBanners.length : 0
  const generalBannerUrl = !bannerEvent && selectedGeneralBanners.length > 0 ? selectedGeneralBanners[safeIdx] : null
  // Find which photo ID is currently displayed (for text overlay lookup)
  const activeGeneralPhotoId = !bannerEvent && selectedGeneralBanners.length > 0
    ? (generalPhotos.filter(p => selectedBannerIds.includes(p.id))[safeIdx]?.id ?? null)
    : null
  const activeBannerTextOverlay = activeGeneralPhotoId ? bannerTextOverlays[activeGeneralPhotoId] : null
  return (
    <div className="bg-white shrink-0 relative" style={{ borderBottom: "1px solid #e5e7eb" }}>
      <div className="h-[3px] bg-gradient-to-r from-transparent via-[#B8960C] to-transparent" />

      <div className="flex flex-col md:flex-row md:items-stretch md:h-[184px]">

        {/* ① HOME PAGE branding */}
        <div className="flex flex-row items-center justify-between px-4 py-2 border-b border-gray-100 md:flex-col md:items-center md:justify-center md:py-0 md:shrink-0 md:border-b-0 md:border-r md:w-56">
          {/* Logo */}
          <img
            src="https://galaxy-prod.tlcdn.com/view/user_376iXwrFR3WYxRRISnJY1Yj7ec4/d2be383fcd6d451b9efb892b5afda6ed.png"
            alt="HOME PAGE"
            className="object-contain h-14 w-auto md:h-auto md:max-h-[114px] md:max-w-full"
          />
          {/* Date + streaming hint — desktop only */}
          <div className="hidden md:flex flex-col items-center gap-0.5 mt-1">
            {userName ? (
              <p className="text-[11px] font-semibold text-gray-600 leading-none mb-1 truncate text-center">
                Welcome, {userName}
              </p>
            ) : null}
            <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-[#B8960C] leading-none mb-2 text-center">
              {format(currentTime, "MMMM d, yyyy")}
            </p>
            <div className="flex flex-col items-center gap-0.5">
              <div className="text-[9px] font-black uppercase tracking-widest text-gray-300">Live Streaming</div>
              <div className="text-[9px] text-gray-400 leading-snug">↓ Select a service</div>
            </div>
          </div>
          {/* Mobile-only: date + clock + bell + settings inline */}
          <div className="flex md:hidden flex-col items-end gap-0.5">
            {userName ? (
              <p className="text-[11px] font-semibold text-gray-500 leading-none truncate">
                {userName}
              </p>
            ) : null}
            <p className="text-[11px] font-bold text-[#B8960C] leading-none">
              {format(currentTime, "MMMM d")}
            </p>
          </div>
          <div className="flex md:hidden items-center gap-2 ml-3">
            <span className="text-[16px] font-black text-gray-900 font-mono tabular-nums leading-tight">
              {format(currentTime, "hh:mm")}
              <span className="text-[12px] font-normal text-[#B8960C] ml-0.5">{format(currentTime, "aa")}</span>
            </span>
            <button className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
              <Bell style={{ width: 20, height: 20 }} />
            </button>
            <button onClick={onSettingsClick}
              className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white hover:bg-gray-700"
              title="Settings">
              <Settings style={{ width: 17, height: 17 }} />
            </button>
          </div>
        </div>


        {/* Breaking News ticker — mobile only, sticky so it pins while banner/feed scroll */}
        {ticker && (
          <div className="md:hidden sticky top-0 z-30">
            {ticker}
          </div>
        )}

                {/* ③ ANNOUNCEMENT BANNER — full-bleed, fills entire remaining space */}
        <div className="relative overflow-hidden min-w-0 w-full min-h-[130px] md:flex-1 md:min-h-0">
          {bannerEvent ? (
            <>
              {/* Background: dark cinematic base */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a1206] via-[#2d1e06] to-[#0e0c0a]" />

              {/* Background: AI banner image fills everything */}
              {activeBannerUrl && (
                <img
                  key={activeBannerUrl}
                  src={activeBannerUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {/* Overlay: stronger on left where text is, lighter on right so image shows through */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />
              {/* Subtle top/bottom vignette */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />

              {/* Gold border lines */}
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#B8960C] via-[#D4AF37] to-[#B8960C]/40" />
              <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-[#B8960C]/60 via-[#D4AF37]/40 to-transparent" />
              <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-[#B8960C] to-[#B8960C]/30" />

              {/* Content */}
              <div className="relative h-full flex items-center gap-4 px-5">

                {/* Headshot — large prominent circle */}
                <div className="shrink-0 relative">
                  {bannerEvent.event.headshotDataUrl ? (
                    <>
                      {/* Outer glow */}
                      <div className="absolute inset-0 rounded-full bg-[#D4AF37]/25 blur-2xl scale-125" />
                      {/* Photo */}
                      <div className="relative w-28 h-28 rounded-full overflow-hidden border-[3px] border-[#D4AF37] shadow-2xl ring-4 ring-[#D4AF37]/20">
                        <img src={bannerEvent.event.headshotDataUrl} alt={bannerEvent.event.personName}
                          className="w-full h-full object-cover" />
                      </div>
                      {/* Emoji badge */}
                      <span className="absolute -bottom-1 -right-2 text-[28px] leading-none drop-shadow-lg">
                        {EV_EMOJI[bannerEvent.event.eventType] ?? "⭐"}
                      </span>
                    </>
                  ) : (
                    /* No headshot: styled emoji placeholder that looks intentional */
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-[#D4AF37]/20 blur-xl scale-125" />
                      <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#2d1e06] to-[#1a1206] border-[3px] border-[#D4AF37] shadow-2xl ring-4 ring-[#D4AF37]/20 flex items-center justify-center">
                        <span className="text-[44px] leading-none">{EV_EMOJI[bannerEvent.event.eventType] ?? "⭐"}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Text block */}
                <div className="flex-1 min-w-0">
                  {/* Label row */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-px w-6 bg-[#D4AF37]" />
                    <p className="text-[#D4AF37]/80 text-[9px] font-black uppercase tracking-[0.32em] leading-none">
                      {bannerEvent.daysUntil === 0
                        ? `${format(new Date(), "MMMM d, yyyy")} · Special Announcement`
                        : `Coming up · ${bannerEvent.daysUntil} day${bannerEvent.daysUntil !== 1 ? "s" : ""}`}
                    </p>
                  </div>

                  {/* Main headline */}
                  <h2 className="masthead text-white leading-none drop-shadow-2xl"
                    style={{ fontSize: "clamp(20px, 2.8vw, 40px)", textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>
                    {bannerMessages[bannerEvent.event.id]
                      ? bannerMessages[bannerEvent.event.id]
                      : bannerEvent.daysUntil === 0
                        ? EV_MSG[bannerEvent.event.eventType]?.(bannerEvent.event.personName)
                        : bannerEvent.event.personName}
                  </h2>

                  {bannerEvent.daysUntil > 0 && (
                    <p className="text-[#D4AF37] text-sm font-semibold mt-1">
                      {EV_MSG[bannerEvent.event.eventType]?.("").replace(", !", "").trim() || "Special Day"}
                    </p>
                  )}
                  {bannerEvent.event.notes && bannerEvent.daysUntil === 0 && (
                    <p className="text-white/55 text-[11px] font-medium mt-1.5 line-clamp-1">
                      {bannerEvent.event.notes}
                    </p>
                  )}
                </div>

                {/* Generate banner button (right side) */}
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <div className="hidden xl:flex flex-col items-end gap-1">
                    <div className="h-px w-16 bg-gradient-to-l from-[#D4AF37] to-transparent" />
                    <p className="text-[#D4AF37]/50 text-[8px] font-black uppercase tracking-[0.3em]">HOME PAGE</p>
                    <div className="h-px w-16 bg-gradient-to-l from-[#D4AF37] to-transparent" />
                  </div>
                  <button
                    onClick={() => generateBanner(
                      bannerEvent.event.id,
                      bannerEvent.event.personName,
                      bannerEvent.event.eventType,
                      bannerEvent.event.notes,
                      !!bannerEvent.event.headshotDataUrl
                    )}
                    disabled={generating}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all",
                      generating
                        ? "bg-white/10 text-white/30 cursor-wait"
                        : activeBannerUrl
                          ? "bg-white/10 hover:bg-white/20 text-white/50 hover:text-white border border-white/15"
                          : "bg-gradient-to-r from-[#B8960C] to-[#D4AF37] text-black hover:opacity-90 shadow-lg"
                    )}>
                    {generating
                      ? <><RefreshCw className="h-3 w-3 animate-spin" />Generating…</>
                      : activeBannerUrl
                        ? <><RefreshCw className="h-3 w-3" />New banner</>
                        : <><Sparkles className="h-3 w-3" />Generate banner</>
                    }
                  </button>
                </div>
              </div>
            </>
          ) : generalBannerUrl ? (
            /* General banner rotation */
            <>
              <div className="absolute inset-0 bg-black/20" />
              <img
                key={generalBannerUrl}
                src={generalBannerUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />
              {/* Gold frame lines */}
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#B8960C] via-[#D4AF37] to-[#B8960C]/40" />
              <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-[#B8960C]/60 via-[#D4AF37]/40 to-transparent" />
              <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-[#B8960C] to-[#B8960C]/30" />
              {/* Text overlay */}
              {activeBannerTextOverlay?.text && (
                <div className={cn(
                  "absolute inset-x-0 px-5 z-10 pointer-events-none",
                  activeBannerTextOverlay.position === "top"    ? "top-3" :
                  activeBannerTextOverlay.position === "center" ? "top-1/2 -translate-y-1/2" :
                                                                   "bottom-5"
                )}>
                  <p className="text-white font-black leading-tight drop-shadow-2xl"
                    style={{
                      fontSize: "clamp(14px, 2.2vw, 32px)",
                      textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8)",
                      letterSpacing: "0.02em",
                    }}>
                    {activeBannerTextOverlay.text}
                  </p>
                </div>
              )}
              {/* Rotation dots */}
              {selectedGeneralBanners.length > 1 && (
                <div className="absolute bottom-2 right-3 flex gap-1.5">
                  {selectedGeneralBanners.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setGeneralBannerIdx(i)}
                      className={cn("w-1.5 h-1.5 rounded-full transition-all",
                        i === safeIdx ? "bg-[#D4AF37] scale-125" : "bg-white/40 hover:bg-white/70")}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            /* No event, no banner — neutral placeholder */
            <div className="h-full flex items-center justify-center bg-gray-50">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-gray-200 hidden lg:block">
                Your Personal Hub
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px bg-gray-100 shrink-0" />

        {/* ④ Right controls — desktop only */}
        <div className="hidden md:flex flex-col items-center justify-center gap-2 px-3 shrink-0">
          {/* Search */}
          <div ref={wrapRef} className="relative flex items-center">
            {searchVisible ? (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 w-52">
                <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <input ref={inputRef} autoFocus value={query}
                  onChange={e => handleChange(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="Search feed or web…"
                  className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none" />
                <button onClick={() => { setQuery(""); setResults([]); setOpen(false); setSearchVisible(false) }}>
                  <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            ) : (
              <button onClick={() => { setSearchVisible(true); setTimeout(() => inputRef.current?.focus(), 50) }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors">
                <Search style={{ width:17, height:17 }} />
              </button>
            )}
            {showDropdown && (
              <div className="absolute top-full right-0 mt-2 w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                {results.length > 0 && (
                  <>
                    <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">In Your Feed</span>
                      <span className="text-[10px] text-gray-300">{results.length} match{results.length !== 1 ? "es" : ""}</span>
                    </div>
                    {results.map((item, i) => (
                      <button key={item.id} onClick={() => openArticle(item)}
                        className={cn("w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors group border-b border-gray-50 last:border-0",
                          selected === i ? "bg-gray-100" : "hover:bg-gray-50")}>
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 bg-gray-100"
                            onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg shrink-0">📰</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-gray-900 line-clamp-1">{item.title}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{item.source} · {ago(item.minutesAgo)}</p>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 shrink-0 mt-1" />
                      </button>
                    ))}
                  </>
                )}
                <button onClick={() => openGoogle(query)}
                  className={cn("w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left",
                    selected === results.length ? "bg-gray-100" : "hover:bg-gray-50")}>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Search className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-700">
                      Search Google for <span className="font-bold text-gray-900">"{query}"</span>
                    </p>
                    <p className="text-[11px] text-gray-400">google.com</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                </button>
              </div>
            )}
          </div>

          <button className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors">
            <Bell style={{ width:17, height:17 }} />
          </button>

          <div className="hidden md:flex flex-col items-center justify-center">
            <span className="text-[15px] font-black text-gray-900 font-mono tabular-nums leading-tight">
              {format(currentTime, "hh:mm")}
              <span className="text-[10px] font-normal text-[#B8960C] ml-0.5">{format(currentTime, "aa")}</span>
            </span>
          </div>

          <button onClick={onSettingsClick}
            className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center text-white hover:bg-gray-700 transition-colors shrink-0"
            title="Settings">
            <Settings style={{ width:15, height:15 }} />
          </button>
        </div>
      </div>

      <div className="gold-rule" />
    </div>
  )
}
