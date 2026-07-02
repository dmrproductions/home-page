"use client"

import { useState, useRef, useEffect } from "react"
import { X, ExternalLink, RefreshCw, AlertCircle, Maximize2, Minimize2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface BrowserDrawerProps {
  url: string
  title: string
  emoji: string
  onClose: () => void
}

// Sites known to block iframes — open new tab immediately
const BLOCKED_DOMAINS = [
  "google.com","gmail.com","youtube.com","instagram.com","facebook.com",
  "twitter.com","x.com","linkedin.com","netflix.com","tiktok.com",
  "spotify.com","disneyplus.com","tv.apple.com","slack.com","zoom.us",
  "chatgpt.com","claude.ai","gemini.google.com","midjourney.com","perplexity.ai",
  "notion.so","drive.google.com","calendar.google.com","mail.google.com",
]

function isDomainBlocked(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "")
    return BLOCKED_DOMAINS.some(d => host === d || host.endsWith("." + d))
  } catch { return false }
}

export function BrowserDrawer({ url, title, emoji, onClose }: BrowserDrawerProps) {
  const [loading,    setLoading]    = useState(true)
  const [blocked,    setBlocked]    = useState(false)
  const [maximized,  setMaximized]  = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const isBlocked = isDomainBlocked(url) || url === "#"

  useEffect(() => {
    if (isBlocked) { setLoading(false); setBlocked(true) }
  }, [isBlocked])

  // Detect load errors via timeout (CSP blocks don't fire onerror)
  useEffect(() => {
    if (isBlocked) return
    const timer = setTimeout(() => {
      // If iframe is still "loading" after 8s, likely blocked
      if (loading) setBlocked(true)
    }, 8000)
    return () => clearTimeout(timer)
  }, [loading, isBlocked, refreshKey])

  function openExternal() {
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <div className={cn(
      "fixed z-50 bg-white shadow-2xl border border-gray-200 flex flex-col transition-all duration-300",
      maximized
        ? "inset-0 rounded-none"
        : "bottom-0 left-0 md:left-56 right-0 h-[72vh] rounded-t-xl"
    )}>
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200 bg-gray-50 rounded-t-xl shrink-0">
        <span className="text-base">{emoji}</span>
        <span className="text-[13px] font-semibold text-gray-800 flex-1 truncate">{title}</span>
        <span className="text-[11px] text-gray-400 truncate max-w-[200px] hidden sm:block">{url}</span>

        <div className="flex items-center gap-1 ml-2">
          {/* Refresh */}
          {!isBlocked && (
            <button
              onClick={() => { setLoading(true); setBlocked(false); setRefreshKey(k => k + 1) }}
              className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
          {/* Open in new tab */}
          <button
            onClick={openExternal}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
          {/* Maximize */}
          <button
            onClick={() => setMaximized(v => !v)}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
            title={maximized ? "Restore" : "Maximize"}
          >
            {maximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden bg-gray-100">
        {blocked ? (
          /* Blocked / not embeddable */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="text-5xl">{emoji}</div>
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-full text-sm font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {title} doesn't allow embedding for security reasons
            </div>
            <p className="text-sm text-gray-500 max-w-sm">
              Most major platforms (Google, Meta, Apple, etc.) block being opened inside other websites.
              Your login session is still saved — just click below to open it.
            </p>
            <button
              onClick={openExternal}
              className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Open {title} in new tab
            </button>
            <p className="text-[11px] text-gray-400">Your browser remembers your login — it will open already signed in.</p>
          </div>
        ) : (
          <>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
                  <span className="text-sm text-gray-500">Loading {title}…</span>
                </div>
              </div>
            )}
            <iframe
              key={refreshKey}
              ref={iframeRef}
              src={url}
              className="w-full h-full border-0"
              onLoad={() => setLoading(false)}
              onError={() => { setLoading(false); setBlocked(true) }}
              title={title}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
            />
          </>
        )}
      </div>
    </div>
  )
}
