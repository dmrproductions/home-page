import { NextResponse } from "next/server"
import Parser from "rss-parser"
import { readJSON } from "@/lib/store"
import type { FollowCategory } from "@/types"
import type { SocialChannel, ChannelsStore } from "@/app/api/channels/route"
import type { NewsFeed } from "@/lib/feed-defaults"
import { DEFAULT_FEEDS } from "@/lib/feed-defaults"

/* ─── Built-in feed registry ─────────────────────────────── */
const BUILTIN_FEEDS: { url: string; category: FollowCategory; source: string; urgent?: boolean }[] = [
  { url: "https://www.tmz.com/rss.xml",                                       category: "celebrities", source: "TMZ",             urgent: true },
  { url: "https://pagesix.com/feed/",                                          category: "celebrities", source: "Page Six"                       },
  { url: "https://www.eonline.com/syndication/feeds/rssfeeds/topstories.xml",  category: "celebrities", source: "E! News"                        },
  { url: "https://www.billboard.com/feed/",                                    category: "celebrities", source: "Billboard"                       },
  { url: "https://wwd.com/feed/",                                              category: "industry",    source: "WWD"                             },
  { url: "https://fashionista.com/.rss/full/",                                 category: "industry",    source: "Fashionista"                     },
  { url: "https://www.vogue.com/feed/rss",                                     category: "industry",    source: "Vogue"                           },
  { url: "https://fortune.com/feed/",                                          category: "businesses",  source: "Fortune"                         },
  { url: "https://feeds.businessinsider.com/custom/all",                       category: "businesses",  source: "Business Insider"                },
]

/* ─── RSS parser ─────────────────────────────────────────── */
type MediaEntry = { $?: { url?: string; width?: string; height?: string }; url?: string }
type CustomItem = {
  "media:content"?:    MediaEntry | MediaEntry[]
  "media:thumbnail"?:  MediaEntry | MediaEntry[]
  "media:group"?:      { "media:thumbnail"?: MediaEntry | MediaEntry[] }
  "content:encoded"?:  string
  enclosure?:          { url?: string; type?: string }
}

const parser = new Parser<Record<string, unknown>, CustomItem>({
  timeout: 9000,
  customFields: {
    item: [
      ["media:content",   "media:content",   { keepArray: true  }],
      ["media:thumbnail", "media:thumbnail", { keepArray: false }],
      ["media:group",     "media:group",     { keepArray: false }],
      ["content:encoded", "content:encoded"],
    ],
  },
})

/* ─── Image extraction ───────────────────────────────────── */
function pickUrl(e?: MediaEntry | null): string | null {
  if (!e) return null
  const u = e.$?.url ?? e.url
  return u ? decodeURIComponent(u) : null
}

function extractImage(item: CustomItem & { link?: string }): string | null {
  // YouTube: derive thumbnail from video URL
  const ytId = item.link?.match(/[?&]v=([\w-]{11})/)?.[1]
  if (ytId) return `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`

  // media:group → media:thumbnail (YouTube Atom)
  const group = item["media:group"]
  if (group) {
    const gt = group["media:thumbnail"]
    const url = pickUrl(Array.isArray(gt) ? gt[0] : gt)
    if (url) return url
  }

  // media:content array
  const mc = item["media:content"]
  if (Array.isArray(mc)) {
    const img = mc.find((e: Record<string, unknown>) => { const attrs = e.$ as Record<string, string> | undefined; return !attrs?.medium || attrs?.medium === "image" }) ?? mc[0]
    const url = pickUrl(img)
    if (url) return url
  } else if (mc) {
    const url = pickUrl(mc)
    if (url) return url
  }

  // media:thumbnail
  const mt = item["media:thumbnail"]
  const tu = pickUrl(Array.isArray(mt) ? mt[0] : mt)
  if (tu) return tu

  // enclosure
  if (item.enclosure?.url) return decodeURIComponent(item.enclosure.url)

  // first <img> in content:encoded
  if (item["content:encoded"]) {
    const m = item["content:encoded"].match(/<img[^>]+src=["']([^"']+)["']/i)
    if (m?.[1]) return m[1]
  }

  return null
}


