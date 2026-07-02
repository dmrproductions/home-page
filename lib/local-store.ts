/**
 * Client-side persistent store using localStorage.
 * All user settings (feeds, channels, follows) live here so
 * server deployments can never wipe them.
 */

import type { NewsFeed } from "@/lib/feed-defaults"
import type { SavedFollow } from "@/app/api/follows/route"
export type { SavedFollow } from "@/app/api/follows/route"

/* ─── NewsFeed defaults ───────────────────────────────────── */
import { DEFAULT_FEEDS } from "@/lib/feed-defaults"

export const DEFAULT_FOLLOWS: SavedFollow[] = [
  { id: "f1", name: "Beyoncé",        category: "celebrities", platform: "Instagram", profileUrl: "https://www.instagram.com/beyonce/",        searchQuery: "Beyoncé",               addedAt: "" },
  { id: "f2", name: "Naomi Campbell", category: "celebrities", platform: "Twitter/X", profileUrl: "https://twitter.com/NaomiCampbell",         searchQuery: "Naomi Campbell",         addedAt: "" },
  { id: "f3", name: "Rihanna",        category: "celebrities", platform: "Instagram", profileUrl: "https://www.instagram.com/badgalriri/",     searchQuery: "Rihanna",               addedAt: "" },
  { id: "f4", name: "Vogue Magazine", category: "businesses",  platform: "Instagram", profileUrl: "https://www.instagram.com/voguemagazine/",  searchQuery: "Vogue Magazine",         addedAt: "" },
  { id: "f5", name: "WWD",            category: "businesses",  platform: "WWD.com",   profileUrl: "https://wwd.com",                           searchQuery: "WWD fashion",            addedAt: "" },
  { id: "f6", name: "DMR Beehiive",   category: "businesses",  platform: "Instagram", profileUrl: "https://www.instagram.com/dmrbeehiive/",    searchQuery: "DMR Beehiive fashion",  addedAt: "" },
  { id: "f7", name: "James Head",     category: "industry",    platform: "Instagram", profileUrl: "https://www.instagram.com/",                searchQuery: "James Head designer",    addedAt: "" },
  { id: "f8", name: "Fashion Week",   category: "industry",    platform: "TikTok",    profileUrl: "https://www.vogue.com/fashion-week",         searchQuery: "Fashion Week 2026",     addedAt: "" },
  { id: "f9", name: "RunwayConnect",  category: "businesses",  platform: "Website",   profileUrl: "https://runwayconnect.com",                 searchQuery: "runway model casting",   addedAt: "" },
]

export interface SocialChannelLocal {
  id: string; type: string; label: string; feedUrl: string; category: string
}

/* ─── helpers ─────────────────────────────────────────────── */
function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch { return fallback }
}
function write<T>(key: string, val: T) {
  if (typeof window === "undefined") return
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

/* ─── NEWS FEEDS ──────────────────────────────────────────── */
export const feedsStore = {
  get():         NewsFeed[]  { return read<NewsFeed[]>("hp_feeds", DEFAULT_FEEDS) },
  set(v: NewsFeed[])         { write("hp_feeds", v) },
  toggle(id: string, enabled: boolean) {
    feedsStore.set(feedsStore.get().map(f => f.id === id ? { ...f, enabled } : f))
  },
  add(f: Omit<NewsFeed, "id"|"builtin"|"addedAt">) {
    const entry: NewsFeed = { ...f, id: `f${Date.now()}`, builtin: false, addedAt: new Date().toISOString() }
    feedsStore.set([...feedsStore.get(), entry])
    return entry
  },
  remove(id: string) { feedsStore.set(feedsStore.get().filter(f => f.id !== id)) },
}

/* ─── SOCIAL CHANNELS ─────────────────────────────────────── */
export const channelsStore = {
  get(): SocialChannelLocal[] { return read<SocialChannelLocal[]>("hp_channels", []) },
  set(v: SocialChannelLocal[])  { write("hp_channels", v) },
  add(c: Omit<SocialChannelLocal, "id">) {
    const entry: SocialChannelLocal = { ...c, id: `c${Date.now()}` }
    channelsStore.set([...channelsStore.get(), entry])
    return entry
  },
  remove(id: string) { channelsStore.set(channelsStore.get().filter(c => c.id !== id)) },
}

/* ─── FOLLOWS ─────────────────────────────────────────────── */
export const followsStore = {
  get(): SavedFollow[]  { return read<SavedFollow[]>("hp_follows", DEFAULT_FOLLOWS) },
  set(v: SavedFollow[]) { write("hp_follows", v) },
  add(f: Omit<SavedFollow, "id"|"addedAt">) {
    const entry: SavedFollow = { ...f, id: `f${Date.now()}`, addedAt: new Date().toISOString() }
    followsStore.set([...followsStore.get(), entry])
    return entry
  },
  remove(id: string) { followsStore.set(followsStore.get().filter(f => f.id !== id)) },
}
