import { NextResponse } from "next/server"
import Parser from "rss-parser"
import type { SavedFollow } from "@/app/api/follows/route"

export const dynamic = "force-dynamic"
export const revalidate = 0

type CustomItem = {
  "media:content"?:   { $?: { url?: string } } | { $?: { url?: string } }[]
  "media:thumbnail"?: { $?: { url?: string } } | { $?: { url?: string } }[]
  "content:encoded"?: string
  enclosure?:         { url?: string }
}

const parser = new Parser<Record<string, unknown>, CustomItem>({
  customFields: {
    item: [
      ["media:content",   "media:content",   { keepArray: true }],
      ["media:thumbnail", "media:thumbnail", { keepArray: true }],
      ["content:encoded", "content:encoded"],
    ],
  },
  timeout: 8000,
})

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

function extractImage(item: CustomItem & Record<string, unknown>): string | undefined {
  const mc = item["media:content"]
  if (mc) {
    const arr = Array.isArray(mc) ? mc : [mc]
    const u = arr[0]?.$?.url
    if (u) return u
  }
  const mt = item["media:thumbnail"]
  if (mt) {
    const arr = Array.isArray(mt) ? mt : [mt]
    const u = arr[0]?.$?.url
    if (u) return u
  }
  if (item["content:encoded"]) {
    const m = (item["content:encoded"] as string).match(/<img[^>]+src=["']([^"']+)["']/i)
    if (m?.[1]) return m[1]
  }
  if (item.enclosure?.url) return item.enclosure.url
  return undefined
}

function gnewsUrl(query: string) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`
}

function minutesAgo(dateStr: string | undefined): number {
  if (!dateStr) return 60
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.max(0, Math.floor(diff / 60000))
}

async function fetchLatest(person: SavedFollow) {
  try {
    const feed = await parser.parseURL(gnewsUrl(person.searchQuery || person.name))
    const item = feed.items?.[0]
    if (!item) return null

    const mins     = minutesAgo(item.pubDate ?? item.isoDate)
    const headline = (item.title ?? "").replace(/\s*-\s*[^-]+$/, "").trim()
    const link     = item.link ?? person.profileUrl
    const imageUrl = extractImage(item as CustomItem & Record<string, unknown>)
                  ?? `https://picsum.photos/seed/${person.id}-avatar/80/80`

    return {
      id:           person.id,
      name:         person.name,
      handle:       `@${person.name.toLowerCase().replace(/\s+/g, "")}`,
      category:     person.category,
      initials:     initials(person.name),
      avatarUrl:    `https://picsum.photos/seed/${person.id}-avatar/80/80`,
      latestUpdate: headline || `Latest from ${person.name}`,
      storyLink:    link,
      profileUrl:   person.profileUrl,
      platform:     person.platform,
      minutesAgo:   mins,
      isLive:       false,
      isReal:       true,
      imageUrl,
    }
  } catch {
    return {
      id:           person.id,
      name:         person.name,
      handle:       `@${person.name.toLowerCase().replace(/\s+/g, "")}`,
      category:     person.category,
      initials:     initials(person.name),
      avatarUrl:    `https://picsum.photos/seed/${person.id}-avatar/80/80`,
      latestUpdate: `View latest from ${person.name}`,
      storyLink:    person.profileUrl,
      profileUrl:   person.profileUrl,
      platform:     person.platform,
      minutesAgo:   0,
      isLive:       false,
      isReal:       false,
      imageUrl:     `https://picsum.photos/seed/${person.id}-avatar/80/80`,
    }
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  let follows: SavedFollow[] = []

  // Client passes its localStorage follows as JSON
  const followsParam = searchParams.get("follows")
  if (followsParam) {
    try { follows = JSON.parse(decodeURIComponent(followsParam)) as SavedFollow[] } catch {}
  }

  // Fallback: load from /api/follows (legacy)
  if (!follows.length) {
    try {
      const base = req.url.replace(/\/api\/following.*/, "/api/follows")
      const r = await fetch(base, { cache: "no-store" })
      const d = await r.json() as { follows: SavedFollow[] }
      follows = d.follows ?? []
    } catch {}
  }

  const results = await Promise.allSettled(follows.map(fetchLatest))
  const people  = results
    .map(r => r.status === "fulfilled" ? r.value : null)
    .filter(Boolean)

  return NextResponse.json({ people })
}
