"use client"

import { useState, useEffect } from "react"
import { feedsStore, channelsStore } from "@/lib/local-store"

interface TickerItem {
  text: string
  link?: string
}

const FALLBACK: TickerItem[] = [
  { text: "DMR Beehiive Season 21 Casting Call OPEN — 200+ Registrations in Hour One" },
  { text: "Paris Fashion Week Fall 2026 Confirmed — 3 Debutante Houses Joining the Lineup" },
  { text: "Rihanna Spotted at Paris Fenty Showroom — New Collection Imminent" },
  { text: "Naomi Campbell: Fashion for Relief NYC Gala Confirmed for December" },
  { text: "WWD: Quiet Luxury Is Dead — Bold Maximalism Dominates 2026 Runway Season" },
]

export function NewsTicker() {
  const [items, setItems] = useState<TickerItem[]>(FALLBACK)

  useEffect(() => {
    const feeds    = feedsStore.get()
    const channels = channelsStore.get()
    const url = `/api/news?feeds=${encodeURIComponent(JSON.stringify(feeds))}&channels=${encodeURIComponent(JSON.stringify(channels))}`

    fetch(url, { cache: "no-store" })
      .then(r => r.json())
      .then((data: { items?: { update?: string; link?: string }[] }) => {
        const alerts = data.items ?? []
        if (alerts.length === 0) return
        setItems(
          alerts
            .filter(a => a.update)
            .slice(0, 20)
            .map(a => ({ text: a.update ?? "", link: a.link ?? undefined }))
        )
      })
      .catch(() => {/* keep fallback */})
  }, [])

  return (
    <div className="h-8 bg-gray-950 text-white flex items-center shrink-0 overflow-hidden border-b border-gray-800">
      {/* Label */}
      <div className="h-full flex items-center px-4 shrink-0 gap-1.5 text-[11px] font-black uppercase tracking-widest whitespace-nowrap z-10" style={{background:"#B8960C", color:"#000"}}>
        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        BREAKING
      </div>

      {/* Scrolling track */}
      <div className="flex-1 min-w-0 overflow-hidden h-full flex items-center">
        <div className="marquee-track">
          {[0, 1].map(copy => (
            <span key={copy} className="whitespace-nowrap pl-8 pr-4 inline-flex items-center gap-0">
              {items.map((item, i) => (
                <span key={i} className="inline-flex items-center">
                  {item.link ? (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-gray-200 tracking-wide hover:text-white hover:underline underline-offset-2 transition-colors cursor-pointer"
                      onClick={e => e.stopPropagation()}
                    >
                      {item.text}
                    </a>
                  ) : (
                    <span className="text-[12px] text-gray-200 tracking-wide">{item.text}</span>
                  )}
                  {i < items.length - 1 && (
                    <span className="text-gray-600 mx-6 select-none">·</span>
                  )}
                </span>
              ))}
              <span className="pr-12" />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