/* ─── Open Graph image fallback ─────────────────────────── */
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(3500),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DMRHomepageBot/1.0)",
        "Accept": "text/html",
      },
    })
    if (!res.ok) return null
    const html = await res.text()
    // og:image
    const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
    if (og?.[1] && og[1].startsWith("http")) return og[1]
    // twitter:image
    const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
    if (tw?.[1] && tw[1].startsWith("http")) return tw[1]
  } catch { /* timeout or fetch error */ }
  return null
}

/* ─── YouTube handle → channel ID resolver ──────────────── */
async function resolveYouTubeHandle(handle: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.youtube.com/@${handle}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal:  AbortSignal.timeout(6000),
    })
    const html = await res.text()
    const m = html.match(/"channelId":"(UC[\w-]{22})"/)
    return m ? `https://www.youtube.com/feeds/videos.xml?channel_id=${m[1]}` : null
  } catch {
    return null
  }
}

/* ─── HTML entity cleaner ────────────────────────────────── */
function clean(s: string) {
  return s
    .replace(/&#8217;|&#039;/g, "'").replace(/&#8216;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"').replace(/&#8211;/g, "–").replace(/&#8212;/g, "—")
    .replace(/&amp;/g, "&").replace(/&hellip;/g, "…").replace(/<[^>]+>/g, "").trim()
}
function titleSeed(t: string) {
  return encodeURIComponent(t.slice(0, 30).toLowerCase().replace(/\W+/g, "-"))
}

/* ─── Free News API type definitions ───────────────────── */
type GNewsArticle = {
  title?: string; url?: string; image?: string; publishedAt?: string
  source?: { name?: string }
}
type GuardianResult = {
  webTitle?: string; webPublicationDate?: string; webUrl?: string
  fields?: { thumbnail?: string; headline?: string }
}
type NewsDataResult = {
  title?: string; link?: string; image_url?: string | null
  pubDate?: string; source_id?: string; category?: string[]
}

function mapNewsDataCat(cats?: string[]): FollowCategory {
  const c = (cats?.[0] ?? "").toLowerCase()
  if (c === "entertainment") return "celebrities"
  if (c === "business" || c === "technology") return "businesses"
  if (c === "sports" || c === "science" || c === "health") return "industry"
  return "celebrities"
}

/* ─── GNews top-headlines fetcher ───────────────────────── */
async function fetchGNews(apiKey: string) {
  const url = `https://gnews.io/api/v4/top-headlines?lang=en&max=10&apikey=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`GNews ${res.status}`)
  const data = await res.json() as { articles?: GNewsArticle[] }
  return (data.articles ?? []).map((a, i) => {
    const pubDate = a.publishedAt ? new Date(a.publishedAt) : new Date()
    const minutesAgo = Math.max(0, Math.floor((Date.now() - pubDate.getTime()) / 60_000))
    const src = a.source?.name ?? "GNews"
    return {
      id: `gnews-${i}-${pubDate.getTime()}`,
      name: src, category: "celebrities" as FollowCategory,
      update: clean(a.title ?? ""), platform: src,
      minutesAgo, urgent: minutesAgo < 30,
      initials: src.slice(0, 2).toUpperCase(),
      imageUrl: a.image ?? `https://picsum.photos/seed/${titleSeed(a.title ?? "")}/800/420`,
      link: a.url ?? "#", isReal: true,
    }
  })
}

/* ─── The Guardian API fetcher ───────────────────────────── */
async function fetchGuardian(apiKey: string) {
  const url = `https://content.guardianapis.com/search?show-fields=thumbnail,headline&order-by=newest&page-size=15&api-key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`Guardian ${res.status}`)
  const data = await res.json() as { response?: { results?: GuardianResult[] } }
  return (data.response?.results ?? []).map((r, i) => {
    const pubDate = r.webPublicationDate ? new Date(r.webPublicationDate) : new Date()
    const minutesAgo = Math.max(0, Math.floor((Date.now() - pubDate.getTime()) / 60_000))
    const title = r.fields?.headline ?? r.webTitle ?? ""
    return {
      id: `guardian-${i}-${pubDate.getTime()}`,
      name: "The Guardian", category: "businesses" as FollowCategory,
      update: clean(title), platform: "The Guardian",
      minutesAgo, urgent: minutesAgo < 30,
      initials: "GU",
      imageUrl: r.fields?.thumbnail ?? `https://picsum.photos/seed/${titleSeed(title)}/800/420`,
      link: r.webUrl ?? "#", isReal: true,
    }
  })
}

