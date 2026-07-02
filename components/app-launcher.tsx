"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, X, Trash2, Globe, Check, ChevronRight, ExternalLink } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DEFAULT_APPS } from "@/lib/data"
import type { AppItem, AppCategory } from "@/types"
import { cn } from "@/lib/utils"

/* ── localStorage helpers ─────────────────────── */
const STORAGE_KEY_CUSTOM  = "hp_bookmarks_custom"
const STORAGE_KEY_REMOVED = "hp_bookmarks_removed"

function loadCustom(): AppItem[]   {
  if (typeof window === "undefined") return []
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_CUSTOM) ?? "[]") } catch { return [] }
}
function loadRemoved(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY_REMOVED) ?? "[]")) } catch { return new Set() }
}
function saveCustom(items: AppItem[])  { localStorage.setItem(STORAGE_KEY_CUSTOM,  JSON.stringify(items)) }
function saveRemoved(ids: Set<string>) { localStorage.setItem(STORAGE_KEY_REMOVED, JSON.stringify([...ids])) }

/* ── helpers ──────────────────────────────────── */
function getDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", "") } catch { return "" }
}

function faviconUrl(url: string): string {
  const domain = getDomain(url)
  if (!domain || url === "#") return ""
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
}

const CATEGORY_CONFIG: Record<AppCategory, { label: string }> = {
  "ai-tools":      { label: "AI Tools"        },
  "social":        { label: "Social Media"    },
  "productivity":  { label: "Productivity"    },
  "fashion":       { label: "Fashion & Media" },
  "entertainment": { label: "Entertainment"   },
}
const CATEGORY_OPTIONS: AppCategory[] = ["ai-tools","social","productivity","fashion","entertainment"]
const EMOJI_SUGGESTIONS = ["🌐","🔗","📰","🎯","🛍️","📊","🎮","🎵","📷","💡","🔧","📋","🏆","🌟","💬","📱","🖥️","🎬","🛒","✈️"]

