"use client"

import { useState } from "react"
import { X, ExternalLink, ChevronDown, ChevronUp, RefreshCw, AlertCircle, Globe, Minimize2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface OpenedSite {
  id: string
  url: string
  name: string
  emoji: string
}

const EMBED_BLOCKED = [
  "google.com","gmail.com","youtube.com","instagram.com","facebook.com",
  "twitter.com","x.com","linkedin.com","netflix.com","tiktok.com",
  "spotify.com","disneyplus.com","tv.apple.com","slack.com","zoom.us",
  "chatgpt.com","claude.ai","gemini.google.com","midjourney.com","perplexity.ai",
  "notion.so","drive.google.com","calendar.google.com","mail.google.com",
  "hotmail.com","outlook.com","live.com","yahoo.com",
  "music.apple.com","music.youtube.com","hulu.com","hbo.com","max.com",
  "primevideo.com","amazon.com","xfinity.com","starz.com",
]

function canEmbed(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "")
    return !EMBED_BLOCKED.some(d => host === d || host.endsWith("." + d))
  } catch { return true }
}

function faviconUrl(url: string): string {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32` } catch { return "" }
}

function SitePanel({ site, onClose }: { site: OpenedSite; onClose: () => void }) {
  const [collapsed, setCollapsed] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const blocked = !canEmbed(site.url)
  const favicon = faviconUrl(site.url)

  return (
    <div className="flex flex-col border-b border-gray-100 last:border-0">
      {/* Panel header */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 transition-colors shrink-0 cursor-pointer",
        "bg-gray-50 hover:bg-gray-100"
      )}>
        <div className="w-5 h-5 rounded shrink-0 flex items-center justify-center overflow-hidden bg-white border border-gray-100">
          {favicon
            ? <img src={favicon} alt="" className="w-4 h-4 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
            : <span className="text-[11px]">{site.emoji}</span>
          }
        </div>
        <button onClick={() => setCollapsed(v => !v)} className="flex-1 text-left min-w-0 py-0.5">
          <span className="text-[12px] font-semibold text-gray-800 truncate block leading-tight">{site.name}</span>
        </button>
        <div className="flex items-center gap-0.5 shrink-0">
          {!blocked && (
            <button
              onClick={() => { setLoading(true); setRefreshKey(k => k + 1) }}
              className="p-1 rounded hover:bg-white text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={() => window.open(site.url, "_blank", "noopener,noreferrer")}
            className="p-1 rounded hover:bg-white text-gray-400 hover:text-gray-600 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="h-3 w-3" />
          </button>
          <button
            onClick={() => setCollapsed(v => !v)}
            className="p-1 rounded hover:bg-white text-gray-400 transition-colors"
          >
            {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            title="Close"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="h-[260px] relative bg-gray-50 shrink-0">
          {blocked ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
              <span className="text-3xl">{site.emoji}</span>
              <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full text-xs font-medium border border-amber-200">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {site.name} blocks embedding
              </div>
              <button
                onClick={() => window.open(site.url, "_blank", "noopener,noreferrer")}
                className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-gray-700 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open {site.name}
              </button>
              <p className="text-[10px] text-gray-400">Your browser login session stays active</p>
            </div>
          ) : (
            <>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-gray-300 animate-spin" />
                    <span className="text-[11px] text-gray-400">Loading {site.name}…</span>
                  </div>
                </div>
              )}
              <iframe
                key={refreshKey}
                src={site.url}
                className="w-full h-full border-0"
                onLoad={() => setLoading(false)}
                onError={() => setLoading(false)}
                title={site.name}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}

interface BrowserColumnProps {
  items: OpenedSite[]
  onClose: (id: string) => void
  onCloseAll: () => void
}

export function BrowserColumn({ items, onClose, onCloseAll }: BrowserColumnProps) {
  if (items.length === 0) return null

  return (
    <div className="hidden md:flex w-[340px] shrink-0 flex-col border-r border-gray-100 bg-white overflow-hidden">
      {/* Column header */}
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-[#B8960C]" />
          <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#B8960C]">Browser</span>
          <span className="text-[10px] text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>
        <button
          onClick={onCloseAll}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-700 font-semibold transition-colors"
        >
          <Minimize2 className="h-2.5 w-2.5" />
          Close all
        </button>
      </div>

      {/* Gold rule */}
      <div className="h-px bg-gradient-to-r from-[#B8960C]/60 via-[#D4AF37]/40 to-transparent shrink-0" />

      {/* Stacked panels — newest on top */}
      <div className="flex-1 overflow-y-auto">
        {[...items].reverse().map(site => (
          <SitePanel key={site.id} site={site} onClose={() => onClose(site.id)} />
        ))}
      </div>
    </div>
  )
}