/* ─── NewsData.io API fetcher ────────────────────────────── */
async function fetchNewsData(apiKey: string) {
  const url = `https://newsdata.io/api/1/news?apikey=${encodeURIComponent(apiKey)}&language=en&size=10`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`NewsData ${res.status}`)
  const data = await res.json() as { results?: NewsDataResult[] }
  return (data.results ?? []).map((r, i) => {
    const pubDate = r.pubDate ? new Date(r.pubDate) : new Date()
    const minutesAgo = Math.max(0, Math.floor((Date.now() - pubDate.getTime()) / 60_000))
    const src = r.source_id ?? "NewsData"
    return {
      id: `newsdata-${i}-${pubDate.getTime()}`,
      name: src, category: mapNewsDataCat(r.category),
      update: clean(r.title ?? ""), platform: src,
      minutesAgo, urgent: minutesAgo < 30,
      initials: src.slice(0, 2).toUpperCase(),
      imageUrl: r.image_url ?? `https://picsum.photos/seed/${titleSeed(r.title ?? "")}/800/420`,
      link: r.link ?? "#", isReal: true,
    }
  })
}

/* ─── Parse a single feed into NewsAlert-shaped items ───── */
async function parseFeed(feedUrl: string, source: string, category: FollowCategory, urgent = false) {
  // Resolve YouTube handles at runtime
  let resolvedUrl = feedUrl
  if (feedUrl.startsWith("youtube-handle:")) {
    const handle = feedUrl.replace("youtube-handle:", "")
    resolvedUrl = (await resolveYouTubeHandle(handle)) ?? ""
    if (!resolvedUrl) throw new Error(`Could not resolve YouTube handle @${handle}`)
  }

  const parsed = await parser.parseURL(resolvedUrl)
  const sliced = parsed.items.slice(0, 10)
  const base = sliced.map((item, i) => {
    const imageUrl = extractImage(item as CustomItem & { link?: string })
    const pubDate    = item.pubDate ? new Date(item.pubDate) : new Date()
    const minutesAgo = Math.max(0, Math.floor((Date.now() - pubDate.getTime()) / 60_000))
    return {
      id:         `${source}-${i}-${pubDate.getTime()}`,
      name:       source,
      category,
      update:     clean(item.title ?? ""),
      platform:   source,
      minutesAgo,
      urgent:     urgent && minutesAgo < 60,
      initials:   source.slice(0, 2).toUpperCase(),
      imageUrl,
      link:       item.link ?? "#",
      isReal:     true,
      _rawLink:   item.link ?? "",
    }
  })

  // Parallel OG fallback for items with no image (max 5 per feed, 3.5s timeout each)
  const needsOg = base.filter(it => !it.imageUrl && it._rawLink).slice(0, 5)
  if (needsOg.length > 0) {
    const ogResults = await Promise.allSettled(needsOg.map(it => fetchOgImage(it._rawLink)))
    ogResults.forEach((res, i) => {
      if (res.status === "fulfilled" && res.value) {
        const idx = base.findIndex(it => it.id === needsOg[i].id)
        if (idx >= 0) base[idx].imageUrl = res.value
      }
    })
  }

  return base.map(it => ({
    id: it.id, name: it.name, category: it.category, update: it.update,
    platform: it.platform, minutesAgo: it.minutesAgo, urgent: it.urgent,
    initials: it.initials,
    imageUrl: it.imageUrl ?? `https://picsum.photos/seed/${titleSeed(it.update)}/800/420`,
    link: it.link, isReal: it.isReal,
  }))
}

