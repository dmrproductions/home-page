import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

// Uses Pollinations.ai — completely FREE, no API key required
// Generates a PURELY VISUAL background — no text, no words.
// Composition is right-weighted: left ~40% will be covered by a dark gradient overlay
// so visual interest should concentrate on the center-right.

export async function POST(req: NextRequest) {
  const { eventType, notes } = await req.json()

  const BASE: Record<string, string> = {
    birthday: [
      "luxurious birthday celebration background",
      "warm golden bokeh light orbs floating",
      "scattered rose petals and gold confetti",
      "soft cinematic depth of field",
      "rich amber and champagne color palette",
      "right side illuminated with warm golden glow",
      "left side naturally transitioning to darker tones",
    ].join(", "),

    anniversary: [
      "romantic anniversary background",
      "elegant champagne bubbles rising",
      "soft blush and gold bokeh particles",
      "delicate floral petals scattered",
      "candlelight warm atmospheric glow",
      "right side bright and luminous",
      "left side softly shadowed",
    ].join(", "),

    holiday: [
      "festive holiday celebration background",
      "twinkling light strings bokeh",
      "gold and jewel-tone color palette",
      "sparkling magical atmosphere",
      "right side vibrant and bright",
      "left side naturally darker",
    ].join(", "),

    custom: [
      "elegant special occasion background",
      "gold and warm light bokeh",
      "luxurious atmospheric glow",
      "soft abstract celebratory aesthetic",
      "right side brighter and more detailed",
      "left side transitioning to shadow",
    ].join(", "),
  }

  const styleBase = BASE[eventType as string] ?? BASE.custom
  const noteHint  = notes ? `, ${notes} themed atmosphere` : ""

  const prompt = [
    styleBase + noteHint,
    "ultra high definition photographic quality",
    "wide panoramic horizontal banner format 16:3 aspect ratio",
    "professional editorial luxury aesthetic",
    "NO text NO words NO letters NO numbers NO typography NO watermarks NO logos",
    "pure abstract visual only",
  ].join(", ")

  const negative = "text, words, letters, numbers, typography, font, watermark, logo, signature, writing, captions, title, inscription, label"

  const seed    = Math.floor(Math.random() * 999999)
  const encoded = encodeURIComponent(prompt)
  const negEnc  = encodeURIComponent(negative)

  const bannerUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1792&height=448&model=flux&nologo=true&seed=${seed}&negative=${negEnc}&enhance=true`

  return NextResponse.json({ bannerUrl })
}