export function AppLauncher({ onClose }: { onClose?: () => void } = {}) {
  const [customApps, setCustomApps] = useState<AppItem[]>([])
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())
  const [editMode,   setEditMode]   = useState(false)
  const [showAdd,    setShowAdd]    = useState(false)
  const [expanded,   setExpanded]   = useState<AppCategory | null>("entertainment")

  // Add form
  const [newName,  setNewName]  = useState("")
  const [newUrl,   setNewUrl]   = useState("")
  const [newEmoji, setNewEmoji] = useState("🌐")
  const [newCat,   setNewCat]   = useState<AppCategory>("productivity")
  const [addError, setAddError] = useState("")
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setCustomApps(loadCustom())
    setRemovedIds(loadRemoved())
  }, [])

  const allApps = [
    ...DEFAULT_APPS.filter(a => !removedIds.has(a.id)),
    ...customApps,
  ]

  // Group by category (no sorting by embed-ability — everything opens new tab)
  const grouped = allApps.reduce<Record<string, AppItem[]>>((acc, app) => {
    if (!acc[app.category]) acc[app.category] = []
    acc[app.category].push(app)
    return acc
  }, {})

  function handleClick(app: AppItem) {
    if (editMode) return
    // All bookmarks open in a new tab
    if (app.url && app.url !== "#") {
      window.open(app.url, "_blank", "noopener,noreferrer")
    }
  }

  function handleRemove(app: AppItem, e: React.MouseEvent) {
    e.stopPropagation()
    const isDefault = DEFAULT_APPS.some(a => a.id === app.id)
    if (isDefault) {
      const next = new Set(removedIds); next.add(app.id)
      setRemovedIds(next); saveRemoved(next)
    } else {
      const next = customApps.filter(a => a.id !== app.id)
      setCustomApps(next); saveCustom(next)
    }
  }

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault(); setAddError("")
    const trimName = newName.trim(), trimUrl = newUrl.trim()
    if (!trimName) { setAddError("Name is required"); return }
    if (!trimUrl)  { setAddError("URL is required"); return }
    let finalUrl = trimUrl
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = "https://" + finalUrl
    try { new URL(finalUrl) } catch { setAddError("Enter a valid URL (e.g. example.com)"); return }
    const newApp: AppItem = { id: `custom_${Date.now()}`, name: trimName, emoji: newEmoji, url: finalUrl, category: newCat }
    const next = [...customApps, newApp]; setCustomApps(next); saveCustom(next)
    setNewName(""); setNewUrl(""); setNewEmoji("🌐"); setNewCat("productivity"); setShowAdd(false)
  }

  return (
    <div className="flex flex-col w-56 shrink-0 bg-white border-r border-gray-100 h-full">
      {/* Mobile close button */}
      {onClose && (
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-[11px] font-black uppercase tracking-widest text-gray-700">Bookmarks</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
            <span className="text-sm text-gray-600">✕</span>
          </button>
        </div>
      )}

      {/* ── Header ───────────────────────────────── */}
      <div className="px-4 pt-4 pb-2 border-b border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#B8960C]">
            Bookmarks
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setEditMode(e => !e); setShowAdd(false) }}
              className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors",
                editMode ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              )}
            >
              {editMode ? "Done" : "Edit"}
            </button>
            {!editMode && (
              <button onClick={() => { setShowAdd(s => !s); setAddError(""); setTimeout(() => nameRef.current?.focus(), 50) }}
                className="text-gray-400 hover:text-[#B8960C] p-0.5 transition-colors">
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="gold-rule mt-2" />
      </div>

      {/* ── Bookmarks list ────────────────────────── */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {(Object.keys(CATEGORY_CONFIG) as AppCategory[]).map(cat => {
            const catApps = grouped[cat] ?? []
            if (catApps.length === 0) return null
            const isExpanded = expanded === cat
            const preview = catApps.slice(0, isExpanded ? catApps.length : 4)

            return (
              <div key={cat} className="mb-1">
                {/* Category header */}
                <div className="flex items-center justify-between px-4 py-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                    {CATEGORY_CONFIG[cat].label}
                  </span>
                  <span className="text-[10px] text-gray-300 font-medium">{catApps.length}</span>
                </div>

                {/* App items */}
                {preview.map(app => {
                  const favicon = faviconUrl(app.url)
                  const domain  = getDomain(app.url)

                  return (
                    <button
                      key={app.id}
                      onClick={() => handleClick(app)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2 transition-colors group relative text-left",
                        editMode ? "hover:bg-red-50" : "hover:bg-gray-50"
                      )}
                    >
                      {/* Favicon / emoji thumbnail */}
                      <div className="w-9 h-9 rounded-xl shrink-0 overflow-hidden flex items-center justify-center border border-gray-100 group-hover:border-gray-200 transition-all">
                        {favicon ? (
                          <img
                            src={favicon}
                            alt={app.name}
                            className="w-5 h-5 object-contain"
                            onError={e => {
                              const img = e.target as HTMLImageElement
                              img.style.display = "none"
                              if (img.nextElementSibling) (img.nextElementSibling as HTMLElement).style.display = "flex"
                            }}
                          />
                        ) : null}
                        <span className={cn("text-base", favicon ? "hidden" : "flex")}>{app.emoji}</span>
                      </div>

                      {/* Name + domain */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate leading-tight text-gray-700 group-hover:text-gray-900">
                          {app.name}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate leading-tight">{domain}</p>
                      </div>

                      {/* External link icon */}
                      {!editMode && (
                        <ExternalLink className="h-3 w-3 text-gray-200 group-hover:text-[#B8960C] transition-colors shrink-0" />
                      )}

                      {/* Delete in edit mode */}
                      {editMode && (
                        <span
                          onClick={ev => handleRemove(app, ev)}
                          className="ml-auto w-5 h-5 rounded-full bg-red-100 hover:bg-red-500 flex items-center justify-center transition-colors group/del shrink-0"
                        >
                          <Trash2 className="h-2.5 w-2.5 text-red-400 group-hover/del:text-white" />
                        </span>
                      )}
                    </button>
                  )
                })}

                {/* Show more / less */}
                {catApps.length > 4 && (
                  <button
                    onClick={() => setExpanded(isExpanded ? null : cat)}
                    className="w-full flex items-center gap-1.5 px-4 py-1.5 text-[11px] text-[#B8960C] hover:text-[#9a7a08] font-semibold transition-colors"
                  >
                    <ChevronRight className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-90")} />
                    {isExpanded ? "Show less" : `${catApps.length - 4} more`}
                  </button>
                )}

                <div className="mx-4 mt-1 border-b border-gray-50" />
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* ── Add form ─────────────────────────────── */}
      {showAdd && (
        <div className="border-t border-gray-100 p-3 bg-gray-50">
          <form onSubmit={handleAddSubmit} className="flex flex-col gap-2">
            <p className="text-[11px] font-black text-[#B8960C] uppercase tracking-wider">Add Bookmark</p>
            <div className="flex flex-wrap gap-1">
              {EMOJI_SUGGESTIONS.map(em => (
                <button key={em} type="button" onClick={() => setNewEmoji(em)}
                  className={cn(
                    "w-6 h-6 rounded text-sm flex items-center justify-center transition-colors",
                    newEmoji === em ? "bg-gray-900 text-white ring-1 ring-gray-900" : "bg-white hover:bg-gray-100 border border-gray-200"
                  )}>{em}</button>
              ))}
            </div>
            <input ref={nameRef} value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Name (e.g. DMR Casting)"
              className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#B8960C]/50 placeholder:text-gray-300" />
            <div className="relative">
              <Globe className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-300 pointer-events-none" />
              <input value={newUrl} onChange={e => setNewUrl(e.target.value)}
                placeholder="URL (e.g. example.com)"
                className="w-full text-xs border border-gray-200 rounded-md pl-6 pr-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#B8960C]/50 placeholder:text-gray-300" />
            </div>
            <select value={newCat} onChange={e => setNewCat(e.target.value as AppCategory)}
              className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#B8960C]/50 text-gray-600">
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{CATEGORY_CONFIG[c].label}</option>)}
            </select>
            {addError && <p className="text-[11px] text-red-500">{addError}</p>}
            <div className="flex gap-1.5">
              <button type="submit"
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-gray-900 text-white text-xs font-medium hover:bg-gray-700 transition-colors">
                <Check className="h-3 w-3" /> Save
              </button>
              <button type="button" onClick={() => { setShowAdd(false); setAddError("") }}
                className="px-3 py-1.5 rounded-md border border-gray-200 text-xs text-gray-500 hover:bg-gray-100 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Footer ───────────────────────────────── */}
      {!showAdd && (
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => { setShowAdd(true); setAddError(""); setTimeout(() => nameRef.current?.focus(), 50) }}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-[#D4AF37]/50 text-[#B8960C] hover:border-[#B8960C] hover:bg-[#F5EFD6]/50 transition-colors text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Bookmark
          </button>
        </div>
      )}
    </div>
  )
}
