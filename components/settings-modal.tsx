"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { X, Upload, Trash2, Calendar, User, Star, Check, Youtube, Facebook, Instagram, Plus, Copy, CheckCheck, Rss, ChevronDown, Camera, RefreshCw, Type, Sliders } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import type { FamilyPhoto, FamilyEvent, EventType } from "@/types"
import { cn } from "@/lib/utils"
import type { SocialChannel } from "@/app/api/channels/route"
import { type NewsFeed } from "@/lib/feed-defaults"
import { feedsStore, channelsStore, type SocialChannelLocal } from "@/lib/local-store"

/* ─── Types ──────────────────────────────────────────────── */

/* ─── Per-event banner uploader ──────────────────────────── */
const BANNER_KEY_SM = "hp_banner_urls"

function loadBannerUrlsSM(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try { return JSON.parse(localStorage.getItem(BANNER_KEY_SM) ?? "{}") } catch { return {} }
}

function EventBannerRow({ event, onUpdateEvent }: {
  event: FamilyEvent
  onUpdateEvent?: (e: FamilyEvent) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)

  useEffect(() => {
    const urls = loadBannerUrlsSM()
    setBannerUrl(urls[event.id] ?? null)
  }, [event.id])

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const existing = loadBannerUrlsSM()
      existing[event.id] = dataUrl
      localStorage.setItem(BANNER_KEY_SM, JSON.stringify(existing))
      setBannerUrl(dataUrl)
      window.dispatchEvent(new CustomEvent("hp-banner-updated", { detail: { eventId: event.id } }))
    }
    reader.readAsDataURL(file)
  }

  function clearBanner() {
    const existing = loadBannerUrlsSM()
    delete existing[event.id]
    localStorage.setItem(BANNER_KEY_SM, JSON.stringify(existing))
    setBannerUrl(null)
    window.dispatchEvent(new CustomEvent("hp-banner-updated", { detail: { eventId: event.id } }))
  }

  const EV_EMOJI: Record<string, string> = { birthday: "🎂", anniversary: "💍", holiday: "🎉", custom: "⭐" }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:border-gray-200 transition-all">
      {/* Preview thumbnail */}
      <div
        onClick={() => inputRef.current?.click()}
        className="w-16 h-10 rounded-lg overflow-hidden border border-gray-200 bg-white flex items-center justify-center cursor-pointer shrink-0 hover:border-[#B8960C] transition-colors group relative"
        title={bannerUrl ? "Click to replace banner" : "Click to upload banner"}
      >
        {bannerUrl ? (
          <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xl group-hover:scale-110 transition-transform">{EV_EMOJI[event.eventType] ?? "⭐"}</span>
        )}
      </div>

      {/* Event info */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-gray-800 truncate">{event.personName}</p>
        <p className="text-[11px] text-gray-400">
          {EVENT_TYPE_LABELS[event.eventType]} · {event.date}
          {bannerUrl && <span className="ml-2 text-green-600 font-semibold">✓ Banner set</span>}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => inputRef.current?.click()}
          className="h-7 px-2.5 text-[11px] font-bold rounded-lg bg-[#B8960C] text-white hover:bg-[#9a7a0a] transition-colors"
        >
          {bannerUrl ? "Replace" : "Upload"}
        </button>
        {bannerUrl && (
          <button
            onClick={clearBanner}
            className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
      />
    </div>
  )
}

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  familyPhotos: FamilyPhoto[]
  familyEvents: FamilyEvent[]
  onAddPhoto: (photo: FamilyPhoto) => void
  onDeletePhoto: (id: string) => void
  onAddEvent: (event: FamilyEvent) => void
  onDeleteEvent: (id: string) => void
  onUpdateEvent?: (event: FamilyEvent) => void
  userName?: string
  onNameChange?: (name: string) => void
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const DAYS   = Array.from({ length: 31 }, (_, i) => i + 1)
const EVENT_TYPE_LABELS: Record<EventType, string> = {
  birthday: "🎂 Birthday", anniversary: "💍 Anniversary", holiday: "🎉 Holiday", custom: "⭐ Custom",
}

/* ─── Reusable sub-components ────────────────────────────── */
function UploadZone({ onFiles }: { onFiles: (f: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const process = (files: FileList | null) => {
    if (!files) return
    onFiles(Array.from(files).filter(f => f.type.startsWith("image/")))
  }
  return (
    <div onClick={() => inputRef.current?.click()}
      onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)}
      onDrop={e=>{e.preventDefault();setDragging(false);process(e.dataTransfer.files)}}
      className={cn("border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
        dragging ? "border-gray-700 bg-gray-50" : "border-gray-200 hover:border-gray-400 hover:bg-gray-50")}>
      <Upload className="h-7 w-7 mx-auto mb-2 text-gray-400"/>
      <p className="text-sm font-medium text-gray-700">Drop photos here</p>
      <p className="text-xs text-gray-400 mt-0.5">or click to select</p>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e=>process(e.target.files)}/>
    </div>
  )
}