/* ─── Route handler ──────────────────────────────────────── */
export const dynamic    = "force-dynamic"
export const revalidate = 0

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const gnewsKey    = (searchParams.get("gnews")    ?? "").trim()
  const guardianKey = (searchParams.get("guardian") ?? "").trim()
  const newsdataKey = (searchParams.get("newsdata") ?? "").trim()

  // Client sends its localStorage feeds as JSON in ?feeds=
  let managedFeeds: NewsFeed[] = DEFAULT_FEEDS
  const feedsParam = searchParams.get("feeds")
  if (feedsParam) {
    try { managedFeeds = JSON.parse(decodeURIComponent(feedsParam)) as NewsFeed[] } catch {}
  } else {
    // Fall back to server-side file store (legacy / first load)
    interface FeedsStore { feeds: NewsFeed[] }
    const fs2 = readJSON<FeedsStore>("feeds.json", { feeds: DEFAULT_FEEDS })
    managedFeeds = fs2.feeds ?? DEFAULT_FEEDS
  }
  const enabledFeeds = managedFeeds.filter(f => f.enabled)

  // Client sends its localStorage channels as JSON in ?channels=
  let userChannels: SocialChannel[] = []
  const channelsParam = searchParams.get("channels")
  if (channelsParam) {
    try {
      const parsed = JSON.parse(decodeURIComponent(channelsParam)) as Array<{id:string;type:string;label:string;feedUrl:string;category:string}>
      userChannels = parsed.map(c => ({ ...c, feedUrl: c.feedUrl } as SocialChannel))
    } catch {}
  } else {
    const chanStore = readJSON<ChannelsStore>("channels.json", { youtube: [], facebook: [], instagram: [], rss: [] })
    userChannels = [
      ...(chanStore.youtube   ?? []),
      ...(chanStore.facebook  ?? []),
      ...(chanStore.instagram ?? []),
      ...(chanStore.rss       ?? []),
    ]
  }

  const builtinJobs = enabledFeeds.map(f => ({
    url: f.url, source: f.source, category: f.category as FollowCategory, urgent: f.source === "TMZ",
  }))
  const userJobs = userChannels.map(c => ({
    url: c.feedUrl, source: c.label, category: c.category, urgent: false,
  }))

  const allJobs = [...builtinJobs, ...userJobs]

  const settled = await Promise.allSettled(
    allJobs.map(j => parseFeed(j.url, j.source, j.category, j.urgent))
  )

  const succeeded: string[] = []
  const errors:    string[] = []

  const items = settled.flatMap((r, i) => {
    if (r.status === "fulfilled") {
      succeeded.push(allJobs[i].source)
      return r.value
    } else {
      errors.push(`${allJobs[i].source}: ${(r.reason as Error)?.message ?? "error"}`)
      return []
    }
  })

  // Free News API calls (only if keys provided)
  const apiJobs: { label: string; fn: () => Promise<typeof items[number][]> }[] = []
  if (gnewsKey)    apiJobs.push({ label: "GNews",       fn: () => fetchGNews(gnewsKey) })
  if (guardianKey) apiJobs.push({ label: "The Guardian", fn: () => fetchGuardian(guardianKey) })
  if (newsdataKey) apiJobs.push({ label: "NewsData",    fn: () => fetchNewsData(newsdataKey) })

  if (apiJobs.length > 0) {
    const apiSettled = await Promise.allSettled(apiJobs.map(j => j.fn()))
    apiSettled.forEach((r, i) => {
      if (r.status === "fulfilled") {
        succeeded.push(apiJobs[i].label)
        items.push(...r.value)
      } else {
        errors.push(`${apiJobs[i].label}: ${(r.reason as Error)?.message ?? "error"}`)
      }
    })
  }

  // Deduplicate + sort newest first
  const seen = new Set<string>()
  const deduped = items
    .sort((a, b) => a.minutesAgo - b.minutesAgo)
    .filter(a => {
      const key = a.update.slice(0, 60).toLowerCase()
      if (seen.has(key) || a.update.length < 5) return false
      seen.add(key)
      return true
    })

  if (errors.length) console.warn("[news] Feed errors:", errors)

  return NextResponse.json({ items: deduped, succeeded, errors, fetchedAt: new Date().toISOString() })
}
