import { NextResponse } from "next/server"
import { readJSON, writeJSON } from "@/lib/store"

export interface WallPost {
  id: string
  authorName: string
  message: string
  imageDataUrl?: string   // base64, max ~400KB
  category: "friends" | "family"
  createdAt: string
  minutesAgo: number
}

export const dynamic    = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const posts = readJSON<WallPost[]>("wall.json", [])

  // Recalculate minutesAgo on every read
  const updated = posts.map(p => ({
    ...p,
    minutesAgo: Math.max(0, Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 60_000)),
  }))

  return NextResponse.json(updated)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { authorName, message, imageDataUrl, category, token } = body

    const expected = process.env.SHARE_TOKEN
    if (!expected || token !== expected) {
      return NextResponse.json({ error: "Invalid or expired share link." }, { status: 401 })
    }

    if (!authorName?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Name and message are required." }, { status: 400 })
    }

    // Limit image size to 400 KB (base64 ≈ 533 KB on wire)
    if (imageDataUrl && imageDataUrl.length > 550_000) {
      return NextResponse.json({ error: "Image too large — please use a smaller photo." }, { status: 400 })
    }

    const post: WallPost = {
      id:           crypto.randomUUID(),
      authorName:   authorName.trim().slice(0, 80),
      message:      message.trim().slice(0, 500),
      imageDataUrl: imageDataUrl ?? undefined,
      category:     category === "family" ? "family" : "friends",
      createdAt:    new Date().toISOString(),
      minutesAgo:   0,
    }

    const posts = readJSON<WallPost[]>("wall.json", [])
    const updated = [post, ...posts].slice(0, 200)   // keep last 200 posts
    writeJSON("wall.json", updated)

    return NextResponse.json(post, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 })
  }
}

