import { NextResponse } from "next/server"
import { readJSON, writeJSON } from "@/lib/store"
import { DEFAULT_FEEDS, type NewsFeed } from "@/lib/feed-defaults"
export type { NewsFeed } from "@/lib/feed-defaults"

export const dynamic = "force-dynamic"


interface FeedsStore { feeds: NewsFeed[] }


function load(): NewsFeed[] {
  const store = readJSON<FeedsStore>("feeds.json", { feeds: DEFAULT_FEEDS })
  return store.feeds ?? DEFAULT_FEEDS
}
function save(feeds: NewsFeed[]) {
  writeJSON("feeds.json", { feeds })
}

export async function GET() {
  return NextResponse.json({ feeds: load() })
}

export async function POST(req: Request) {
  const body = await req.json() as Partial<NewsFeed>
  if (!body.source || !body.url || !body.category) {
    return NextResponse.json({ error: "source, url and category required" }, { status: 400 })
  }
  const feeds = load()
  const feed: NewsFeed = {
    id:       `f${Date.now()}`,
    source:   body.source.trim(),
    url:      body.url.trim(),
    category: body.category,
    enabled:  true,
    builtin:  false,
    addedAt:  new Date().toISOString(),
  }
  feeds.push(feed)
  save(feeds)
  return NextResponse.json({ feed })
}

export async function PATCH(req: Request) {
  const { id, enabled } = await req.json() as { id: string; enabled: boolean }
  const feeds = load().map(f => f.id === id ? { ...f, enabled } : f)
  save(feeds)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const { id } = await req.json() as { id: string }
  const feeds = load().filter(f => f.id !== id)
  save(feeds)
  return NextResponse.json({ ok: true })
}
