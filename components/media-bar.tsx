"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Music, ExternalLink, ChevronDown, ChevronUp, Settings2, X,
         Tv2, Radio, Youtube, Maximize2, Minimize2 } from "lucide-react"
import { feedCache, type CachedItem } from "@/lib/feed-cache"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

/* ─── Types ──────────────────────────────────── */
type MediaSource = "spotify" | "youtube" | "custom" | "hub"

interface MediaConfig {
  source: MediaSource
  url: string
  label: string
}

const STORAGE_KEY = "hp_media_bar_config"

/* ─── Streaming service quick-launch tiles ───── */
const STREAMING_SERVICES = [
  { id: "tubi",        label: "Tubi",         emoji: "📺", url: "https://tubitv.com",               color: "#fa4616", canEmbed: false },
  { id: "youtube",     label: "YouTube",      emoji: "▶️", url: "https://youtube.com",              color: "#FF0000", canEmbed: false },
  { id: "spotify",     label: "Spotify",      emoji: "🎵", url: "https://open.spotify.com",         color: "#1DB954", canEmbed: true  },
  { id: "pluto",       label: "Pluto TV",     emoji: "🪐", url: "https://pluto.tv",                 color: "#19b8e8", canEmbed: false },
  { id: "netflix",     label: "Netflix",      emoji: "🎬", url: "https://netflix.com",              color: "#E50914", canEmbed: false },
  { id: "hulu",        label: "Hulu",         emoji: "🟩", url: "https://hulu.com",                 color: "#1CE783", canEmbed: false },
  { id: "hbo",         label: "Max",          emoji: "🔵", url: "https://max.com",                  color: "#002BE7", canEmbed: false },
  { id: "prime",       label: "Prime",        emoji: "📦", url: "https://primevideo.com",           color: "#00A8E1", canEmbed: false },
  { id: "starz",       label: "Starz",        emoji: "⭐", url: "https://starz.com",               color: "#000000", canEmbed: false },
  { id: "apple",       label: "Apple TV+",    emoji: "🍎", url: "https://tv.apple.com",            color: "#555555", canEmbed: false },
  { id: "appmusic",    label: "Apple Music",  emoji: "🎶", url: "https://music.apple.com",          color: "#FC3C44", canEmbed: false },
  { id: "ytmusic",     label: "YT Music",     emoji: "🎵", url: "https://music.youtube.com",        color: "#FF0000", canEmbed: false },
]

/* ─── Default Spotify top-hits embed ─────────── */
const DEFAULT_SPOTIFY = "https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator&theme=0"
const DEFAULT_YOUTUBE = "https://www.youtube-nocookie.com/embed/videoseries?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI"

function loadConfig(): MediaConfig {
  if (typeof window === "undefined") return { source: "hub", url: "", label: "" }
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")
    if (saved?.source) return saved
  } catch {}
  return { source: "hub", url: "", label: "Streaming Hub" }
}

function ago(m: number) {
  if (m < 1)  return "Just now"
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h`
}

/* ─── Media source config form ───────────────── */
function MediaConfig({ current, onSave, onClose }: {
  current: MediaConfig
  onSave: (c: MediaConfig) => void
  onClose: () => void
}) {
  const [source, setSource] = useState<MediaSource>(current.source)
  const [url,    setUrl]    = useState(current.url)

  const hints: Record<MediaSource, string> = {
    spotify: "Paste a Spotify playlist/album URL — e.g. open.spotify.com/playlist/...",
    youtube: "Paste a YouTube playlist URL — e.g. youtube.com/playlist?list=...",
    custom:  "Any embeddable URL (must support iframe embedding)",
    hub:     "Shows quick-launch tiles for all your streaming services",
  }

  function handleSave() {
    let embedUrl = url.trim()
    if (source === "spotify") {
      // Convert regular Spotify URL to embed URL
      embedUrl = embedUrl.replace("open.spotify.com/", "open.spotify.com/embed/")
      if (!embedUrl.includes("embed")) embedUrl = DEFAULT_SPOTIFY
      if (!embedUrl.includes("utm_source")) embedUrl += "?utm_source=generator&theme=0"
    } else if (source === "youtube") {
      // Convert YouTube playlist URL to embed
      const listMatch = embedUrl.match(/[?&]list=([^&]+)/)
      if (listMatch) embedUrl = `https://www.youtube-nocookie.com/embed/videoseries?list=${listMatch[1]}`
      else if (!embedUrl.includes("youtube-nocookie")) embedUrl = DEFAULT_YOUTUBE
    }
    onSave({ source, url: embedUrl || (source === "spotify" ? DEFAULT_SPOTIFY : DEFAULT_YOUTUBE), label: source })
    onClose()
  }

  return (
    <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-b-xl shadow-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-black uppercase tracking-widest text-gray-700">Media Player Source</span>
        <button onClick={onClose}><X className="h-4 w-4 text-gray-400 hover:text-gray-700" /></button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {(["hub","spotify","youtube","custom"] as MediaSource[]).map(s => (
          <button key={s} onClick={() => setSource(s)}
            className={cn("flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all",
              source === s ? "border-[#B8960C] bg-amber-50 text-[#B8960C]" : "border-gray-200 text-gray-500 hover:border-gray-300")}>
            <span className="text-lg">{s === "hub" ? "📺" : s === "spotify" ? "🎵" : s === "youtube" ? "▶️" : "🔗"}</span>
            <span className="text-[10px] font-bold capitalize">{s === "hub" ? "Launch Hub" : s}</span>
          </button>
        ))}
      </div>

      {source !== "hub" && (
        <div>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder={source === "spotify" ? "open.spotify.com/playlist/..." : source === "youtube" ? "youtube.com/playlist?list=..." : "https://..."}
            className="w-full h-8 text-xs px-3 border border-gray-200 rounded-lg outline-none focus:border-[#B8960C]"
          />
          <p className="text-[10px] text-gray-400 mt-1">{hints[source]}</p>
        </div>
      )}

      <button onClick={handleSave}
        className="w-full h-8 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-700 transition-colors">
        Apply
      </button>
    </div>
  )
}

