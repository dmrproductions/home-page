import { NextResponse } from "next/server"
import { readJSON, writeJSON } from "@/lib/store"

export const dynamic = "force-dynamic"

export interface SavedFollow {
  id: string
  name: string
  category: string
  platform: string
  profileUrl: string
  searchQuery: string   // what to search on Google News
  addedAt: string
}

interface FollowsStore { follows: SavedFollow[] }

const DEFAULT_FOLLOWS: SavedFollow[] = [
  { id: "f1", name: "Beyoncé",        category: "celebrities", platform: "Instagram", profileUrl: "https://www.instagram.com/beyonce/",        searchQuery: "Beyoncé",               addedAt: new Date().toISOString() },
  { id: "f2", name: "Naomi Campbell", category: "celebrities", platform: "Twitter/X", profileUrl: "https://twitter.com/NaomiCampbell",         searchQuery: "Naomi Campbell",         addedAt: new Date().toISOString() },
  { id: "f3", name: "Rihanna",        category: "celebrities", platform: "Instagram", profileUrl: "https://www.instagram.com/badgalriri/",     searchQuery: "Rihanna",               addedAt: new Date().toISOString() },
  { id: "f4", name: "Vogue Magazine", category: "businesses",  platform: "Instagram", profileUrl: "https://www.instagram.com/voguemagazine/",  searchQuery: "Vogue Magazine",         addedAt: new Date().toISOString() },
  { id: "f5", name: "WWD",            category: "businesses",  platform: "WWD.com",   profileUrl: "https://wwd.com",                           searchQuery: "WWD fashion",            addedAt: new Date().toISOString() },
  { id: "f6", name: "DMR Beehiive",   category: "businesses",  platform: "Instagram", profileUrl: "https://www.instagram.com/dmrbeehiive/",    searchQuery: "DMR Beehiive fashion",  addedAt: new Date().toISOString() },
  { id: "f7", name: "James Head",     category: "industry",    platform: "Instagram", profileUrl: "https://www.instagram.com/",                searchQuery: "James Head designer",    addedAt: new Date().toISOString() },
  { id: "f8", name: "Fashion Week",   category: "industry",    platform: "TikTok",    profileUrl: "https://www.vogue.com/fashion-week",         searchQuery: "Fashion Week 2026",     addedAt: new Date().toISOString() },
  { id: "f9", name: "RunwayConnect",  category: "businesses",  platform: "Website",   profileUrl: "https://runwayconnect.com",                 searchQuery: "runway model casting",   addedAt: new Date().toISOString() },
]

function load(): SavedFollow[] {
  const store = readJSON<FollowsStore>("follows.json", { follows: DEFAULT_FOLLOWS })
  return store.follows ?? DEFAULT_FOLLOWS
}
function save(follows: SavedFollow[]) {
  writeJSON("follows.json", { follows })
}

export async function GET() {
  return NextResponse.json({ follows: load() })
}

export async function POST(req: Request) {
  const body = await req.json() as Partial<SavedFollow>
  if (!body.name || !body.category) {
    return NextResponse.json({ error: "name and category required" }, { status: 400 })
  }
  const follows = load()
  const entry: SavedFollow = {
    id:           `f${Date.now()}`,
    name:         body.name.trim(),
    category:     body.category,
    platform:     body.platform ?? "Instagram",
    profileUrl:   body.profileUrl ?? "",
    searchQuery:  body.searchQuery ?? body.name.trim(),
    addedAt:      new Date().toISOString(),
  }
  follows.push(entry)
  save(follows)
  return NextResponse.json({ follow: entry })
}

export async function DELETE(req: Request) {
  const { id } = await req.json() as { id: string }
  const follows = load().filter(f => f.id !== id)
  save(follows)
  return NextResponse.json({ ok: true })
}
