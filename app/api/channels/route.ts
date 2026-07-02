import { NextResponse } from "next/server"
import { readJSON, writeJSON } from "@/lib/store"

export interface SocialChannel {
  id:       string
  label:    string          // display name
  type:     "youtube" | "facebook" | "instagram" | "rss"
  feedUrl:  string          // resolved RSS URL
  category: "celebrities" | "businesses" | "industry" | "friends" | "family"
}

export interface ChannelsStore {
  youtube:   SocialChannel[]
  facebook:  SocialChannel[]
  instagram: SocialChannel[]
  rss:       SocialChannel[]
}

export const dynamic = "force-dynamic"

/* Resolve a YouTube input (URL, handle, or channel ID) to an RSS feed URL */
function resolveYouTubeFeed(input: string): { feedUrl: string; label: string } | null {
  const trimmed = input.trim()

  // Already an RSS URL
  if (trimmed.includes("youtube.com/feeds/videos.xml")) {
    return { feedUrl: trimmed, label: "YouTube Channel" }
  }

  // Channel ID format: starts with UC (24 chars)
  const channelIdMatch = trimmed.match(/(?:channel\/|^)(UC[\w-]{22})/)
  if (channelIdMatch) {
    return {
      feedUrl: `https://www.youtube.com/feeds/videos.xml?channel_id=${channelIdMatch[1]}`,
      label:   "YouTube Channel",
    }
  }

  // Handle: @username or youtube.com/@username
  const handleMatch = trimmed.match(/@([\w-]+)/)
  if (handleMatch) {
    // YouTube no longer supports ?user= for new-style handles
    // We store the handle and resolve at fetch time by scraping
    return {
      feedUrl: `youtube-handle:${handleMatch[1]}`,
      label:   `@${handleMatch[1]}`,
    }
  }

  // Plain username (legacy)
  const plain = trimmed.replace(/https?:\/\/(www\.)?youtube\.com\/?/, "").replace(/^\//, "")
  if (plain && !plain.includes("/")) {
    return {
      feedUrl: `https://www.youtube.com/feeds/videos.xml?user=${plain}`,
      label:   plain,
    }
  }

  return null
}

export async function GET() {
  const store = readJSON<ChannelsStore>("channels.json", { youtube: [], facebook: [], instagram: [], rss: [] })
  return NextResponse.json(store)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { type, input, label, category } = body

    if (!type || !input) return NextResponse.json({ error: "type and input required" }, { status: 400 })

    const store = readJSON<ChannelsStore>("channels.json", { youtube: [], facebook: [], instagram: [], rss: [] })

    let channel: SocialChannel | null = null

    if (type === "youtube") {
      const resolved = resolveYouTubeFeed(input)
      if (!resolved) return NextResponse.json({ error: "Couldn't parse YouTube URL" }, { status: 400 })
      channel = {
        id:       crypto.randomUUID(),
        label:    label?.trim() || resolved.label,
        type:     "youtube",
        feedUrl:  resolved.feedUrl,
        category: category ?? "celebrities",
      }
      store.youtube = [...(store.youtube ?? []), channel]
    } else if (type === "facebook" || type === "instagram") {
      // Expect a full RSS URL (e.g. from rss.app)
      if (!input.startsWith("http")) return NextResponse.json({ error: "Paste the full RSS URL" }, { status: 400 })
      channel = {
        id:       crypto.randomUUID(),
        label:    label?.trim() || (type === "facebook" ? "Facebook Page" : "Instagram Account"),
        type,
        feedUrl:  input.trim(),
        category: category ?? "celebrities",
      }
      const key = type as "facebook" | "instagram"
      store[key] = [...(store[key] ?? []), channel]
    } else if (type === "rss") {
      if (!input.startsWith("http")) return NextResponse.json({ error: "Paste a valid RSS URL" }, { status: 400 })
      channel = {
        id:       crypto.randomUUID(),
        label:    label?.trim() || "Custom Feed",
        type:     "rss",
        feedUrl:  input.trim(),
        category: category ?? "industry",
      }
      store.rss = [...(store.rss ?? []), channel]
    }

    if (!channel) return NextResponse.json({ error: "Unknown type" }, { status: 400 })

    writeJSON("channels.json", store)
    return NextResponse.json(channel, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id   = searchParams.get("id")
  const type = searchParams.get("type") as keyof ChannelsStore | null
  if (!id || !type) return NextResponse.json({ error: "id + type required" }, { status: 400 })

  const store = readJSON<ChannelsStore>("channels.json", { youtube: [], facebook: [], instagram: [], rss: [] })
  if (store[type]) store[type] = (store[type] as SocialChannel[]).filter(c => c.id !== id)
  writeJSON("channels.json", store)
  return NextResponse.json({ ok: true })
}
