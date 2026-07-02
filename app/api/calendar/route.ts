import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

/* ── ICAL line-unfolding ─────────────────────── */
function unfold(text: string): string {
  return text.replace(/\r?\n[ \t]/g, "")
}

/* ── Parse a DTSTART / DTEND value string → Date ─ */
function parseIcalDate(raw: string): Date | null {
  const v = raw.trim()
  // All-day: YYYYMMDD
  if (/^\d{8}$/.test(v)) {
    return new Date(`${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T00:00:00`)
  }
  // UTC: YYYYMMDDTHHmmssZ
  if (/^\d{8}T\d{6}Z$/.test(v)) {
    return new Date(
      `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T${v.slice(9,11)}:${v.slice(11,13)}:${v.slice(13,15)}Z`
    )
  }
  // Local: YYYYMMDDTHHmmss
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/)
  if (m) {
    return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`)
  }
  return null
}

/* ── Extract value after the last colon on a line ─ */
function lineValue(line: string): string {
  const idx = line.indexOf(":")
  return idx >= 0 ? line.slice(idx + 1).trim() : ""
}

/* ── Unescape ICAL text ─────────────────────── */
function unescape(s: string): string {
  return s.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\")
}

/* ── Check if an RRULE event recurs in the next N days ─ */
function nextRruleOccurrence(rrule: string, dtstart: Date, windowEnd: Date): Date | null {
  const now = new Date()
  // Only handle FREQ=YEARLY (birthdays, anniversaries)
  if (!rrule.includes("FREQ=YEARLY")) return null

  const nextYear = new Date(dtstart)
  // Try this calendar year and next
  for (const yr of [now.getFullYear(), now.getFullYear() + 1]) {
    nextYear.setFullYear(yr)
    if (nextYear >= now && nextYear <= windowEnd) return new Date(nextYear)
  }
  return null
}

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  location?: string
  imageUrl?: string       // from ATTACH or <img> in description
  imageSource?: string    // debug: "attach" | "description" | "none"
  date: string            // ISO string
  isAllDay: boolean
  daysUntil: number
}


/* ── Extract image URL from ATTACH lines ─────── */
/* ── Convert Google Drive view URL → direct image URL ── */
function driveDirectUrl(url: string): string {
  // https://drive.google.com/file/d/FILE_ID/view → https://drive.google.com/uc?export=view&id=FILE_ID
  const m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/)
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`
  // https://drive.google.com/open?id=FILE_ID
  const m2 = url.match(/drive\.google\.com\/open\?id=([^&]+)/)
  if (m2) return `https://drive.google.com/uc?export=view&id=${m2[1]}`
  return url
}

function extractAttachImage(lines: Record<string, string>): string | undefined {
  // Tries multiple fallback strategies to extract an image URL from ATTACH properties.
  // Google Calendar ATTACH formats seen in the wild:
  //   ATTACH;FMTTYPE=image/jpeg:https://drive.google.com/file/d/ID/view
  //   ATTACH;VALUE=URI;FMTTYPE=image/jpeg:https://...
  //   ATTACH;FILENAME=photo.jpg;FMTTYPE=image/jpeg;X-APPLE-FILENAME=photo.jpg:https://...
  //   ATTACH:https://example.com/photo.jpg
  //   ATTACH;VALUE=URI:https://drive.google.com/file/d/ID/view
  for (const [key, line] of Object.entries(lines)) {
    if (!key.startsWith("ATTACH")) continue
    // IMPORTANT: use indexOf (first colon) — lastIndexOf would hit "https://"
    const colonIdx = line.indexOf(":")
    if (colonIdx < 0) continue
    const rawUrl = line.slice(colonIdx + 1).trim()
    if (!rawUrl.startsWith("http")) continue
    const isImageMime = key.includes("FMTTYPE=IMAGE") || key.includes("FMTTYPE=image")
    const isImageExt  = /\.(jpe?g|png|gif|webp|avif|svg)(\?|$)/i.test(rawUrl)
    const isImageHost = rawUrl.includes("drive.google.com") ||
                        rawUrl.includes("photos.google.com") ||
                        rawUrl.includes("lh3.googleusercontent.com") ||
                        rawUrl.includes("googleusercontent.com")
    if (isImageMime || isImageExt || isImageHost) return driveDirectUrl(rawUrl)
  }
  // Last resort: accept any ATTACH http URL regardless of type
  for (const [key, line] of Object.entries(lines)) {
    if (!key.startsWith("ATTACH")) continue
    const colonIdx = line.indexOf(":")
    if (colonIdx < 0) continue
    const rawUrl = line.slice(colonIdx + 1).trim()
    if (rawUrl.startsWith("http")) return driveDirectUrl(rawUrl)
  }
  return undefined
}