/* ─── Mini headshot uploader ─────────────────────────────── */
function HeadshotUpload({ value, onChange }: { value: string | null; onChange: (dataUrl: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      if (e.target?.result) onChange(e.target.result as string)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <Label className="text-[11px] text-gray-500 font-bold uppercase tracking-wide mb-1 block">
        Headshot Photo <span className="font-normal text-gray-400">(optional)</span>
      </Label>
      {value ? (
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#B8960C] shrink-0">
            <img src={value} alt="headshot" className="w-full h-full object-cover" />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] text-emerald-600 font-semibold">✓ Photo added</p>
            <button
              onClick={() => onChange(null)}
              className="text-[11px] text-red-500 hover:text-red-700 flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500 hover:border-[#B8960C] hover:text-[#B8960C] transition-colors w-full"
        >
          <Camera className="h-4 w-4 shrink-0" />
          <span className="text-[12px]">Upload headshot for birthday header</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
    </div>
  )
}

const BANNER_URLS_KEY = "hp_banner_urls"
const BANNER_MSG_KEY  = "hp_banner_messages"
function loadBannerMessages(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try { return JSON.parse(localStorage.getItem(BANNER_MSG_KEY) ?? "{}") } catch { return {} }
}
function saveBannerMessage(eventId: string, msg: string) {
  const existing = loadBannerMessages()
  if (msg.trim()) existing[eventId] = msg.trim()
  else delete existing[eventId]
  localStorage.setItem(BANNER_MSG_KEY, JSON.stringify(existing))
  window.dispatchEvent(new Event("hp-banner-updated"))
}
function loadBannerUrls(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try { return JSON.parse(localStorage.getItem(BANNER_URLS_KEY) ?? "{}") } catch { return {} }
}
function saveBannerUrl(eventId: string, url: string) {
  const existing = loadBannerUrls()
  existing[eventId] = url
  localStorage.setItem(BANNER_URLS_KEY, JSON.stringify(existing))
  window.dispatchEvent(new Event("hp-banner-updated"))
}
function clearBannerUrl(eventId: string) {
  const existing = loadBannerUrls()
  delete existing[eventId]
  localStorage.setItem(BANNER_URLS_KEY, JSON.stringify(existing))
  window.dispatchEvent(new Event("hp-banner-updated"))
}

function UpcomingEventRow({ event, onDelete, onUpdateEvent }: { event: FamilyEvent; onDelete: () => void; onUpdateEvent?: (e: FamilyEvent) => void }) {
  const [mm, dd] = event.date.split("-")
  const monthName = MONTHS[parseInt(mm)-1]
  const today     = new Date()
  const eventDate = new Date(today.getFullYear(), parseInt(mm)-1, parseInt(dd))
  if (eventDate < today) eventDate.setFullYear(today.getFullYear()+1)
  const daysUntil = Math.ceil((eventDate.getTime()-today.getTime())/(1000*60*60*24))
  const isToday   = daysUntil===0||daysUntil===365

  const [bannerUrls, setBannerUrls]   = useState<Record<string,string>>(loadBannerUrls)
  const [generating, setGenerating]   = useState(false)
  const [genError,   setGenError]     = useState<string|null>(null)
  const hasBanner = !!bannerUrls[event.id]
  const [bannerMsgs,  setBannerMsgs]  = useState<Record<string,string>>(loadBannerMessages)
  const [customMsg,   setCustomMsg]   = useState<string>(() => loadBannerMessages()[event.id] ?? "")
  const handleMsgSave = () => {
    saveBannerMessage(event.id, customMsg)
    setBannerMsgs(loadBannerMessages())
  }
  const headshotInputRef = useRef<HTMLInputElement>(null)

  const handleHeadshotUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      if (e.target?.result && onUpdateEvent) {
        onUpdateEvent({ ...event, headshotDataUrl: e.target.result as string })
      }
    }
    reader.readAsDataURL(file)
  }
  const handleRemoveHeadshot = () => {
    if (onUpdateEvent) onUpdateEvent({ ...event, headshotDataUrl: undefined })
  }

  const handleGenerateBanner = async () => {
    setGenerating(true); setGenError(null)
    try {
      const res = await fetch("/api/banner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personName: event.personName, eventType: event.eventType, notes: event.notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Generation failed")
      saveBannerUrl(event.id, data.bannerUrl)
      setBannerUrls(loadBannerUrls())
    } catch(e) {
      setGenError((e as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  const handleClearBanner = () => {
    clearBannerUrl(event.id)
    setBannerUrls(loadBannerUrls())
  }

  return (
    <div className={cn("rounded-xl border overflow-hidden",
      isToday ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-white")}>
      {/* Main row */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Headshot or date badge */}
        {/* Headshot — click to upload/change */}
        <button
          type="button"
          onClick={() => headshotInputRef.current?.click()}
          title={event.headshotDataUrl ? "Click to change photo" : "Click to add headshot"}
          className="relative shrink-0 group"
        >
          {event.headshotDataUrl ? (
            <>
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#B8960C]">
                <img src={event.headshotDataUrl} alt={event.personName} className="w-full h-full object-cover" />
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-3.5 w-3.5 text-white" />
              </div>
            </>
          ) : (
            <div className={cn("w-10 h-10 rounded-lg flex flex-col items-center justify-center relative",
              isToday ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700")}>
              <span className="text-[10px] font-semibold group-hover:hidden">{monthName}</span>
              <span className="text-base font-black leading-none group-hover:hidden">{dd}</span>
              <Camera className="h-4 w-4 hidden group-hover:block" />
            </div>
          )}
        </button>
        <input ref={headshotInputRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleHeadshotUpload(f) }} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-gray-900 truncate">{event.personName}</p>
          <p className="text-[11px] text-gray-500">{EVENT_TYPE_LABELS[event.eventType]}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isToday ? <Badge className="bg-amber-500 text-white text-[10px]">Today!</Badge>
            : <span className="text-[11px] text-gray-400">in {daysUntil}d</span>}
          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5"/>
          </Button>
        </div>
      </div>

      {/* Banner controls */}
      <div className="px-3 pb-2.5 flex items-center gap-2 flex-wrap">
        {hasBanner ? (
          <>
            <div className="w-20 h-10 rounded-lg overflow-hidden border border-[#B8960C]/40 shrink-0">
              <img src={bannerUrls[event.id]} alt="banner" className="w-full h-full object-cover" />
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold flex-1">✓ AI Banner set — showing in header</span>
            <button onClick={handleClearBanner}
              className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors">
              <Trash2 className="h-3 w-3"/>Remove banner
            </button>
            {event.headshotDataUrl && (
              <button onClick={handleRemoveHeadshot}
                className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors">
                <Trash2 className="h-3 w-3"/>Remove photo
              </button>
            )}
            <button onClick={handleGenerateBanner} disabled={generating}
              className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-1 transition-colors disabled:opacity-50">
              {generating ? "Generating…" : "↻ Regenerate"}
            </button>
          </>
        ) : (
          <>
            <button onClick={handleGenerateBanner} disabled={generating}
              className={cn("text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all",
                generating
                  ? "bg-gray-100 text-gray-400 cursor-wait"
                  : "bg-gradient-to-r from-[#B8960C] to-[#D4AF37] text-white hover:opacity-90 shadow-sm")}>
              {generating ? (
                <><span className="animate-spin inline-block">⟳</span> Generating…</>
              ) : (
                <>✨ Generate AI Banner</>
              )}
            </button>
            {event.headshotDataUrl && (
              <span className="text-[10px] text-gray-400">— headshot will be used as style reference</span>
            )}
          </>
        )}
        {genError && (
          <p className="w-full text-[10px] text-red-600 bg-red-50 px-2 py-1 rounded mt-1">{genError}</p>
        )}
      </div>

      {/* Custom message overlay */}
      <div className="px-3 pb-3">
        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Banner Message</p>
        <div className="flex gap-2">
          <input
            value={customMsg}
            onChange={e => setCustomMsg(e.target.value)}
            onBlur={handleMsgSave}
            onKeyDown={e => e.key === "Enter" && handleMsgSave()}
            placeholder={`e.g. Happy Birthday, ${event.personName}! 🎉`}
            className="flex-1 h-7 text-[11px] px-2 border border-gray-200 rounded outline-none focus:border-[#B8960C] bg-white"
          />
          <button onClick={handleMsgSave}
            className="h-7 px-2.5 bg-gray-800 hover:bg-gray-700 text-white text-[10px] font-bold rounded transition-colors">
            Save
          </button>
          {bannerMsgs[event.id] && (
            <button onClick={() => { setCustomMsg(""); saveBannerMessage(event.id, ""); setBannerMsgs(loadBannerMessages()) }}
              className="h-7 px-2 text-gray-400 hover:text-red-500 text-[10px] rounded hover:bg-red-50 transition-colors">
              ✕
            </button>
          )}
        </div>
        {bannerMsgs[event.id] && (
          <p className="text-[10px] text-emerald-600 mt-1">✓ Showing: "{bannerMsgs[event.id]}"</p>
        )}
        {!bannerMsgs[event.id] && (
          <p className="text-[9px] text-gray-400 mt-1">Leave blank to use default greeting</p>
        )}
      </div>
    </div>
  )
}

/* ─── Social channel row ─────────────────────────────────── */
const PLATFORM_ICON: Record<string, React.ReactNode> = {
  youtube:   <Youtube   className="h-4 w-4 text-red-600"/>,
  facebook:  <Facebook  className="h-4 w-4 text-blue-600"/>,
  instagram: <Instagram className="h-4 w-4 text-pink-600"/>,
  rss:       <Rss       className="h-4 w-4 text-orange-500"/>,
}
function ChannelRow({ channel, onDelete }: { channel: SocialChannel; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 bg-white hover:bg-gray-50">
      {PLATFORM_ICON[channel.type] ?? <Rss className="h-4 w-4 text-gray-400"/>}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-gray-800 truncate">{channel.label}</p>
        <p className="text-[10px] text-gray-400 truncate">{channel.feedUrl.replace("youtube-handle:", "@")}</p>
      </div>
      <Badge className="text-[10px] bg-gray-100 text-gray-600 font-medium capitalize">{channel.category}</Badge>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-300 hover:text-red-500 rounded shrink-0" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5"/>
      </Button>
    </div>
  )
}

/* ─── Add channel form ───────────────────────────────────── */
const PLATFORM_OPTS = [
  { value: "youtube",   label: "YouTube",          icon: "▶️", hint: "Paste a channel URL like youtube.com/@ChannelName" },
  { value: "facebook",  label: "Facebook Page",    icon: "📘", hint: "Paste your rss.app feed URL for the Facebook Page" },
  { value: "instagram", label: "Instagram",        icon: "📸", hint: "Paste your rss.app feed URL for the Instagram account" },
  { value: "rss",       label: "Any RSS Feed",     icon: "📡", hint: "Paste any valid RSS/Atom feed URL" },
]
const CATEGORY_OPTS = [
  { value: "celebrities", label: "⭐ Stars" },
  { value: "businesses",  label: "🏢 Brands" },
  { value: "industry",    label: "💼 Industry" },
  { value: "friends",     label: "🤝 Friends" },
  { value: "family",      label: "🏡 Family" },
]

function AddChannelForm({ onAdded }: { onAdded: (c: SocialChannel) => void }) {
  const [platform, setPlatform] = useState("youtube")
  const [input,    setInput   ] = useState("")
  const [label,    setLabel   ] = useState("")
  const [category, setCategory] = useState("celebrities")
  const [loading,  setLoading ] = useState(false)
  const [err,      setErr     ] = useState<string|null>(null)
  const [showTips, setShowTips] = useState(false)
  const hint = PLATFORM_OPTS.find(p=>p.value===platform)?.hint ?? ""

  const handleAdd = async () => {
    if (!input.trim()) return
    setLoading(true); setErr(null)
    try {
      let feedUrl = input.trim()
      let resolvedLabel = label.trim() || input.trim()
      if (platform === "youtube") {
        const res = await fetch("/api/channels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: platform, input: input.trim(), label: label.trim() || undefined, category }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed")
        const saved = channelsStore.add({ type: data.type, label: data.label, feedUrl: data.feedUrl, category: data.category })
        onAdded(saved as SocialChannel)
      } else {
        const saved = channelsStore.add({ type: platform, label: resolvedLabel, feedUrl: feedUrl, category })
        onAdded(saved as SocialChannel)
      }
      setInput(""); setLabel("")
    } catch(e) { setErr((e as Error).message) }
    finally { setLoading(false) }
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[11px] text-gray-500 font-bold uppercase tracking-wide mb-1 block">Platform</Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="h-8 text-sm border-gray-200 bg-white">
              <SelectValue/>
            </SelectTrigger>
            <SelectContent>
              {PLATFORM_OPTS.map(p=>(
                <SelectItem key={p.value} value={p.value}>{p.icon} {p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[11px] text-gray-500 font-bold uppercase tracking-wide mb-1 block">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 text-sm border-gray-200 bg-white">
              <SelectValue/>
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTS.map(c=>(
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-[11px] text-gray-500 font-bold uppercase tracking-wide mb-1 block">URL or Feed Link</Label>
        <Input value={input} onChange={e=>setInput(e.target.value)} placeholder={
          platform==="youtube" ? "https://youtube.com/@ChannelName" :
          platform==="facebook" ? "https://rss.app/feeds/..." :
          platform==="instagram" ? "https://rss.app/feeds/..." :
          "https://example.com/feed.rss"
        } className="h-8 text-sm border-gray-200 bg-white"/>
        <p className="text-[10px] text-gray-400 mt-1">{hint}</p>
      </div>

      <div>
        <Label className="text-[11px] text-gray-500 font-bold uppercase tracking-wide mb-1 block">Display Name (optional)</Label>
        <Input value={label} onChange={e=>setLabel(e.target.value)} placeholder="e.g. Mom's YouTube" className="h-8 text-sm border-gray-200 bg-white"/>
      </div>

      {/* Facebook/Instagram helper */}
      {(platform==="facebook"||platform==="instagram") && (
        <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
          <button onClick={()=>setShowTips(t=>!t)} className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 w-full text-left">
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform",showTips&&"rotate-180")}/>
            How to get a free RSS feed for {platform==="facebook"?"Facebook":"Instagram"}?
          </button>
          {showTips && (
            <div className="mt-2 text-[11px] text-blue-700 space-y-1 leading-relaxed">
              <p>1. Go to <a href="https://rss.app" target="_blank" rel="noopener" className="underline font-bold">rss.app</a> (free account)</p>
              <p>2. Click <strong>Create Feed → {platform==="facebook"?"Facebook Page":"Instagram Account"}</strong></p>
              <p>3. Paste the page/profile URL and hit Generate</p>
              <p>4. Copy the RSS URL and paste it here</p>
            </div>
          )}
        </div>
      )}

      {err && <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</p>}

      <Button onClick={handleAdd} disabled={!input.trim()||loading}
        className="w-full h-8 text-xs font-bold bg-gray-900 hover:bg-gray-700 gap-1.5">
        <Plus className="h-3.5 w-3.5"/>{loading?"Adding…":"Add to Feed"}
      </Button>
    </div>
  )
}

/* ─── Banner Crop Adjuster ───────────────────────────────── */
type CropAdjustState = {
  photoId: string; dataUrl: string; isWide: boolean
  sw: number; sh: number; naturalW: number; naturalH: number
  yPct: number; xPct: number
}
function BannerCropAdjuster({
  adjust, onChange, onApply, onCancel,
}: {
  adjust: CropAdjustState
  onChange: (yPct: number, xPct: number) => void
  onApply: () => void
  onCancel: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const img = new Image()
    img.onload = () => {
      const { isWide, sw, sh, naturalW, naturalH, yPct, xPct } = adjust
      const W = canvas.width, H = canvas.height
      const scale = Math.min(W / naturalW, H / naturalH)
      const drawW = naturalW * scale
      const drawH = naturalH * scale
      const offX = (W - drawW) / 2
      const offY = (H - drawH) / 2
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = "#111"
      ctx.fillRect(0, 0, W, H)
      // Draw full image dimmed
      ctx.globalAlpha = 0.35
      ctx.drawImage(img, offX, offY, drawW, drawH)
      ctx.globalAlpha = 1
      // Compute crop window
      const sx = isWide ? Math.max(0, Math.min(naturalW - sw, (naturalW - sw) * (xPct / 100))) : 0
      const sy = isWide ? 0 : Math.max(0, Math.min(naturalH - sh, (naturalH - sh) * (yPct / 100)))
      const cropX = offX + sx * scale
      const cropY = offY + sy * scale
      const cropW = sw * scale
      const cropH = sh * scale
      // Draw bright crop area
      ctx.drawImage(img, sx, sy, sw, sh, cropX, cropY, cropW, cropH)
      // Gold border
      ctx.strokeStyle = "#B8960C"
      ctx.lineWidth = 2
      ctx.strokeRect(cropX + 1, cropY + 1, cropW - 2, cropH - 2)
      // Label
      ctx.fillStyle = "rgba(184,150,12,0.85)"
      ctx.fillRect(cropX + 4, cropY + 4, 60, 16)
      ctx.fillStyle = "#fff"
      ctx.font = "bold 10px sans-serif"
      ctx.fillText("BANNER", cropX + 8, cropY + 15)
    }
    img.src = adjust.dataUrl
  }, [adjust])

  const sliderVal = adjust.isWide ? adjust.xPct : adjust.yPct

  return (
    <div className="bg-gray-950 border border-[#B8960C]/40 rounded-xl p-3 space-y-2.5">
      <p className="text-[10px] font-bold text-[#B8960C] uppercase tracking-wider flex items-center gap-1.5">
        <Sliders className="h-3 w-3"/> Adjust Crop — drag slider to reposition
      </p>
      <canvas ref={canvasRef} width={560} height={180}
        className="w-full rounded-lg" style={{ imageRendering: "pixelated" }} />
      <div className="space-y-1">
        <div className="flex justify-between text-[9px] text-gray-500 uppercase tracking-wide">
          <span>{adjust.isWide ? "◀ Left" : "▲ Top"}</span>
          <span>{adjust.isWide ? "Right ▶" : "Bottom ▼"}</span>
        </div>
        <input
          type="range" min={0} max={100} step={1}
          value={sliderVal}
          onChange={e => {
            const v = Number(e.target.value)
            if (adjust.isWide) onChange(adjust.yPct, v)
            else onChange(v, adjust.xPct)
          }}
          className="w-full h-2 accent-[#B8960C]"
        />
      </div>
      <div className="flex gap-2 pt-0.5">
        <button onClick={onApply}
          className="flex-1 h-7 text-[11px] font-bold rounded-lg bg-[#B8960C] text-white hover:bg-[#9a7a0a] transition-colors">
          ✓ Apply Crop
        </button>
        <button onClick={onCancel}
          className="h-7 px-4 text-[11px] font-bold rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}

/* ─── Banner Text Overlay Editor ────────────────────────── */
function BannerTextEditor({
  photoId, initial, onSave,
}: {
  photoId: string
  initial?: { text: string; position: "top"|"center"|"bottom" }
  onSave: (text: string, position: "top"|"center"|"bottom") => void
}) {
  const [text, setText] = useState(initial?.text ?? "")
  const [position, setPosition] = useState<"top"|"center"|"bottom">(initial?.position ?? "bottom")
  const [saved, setSaved] = useState(false)

  function handleSave() {
    onSave(text, position)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div className="px-2.5 pb-2.5 bg-gray-50 border-t border-gray-100 space-y-2">
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 pt-2">Banner Text Overlay</p>
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="e.g.  DMR Fashion Week 2026  or  leave blank to remove"
        className="w-full h-7 text-[11px] px-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#B8960C]"
      />
      <div className="flex items-center gap-2">
        <p className="text-[10px] text-gray-500 font-semibold shrink-0">Position:</p>
        {(["top","center","bottom"] as const).map(pos => (
          <button
            key={pos}
            onClick={() => setPosition(pos)}
            className={cn("h-6 px-2.5 text-[10px] font-bold rounded-md capitalize transition-colors",
              position === pos ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
          >
            {pos === "top" ? "↑ Top" : pos === "center" ? "⊙ Center" : "↓ Bottom"}
          </button>
        ))}
        <div className="flex-1"/>
        <button
          onClick={handleSave}
          className={cn("h-6 px-3 text-[10px] font-bold rounded-md transition-all",
            saved ? "bg-emerald-500 text-white" : "bg-[#B8960C] text-white hover:bg-[#9a7a0a]")}
        >
          {saved ? "✓ Saved" : text.trim() ? "Save" : "Clear"}
        </button>
      </div>
      {text.trim() && (
        <p className="text-[10px] text-gray-400">Preview: text will appear at <strong>{position}</strong> of the banner with a dark shadow for readability.</p>
      )}
    </div>
  )
}

/* ─── Main modal ─────────────────────────────────────────── */
export function SettingsModal({
  open, onClose,
  familyPhotos, familyEvents,
  onAddPhoto, onDeletePhoto,
  onAddEvent, onDeleteEvent, onUpdateEvent, userName = "", onNameChange,
}: SettingsModalProps) {

  const [newEvent,       setNewEvent]       = useState({ personName:"", eventType:"birthday" as EventType, month:"01", day:"01", notes:"", headshotDataUrl: null as string | null })
  const [savedIndicator, setSavedIndicator] = useState(false)
  const [channels,       setChannels]       = useState<SocialChannel[]>([])
  const [feeds,          setFeeds]          = useState<NewsFeed[]>([])
  const [copied,         setCopied]         = useState(false)
  const [calendarUrl,      setCalendarUrl]    = useState("")
  const [calendarSaved,    setCalendarSaved]  = useState(false)
  const [addFeedOpen,    setAddFeedOpen]    = useState(false)
  const [newFeedSource,  setNewFeedSource]  = useState("")
  const [newFeedUrl,     setNewFeedUrl]     = useState("")
  const [newFeedCat,     setNewFeedCat]     = useState("celebrities")
  const [newsApiKeys,    setNewsApiKeys]    = useState({ gnews: "", guardian: "", newsdata: "" })
  const [selectedBannerIds, setSelectedBannerIds] = useState<string[]>([])
  const [bannerCrops,   setBannerCrops]   = useState<Record<string,string>>({})
  const [calendarRefreshing, setCalendarRefreshing] = useState(false)
  const [textOverlays,       setTextOverlays]       = useState<Record<string,{text:string;position:"top"|"center"|"bottom"}>>({})
  const [expandedBanner,     setExpandedBanner]     = useState<string|null>(null)
  const [cropAdjust, setCropAdjust] = useState<{
    photoId: string; dataUrl: string; isWide: boolean
    sw: number; sh: number; naturalW: number; naturalH: number
    yPct: number; xPct: number
  } | null>(null)

  /* ── Banner selection & reformat helpers ── */
  function toggleBannerSelection(photoId: string) {
    setSelectedBannerIds(prev => {
      const next = prev.includes(photoId) ? prev.filter(id => id !== photoId) : [...prev, photoId]
      localStorage.setItem("hp_general_banners_selected", JSON.stringify(next))
      window.dispatchEvent(new CustomEvent("hp-general-banner-updated"))
      return next
    })
  }


  function saveTextOverlay(photoId: string, text: string, position: "top"|"center"|"bottom") {
    const updated = { ...textOverlays, [photoId]: { text, position } }
    if (!text.trim()) delete updated[photoId]
    setTextOverlays(updated)
    localStorage.setItem("hp_banner_text_overlays", JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent("hp-general-banner-updated"))
  }

  function handleReformat(photo: { id: string; dataUrl: string }) {
    const img = new Image()
    img.onload = () => {
      const srcAspect = img.width / img.height
      const dstAspect = 1792 / 448
      const isWide = srcAspect > dstAspect
      const sw = isWide ? img.height * dstAspect : img.width
      const sh = isWide ? img.height : img.width / dstAspect
      // Default starting position: 8% from top for tall images (heads visible), center for wide
      const yPct = isWide ? 50 : 8
      const xPct = 50
      setCropAdjust({ photoId: photo.id, dataUrl: photo.dataUrl, isWide, sw, sh, naturalW: img.width, naturalH: img.height, yPct, xPct })
    }
    img.src = photo.dataUrl
  }

  async function applyManualCrop() {
    if (!cropAdjust) return
    const { photoId, dataUrl, isWide, sw, sh, naturalW, naturalH, yPct, xPct } = cropAdjust
    const canvas = document.createElement("canvas")
    canvas.width = 1792; canvas.height = 448
    const ctx = canvas.getContext("2d")!
    const img = new Image()
    await new Promise<void>(r => { img.onload = () => r(); img.src = dataUrl })
    const sx = isWide ? Math.max(0, Math.min(naturalW - sw, (naturalW - sw) * (xPct / 100))) : 0
    const sy = isWide ? 0 : Math.max(0, Math.min(naturalH - sh, (naturalH - sh) * (yPct / 100)))
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 1792, 448)
    const cropped = canvas.toDataURL("image/jpeg", 0.9)
    const existing = { ...bannerCrops, [photoId]: cropped }
    localStorage.setItem("hp_banner_crops", JSON.stringify(existing))
    setBannerCrops(existing)
    window.dispatchEvent(new CustomEvent("hp-general-banner-updated"))
    setCropAdjust(null)
  }

    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/share` : "/share"

  const loadChannels = useCallback(() => {
    setChannels(channelsStore.get() as SocialChannel[])
  }, [])

  const loadFeeds = useCallback(() => {
    setFeeds(feedsStore.get())
  }, [])

  useEffect(() => {
    if (open) {
      loadChannels()
      loadFeeds()
      setCalendarUrl(localStorage.getItem("hp_calendar_url") ?? "")
      try {
        const saved = JSON.parse(localStorage.getItem("hp_news_api_keys") ?? "{}")
        setNewsApiKeys({ gnews: saved.gnews ?? "", guardian: saved.guardian ?? "", newsdata: saved.newsdata ?? "" })
      } catch {}
      try { setSelectedBannerIds(JSON.parse(localStorage.getItem("hp_general_banners_selected") ?? "[]")) } catch {}
      try { setBannerCrops(JSON.parse(localStorage.getItem("hp_banner_crops") ?? "{}")) } catch {}
      try { setTextOverlays(JSON.parse(localStorage.getItem("hp_banner_text_overlays") ?? "{}")) } catch {}
    }
  }, [open, loadChannels, loadFeeds])

  const handleToggleFeed = (id: string, enabled: boolean) => {
    feedsStore.toggle(id, enabled)
    setFeeds(feedsStore.get())
  }

  const handleDeleteFeed = (id: string) => {
    feedsStore.remove(id)
    setFeeds(feedsStore.get())
  }

  const handleAddFeed = () => {
    if (!newFeedSource.trim() || !newFeedUrl.trim()) return
    feedsStore.add({ source: newFeedSource.trim(), url: newFeedUrl.trim(), category: newFeedCat, enabled: true })
    setFeeds(feedsStore.get())
    setNewFeedSource(""); setNewFeedUrl(""); setAddFeedOpen(false)
  }

  if (!open) return null

  const handleFiles = (files: File[]) => {
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = e => {
        if (e.target?.result) {
          onAddPhoto({ id: crypto.randomUUID(), name: file.name, dataUrl: e.target.result as string, uploadedAt: new Date().toISOString() })
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleAddEvent = () => {
    if (!newEvent.personName.trim()) return
    onAddEvent({
      id: crypto.randomUUID(),
      personName: newEvent.personName.trim(),
      eventType: newEvent.eventType,
      date: `${newEvent.month.padStart(2,"0")}-${newEvent.day.padStart(2,"0")}`,
      notes: newEvent.notes||undefined,
      headshotDataUrl: newEvent.headshotDataUrl || undefined,
    })
    setNewEvent({ personName:"", eventType:"birthday", month:"01", day:"01", notes:"", headshotDataUrl: null })
    setSavedIndicator(true)
    setTimeout(()=>setSavedIndicator(false), 2000)
  }

  const handleDeleteChannel = (c: SocialChannel) => {
    channelsStore.remove(c.id)
    setChannels(channelsStore.get() as SocialChannel[])
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(()=>setCopied(false), 2000)
  }

  const sortedEvents = [...familyEvents].sort((a,b)=>{
    const today = new Date()
    const toDate = (d:string) => { const [mm,dd]=d.split("-"); const dt=new Date(today.getFullYear(),parseInt(mm)-1,parseInt(dd)); if(dt<today)dt.setFullYear(today.getFullYear()+1); return dt.getTime() }
    return toDate(a.date)-toDate(b.date)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative z-10 w-[660px] max-h-[82vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-black text-gray-900 uppercase tracking-widest">Settings</h2>
            <p className="text-xs text-gray-400 mt-0.5">Personalize your HOME PAGE</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-gray-400 hover:text-gray-700 rounded-lg">
            <X className="h-4 w-4"/>
          </Button>
        </div>

        {/* ↓ KEY FIX: min-h-0 lets the flex child shrink so TabsContent overflow-y-auto works */}
        <div className="flex-1 min-h-0 flex flex-col">
          <Tabs defaultValue="social" className="flex-1 min-h-0 flex flex-col">
            <div className="px-6 pt-3 pb-0 border-b border-gray-100 shrink-0">
              <TabsList className="h-8 bg-gray-100 p-0.5 rounded-lg">
                <TabsTrigger value="news"    className="text-xs h-7 px-3 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">News Sources</TabsTrigger>
                <TabsTrigger value="social"  className="text-xs h-7 px-3 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Social Feeds</TabsTrigger>
                <TabsTrigger value="family"  className="text-xs h-7 px-3 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Family &amp; Events</TabsTrigger>
                <TabsTrigger value="general" className="text-xs h-7 px-3 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">General</TabsTrigger>
              </TabsList>
            </div>

            {/* ── News Sources tab ── */}
            <TabsContent value="news" className="flex-1 overflow-y-auto p-6 m-0 space-y-4" style={{ minHeight: 0 }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[13px] font-bold text-gray-800 uppercase tracking-wide">Highlight News Feed</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Toggle sources on/off or add your own RSS feed</p>
                </div>
                <button
                  onClick={() => setAddFeedOpen(v => !v)}
                  className={cn("flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors",
                    addFeedOpen ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200")}
                >
                  <Plus className="h-3.5 w-3.5" /> Add Source
                </button>
              </div>

              {addFeedOpen && (
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-2">
                  <Input value={newFeedSource} onChange={e => setNewFeedSource(e.target.value)} placeholder="Source name (e.g. Hypebeast)" className="h-8 text-xs" />
                  <Input value={newFeedUrl}    onChange={e => setNewFeedUrl(e.target.value)}    placeholder="RSS feed URL (e.g. https://hypebeast.com/feed)" className="h-8 text-xs" type="url" />
                  <div className="relative">
                    <select value={newFeedCat} onChange={e => setNewFeedCat(e.target.value)}
                      className="w-full h-8 text-xs border border-input rounded-md bg-background px-2 pr-6 appearance-none focus:outline-none focus:ring-1 focus:ring-gray-300">
                      <option value="celebrities">⭐ Celebrities</option>
                      <option value="industry">💼 Industry</option>
                      <option value="businesses">🏢 Businesses</option>
                      <option value="friends">🤝 Friends</option>
                      <option value="family">🏡 Family</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddFeed} disabled={!newFeedSource.trim() || !newFeedUrl.trim()} className="flex-1 h-8 text-xs">Add Feed</Button>
                    <Button variant="outline" onClick={() => setAddFeedOpen(false)} className="h-8 text-xs">Cancel</Button>
                  </div>
                </div>
              )}

              {(["celebrities","industry","businesses","friends","family"] as const).map(cat => {
                const catFeeds = feeds.filter(f => f.category === cat)
                if (!catFeeds.length) return null
                const catLabel: Record<string,string> = { celebrities:"⭐ Celebrities", industry:"💼 Industry", businesses:"🏢 Businesses", friends:"🤝 Friends", family:"🏡 Family" }
                return (
                  <div key={cat}>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{catLabel[cat]}</p>
                    <div className="space-y-1.5">
                      {catFeeds.map(f => (
                        <div key={f.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 group">
                          <Rss className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold text-gray-800 truncate">{f.source}</p>
                            <p className="text-[10px] text-gray-400 truncate">{f.url}</p>
                          </div>
                          <button
                            onClick={() => handleToggleFeed(f.id, !f.enabled)}
                            className={cn("relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors",
                              f.enabled ? "bg-gray-900" : "bg-gray-200")}
                          >
                            <span className={cn("pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform",
                              f.enabled ? "translate-x-4" : "translate-x-0")} />
                          </button>
                          <button onClick={() => handleDeleteFeed(f.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {feeds.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-8">No feeds yet — add one above</p>
              )}
            {/* ── News API Keys section ── */}
              <div className="mt-2 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-[13px] font-bold text-gray-800 uppercase tracking-wide">Free News APIs</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Connect free APIs to pull top stories with real images</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {/* GNews */}
                  <div className="border border-gray-100 rounded-xl p-3 bg-gray-50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-bold text-gray-700">🌐 GNews <span className="font-normal text-gray-400">(100 req/day free)</span></p>
                      <a href="https://gnews.io/register" target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-blue-500 hover:text-blue-700 underline">Get free key →</a>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={newsApiKeys.gnews}
                        onChange={e => setNewsApiKeys(k => ({ ...k, gnews: e.target.value }))}
                        placeholder="Paste your GNews API key"
                        className="h-7 text-xs flex-1"
                      />
                      <Button
                        size="sm"
                        className="h-7 text-xs px-3"
                        onClick={() => {
                          const updated = { ...newsApiKeys }
                          localStorage.setItem("hp_news_api_keys", JSON.stringify(updated))
                          window.dispatchEvent(new CustomEvent("hp-news-keys-updated"))
                        }}
                      >Save</Button>
                    </div>
                  </div>
                  {/* The Guardian */}
                  <div className="border border-gray-100 rounded-xl p-3 bg-gray-50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-bold text-gray-700">📰 The Guardian <span className="font-normal text-gray-400">(500 req/day free)</span></p>
                      <a href="https://bonobo.capi.gutools.co.uk/register/developer" target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-blue-500 hover:text-blue-700 underline">Get free key →</a>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={newsApiKeys.guardian}
                        onChange={e => setNewsApiKeys(k => ({ ...k, guardian: e.target.value }))}
                        placeholder="Paste your Guardian API key"
                        className="h-7 text-xs flex-1"
                      />
                      <Button
                        size="sm"
                        className="h-7 text-xs px-3"
                        onClick={() => {
                          const updated = { ...newsApiKeys }
                          localStorage.setItem("hp_news_api_keys", JSON.stringify(updated))
                          window.dispatchEvent(new CustomEvent("hp-news-keys-updated"))
                        }}
                      >Save</Button>
                    </div>
                  </div>
                  {/* NewsData.io */}
                  <div className="border border-gray-100 rounded-xl p-3 bg-gray-50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-bold text-gray-700">📡 NewsData.io <span className="font-normal text-gray-400">(200 req/day free)</span></p>
                      <a href="https://newsdata.io/register" target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-blue-500 hover:text-blue-700 underline">Get free key →</a>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={newsApiKeys.newsdata}
                        onChange={e => setNewsApiKeys(k => ({ ...k, newsdata: e.target.value }))}
                        placeholder="Paste your NewsData.io API key"
                        className="h-7 text-xs flex-1"
                      />
                      <Button
                        size="sm"
                        className="h-7 text-xs px-3"
                        onClick={() => {
                          const updated = { ...newsApiKeys }
                          localStorage.setItem("hp_news_api_keys", JSON.stringify(updated))
                          window.dispatchEvent(new CustomEvent("hp-news-keys-updated"))
                        }}
                      >Save</Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── Social Feeds tab ── */}
            <TabsContent value="social" className="flex-1 overflow-y-auto p-6 m-0 space-y-6" style={{ minHeight: 0 }}>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-gray-400"/>
                  <h3 className="text-[13px] font-bold text-gray-800 uppercase tracking-wide">Family &amp; Friends Wall</h3>
                </div>
                <div className="rounded-xl bg-gradient-to-r from-gray-900 to-gray-700 p-4">
                  <p className="text-xs font-bold text-white mb-1">📲 Your private share link</p>
                  <p className="text-[11px] text-gray-300 mb-3">Send this to family and friends — they tap it on their phone and post straight to your feed.</p>
                  <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                    <span className="text-[11px] text-white/80 flex-1 truncate font-mono">{shareUrl}</span>
                    <button onClick={handleCopy} className={cn("flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md transition-all",
                      copied ? "bg-emerald-500 text-white" : "bg-white text-gray-900 hover:bg-gray-100")}>
                      {copied ? <><CheckCheck className="h-3 w-3"/>Copied!</> : <><Copy className="h-3 w-3"/>Copy</>}
                    </button>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Plus className="h-4 w-4 text-gray-400"/>
                  <h3 className="text-[13px] font-bold text-gray-800 uppercase tracking-wide">Add a Social Feed</h3>
                </div>
                <AddChannelForm onAdded={c => setChannels(prev=>[...prev,c])}/>
              </section>

              {channels.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Rss className="h-4 w-4 text-gray-400"/>
                    <h3 className="text-[13px] font-bold text-gray-800 uppercase tracking-wide">Connected Feeds</h3>
                    <span className="text-[11px] text-gray-400">({channels.length})</span>
                  </div>
                  <div className="space-y-2">
                    {channels.map(c=>(
                      <ChannelRow key={c.id} channel={c} onDelete={()=>handleDeleteChannel(c)}/>
                    ))}
                  </div>
                </section>
              )}
            </TabsContent>

            {/* ── Family & Events tab ── */}
            <TabsContent value="family" className="flex-1 overflow-y-auto m-0 p-6 space-y-6" style={{ minHeight: 0 }}>
              <section>
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-gray-400"/>
                  <h3 className="text-[13px] font-bold text-gray-800 uppercase tracking-wide">General Banners</h3>
                  <span className="text-[11px] text-gray-400">({familyPhotos.length} uploaded · {selectedBannerIds.length} in rotation)</span>
                </div>
                <p className="text-[11px] text-gray-400 mb-3">Upload images to rotate into the top banner. Click <strong>Use</strong> to include in rotation, <strong>Reformat</strong> to auto-crop to banner proportions (4:1).</p>
                <UploadZone onFiles={handleFiles}/>
                {familyPhotos.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {familyPhotos.map(photo => {
                      const isSelected = selectedBannerIds.includes(photo.id)
                      const hasCrop    = !!bannerCrops[photo.id]
                      const preview    = bannerCrops[photo.id] ?? photo.dataUrl
                      return (
                        <div key={photo.id} className={cn("rounded-xl border-2 overflow-hidden transition-colors",
                          isSelected ? "border-[#B8960C]" : "border-gray-100")}>
                          {/* Banner preview strip — 4:1 aspect */}
                          <div className="relative w-full" style={{ paddingBottom: "25%" }}>
                            <img src={preview} alt={photo.name}
                              className="absolute inset-0 w-full h-full object-cover"/>
                            {isSelected && (
                              <div className="absolute top-1.5 left-1.5 bg-[#B8960C] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                                ✓ In Rotation
                              </div>
                            )}
                            {hasCrop && (
                              <div className="absolute top-1.5 right-1.5 bg-black/50 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                                Reformatted
                              </div>
                            )}
                          </div>
                          {/* Controls row */}
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white">
                            <p className="text-[11px] text-gray-600 truncate flex-1 font-medium">{photo.name}</p>
                            <button
                              onClick={() => toggleBannerSelection(photo.id)}
                              className={cn("h-6 px-2.5 text-[10px] font-bold rounded-md transition-colors",
                                isSelected
                                  ? "bg-[#B8960C]/10 text-[#B8960C] border border-[#B8960C]/40 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                  : "bg-gray-900 text-white hover:bg-gray-700")}
                            >
                              {isSelected ? "Remove" : "Use"}
                            </button>
                            <button
                              onClick={() => handleReformat(photo)}
                              className={cn("h-6 px-2.5 text-[10px] font-bold rounded-md transition-colors",
                                cropAdjust?.photoId === photo.id
                                  ? "bg-[#B8960C] text-white"
                                  : "bg-gray-100 text-gray-600 hover:bg-[#B8960C] hover:text-white")}
                              title="Adjust crop position (4:1 banner)"
                            >
                              <Sliders className="h-3 w-3 inline mr-1"/>
                              {hasCrop ? "Adjust" : "Crop"}
                            </button>
                            <button
                              onClick={() => setExpandedBanner(p => p === photo.id ? null : photo.id)}
                              className={cn("h-6 w-6 flex items-center justify-center rounded-md transition-colors",
                                expandedBanner === photo.id ? "bg-[#B8960C] text-white" : "bg-gray-100 text-gray-400 hover:text-[#B8960C]")}
                              title="Add text overlay"
                            >
                              <Type className="h-3 w-3"/>
                            </button>
                            <button
                              onClick={() => { onDeletePhoto(photo.id); setSelectedBannerIds(p => { const n = p.filter(id => id !== photo.id); localStorage.setItem("hp_general_banners_selected", JSON.stringify(n)); return n }) }}
                              className="h-6 w-6 flex items-center justify-center rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5"/>
                            </button>
                          </div>
                          {/* Crop adjuster — expands inline */}
                          {cropAdjust?.photoId === photo.id && (
                            <div className="px-2.5 pb-2.5">
                              <BannerCropAdjuster
                                adjust={cropAdjust}
                                onChange={(yPct, xPct) => setCropAdjust(p => p ? { ...p, yPct, xPct } : p)}
                                onApply={applyManualCrop}
                                onCancel={() => setCropAdjust(null)}
                              />
                            </div>
                          )}
                          {/* Text overlay editor — expands inline */}
                          {expandedBanner === photo.id && (
                            <BannerTextEditor
                              photoId={photo.id}
                              initial={textOverlays[photo.id]}
                              onSave={(text, position) => saveTextOverlay(photo.id, text, position)}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-gray-400"/>
                  <h3 className="text-[13px] font-bold text-gray-800 uppercase tracking-wide">Add Special Event / Birthday</h3>
                </div>
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] text-gray-500 font-bold uppercase tracking-wide mb-1 block">Person / Event Name</Label>
                      <Input placeholder="e.g. Mom, Dad…" value={newEvent.personName} onChange={e=>setNewEvent(v=>({...v,personName:e.target.value}))} className="h-8 text-sm border-gray-200 bg-white"/>
                    </div>
                    <div>
                      <Label className="text-[11px] text-gray-500 font-bold uppercase tracking-wide mb-1 block">Type</Label>
                      <Select value={newEvent.eventType} onValueChange={v=>setNewEvent(p=>({...p,eventType:v as EventType}))}>
                        <SelectTrigger className="h-8 text-sm border-gray-200 bg-white"><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="birthday">🎂 Birthday</SelectItem>
                          <SelectItem value="anniversary">💍 Anniversary</SelectItem>
                          <SelectItem value="holiday">🎉 Holiday</SelectItem>
                          <SelectItem value="custom">⭐ Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-[11px] text-gray-500 font-bold uppercase tracking-wide mb-1 block">Month</Label>
                      <Select value={newEvent.month} onValueChange={v=>setNewEvent(p=>({...p,month:v}))}>
                        <SelectTrigger className="h-8 text-sm border-gray-200 bg-white"><SelectValue/></SelectTrigger>
                        <SelectContent>{MONTHS.map((m,i)=><SelectItem key={m} value={String(i+1).padStart(2,"0")}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[11px] text-gray-500 font-bold uppercase tracking-wide mb-1 block">Day</Label>
                      <Select value={newEvent.day} onValueChange={v=>setNewEvent(p=>({...p,day:v}))}>
                        <SelectTrigger className="h-8 text-sm border-gray-200 bg-white"><SelectValue/></SelectTrigger>
                        <SelectContent>{DAYS.map(d=><SelectItem key={d} value={String(d).padStart(2,"0")}>{d}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[11px] text-gray-500 font-bold uppercase tracking-wide mb-1 block">Notes</Label>
                      <Input placeholder="optional" value={newEvent.notes} onChange={e=>setNewEvent(v=>({...v,notes:e.target.value}))} className="h-8 text-sm border-gray-200 bg-white"/>
                    </div>
                  </div>

                  {/* ── Headshot upload ── */}
                  <HeadshotUpload
                    value={newEvent.headshotDataUrl}
                    onChange={v => setNewEvent(p => ({ ...p, headshotDataUrl: v }))}
                  />

                  <Button onClick={handleAddEvent} disabled={!newEvent.personName.trim()}
                    className={cn("h-8 text-xs font-bold w-full gap-1.5", savedIndicator?"bg-green-600 hover:bg-green-700":"bg-gray-900 hover:bg-gray-700")}>
                    {savedIndicator?<><Check className="h-3.5 w-3.5"/>Added!</>:<><Star className="h-3.5 w-3.5"/>Add Event</>}
                  </Button>
                </div>
              </section>

              {sortedEvents.length>0&&(
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="h-4 w-4 text-amber-500"/>
                    <h3 className="text-[13px] font-bold text-gray-800 uppercase tracking-wide">Upcoming</h3>
                    <span className="text-[11px] text-gray-400">({sortedEvents.length})</span>
                  </div>
                  <div className="space-y-2">
                    {sortedEvents.map(event=><UpcomingEventRow key={event.id} event={event} onDelete={()=>onDeleteEvent(event.id)}/>)}
                  </div>
                </section>
              )}
            </TabsContent>

            {/* ── General tab ── */}
            <TabsContent value="general" className="flex-1 overflow-y-auto p-6 m-0 space-y-5" style={{ minHeight: 0 }}>
              <div>
                <Label className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 block">Your Name</Label>
                <Input
                  value={userName}
                  onChange={e => onNameChange?.(e.target.value)}
                  placeholder="e.g. David M. Robinson"
                  className="h-9 text-sm border-gray-200"
                />
                {userName && (
                  <p className="text-[11px] text-emerald-600 mt-1 font-medium">✓ Saved — personalizing your platform</p>
                )}
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 block">Default Feed Filter</Label>
                <Select defaultValue="all">
                  <SelectTrigger className="h-9 text-sm border-gray-200"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="celebrities">Stars Only</SelectItem>
                    <SelectItem value="businesses">Brands Only</SelectItem>
                    <SelectItem value="industry">Industry Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* ── Google Calendar integration ── */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-blue-500"/>
                  <h3 className="text-[13px] font-bold text-gray-800 uppercase tracking-wide">Google Calendar Feed</h3>
                  {calendarUrl && <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">Connected</span>}
                </div>
                <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 space-y-3">
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    Paste your Google Calendar private iCal link — events within the next 7 days will appear automatically in your Friends &amp; Family feed.
                  </p>
                  <div className="bg-white rounded-lg border border-blue-200 p-3 space-y-1.5">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">How to get your link:</p>
                    <ol className="text-[11px] text-gray-600 space-y-1 list-decimal list-inside">
                      <li>Open <span className="font-semibold">calendar.google.com</span></li>
                      <li>Click ⚙️ Settings → your calendar name</li>
                      <li>Scroll to <span className="font-semibold">&quot;Secret address in iCal format&quot;</span></li>
                      <li>Copy and paste that link below</li>
                    </ol>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={calendarUrl}
                      onChange={e => { setCalendarUrl(e.target.value); setCalendarSaved(false) }}
                      placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
                      className="flex-1 text-xs border border-blue-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 placeholder:text-gray-300 font-mono"
                    />
                    <button
                      onClick={() => {
                        localStorage.setItem("hp_calendar_url", calendarUrl.trim())
                        window.dispatchEvent(new CustomEvent("hp-calendar-updated", { detail: { url: calendarUrl.trim() } }))
                        setCalendarSaved(true)
                        setTimeout(() => setCalendarSaved(false), 2500)
                      }}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      {calendarSaved ? "✓ Saved" : "Save"}
                    </button>
                    {calendarUrl && (
                      <button
                        onClick={async () => {
                          setCalendarRefreshing(true)
                          window.dispatchEvent(new CustomEvent("hp-calendar-updated", { detail: { url: calendarUrl.trim() } }))
                          setTimeout(() => setCalendarRefreshing(false), 3000)
                        }}
                        disabled={calendarRefreshing}
                        className="px-3 py-2 rounded-lg border border-blue-200 bg-white text-blue-600 text-xs font-bold hover:bg-blue-50 transition-colors flex items-center gap-1 disabled:opacity-50"
                        title="Force re-fetch calendar — picks up newly added images"
                      >
                        <RefreshCw className={cn("h-3.5 w-3.5", calendarRefreshing && "animate-spin")}/>
                        {calendarRefreshing ? "Refreshing…" : "Refresh"}
                      </button>
                    )}
                    {calendarUrl && (
                      <button
                        onClick={() => {
                          setCalendarUrl("")
                          localStorage.removeItem("hp_calendar_url")
                          window.dispatchEvent(new CustomEvent("hp-calendar-updated", { detail: { url: "" } }))
                        }}
                        className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </section>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
