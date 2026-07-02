"use client"

import { useState, useEffect } from "react"
import { followsStore, type SavedFollow } from "@/lib/local-store"
import { Plus, Radio, Search, Users, ExternalLink, X, ChevronDown, LinkIcon, Newspaper } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DEFAULT_FOLLOWS } from "@/lib/data"
import type { FollowedPerson, FollowCategory } from "@/types"
import { cn } from "@/lib/utils"

const TABS: { key: FollowCategory | "all"; label: string; emoji: string }[] = [
  { key: "all",         label: "All",      emoji: "👥" },
  { key: "celebrities", label: "Stars",    emoji: "⭐" },
  { key: "businesses",  label: "Brands",   emoji: "🏢" },
  { key: "industry",    label: "Industry", emoji: "💼" },
  { key: "friends",     label: "Friends",  emoji: "🤝" },
  { key: "family",      label: "Family",   emoji: "🏡" },
]

const CATEGORIES: { value: string; label: string }[] = [
  { value: "celebrities", label: "⭐ Stars / Celebrities" },
  { value: "businesses",  label: "🏢 Brands / Businesses" },
  { value: "industry",    label: "💼 Industry" },
  { value: "friends",     label: "🤝 Friends" },
  { value: "family",      label: "🏡 Family" },
]

const PLATFORMS = ["Instagram","Twitter/X","TikTok","YouTube","LinkedIn","Facebook","Website","Other"]

const PLATFORM_COLORS: Record<string, string> = {
  Instagram:   "bg-pink-50 text-pink-600",
  "Twitter/X": "bg-sky-50 text-sky-600",
  Twitter:     "bg-sky-50 text-sky-600",
  X:           "bg-sky-50 text-sky-600",
  TikTok:      "bg-gray-100 text-gray-700",
  YouTube:     "bg-red-50 text-red-600",
  LinkedIn:    "bg-blue-50 text-blue-700",
  Facebook:    "bg-blue-50 text-blue-800",
  default:     "bg-gray-100 text-gray-600",
}

function getPlatformStyle(p: string) {
  return PLATFORM_COLORS[p] ?? PLATFORM_COLORS.default
}

function timeAgo(mins: number): string {
  if (mins === 0) return "Just now"
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`
}

/* ─── URL handle extractor ─────────────────────────────── */
function extractHandleFromUrl(url: string): string {
  try {
    const normalized = url.startsWith("http") ? url : `https://${url}`
    const u = new URL(normalized)
    const hostname = u.hostname.replace(/^www\./, "")
    const parts = u.pathname.replace(/^\//, "").split("/").filter(Boolean)

    // Known social platforms — extract username/handle from path
    const socialPatterns: Record<string, number> = {
      "instagram.com":  0,  // instagram.com/username
      "twitter.com":    0,  // twitter.com/username
      "x.com":          0,  // x.com/username
      "tiktok.com":     0,  // tiktok.com/@username
      "facebook.com":   0,  // facebook.com/pagename
      "youtube.com":    0,  // youtube.com/@ChannelName
    }
    const linkedinMatch = hostname === "linkedin.com" && parts[0] === "in"

    if (hostname in socialPatterns && parts.length > 0) {
      const handle = parts[0].replace(/^@/, "")
      return handle
    }
    if (linkedinMatch && parts.length > 1) {
      return parts[1]
    }

    // Brand/personal website — use the domain name itself
    const domainName = hostname.split(".")[0]
    return domainName || ""
  } catch {
    return ""
  }
}

/* ─── Add-person form ──────────────────────────────── */
interface AddFormProps {
  onAdd: (entry: { name: string; category: string; platform: string; profileUrl: string; searchQuery: string }) => Promise<void>
  onClose: () => void
}

