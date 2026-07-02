"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import { Bookmark, Grid3X3 } from "lucide-react"
import { TopBar } from "@/components/top-bar"
import { NewsTicker } from "@/components/news-ticker"
import { AppLauncher } from "@/components/app-launcher"
import { NewsFeed } from "@/components/news-feed"
import { SettingsModal } from "@/components/settings-modal"
import type { FamilyPhoto, FamilyEvent } from "@/types"

/* ── Persistence keys ─────────────────────────── */
const EVENTS_KEY    = "hp_family_events"
const PHOTOS_KEY    = "hp_family_photos"
const USER_NAME_KEY = "hp_user_name"

function loadUserName(): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem(USER_NAME_KEY) ?? ""
}

const DEFAULT_EVENTS: FamilyEvent[] = [
  { id: "evt-1", personName: "Mom",                eventType: "birthday",     date: "06-28", notes: "Don't forget the cake!" },
  { id: "evt-2", personName: "Dad",                eventType: "birthday",     date: "08-14" },
  { id: "evt-3", personName: "Wedding Anniversary",eventType: "anniversary",  date: "09-21", notes: "10 years!" },
]

function loadEvents(): FamilyEvent[] {
  if (typeof window === "undefined") return DEFAULT_EVENTS
  try {
    const raw = localStorage.getItem(EVENTS_KEY)
    if (raw) { const parsed = JSON.parse(raw); if (Array.isArray(parsed) && parsed.length > 0) return parsed }
  } catch {}
  return DEFAULT_EVENTS
}
function loadPhotos(): FamilyPhoto[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(PHOTOS_KEY)
    if (raw) { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) return parsed }
  } catch {}
  return []
}

export default function HomePage() {
  const [settingsOpen,         setSettingsOpen]         = useState(false)
  const [mobileBookmarksOpen,  setMobileBookmarksOpen]  = useState(false)

  const [familyPhotos, setFamilyPhotos] = useState<FamilyPhoto[]>([])
  const [familyEvents, setFamilyEvents] = useState<FamilyEvent[]>([])
  const [hydrated,     setHydrated]     = useState(false)
  const [userName,     setUserName]     = useState("")

  useEffect(() => {
    setFamilyPhotos(loadPhotos())
    setFamilyEvents(loadEvents())
    setUserName(loadUserName())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(USER_NAME_KEY, userName)
  }, [userName, hydrated])

  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(EVENTS_KEY, JSON.stringify(familyEvents)) } catch {}
  }, [familyEvents, hydrated])

  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(PHOTOS_KEY, JSON.stringify(familyPhotos)) } catch {}
  }, [familyPhotos, hydrated])

  const handleAddPhoto    = (photo: FamilyPhoto) => setFamilyPhotos(prev => [...prev, photo])
  const handleDelPhoto    = (id: string)         => setFamilyPhotos(prev => prev.filter(p => p.id !== id))
  const handleAddEvent    = (event: FamilyEvent) => setFamilyEvents(prev => [...prev, event])
  const handleDelEvent    = (id: string)         => setFamilyEvents(prev => prev.filter(e => e.id !== id))
  const handleUpdateEvent = (updated: FamilyEvent) =>
    setFamilyEvents(prev => prev.map(e => e.id === updated.id ? updated : e))

  return (
    <div className="flex flex-col min-h-[100dvh] md:h-[100dvh] md:overflow-hidden bg-white">

      <TopBar
        onSettingsClick={() => setSettingsOpen(true)}
        events={hydrated ? familyEvents : []}
        userName={userName}
        ticker={<NewsTicker />}
      />

      <div className="hidden md:block shrink-0"><NewsTicker /></div>

      <div className="flex flex-1 min-w-0 md:overflow-hidden">
        {/* Bookmarks sidebar */}
        <div className={`
          fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0 md:z-auto md:inset-auto
          ${mobileBookmarksOpen ? "translate-x-0" : "-translate-x-full"}
        `}>
          <AppLauncher onClose={() => setMobileBookmarksOpen(false)} />
        </div>

        {mobileBookmarksOpen && (
          <div className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setMobileBookmarksOpen(false)} />
        )}

        <NewsFeed events={hydrated ? familyEvents : []} />
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 flex items-center justify-around px-6 py-2 safe-area-bottom">
        <button onClick={() => setMobileBookmarksOpen(v => !v)}
          className="flex flex-col items-center gap-0.5 py-1 px-3">
          <Bookmark className={`h-5 w-5 ${mobileBookmarksOpen ? "fill-[#B8960C] text-[#B8960C]" : "text-gray-400"}`} />
          <span className={`text-[9px] font-bold uppercase tracking-wider ${mobileBookmarksOpen ? "text-[#B8960C]" : "text-gray-400"}`}>Bookmarks</span>
        </button>
        <button onClick={() => setSettingsOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-3">
          <Grid3X3 className="h-5 w-5 text-gray-400" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Settings</span>
        </button>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        familyPhotos={familyPhotos}
        familyEvents={familyEvents}
        onAddPhoto={handleAddPhoto}
        onDeletePhoto={handleDelPhoto}
        onAddEvent={handleAddEvent}
        onDeleteEvent={handleDelEvent}
        onUpdateEvent={handleUpdateEvent}
        userName={userName}
        onNameChange={setUserName}
      />
    </div>
  )
}