/* ─── Main component ─────────────────────────── */
export function MediaBar() {
  const [config,       setConfig]       = useState<MediaConfig>({ source: "hub", url: "", label: "" })
  const [showConfig,   setShowConfig]   = useState(false)
  const [collapsed,    setCollapsed]    = useState(false)
  const [headlines,    setHeadlines]    = useState<CachedItem[]>([])
  const [expanded,     setExpanded]     = useState(false) // full-width expand

  useEffect(() => {
    setConfig(loadConfig())
  }, [])

  // Poll feed cache every 10s for fresh headlines
  useEffect(() => {
    const refresh = () => {
      const items = feedCache.get()
      if (items.length) setHeadlines(items.slice(0, 5))
    }
    refresh()
    const id = setInterval(refresh, 10000)
    return () => clearInterval(id)
  }, [])

  function saveConfig(c: MediaConfig) {
    setConfig(c)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c))
  }

  if (collapsed) {
    return (
      <div className="bg-white border-b border-gray-100 flex items-center justify-between px-5 py-1.5 shrink-0">
        <div className="flex items-center gap-2">
          <Tv2 className="h-3.5 w-3.5 text-[#B8960C]" />
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Media</span>
        </div>
        <button onClick={() => setCollapsed(false)} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-700">
          <ChevronDown className="h-3.5 w-3.5" /> Show
        </button>
      </div>
    )
  }

  return (
    <div className={cn(
      "bg-white border-b border-gray-100 shrink-0 relative transition-all duration-300",
      expanded ? "fixed inset-0 z-50 flex flex-col" : "hidden md:flex"
    )}>
      <div className={cn("flex gap-0", expanded ? "flex-1 overflow-hidden" : "h-[148px]")}>

        {/* ── LEFT: Embedded media player ─────── */}
        <div className={cn(
          "relative bg-gray-950 flex flex-col overflow-hidden shrink-0",
          expanded ? "flex-1" : "w-[380px] xl:w-[440px]"
        )}>
          {config.source === "hub" ? (
            /* Streaming hub: quick-launch tiles */
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-3 pt-2 pb-1 shrink-0">
                <Tv2 className="h-3.5 w-3.5 text-[#B8960C]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Streaming Hub</span>
                <span className="text-[9px] text-white/30 ml-auto">Click to launch</span>
              </div>
              <div className="flex-1 overflow-x-auto scrollbar-none px-3 pb-2">
                <div className="flex gap-2 h-full items-center" style={{ minWidth: "max-content" }}>
                  {STREAMING_SERVICES.map(svc => (
                    <button
                      key={svc.id}
                      onClick={() => window.open(svc.url, "_blank", "noopener,noreferrer")}
                      className="flex flex-col items-center justify-center gap-1 w-16 h-16 rounded-xl border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all group shrink-0"
                    >
                      <span className="text-xl group-hover:scale-110 transition-transform">{svc.emoji}</span>
                      <span className="text-[9px] text-white/50 group-hover:text-white/80 font-semibold leading-tight text-center truncate w-full px-1">
                        {svc.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : config.source === "spotify" ? (
            <iframe
              src={config.url || DEFAULT_SPOTIFY}
              className="w-full h-full border-0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Spotify Player"
            />
          ) : (config.source === "youtube" || config.source === "custom") ? (
            <iframe
              src={config.url || DEFAULT_YOUTUBE}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              title="Video Player"
            />
          ) : null}

          {/* Config button overlay */}
          <button
            onClick={() => setShowConfig(v => !v)}
            className="absolute top-2 right-2 w-6 h-6 rounded-md bg-black/50 hover:bg-black/70 flex items-center justify-center text-white/60 hover:text-white transition-all z-10"
            title="Configure media source"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-px bg-gray-100 shrink-0" />

        {/* ── RIGHT: Today's top stories ──────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-2 pb-1.5 border-b border-gray-50 shrink-0">
            <div className="flex items-center gap-2">
              <Radio className="h-3.5 w-3.5 text-[#B8960C]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">Today&apos;s Stories</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setExpanded(v => !v)}
                className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title={expanded ? "Restore" : "Expand"}
              >
                {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => setCollapsed(true)}
                className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Collapse"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {headlines.length > 0 ? (
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {headlines.map(item => (
                <a
                  key={item.id}
                  href={item.link || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 px-4 py-2 hover:bg-gray-50 transition-colors group"
                >
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover shrink-0 bg-gray-100"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-gray-800 line-clamp-2 leading-snug group-hover:text-gray-900">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-gray-400 truncate">{item.source}</span>
                      <span className="text-gray-300 text-[10px]">·</span>
                      <span className="text-[10px] text-gray-400">{ago(item.minutesAgo)}</span>
                    </div>
                  </div>
                  <ExternalLink className="h-3 w-3 text-gray-300 group-hover:text-gray-500 shrink-0 mt-1" />
                </a>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-[11px] text-gray-300 font-medium">Stories load when the feed refreshes</p>
                <p className="text-[10px] text-gray-200 mt-0.5">Usually within a few seconds</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Config dropdown */}
      {showConfig && (
        <MediaConfig
          current={config}
          onSave={saveConfig}
          onClose={() => setShowConfig(false)}
        />
      )}

      {/* Expanded backdrop */}
      {expanded && (
        <button
          className="absolute inset-0 bg-black/50 -z-10"
          onClick={() => setExpanded(false)}
        />
      )}
    </div>
  )
}