function AddPersonForm({ onAdd, onClose }: AddFormProps) {
  const [name,        setName]        = useState("")
  const [category,    setCategory]    = useState("celebrities")
  const [platform,    setPlatform]    = useState("Instagram")
  const [profileUrl,  setProfileUrl]  = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [detectedHandle, setDetectedHandle] = useState("")
  const [saving,      setSaving]      = useState(false)

  // Auto-extract handle when profileUrl changes and auto-fill searchQuery
  useEffect(() => {
    if (!profileUrl.trim()) {
      setDetectedHandle("")
      // Reset search to name if URL cleared
      if (searchQuery && !name) setSearchQuery("")
      return
    }
    const handle = extractHandleFromUrl(profileUrl.trim())
    setDetectedHandle(handle)

    if (handle) {
      // Build a better search query combining name + handle
      const namePart = name.trim()
      const newQuery = namePart ? `${namePart} ${handle}` : handle
      setSearchQuery(newQuery)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileUrl])

  // When name changes and no URL, keep search in sync
  const handleNameChange = (val: string) => {
    setName(val)
    // Only auto-update searchQuery if no custom URL has been set
    if (!profileUrl.trim()) {
      setSearchQuery(val)
    } else if (detectedHandle) {
      setSearchQuery(`${val.trim()} ${detectedHandle}`)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await onAdd({
      name: name.trim(),
      category,
      platform,
      profileUrl,
      searchQuery: searchQuery.trim() || name.trim(),
    })
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="border-b border-gray-200 bg-gray-50 px-3 py-3 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] font-bold text-gray-700 uppercase tracking-widest">Add to Following</span>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Name */}
      <Input
        value={name}
        onChange={e => handleNameChange(e.target.value)}
        placeholder="Name (e.g. Kim Kardashian)"
        className="h-7 text-xs"
        required
      />

      {/* Category */}
      <div className="relative">
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="w-full h-7 text-xs border border-input rounded-md bg-background px-2 pr-6 appearance-none focus:outline-none focus:ring-1 focus:ring-gray-300"
        >
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
      </div>

      {/* Platform */}
      <div className="relative">
        <select
          value={platform}
          onChange={e => setPlatform(e.target.value)}
          className="w-full h-7 text-xs border border-input rounded-md bg-background px-2 pr-6 appearance-none focus:outline-none focus:ring-1 focus:ring-gray-300"
        >
          {PLATFORMS.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
      </div>

      {/* Profile URL — with auto-detect indicator */}
      <div>
        <div className="flex items-center gap-1 mb-1">
          <LinkIcon className="h-2.5 w-2.5 text-gray-400" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Profile / Account URL</span>
        </div>
        <Input
          value={profileUrl}
          onChange={e => setProfileUrl(e.target.value)}
          placeholder="instagram.com/username or full URL"
          className="h-7 text-xs"
          type="url"
        />
        {detectedHandle && (
          <p className="text-[10px] text-emerald-600 mt-0.5 flex items-center gap-1">
            ✓ Handle detected: <span className="font-bold">@{detectedHandle}</span>
            <span className="text-gray-400">— news search updated</span>
          </p>
        )}
        <p className="text-[10px] text-gray-400 mt-0.5">Used for clicking their avatar to visit their profile</p>
      </div>

      {/* News search terms */}
      <div>
        <div className="flex items-center gap-1 mb-1">
          <Newspaper className="h-2.5 w-2.5 text-gray-400" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">News Search Terms</span>
        </div>
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={`e.g. "${name || "their name"}"`}
          className="h-7 text-xs"
        />
        <p className="text-[10px] text-gray-400 mt-0.5">
          {detectedHandle
            ? `Using name + @${detectedHandle} for better news accuracy`
            : "What to search in Google News (be specific for better results)"}
        </p>
      </div>

      <Button type="submit" disabled={saving || !name.trim()} className="w-full h-7 text-xs">
        {saving ? "Adding…" : "Add to Following"}
      </Button>
    </form>
  )
}

/* ─── Person row ───────────────────────────────────── */
function PersonRow({ person, onRemove }: { person: FollowedPerson; onRemove: (id: string) => void }) {
  const storyHref   = person.storyLink  ?? person.profileUrl ?? "#"
  const profileHref = person.profileUrl ?? "#"
  const hasStory    = !!(person.storyLink && person.storyLink !== "#")

  return (
    <div className="relative border-b border-gray-100 last:border-0 group/row">
      {/* Delete button */}
      <button
        onClick={() => onRemove(person.id)}
        className="absolute top-2 right-1 z-10 opacity-0 group-hover/row:opacity-100 transition-opacity w-5 h-5 rounded-full bg-red-100 hover:bg-red-200 text-red-500 flex items-center justify-center"
        title="Remove"
      >
        <X className="h-3 w-3" />
      </button>

      <a
        href={storyHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-3 py-3 px-3 pr-7 rounded-lg hover:bg-gray-50 cursor-pointer group transition-colors"
      >
        {/* Avatar */}
        <div
          className="relative shrink-0"
          onClick={e => {
            if (profileHref === "#") return
            e.preventDefault()
            e.stopPropagation()
            window.open(profileHref, "_blank", "noopener,noreferrer")
          }}
        >
          {person.avatarUrl ? (
            <img
              src={person.avatarUrl}
              alt={person.name}
              className="w-10 h-10 rounded-full object-cover ring-1 ring-gray-200 group-hover:ring-gray-300 transition-all"
              onError={e => {
                const el = e.target as HTMLImageElement
                el.style.display = "none"
                ;(el.nextElementSibling as HTMLElement | null)?.classList.remove("hidden")
              }}
            />
          ) : null}
          <div className={`w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-[13px] font-bold text-gray-600 ${person.avatarUrl ? "hidden" : ""}`}>
            {person.initials}
          </div>
          {person.isLive && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-red-600 rounded-full border-2 border-white" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="text-[13px] font-semibold text-gray-900 truncate group-hover:text-black">
              {person.name}
            </span>
            <span className="text-[11px] text-gray-400 shrink-0">{timeAgo(person.minutesAgo)}</span>
          </div>
          <p className="text-[12px] text-gray-600 line-clamp-2 leading-snug group-hover:text-gray-800">
            {person.latestUpdate}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {person.isLive && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 uppercase tracking-wide">
                <Radio className="h-2.5 w-2.5" />Live
              </div>
            )}
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-sm", getPlatformStyle(person.platform))}>
              {person.platform}
            </span>
            {hasStory && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-400 group-hover:text-blue-500 transition-colors ml-auto">
                <ExternalLink className="h-2.5 w-2.5" /><span>Read</span>
              </span>
            )}
          </div>
        </div>
      </a>
    </div>
  )
}

/* ─── Main panel ───────────────────────────────────── */
export function FollowPanel() {
  const [activeTab,  setActiveTab]  = useState<FollowCategory | "all">("all")
  const [search,     setSearch]     = useState("")
  const [people,     setPeople]     = useState<FollowedPerson[]>(DEFAULT_FOLLOWS)
  const [loading,    setLoading]    = useState(true)
  const [showAdd,    setShowAdd]    = useState(false)

  async function loadFeed(savedList?: SavedFollow[]) {
    const list = savedList ?? followsStore.get()
    try {
      const r = await fetch(`/api/following?follows=${encodeURIComponent(JSON.stringify(list))}`, { cache: "no-store" })
      const d = await r.json()
      if (d.people?.length) setPeople(d.people as FollowedPerson[])
    } catch {/* keep defaults */}
    finally { setLoading(false) }
  }

  useEffect(() => { loadFeed() }, [])

  async function handleAdd(entry: { name: string; category: string; platform: string; profileUrl: string; searchQuery: string }) {
    const saved = followsStore.add(entry)
    setShowAdd(false)
    setLoading(true)
    await loadFeed(followsStore.get())
    void saved
  }

  async function handleRemove(id: string) {
    followsStore.remove(id)
    setPeople(prev => prev.filter(p => p.id !== id))
    loadFeed(followsStore.get())
  }

  const filtered = people.filter(p => {
    const matchesTab    = activeTab === "all" || p.category === activeTab
    const matchesSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase())
    return matchesTab && matchesSearch
  })

  const liveCount = people.filter(p => p.isLive).length

  return (
    <div className="w-64 flex flex-col h-full bg-white border-l border-gray-200 shrink-0">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-[13px] font-bold text-gray-900 uppercase tracking-widest">Following</span>
          </div>
          <div className="flex items-center gap-1.5">
            {liveCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-sm">
                <Radio className="h-2.5 w-2.5" />{liveCount} LIVE
              </span>
            )}
            <Button
              variant="ghost" size="icon"
              className={cn("h-6 w-6 rounded transition-colors", showAdd ? "bg-gray-900 text-white hover:bg-gray-800" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100")}
              onClick={() => setShowAdd(v => !v)}
              title="Add person / brand"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="pl-8 h-7 text-xs border-gray-200 bg-gray-50 focus-visible:ring-gray-300 rounded-full"
          />
        </div>

        {/* Category tabs */}
        <div className="grid grid-cols-3 gap-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "flex items-center justify-center gap-1 rounded-md px-1 py-1 text-[11px] font-medium transition-all",
                activeTab === t.key ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              )}
            >
              <span className="text-[12px]">{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Add form (inline, below header) */}
      {showAdd && <AddPersonForm onAdd={handleAdd} onClose={() => setShowAdd(false)} />}

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="px-1 py-1">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 py-3 px-3 border-b border-gray-100">
                <div className="w-10 h-10 rounded-full bg-gray-100 shimmer shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-100 rounded shimmer w-3/4" />
                  <div className="h-2.5 bg-gray-100 rounded shimmer w-full" />
                  <div className="h-2.5 bg-gray-100 rounded shimmer w-2/3" />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Users className="h-6 w-6 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No one here yet</p>
              <button onClick={() => setShowAdd(true)} className="text-xs text-blue-500 mt-1 hover:underline">
                + Add someone
              </button>
            </div>
          ) : (
            filtered.map(person => (
              <PersonRow key={person.id} person={person} onRemove={handleRemove} />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-100 shrink-0">
        <p className="text-[10px] text-gray-400 text-center">
          {people.length} following · {liveCount} live now
        </p>
      </div>
    </div>
  )
}
