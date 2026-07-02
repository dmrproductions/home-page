import type { AppItem, FollowedPerson, NewsAlert } from "@/types"

const img = (seed: string, w = 800, h = 420) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`

export const DEFAULT_APPS: AppItem[] = [
  { id: "a1", name: "Magica",       emoji: "🌌", url: "https://galaxy.ai",           category: "ai-tools" },
  { id: "a2", name: "ChatGPT",     emoji: "🤖", url: "https://chatgpt.com",         category: "ai-tools" },
  { id: "a3", name: "Claude",      emoji: "🧠", url: "https://claude.ai",           category: "ai-tools" },
  { id: "a4", name: "Gemini",      emoji: "✨", url: "https://gemini.google.com",   category: "ai-tools" },
  { id: "a5", name: "Midjourney",  emoji: "🎨", url: "https://midjourney.com",      category: "ai-tools" },
  { id: "a6", name: "Perplexity",  emoji: "🔍", url: "https://perplexity.ai",       category: "ai-tools" },
  { id: "a7", name: "NotebookLM",  emoji: "📒", url: "https://notebooklm.google.com", category: "ai-tools" },
  { id: "a8", name: "Jules",        emoji: "🛠️", url: "https://jules.google.com",      category: "ai-tools" },
  { id: "a9", name: "Genspark",     emoji: "⚡", url: "https://www.genspark.ai",       category: "ai-tools" },
  { id: "a10", name: "Kimi",        emoji: "🌙", url: "https://kimi.ai",               category: "ai-tools" },
  { id: "a11", name: "Raphael AI",  emoji: "🎭", url: "https://raphael.app",           category: "ai-tools" },
  { id: "s1", name: "Instagram",   emoji: "📸", url: "https://instagram.com",       category: "social" },
  { id: "s2", name: "Twitter/X",   emoji: "🐦", url: "https://x.com",              category: "social" },
  { id: "s3", name: "Facebook",    emoji: "👤", url: "https://facebook.com",        category: "social" },
  { id: "s4", name: "LinkedIn",    emoji: "💼", url: "https://linkedin.com",        category: "social" },
  { id: "s5", name: "YouTube",     emoji: "▶️", url: "https://youtube.com",         category: "social" },
  { id: "s6", name: "TikTok",      emoji: "🎵", url: "https://tiktok.com",          category: "social" },
  { id: "p1", name: "Gmail",       emoji: "📧", url: "https://mail.google.com",     category: "productivity" },
  { id: "p2", name: "Drive",       emoji: "📁", url: "https://drive.google.com",    category: "productivity" },
  { id: "p3", name: "Calendar",    emoji: "📅", url: "https://calendar.google.com", category: "productivity" },
  { id: "p4", name: "Notion",      emoji: "📝", url: "https://notion.so",           category: "productivity" },
  { id: "p5", name: "Slack",       emoji: "💬", url: "https://slack.com",           category: "productivity" },
  { id: "p6", name: "Zoom",        emoji: "📹", url: "https://zoom.us",             category: "productivity" },
  { id: "p7", name: "Yahoo",        emoji: "💜", url: "https://yahoo.com",             category: "productivity" },
  { id: "p8", name: "Hotmail",      emoji: "📨", url: "https://outlook.live.com",      category: "productivity" },
  { id: "f1", name: "Vogue",       emoji: "👗", url: "https://vogue.com",           category: "fashion" },
  { id: "f2", name: "WWD",         emoji: "📰", url: "https://wwd.com",             category: "fashion" },
  { id: "f3", name: "Fashion TV",  emoji: "🎬", url: "https://ftv.com",             category: "fashion" },
  { id: "f4", name: "FITC Mag",    emoji: "✨", url: "#",                           category: "fashion" },
  { id: "f5", name: "Runway",      emoji: "🚀", url: "#",                                    category: "fashion" },
  { id: "f6", name: "DMR Newsletter", emoji: "🐝", url: "https://dmr-newsletter.beehiiv.com/", category: "fashion" },
  { id: "e1", name: "Spotify",     emoji: "🎵", url: "https://spotify.com",         category: "entertainment" },
  { id: "e2", name: "Netflix",     emoji: "🎬", url: "https://netflix.com",         category: "entertainment" },
  { id: "e3", name: "Apple TV",    emoji: "🍎", url: "https://tv.apple.com",        category: "entertainment" },
  { id: "e4",  name: "Disney+",       emoji: "🏰", url: "https://disneyplus.com",      category: "entertainment" },
  { id: "e5",  name: "Hulu",          emoji: "🟢", url: "https://hulu.com",             category: "entertainment" },
  { id: "e6",  name: "HBO Max",        emoji: "👑", url: "https://max.com",              category: "entertainment" },
  { id: "e7",  name: "Xfinity",        emoji: "📡", url: "https://xfinity.com",          category: "entertainment" },
  { id: "e8",  name: "Prime Video",    emoji: "🎥", url: "https://primevideo.com",       category: "entertainment" },
  { id: "e9",  name: "Starz",          emoji: "⭐", url: "https://starz.com",            category: "entertainment" },
  { id: "e10", name: "Tubi",           emoji: "🆓", url: "https://tubitv.com",           category: "entertainment" },
  { id: "e11", name: "Apple Music",    emoji: "🎵", url: "https://music.apple.com",      category: "entertainment" },
  { id: "e12", name: "YouTube Music",  emoji: "🎶", url: "https://music.youtube.com",    category: "entertainment" },
]

export const DEFAULT_FOLLOWS: FollowedPerson[] = [
  { id: "f1", name: "Beyoncé",        handle: "@beyonce",      category: "celebrities", initials: "BY", avatarUrl: "https://picsum.photos/seed/beyonce-avatar/80/80",       latestUpdate: "New Renaissance World Tour photos from London 🎤 The crowd was ELECTRIC", platform: "Instagram", minutesAgo: 5,  isLive: false },
  { id: "f2", name: "Naomi Campbell", handle: "@naomi",        category: "celebrities", initials: "NC", avatarUrl: "https://picsum.photos/seed/naomi-campbell-av/80/80",    latestUpdate: "Fashion for Relief charity gala in NYC this December — tickets on sale now", platform: "Twitter/X",  minutesAgo: 12, isLive: false },
  { id: "f3", name: "Rihanna",        handle: "@badgalriri",   category: "celebrities", initials: "RH", avatarUrl: "https://picsum.photos/seed/rihanna-avatar/80/80",       latestUpdate: "Fenty Beauty Gloss Bomb Ultra drops TOMORROW — limited edition, do not sleep!", platform: "Instagram", minutesAgo: 38, isLive: false },
  { id: "f4", name: "Vogue Magazine", handle: "@voguemagazine",category: "businesses",  initials: "VG", avatarUrl: "https://picsum.photos/seed/vogue-magazine-av/80/80",    latestUpdate: "EXCLUSIVE: September Issue cover model announcement coming tomorrow at midnight", platform: "Instagram", minutesAgo: 23, isLive: false },
  { id: "f5", name: "WWD",            handle: "@wwd",          category: "businesses",  initials: "WD", avatarUrl: "https://picsum.photos/seed/wwd-fashion-av/80/80",       latestUpdate: "Paris Fashion Week Fall 2026 dates officially confirmed — save the dates", platform: "WWD.com",    minutesAgo: 67, isLive: false },
  { id: "f6", name: "DMR Beehiive",   handle: "@dmrbeehiive",  category: "businesses",  initials: "DB", avatarUrl: "https://picsum.photos/seed/dmr-beehiive-av/80/80",     latestUpdate: "🔥 Season 21 casting call is OPEN — 200+ registrations in the first hour!", platform: "Instagram", minutesAgo: 1,  isLive: true  },
  { id: "f7", name: "James Head",     handle: "@jameshead",    category: "industry",    initials: "JH", avatarUrl: "https://picsum.photos/seed/james-head-designer/80/80", latestUpdate: "MC Hammer 20th Anniversary collab preview just dropped — going viral 🔥", platform: "Instagram", minutesAgo: 55, isLive: false },
  { id: "f8", name: "Fashion Week",   handle: "@fashionwknyc", category: "industry",    initials: "FW", avatarUrl: "https://picsum.photos/seed/fashion-week-nyc/80/80",    latestUpdate: "Day 3 roundup live — bold maximalism is officially IN for Fall 2026", platform: "TikTok",     minutesAgo: 89, isLive: false },
  { id: "f9", name: "RunwayConnect",  handle: "@runwayconnect",category: "businesses",  initials: "RC", avatarUrl: "https://picsum.photos/seed/runwayconnect-av/80/80",    latestUpdate: "Season 21 model registrations now live — upload your comp card today", platform: "Website",    minutesAgo: 15, isLive: false },
]

export const INITIAL_ALERTS: NewsAlert[] = [
  {
    id: "n1", name: "DMR Beehiive", category: "businesses",
    update: "Season 21 Casting Call OPEN — Over 200 Registrations in the First Hour, Setting a New Record",
    platform: "Instagram", minutesAgo: 1, urgent: true, initials: "DB",
    imageUrl: img("dmr-fashion-show", 800, 420),
  },
  {
    id: "n2", name: "Beyoncé", category: "celebrities",
    update: "Surprise Album Announcement Drops — 12 Million Instagram Likes in 20 Minutes as Servers Struggle",
    platform: "Instagram", minutesAgo: 5, urgent: true, initials: "BY",
    imageUrl: img("concert-stage-lights", 800, 420),
  },
  {
    id: "n3", name: "Vogue Magazine", category: "businesses",
    update: "September Issue Cover Reveal: Editor Calls It 'The Most Iconic Cover in Thirty Years'",
    platform: "Vogue.com", minutesAgo: 15, urgent: false, initials: "VG",
    imageUrl: img("fashion-magazine-editorial", 800, 420),
  },
  {
    id: "n4", name: "Rihanna", category: "celebrities",
    update: "Spotted Arriving at the Paris Fenty Showroom in Custom Balenciaga — Paparazzi Waiting Outside for Hours",
    platform: "Twitter/X", minutesAgo: 28, urgent: false, initials: "RH",
    imageUrl: img("paris-fashion-street", 800, 420),
  },
  {
    id: "n5", name: "WWD", category: "businesses",
    update: "Paris Fashion Week Fall 2026 Lineup Drops Monday — Three Surprise Debutante Houses Joining the Roster",
    platform: "WWD.com", minutesAgo: 41, urgent: false, initials: "WD",
    imageUrl: img("runway-show-models", 800, 420),
  },
  {
    id: "n6", name: "James Head", category: "industry",
    update: "MC Hammer 20th Anniversary Collab Goes Viral on TikTok — Half a Million Views Per Hour",
    platform: "TikTok", minutesAgo: 55, urgent: false, initials: "JH",
    imageUrl: img("fashion-designer-studio", 800, 420),
  },
  {
    id: "n7", name: "Naomi Campbell", category: "celebrities",
    update: "Spotted at JFK With Mystery Companion — Fashion for Relief NYC Gala Now Officially Confirmed",
    platform: "Instagram", minutesAgo: 72, urgent: false, initials: "NC",
    imageUrl: img("model-airport-fashion", 800, 420),
  },
  {
    id: "n8", name: "Fashion Week NYC", category: "industry",
    update: "Trend Alert: 'Quiet Luxury Is Dead' — Bold Maximalism Sweeps Day Three Street Style Coverage",
    platform: "TikTok", minutesAgo: 88, urgent: false, initials: "FW",
    imageUrl: img("street-style-fashion", 800, 420),
  },
]

export const SIMULATED_NEW_ALERTS: Omit<NewsAlert, "id" | "minutesAgo">[] = [
  {
    name: "Fashion Week NYC", category: "industry",
    update: "Day Four Street Style: Iridescent Fabrics and Statement Boots Are Everywhere You Look",
    platform: "Instagram", urgent: false, initials: "FW",
    imageUrl: img("fashion-week-street", 800, 420),
  },
  {
    name: "Beyoncé", category: "celebrities",
    update: "Beyoncé Goes LIVE on Instagram — 2.4 Million Concurrent Viewers Watching Right Now",
    platform: "Instagram", urgent: true, initials: "BY",
    imageUrl: img("live-performance-stage", 800, 420),
  },
  {
    name: "Vogue Magazine", category: "businesses",
    update: "Full September Issue Cover Just Revealed — The Internet Is Going Wild Across All Platforms",
    platform: "Instagram", urgent: true, initials: "VG",
    imageUrl: img("fashion-cover-shoot", 800, 420),
  },
  {
    name: "RunwayConnect", category: "businesses",
    update: "Season 21 Callbacks Posted — Check RunwayConnect Now for Your Casting Status",
    platform: "Website", urgent: false, initials: "RC",
    imageUrl: img("casting-call-models", 800, 420),
  },
]