/* ── Extract first <img src> from HTML description ── */
function extractDescriptionImage(desc: string): string | undefined {
  const m = desc.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (m && m[1].startsWith("http")) return m[1]
  // Also try bare URLs ending in image extension
  const m2 = desc.match(/https?:\/\/\S+\.(?:jpe?g|png|gif|webp)(\?\S*)?/i)
  if (m2) return m2[0]
  return undefined
}

function parseIcal(text: string): CalendarEvent[] {
  const unfolded = unfold(text)
  const lines = unfolded.split(/\r?\n/)

  const events: CalendarEvent[] = []
  let inEvent = false
  let cur: Record<string, string> = {}

  for (const raw of lines) {
    const line = raw.trim()
    if (line === "BEGIN:VEVENT") { inEvent = true; cur = {}; continue }
    if (line === "END:VEVENT")   {
      inEvent = false
      // Process cur
      const summary     = unescape(lineValue(cur["SUMMARY"] ?? ""))
      const description = cur["DESCRIPTION"] ? unescape(lineValue(cur["DESCRIPTION"])) : undefined
      const location    = cur["LOCATION"]    ? unescape(lineValue(cur["LOCATION"]))    : undefined
      const uid         = lineValue(cur["UID"] ?? "") || `evt-${Math.random()}`
      // Image: try ATTACH first, then fall back to <img> in description
      const attachImg = extractAttachImage(cur)
      const descImg   = description ? extractDescriptionImage(description) : undefined
      const imageUrl  = attachImg ?? descImg
      const imageSource: string = attachImg ? "attach" : descImg ? "description" : "none"

      // Determine dtstart — the key might be "DTSTART" or "DTSTART;VALUE=DATE" or "DTSTART;TZID=..."
      const dtstartKey = Object.keys(cur).find(k => k.startsWith("DTSTART"))
      const dtstartRaw = dtstartKey ? cur[dtstartKey] : ""
      const isAllDay   = dtstartKey?.includes("VALUE=DATE") || (!dtstartRaw.includes("T"))
      const dtstart    = parseIcalDate(lineValue(dtstartRaw))

      const rruleKey  = Object.keys(cur).find(k => k.startsWith("RRULE"))
      const rrule     = rruleKey ? cur[rruleKey] : ""

      events.push({ uid, summary, description, location, imageUrl, imageSource, dtstart, isAllDay, rrule } as never)
      cur = {}
      continue
    }
    if (!inEvent) continue

    // Store key → rest-of-line (includes the colon+value, lineValue will extract)
    const colonIdx = line.indexOf(":")
    if (colonIdx < 0) continue
    const key = line.slice(0, colonIdx).trim().toUpperCase()
    cur[key] = line  // store full line so lineValue can parse it
  }

  return events as never
}

export async function POST(req: Request) {
  let url: string | null = null
  try {
    const body = await req.json()
    url = typeof body?.url === "string" ? body.url : null
  } catch {
    return NextResponse.json({ events: [] })
  }

  if (!url) return NextResponse.json({ events: [] })

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "Accept": "text/calendar, */*" },
    })
    if (!res.ok) throw new Error(`Calendar fetch failed: ${res.status}`)
    const text = await res.text()

    if (!text.includes("BEGIN:VCALENDAR")) {
      throw new Error("Not a valid iCal feed — check your URL")
    }

    const rawEvents = parseIcal(text) as unknown as Array<{
      uid: string; summary: string; description?: string; location?: string; imageUrl?: string; imageSource?: string
      dtstart: Date | null; isAllDay: boolean; rrule: string
    }>

    const now = new Date()
    const windowEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    // Include today and up to 7 days from now
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const result: CalendarEvent[] = []

    for (const e of rawEvents) {
      if (!e.summary) continue

      let occurrenceDate: Date | null = null

      // One-time event within window
      if (e.dtstart && e.dtstart >= startOfToday && e.dtstart <= windowEnd) {
        occurrenceDate = e.dtstart
      }
      // Recurring event — find next occurrence
      else if (e.rrule && e.dtstart) {
        occurrenceDate = nextRruleOccurrence(e.rrule, e.dtstart, windowEnd)
      }

      if (!occurrenceDate) continue

      const daysUntil = Math.ceil(
        (occurrenceDate.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000)
      )

      result.push({
        id:          `cal-${e.uid.replace(/[^a-zA-Z0-9]/g, "-")}`,
        summary:     e.summary,
        description: e.description,
        location:    e.location,
        imageUrl:    e.imageUrl,
        imageSource: e.imageSource,
        date:        occurrenceDate.toISOString(),
        isAllDay:    e.isAllDay,
        daysUntil,
      })
    }

    result.sort((a, b) => a.daysUntil - b.daysUntil)

    return NextResponse.json({ events: result })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message, events: [] }, { status: 200 })
  }
}
