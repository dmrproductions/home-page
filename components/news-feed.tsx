"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { feedsStore, channelsStore } from "@/lib/local-store"
import { feedCache } from "@/lib/feed-cache"
import { RefreshCw, X, ExternalLink, ChevronLeft, ChevronRight,
         Camera, Zap, FlameKindling, Wifi, WifiOff, Heart, Star,
         TrendingUp, ChevronDown, ChevronUp, Pencil, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { INITIAL_ALERTS } from "@/lib/data"
import type { NewsAlert, FollowCategory } from "@/types"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import type { FamilyEvent } from "@/types"
import type { WallPost } from "@/app/api/wall/route"

/* ══════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════ */
type FeedItem = (NewsAlert & { _wall?: WallPost })

/* ══════════════════════════════════════════════════
   PAPARAZZI HELPERS
══════════════════════════════════════════════════ */
const HOOKS   = ["EXCLUSIVE:","CAUGHT ON CAMERA:","SPOTTED!","YOU WON'T BELIEVE —","BREAKING INTEL:","SOURCES CONFIRM:","FLASH ALERT:","DRAMA ALERT:","PAPARAZZI CAUGHT:","CONFIRMED:"]
const EMOJIS  = ["🔥","⚡","💥","🎯","📸","🚨","👀","💫","🗞️"]
const FOOTERS = ["— cameras never lie.","Full story developing…","Our sources are INSIDE.","The internet is LOSING it.","We have the receipts.","This one's going viral."]

function pick<T>(arr: T[], id: string, salt = 0): T {
  let h = salt * 31
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return arr[h % arr.length]
}
const pap     = (id: string) => ({ hook: pick(HOOKS,id,0), emoji: pick(EMOJIS,id,1), footer: pick(FOOTERS,id,2) })
const PAP_CATS: FollowCategory[] = ["friends","family"]
const isPap   = (cat: FollowCategory, mode: boolean) => mode && PAP_CATS.includes(cat)

/* ══════════════════════════════════════════════════
   WALL POST LOCAL STORAGE
══════════════════════════════════════════════════ */
const WALL_LOCAL_KEY = "hp_wall_posts_local"

export interface LocalWallPost {
  id: string
  authorName: string
  message: string
  imageDataUrl?: string
  category: "friends" | "family"
  createdAt: string
  minutesAgo: number
}

function loadLocalWallPosts(): LocalWallPost[] {
  if (typeof window === "undefined") return []
  try { return JSON.parse(localStorage.getItem(WALL_LOCAL_KEY) ?? "[]") } catch { return [] }
}

function saveLocalWallPost(post: Omit<LocalWallPost, "id" | "createdAt" | "minutesAgo">): LocalWallPost {
  const newPost: LocalWallPost = {
    ...post,
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
    createdAt: new Date().toISOString(),
    minutesAgo: 0,
  }
  const posts = loadLocalWallPosts()
  localStorage.setItem(WALL_LOCAL_KEY, JSON.stringify([newPost, ...posts].slice(0, 200)))
  return newPost
}

function deleteLocalWallPost(id: string) {
  const posts = loadLocalWallPosts().filter(p => p.id !== id)
  localStorage.setItem(WALL_LOCAL_KEY, JSON.stringify(posts))
}

/* ══════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════ */
const FILTERS: { key: FollowCategory | "all" | "friends-family"; label: string }[] = [
  { key:"all", label:"All" }, { key:"celebrities", label:"Stars" }, { key:"businesses", label:"Brands" },
  { key:"industry", label:"Industry" }, { key:"friends-family", label:"Friends & Family" },
]
const CAT_LABEL: Record<FollowCategory,string> = {
  celebrities:"Celebrity", businesses:"Brand", industry:"Industry", friends:"Friends", family:"Family",
}
const CAT_COLOR: Record<FollowCategory,string> = {
  celebrities:"#B8960C", businesses:"#2563EB", industry:"#7C3AED", friends:"#059669", family:"#DB2777",
}
function ago(m: number) {
  if (m < 1) return "Just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m/60); return h < 24 ? `${h}h ago` : `${Math.floor(h/24)}d ago`
}

/* ══════════════════════════════════════════════════
   SKELETON
══════════════════════════════════════════════════ */
function Skeleton({ hero = false }: { hero?: boolean }) {
  if (hero) return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 flex flex-col sm:flex-row" style={{ minHeight: "280px" }}>
      <div className="w-full sm:w-1/2 shimmer" style={{ minHeight: "280px" }} />
      <div className="w-full sm:w-1/2 p-8 space-y-3">
        <div className="h-3 w-20 shimmer rounded" />
        <div className="h-7 w-full shimmer rounded" />
        <div className="h-7 w-3/4 shimmer rounded" />
        <div className="h-4 w-full shimmer rounded mt-2" />
        <div className="h-4 w-5/6 shimmer rounded" />
        <div className="h-3 w-28 shimmer rounded mt-4" />
      </div>
    </div>
  )
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-100">
      <div className="h-44 shimmer" />
      <div className="p-4 space-y-2">
        <div className="h-2.5 w-16 shimmer rounded" />
        <div className="h-4 w-full shimmer rounded" />
        <div className="h-4 w-4/5 shimmer rounded" />
        <div className="h-3 w-24 shimmer rounded mt-3" />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   HERO CARD — full-width horizontal featured story
══════════════════════════════════════════════════ */
interface CardProps {
  item: FeedItem
  featured?: boolean
  papMode: boolean
  onExpand: () => void
  layoutId: string
  overrideImg?: string
  onEditImg?: (e: React.MouseEvent) => void
}




/* ══ Paparazzi headline rewriter ══════════════════════════ */
const _PAP_PFXS = ["BREAKING:","EXCLUSIVE:","SHOCKING:","BOMBSHELL:","SOURCES REVEAL:","CAUGHT:","EXPOSED:","INSIDERS CONFIRM:","YOU WON'T BELIEVE:","SCANDAL:","SECRET LEAKED:"]
const _PAP_ENDS = ["— THE FULL STORY","— INSIDERS SPEAK OUT","— EXCLUSIVE DETAILS","...AND IT CHANGES EVERYTHING","— SOURCES CLOSE TO THE STORY","— THIS IS HUGE","— NOBODY SAW THIS COMING"]
const _WORD_SUBS: [RegExp, string][] = [
  [/\bsays\b/gi,"CONFESSES"],[/\bsaid\b/gi,"SECRETLY ADMITTED"],
  [/\bannounces?\b/gi,"SHOCKINGLY REVEALS"],[/\bannounced\b/gi,"SHOCKINGLY REVEALED"],
  [/\breleases?\b/gi,"UNLEASHES"],[/\bconfirms?\b/gi,"FINALLY CONFIRMS"],
  [/\bconfirmed\b/gi,"FINALLY CONFIRMED"],[/\blaunches?\b/gi,"DESPERATELY LAUNCHES"],
  [/\bplans?\b/gi,"SECRETLY PLOTS"],[/\bshows?\b/gi,"EXPOSES"],
  [/\bnew\b/gi,"BOMBSHELL NEW"],[/\bdeal\b/gi,"SECRET DEAL"],
  [/\bmeeting\b/gi,"MYSTERIOUS MEETING"],[/\breport\b/gi,"BOMBSHELL REPORT"],
  [/\bupdate\b/gi,"SHOCKING UPDATE"],[/\bcrisis\b/gi,"CATASTROPHIC CRISIS"],
  [/\bgrows?\b/gi,"EXPLODES"],[/\bfalls?\b/gi,"COLLAPSES"],[/\brises?\b/gi,"SKYROCKETS"],
]
function _stableIdx(s: string, max: number): number {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % max
}
function sensationalize(text: string): string {
  const pfx = _PAP_PFXS[_stableIdx(text, _PAP_PFXS.length)]
  const end = _PAP_ENDS[_stableIdx(text + "~", _PAP_ENDS.length)]
  let r = text; for (const [pat, rep] of _WORD_SUBS) r = r.replace(pat, rep)
  return `${pfx} ${r} ${end}`
}

// ── Image error fallback (handles broken calendar/Drive URLs gracefully)
function imgFallback(e: React.SyntheticEvent<HTMLImageElement>, seed: string) {
  const el = e.currentTarget
  if (!el.dataset.fallback) {
    el.dataset.fallback = "1"
    el.src = `https://picsum.photos/seed/${encodeURIComponent(seed.slice(0, 30))}/800/420`
  }
}

function HeroCard({ item, papMode, onExpand, layoutId, overrideImg, onEditImg }: CardProps) {
  const isWall  = !!item._wall
  const doPap   = isPap(item.category, papMode)
  const { hook, emoji, footer } = pap(item.id)
  const catColor = CAT_COLOR[item.category] ?? "#B8960C"
  const imgSrc = overrideImg ?? item.imageUrl

  return (
    <motion.article
      layoutId={layoutId}
      onClick={onExpand}
      className={cn(
        "relative rounded-2xl overflow-hidden cursor-pointer group",
        doPap && "ring-2 ring-yellow-400/50"
      )}
      style={{ height: "400px" }}
      whileHover={{ scale: 1.015 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {/* Full-bleed background image */}
      {imgSrc ? (
        <img
          src={imgSrc} alt=""
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${item.id}/1200/800` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />
      )}

      {/* Edit image button */}
      {onEditImg && (
        <button
          onClick={e => { e.stopPropagation(); onEditImg(e) }}
          className="absolute top-3 right-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold hover:bg-black/90"
        >
          <Pencil className="h-3 w-3"/>Swap Image
        </button>
      )}

      {/* Gradient overlay — dark bottom, light top */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/25 to-black/10" />
      {doPap && <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/20 to-transparent" />}

      {/* Top badges */}
      <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
        {doPap && (
          <span className="flex items-center gap-1 bg-yellow-400 text-black text-[13px] md:text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-wider pap-flash">
            <Camera className="h-3 w-3"/>{hook}
          </span>
        )}
        {item.urgent && !doPap && (
          <span className="flex items-center gap-1 bg-red-600 text-white text-[13px] md:text-[10px] font-bold px-2.5 py-1 rounded uppercase">🔴 URGENT</span>
        )}
        {item.isReal && !isWall && (
          <span className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-emerald-400 text-[13px] md:text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30">
            <Wifi className="h-3 w-3"/>Live
          </span>
        )}
        {isWall && (
          <span className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-pink-400 text-[13px] md:text-[10px] font-bold px-2 py-0.5 rounded border border-pink-400/30">
            <Heart className="h-3 w-3"/>Family
          </span>
        )}
      </div>

      {/* Bottom text overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
        {/* Meta line */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[13px] md:text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: catColor }}>
            {CAT_LABEL[item.category]}
          </span>
          <span className="text-white/30">·</span>
          <span className="text-[13px] md:text-[10px] text-white/60 uppercase tracking-wider truncate max-w-[140px]">{item.platform}</span>
          <span className="text-white/30">·</span>
          <span className="text-[13px] md:text-[10px] text-white/50">{ago(item.minutesAgo)}</span>
        </div>

        {/* Headline */}
        <h2 className={cn("font-bold text-white leading-snug drop-shadow-lg mb-3 text-xl line-clamp-3", doPap && "italic")}>
          {doPap ? `${emoji} ${sensationalize(item.update)}` : item.update}
        </h2>

        {/* Footer row */}
        <div className="flex items-center justify-between">
          <span className="text-[14px] md:text-[11px] font-bold text-[#D4AF37] group-hover:text-white transition-colors">
            Read more →
          </span>
          {doPap && <span className="text-[13px] md:text-[10px] text-yellow-400/60 italic hidden sm:block">{footer}</span>}
        </div>
      </div>
    </motion.article>
  )
}


function FeedCard({ item, papMode, onExpand, layoutId, overrideImg, onEditImg }: CardProps) {
  const isWall  = !!item._wall
  const doPap   = isPap(item.category, papMode)
  const { hook, emoji } = pap(item.id)
  const hasLink = !!(item.link && item.link !== "#")
  const catColor = CAT_COLOR[item.category] ?? "#B8960C"
  const imgSrc = overrideImg ?? item.imageUrl

  return (
    <motion.article
      layoutId={layoutId}
      onClick={onExpand}
      className={cn(
        "bg-white rounded-xl overflow-hidden cursor-pointer group border border-gray-100 hover:shadow-xl transition-all duration-250 flex flex-col",
        doPap && "ring-2 ring-yellow-400/50"
      )}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {/* Image */}
      <div className="relative overflow-hidden h-44 shrink-0">
        <img
          src={imgSrc}
          alt={item.update}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${item.id}/800/600` }}
        />
        {onEditImg && (
          <button
            onClick={e => { e.stopPropagation(); onEditImg(e) }}
            className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-black/65 backdrop-blur-sm text-white p-1.5 rounded-lg hover:bg-black/85"
            title="Swap image"
          >
            <Pencil className="h-3 w-3"/>
          </button>
        )}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
          {doPap && (
            <span className="flex items-center gap-1 bg-yellow-400 text-black text-[13px] md:text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider pap-flash">
              <Camera className="h-2.5 w-2.5" />EXCLUSIVE
            </span>
          )}
          {!doPap && item.urgent && (
            <span className="flex items-center gap-1 bg-red-600 text-white text-[13px] md:text-[10px] font-bold px-2 py-0.5 rounded uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />BREAKING
            </span>
          )}
          {item.isReal && !isWall && (
            <span className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-emerald-400 text-[13px] md:text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
              <Wifi className="h-2.5 w-2.5" />LIVE
            </span>
          )}
          {isWall && (
            <span className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-pink-400 text-[13px] md:text-[10px] font-bold px-1.5 py-0.5 rounded border border-pink-400/30">
              <Heart className="h-2.5 w-2.5" />WALL
            </span>
          )}
        </div>
        <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-white/10 to-transparent" />
      </div>

      {/* Text */}
      <div className="flex-1 flex flex-col p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[13px] md:text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: catColor }}>
            {CAT_LABEL[item.category]}
          </span>
          {doPap && (
            <span className="text-[13px] md:text-[10px] text-yellow-600/80 italic font-medium">{hook}</span>
          )}
        </div>
        {isWall ? (
          <div className="flex items-start gap-2.5 flex-1">
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm font-black text-gray-600 shrink-0 mt-0.5">
              {item._wall!.authorName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-[14px] md:text-[11px] font-bold text-gray-500 mb-1">{item._wall!.authorName}</p>
              <h3 className="reader-headline text-gray-900 text-[18px] md:text-[15px] line-clamp-3 leading-snug">
                {item.update}
              </h3>
            </div>
          </div>
        ) : (
          <h3 className="reader-headline text-gray-900 leading-snug line-clamp-3 group-hover:text-gray-700 flex-1 text-[18px] md:text-[15px]">
            {doPap ? `${emoji} ${sensationalize(item.update)}` : item.update}
          </h3>
        )}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] md:text-[11px] font-semibold text-gray-500 truncate max-w-[100px]">{item.platform}</span>
            <span className="text-gray-200 text-xs">·</span>
            <span className="text-[14px] md:text-[11px] text-gray-400">{ago(item.minutesAgo)}</span>
          </div>
          {hasLink && (
            <ExternalLink className="h-3.5 w-3.5 text-gray-300 group-hover:text-[#B8960C] transition-colors shrink-0" />
          )}
        </div>
      </div>
    </motion.article>
  )
}

/* ══════════════════════════════════════════════════
   TRENDING ITEM — numbered horizontal card
══════════════════════════════════════════════════ */
function TrendingItem({ item, index, papMode, onExpand, layoutId }: CardProps & { index: number }) {
  const catColor = CAT_COLOR[item.category] ?? "#B8960C"
  const doPap = isPap(item.category, papMode)
  const { emoji } = pap(item.id)

  return (
    <motion.button
      layoutId={layoutId}
      onClick={onExpand}
      className="flex items-center gap-3 group text-left shrink-0 min-w-[220px] max-w-[260px] bg-white rounded-xl border border-gray-100 p-3 hover:shadow-md transition-all duration-200"
      whileHover={{ y: -2 }}
    >
      <span className="text-2xl font-black tabular-nums shrink-0"
        style={{ color: index < 3 ? "#B8960C" : "#e5e7eb" }}>
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-gray-100">
        <img
          src={item.imageUrl}
          alt=""
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${item.id}/200/200` }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] md:text-[10px] font-black uppercase tracking-[0.15em] mb-1" style={{ color: catColor }}>
          {CAT_LABEL[item.category]}
        </p>
        <p className="text-[15px] md:text-[12px] font-semibold text-gray-900 line-clamp-2 leading-snug group-hover:text-gray-700">
          {doPap ? `${emoji} ${sensationalize(item.update)}` : item.update}
        </p>
      </div>
    </motion.button>
  )
}

/* ══════════════════════════════════════════════════
   FULL-SCREEN READER MODAL
══════════════════════════════════════════════════ */
interface ReaderProps {
  item: FeedItem; layoutId: string
  onClose: () => void; onPrev: () => void; onNext: () => void
  hasPrev: boolean; hasNext: boolean; papMode: boolean
}

function FullScreenReader({ item, layoutId, onClose, onPrev, onNext, hasPrev, hasNext, papMode }: ReaderProps) {
  const isWall = !!item._wall
  const doPap  = isPap(item.category, papMode)
  const { hook, emoji, footer } = pap(item.id)
  const hasLink = !!(item.link && item.link !== "#")

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft")  onPrev()
      if (e.key === "ArrowRight") onNext()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose, onPrev, onNext])

  return (
    <motion.div
      key="reader-backdrop"
      className="fixed inset-0 z-[100] flex"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute inset-0 bg-black" onClick={onClose} />

      <motion.div
        layoutId={layoutId}
        className="relative w-full h-full overflow-hidden"
        transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      >
        <img
          src={item.imageUrl} alt={item.update}
          className="absolute inset-0 w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${item.id}/1600/900` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
        {doPap && (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/20 to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400" />
          </>
        )}

        <motion.div
          className="absolute top-0 left-0 right-0 flex items-center justify-between p-5 z-20"
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        >
          <div className="flex items-center gap-3">
            {item.isReal && !isWall && (
              <span className="flex items-center gap-1.5 bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/40 text-emerald-400 text-[14px] md:text-[11px] font-bold px-2.5 py-1 rounded-full">
                <Wifi className="h-3 w-3" />LIVE
              </span>
            )}
            {doPap && (
              <span className="flex items-center gap-1.5 bg-yellow-400/20 backdrop-blur-sm border border-yellow-400/40 text-yellow-300 text-[14px] md:text-[11px] font-bold px-2.5 py-1 rounded-full pap-flash">
                <Camera className="h-3 w-3" />PAPARAZZI MODE
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={e => { e.stopPropagation(); onPrev() }} disabled={!hasPrev}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 disabled:opacity-30 transition">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={e => { e.stopPropagation(); onNext() }} disabled={!hasNext}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 disabled:opacity-30 transition">
              <ChevronRight className="h-5 w-5" />
            </button>
            <button onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition ml-1">
              <X className="h-5 w-5" />
            </button>
          </div>
        </motion.div>

        <motion.div
          className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 z-20"
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.4 }}
        >
          {isWall && (
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-xl font-black text-white">
                {item._wall!.authorName.charAt(0)}
              </div>
              <div>
                <p className="text-white font-bold text-base">{item._wall!.authorName}</p>
                <p className="text-white/50 text-sm capitalize">{item._wall!.category} · {ago(item.minutesAgo)}</p>
              </div>
            </div>
          )}
          {!isWall && (
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-[14px] md:text-[11px] font-black text-white/50 uppercase tracking-[0.2em]">
                {CAT_LABEL[item.category]}
              </span>
              <span className="text-white/20">·</span>
              <span className="text-[14px] md:text-[11px] text-white/50 uppercase tracking-wider">{item.platform}</span>
              <span className="text-white/20">·</span>
              <span className="text-[14px] md:text-[11px] text-white/50">{ago(item.minutesAgo)}</span>
            </div>
          )}
          {doPap && <p className="text-xs font-black text-yellow-400 uppercase tracking-[0.25em] mb-3">{hook}</p>}

          <h1 className={cn(
            "reader-headline text-white drop-shadow-2xl mb-5 max-w-4xl text-2xl sm:text-3xl md:text-4xl lg:text-5xl",
            doPap && "italic"
          )}>
            {doPap ? `${emoji} ${item.update}` : item.update}
          </h1>
          {doPap && <p className="text-sm text-yellow-300/70 italic mb-4">{footer}</p>}

          <div className="flex flex-wrap gap-3 items-center">
            {hasLink && !isWall && (
              <a href={item.link} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className={cn(
                  "inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all",
                  doPap ? "bg-yellow-400 text-black hover:bg-yellow-300 shadow-lg shadow-yellow-400/30"
                         : "bg-white text-gray-900 hover:bg-gray-100 shadow-lg shadow-white/20"
                )}>
                Read Full Article <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <span className="text-[14px] md:text-[11px] text-white/30">ESC to close · ← → to navigate</span>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════
   IMAGE EDIT MODAL — swap feed card image
══════════════════════════════════════════════════ */
interface ImageEditModalProps {
  item: FeedItem
  currentOverride?: string
  onApply: (item: FeedItem, dataUrl: string) => void
  onClear: (item: FeedItem) => void
  onClose: () => void
}
function ImageEditModal({ item, currentOverride, onApply, onClear, onClose }: ImageEditModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [generalBanners, setGeneralBanners] = useState<Array<{ id: string; name: string; url: string }>>([])
  const [preview, setPreview] = useState<string | null>(currentOverride ?? null)
  const [pendingDataUrl, setPendingDataUrl] = useState<string | null>(null)

  useEffect(() => {
    // Load General Banners (formatted crops if available, else originals)
    try {
      const photos = JSON.parse(localStorage.getItem("hp_family_photos") ?? "[]") as Array<{ id: string; name: string; dataUrl: string }>
      const crops  = JSON.parse(localStorage.getItem("hp_banner_crops") ?? "{}") as Record<string, string>
      setGeneralBanners(photos.map(p => ({ id: p.id, name: p.name, url: crops[p.id] ?? p.dataUrl })))
    } catch {}
  }, [])

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = e => {
      const url = e.target?.result as string
      setPreview(url)
      setPendingDataUrl(url)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-[#B8960C]"/>
            <p className="text-[13px] font-black uppercase tracking-wider text-gray-800">Swap Image</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="h-4 w-4"/>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Current preview */}
          <div className="relative rounded-xl overflow-hidden bg-gray-100" style={{ paddingBottom: "52%" }}>
            {preview ? (
              <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover"/>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                <ImageIcon className="h-10 w-10"/>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-3">
              <p className="text-white text-[11px] font-medium line-clamp-1">{item.update}</p>
            </div>
          </div>

          {/* Upload */}
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-[12px] font-medium text-gray-500 hover:border-[#B8960C] hover:text-[#B8960C] transition-colors flex items-center justify-center gap-2"
          >
            <Pencil className="h-3.5 w-3.5"/>Upload from device
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

          {/* Pick from General Banners */}
          {generalBanners.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Or pick from General Banners</p>
              <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto">
                {generalBanners.map(b => (
                  <button key={b.id} onClick={() => { setPreview(b.url); setPendingDataUrl(b.url) }}
                    className={cn("relative rounded-lg overflow-hidden border-2 transition-colors",
                      preview === b.url ? "border-[#B8960C]" : "border-transparent hover:border-gray-200")}
                    style={{ paddingBottom: "56%" }}>
                    <img src={b.url} alt={b.name} className="absolute inset-0 w-full h-full object-cover"/>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { if (pendingDataUrl) onApply(item, pendingDataUrl) }}
              disabled={!pendingDataUrl}
              className="flex-1 py-2 text-[12px] font-bold rounded-xl bg-[#B8960C] text-white hover:bg-[#9a7a0a] transition-colors disabled:opacity-40"
            >
              Apply Image
            </button>
            {currentOverride && (
              <button onClick={() => onClear(item)}
                className="py-2 px-3 text-[12px] font-bold rounded-xl bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors">
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   PAPARAZZI TOGGLE BAR
══════════════════════════════════════════════════ */
function PapBar({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div className={cn(
      "shrink-0 px-4 py-1.5 flex items-center justify-between transition-colors duration-300 border-b",
      enabled ? "bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400 border-yellow-500"
              : "bg-white border-gray-100"
    )}>
      <div className="flex items-center gap-2">
        {enabled
          ? <><Camera className="h-3.5 w-3.5 text-black"/><span className="text-xs font-black uppercase tracking-widest text-black">📸 Paparazzi Mode</span><span className="text-[14px] md:text-[11px] text-black/60">Friends &amp; Family → tabloid style</span></>
          : <><Camera className="h-3.5 w-3.5 text-gray-400"/><span className="text-xs text-gray-500 font-medium">Paparazzi Mode</span><span className="text-[14px] md:text-[11px] text-gray-300 hidden sm:inline"> — Sensationalize Friends &amp; Family</span></>
        }
      </div>
      <button onClick={onToggle} className={cn(
        "flex items-center gap-1.5 px-3 py-1 rounded-full text-[14px] md:text-[11px] font-bold uppercase tracking-wide transition-all",
        enabled ? "bg-black text-yellow-400 hover:bg-gray-900 shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      )}>
        {enabled ? <><Zap className="h-3 w-3"/>ON</> : <><FlameKindling className="h-3 w-3"/>Enable</>}
      </button>
    </div>
  )
}


/* ══════════════════════════════════════════════════
   QUICK POST FORM
══════════════════════════════════════════════════ */
function QuickPostForm({ onPost, onCancel }: { onPost: (post: LocalWallPost) => void; onCancel: () => void }) {
  const [name,     setName]     = useState("")
  const [message,  setMessage]  = useState("")
  const [category, setCategory] = useState<"friends" | "family">("family")
  const [err,      setErr]      = useState("")
  const [posting,  setPosting]  = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim())    { setErr("Name required"); return }
    if (!message.trim()) { setErr("Write a message"); return }
    setPosting(true)
    const saved = saveLocalWallPost({ authorName: name.trim(), message: message.trim(), category })
    // Recalculate minutesAgo
    const withAge = { ...saved, minutesAgo: 0 }
    onPost(withAge)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gradient-to-b from-pink-50 to-purple-50 border border-pink-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Heart className="h-4 w-4 text-pink-400 fill-pink-400" />
        <p className="text-[15px] md:text-[12px] font-black uppercase tracking-wider text-pink-700">Post to Friends & Family</p>
        <button type="button" onClick={onCancel} className="ml-auto p-0.5 text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex gap-2">
        <input
          ref={nameRef}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name…"
          className="flex-1 text-xs border border-pink-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-pink-300 placeholder:text-gray-300"
        />
        <select value={category} onChange={e => setCategory(e.target.value as "friends" | "family")}
          className="text-xs border border-pink-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-pink-300 text-gray-700">
          <option value="family">🏡 Family</option>
          <option value="friends">🤝 Friends</option>
        </select>
      </div>
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Share an update, thought, or photo caption…"
        rows={3}
        className="w-full text-xs border border-pink-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-pink-300 placeholder:text-gray-300 resize-none"
      />
      {err && <p className="text-[14px] md:text-[11px] text-red-500">{err}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={posting}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-pink-500 text-white text-xs font-bold hover:bg-pink-600 transition-colors disabled:opacity-60">
          <Heart className="h-3.5 w-3.5" /> Post Update
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
interface NewsFeedProps { events?: FamilyEvent[] }

export function NewsFeed({ events = [] }: NewsFeedProps) {
  const [alerts,       setAlerts]    = useState<NewsAlert[]>(INITIAL_ALERTS)
  const [wallPosts,    setWall]      = useState<WallPost[]>([])
  const [localPosts,    setLocalPosts]    = useState<LocalWallPost[]>([])
  const [showPostForm,  setShowPostForm]  = useState(false)
  const [calendarItems, setCalendarItems] = useState<FeedItem[]>([])
  const [bannerUrls,    setBannerUrls]    = useState<Record<string,string>>({})
  const [filter,       setFilter]    = useState<FollowCategory | "all" | "friends-family">("all")
  const [papMode,      setPap]       = useState(false)
  const [loading,      setLoading]   = useState(true)
  const [liveStatus,   setStatus]    = useState<"loading"|"live"|"partial"|"offline">("loading")
  const [lastFetch,    setLastFetch] = useState<string|null>(null)
  const [newCount,     setNewCount]  = useState(0)
  const [refreshing,   setRefreshing]= useState(false)
  const [expandedIdx,  setExpanded]  = useState<number | null>(null)
  // VIEW ALL states
  const [showAllStories,   setShowAllStories]   = useState(false)
  const [showAllTrending,  setShowAllTrending]  = useState(false)
  // Feed image overrides (user-swapped images keyed by item link/id)
  const [feedImgOverrides, setFeedImgOverrides] = useState<Record<string,string>>({})
  const [imgEditItem,      setImgEditItem]      = useState<FeedItem | null>(null)
  // Auto-rotation states (used on narrower screens)
  const [heroAutoIdx,   setHeroAutoIdx]   = useState(0)
  const [supportPage,   setSupportPage]   = useState(0)   // 0 = first 3, 1 = second 3
  const prevIds = useRef<Set<string>>(new Set())

  // Load feed image overrides from localStorage on mount
  useEffect(() => {
    try { setFeedImgOverrides(JSON.parse(localStorage.getItem("hp_feed_img_overrides") ?? "{}")) } catch {}
  }, [])

  function getItemKey(item: FeedItem): string {
    return (item.link && item.link !== "#") ? item.link : item.id
  }

  function applyImageOverride(item: FeedItem, dataUrl: string) {
    const key = getItemKey(item)
    const next = { ...feedImgOverrides, [key]: dataUrl }
    setFeedImgOverrides(next)
    try { localStorage.setItem("hp_feed_img_overrides", JSON.stringify(next)) } catch {}
    setImgEditItem(null)
  }

  const fetchAll = useCallback(async (showSpin = false) => {
    if (showSpin) setRefreshing(true)
    try {
      const feeds    = feedsStore.get()
      const channels = channelsStore.get()
      // Load news API keys from localStorage
      let apiKeyParams = ""
      try {
        const keys = JSON.parse(localStorage.getItem("hp_news_api_keys") ?? "{}")
        if (keys.gnews)    apiKeyParams += `&gnews=${encodeURIComponent(keys.gnews)}`
        if (keys.guardian) apiKeyParams += `&guardian=${encodeURIComponent(keys.guardian)}`
        if (keys.newsdata) apiKeyParams += `&newsdata=${encodeURIComponent(keys.newsdata)}`
      } catch {}
      const newsUrl  = `/api/news?feeds=${encodeURIComponent(JSON.stringify(feeds))}&channels=${encodeURIComponent(JSON.stringify(channels))}${apiKeyParams}`
      const [nRes, wRes] = await Promise.all([
        fetch(newsUrl, { cache: "no-store" }),
        fetch("/api/wall", { cache: "no-store" }),
      ])
      const nData = await nRes.json()
      const wData: WallPost[] = await wRes.json()
      const incoming: NewsAlert[] = nData.items ?? []
      if (incoming.length > 0) {
        const fresh = incoming.filter(a => !prevIds.current.has(a.id))
        if (prevIds.current.size > 0 && fresh.length > 0) setNewCount(c => c + fresh.length)
        prevIds.current = new Set(incoming.map(a => a.id))
        setAlerts(incoming)
        setStatus(nData.errors?.length > 0 ? "partial" : "live")
        feedCache.set(incoming.map(a => ({
          id: a.id, title: a.update, source: a.platform,
          category: a.category, link: a.link, imageUrl: a.imageUrl,
          minutesAgo: a.minutesAgo,
        })))
      } else {
        setStatus("offline")
      }
      setWall(wData)
      setLastFetch(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
    } catch {
      setStatus("offline")
    } finally {
      setLoading(false)
      if (showSpin) setTimeout(() => setRefreshing(false), 700)
    }
  }, [])

  // Load local wall posts from localStorage
  useEffect(() => {
    const loaded = loadLocalWallPosts()
    // Recalculate minutesAgo for each
    const withAge = loaded.map(p => ({
      ...p,
      minutesAgo: Math.max(0, Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 60_000)),
    }))
    setLocalPosts(withAge)
  }, [])

  // Fetch Google Calendar events
  const fetchCalendar = async (url: string) => {
    if (!url) { setCalendarItems([]); return }
    try {
      const res  = await fetch(`/api/calendar`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url }),
        cache:   "no-store",
      })
      const data = await res.json()
      if (!data.events?.length) { setCalendarItems([]); return }

      const DAY_LABELS: Record<number,string> = { 0:"Today", 1:"Tomorrow" }
      const items: FeedItem[] = data.events.map((e: { id: string; summary: string; description?: string; imageUrl?: string; date: string; daysUntil: number }) => {
        const dayLabel = DAY_LABELS[e.daysUntil] ?? `In ${e.daysUntil} days`
        const eventDate = new Date(e.date)
        const monthDay  = eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        return {
          id:         e.id,
          name:       "Google Calendar",
          category:   "family" as FollowCategory,
          update:     `📅 ${e.summary}${e.description ? ` — ${e.description.slice(0, 80)}` : ""}`,
          platform:   `${dayLabel} · ${monthDay}`,
          minutesAgo: e.daysUntil * 24 * 60,
          urgent:     e.daysUntil === 0,
          initials:   "📅",
          isReal:     true,
          imageUrl:   e.imageUrl ?? `https://picsum.photos/seed/cal-${e.id}/800/600`,
          link:       undefined,
        }
      })
      setCalendarItems(items)
    } catch {
      setCalendarItems([])
    }
  }

  // Load banner URLs + listen for updates
  useEffect(() => {
    function loadBanners() {
      try { setBannerUrls(JSON.parse(localStorage.getItem("hp_banner_urls") ?? "{}")) } catch { setBannerUrls({}) }
    }
    loadBanners()
    const h = () => loadBanners()
    window.addEventListener("hp-banner-updated", h)
    return () => window.removeEventListener("hp-banner-updated", h)
  }, [])

  // Load calendar on mount + listen for settings changes
  useEffect(() => {
    const url = localStorage.getItem("hp_calendar_url") ?? ""
    fetchCalendar(url)

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { url: string }
      fetchCalendar(detail.url ?? "")
    }
    window.addEventListener("hp-calendar-updated", handler)
    // Refresh calendar every 30 minutes
    const id = setInterval(() => {
      const u = localStorage.getItem("hp_calendar_url") ?? ""
      if (u) fetchCalendar(u)
    }, 30 * 60 * 1000)
    return () => {
      window.removeEventListener("hp-calendar-updated", handler)
      clearInterval(id)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const id = setInterval(() => fetchAll(), 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [fetchAll])

  // Hero auto-rotation (below xl screens) — cycles every 6s
  const displayedCountRef = useRef(0)
  useEffect(() => {
    const id = setInterval(() => {
      setHeroAutoIdx(i => {
        const maxIdx = Math.min(displayedCountRef.current - 1, 4)
        return maxIdx > 0 ? (i < maxIdx ? i + 1 : 0) : 0
      })
    }, 6000)
    return () => clearInterval(id)
  }, [])

  // Support cards page rotation — fires 3s AFTER hero rotates (offset so they don't sync)
  useEffect(() => {
    const delay = setTimeout(() => {
      setSupportPage(p => p === 0 ? 1 : 0) // first flip after 9s
      const id = setInterval(() => setSupportPage(p => p === 0 ? 1 : 0), 6000)
      // store id in closure for cleanup — use a ref trick
      ;(window as any).__supportIntervalId = id
    }, 9000)
    return () => {
      clearTimeout(delay)
      clearInterval((window as any).__supportIntervalId)
    }
  }, [])

  // Build unified feed — server wall posts + local (localStorage) wall posts
  const serverWallItems: FeedItem[] = wallPosts.map(p => ({
    id: p.id, name: p.authorName, category: p.category as FollowCategory,
    update: p.message, platform: p.authorName, minutesAgo: p.minutesAgo,
    urgent: false, initials: p.authorName.charAt(0), isReal: true,
    imageUrl: p.imageDataUrl ?? `https://picsum.photos/seed/${p.id}/800/600`,
    link: undefined, _wall: p,
  }))

  const localWallItems: FeedItem[] = localPosts.map(p => ({
    id: p.id, name: p.authorName, category: p.category as FollowCategory,
    update: p.message, platform: p.authorName, minutesAgo: p.minutesAgo,
    urgent: false, initials: p.authorName.charAt(0), isReal: true,
    imageUrl: `https://picsum.photos/seed/${p.id}/800/600`,
    link: undefined, _wall: { ...p, id: p.id } as WallPost,
  }))

  // Merge server + local, de-duplicate by id, sort newest first
  const seenIds = new Set<string>()
  const allWallItems = [...localWallItems, ...serverWallItems].filter(p => {
    if (seenIds.has(p.id)) return false
    seenIds.add(p.id)
    return true
  })

  // Upcoming family events (within 14 days) → feed items using uploaded banners
  const EV_EMOJI_FEED: Record<string, string> = { birthday: "🎂", anniversary: "💍", holiday: "🎉", custom: "⭐" }
  const EV_MSG_FEED: Record<string, (n: string) => string> = {
    birthday: n => `🎂 Happy Birthday, ${n}!`,
    anniversary: n => `💍 Happy Anniversary, ${n}!`,
    holiday: n => n,
    custom: n => n,
  }
  const todayRef = new Date()
  const eventFeedItems: FeedItem[] = events
    .map(ev => {
      const [mm, dd] = ev.date.split("-")
      const dt = new Date(todayRef.getFullYear(), parseInt(mm) - 1, parseInt(dd))
      if (dt < todayRef) dt.setFullYear(todayRef.getFullYear() + 1)
      const daysUntil = Math.ceil((dt.getTime() - todayRef.getTime()) / 864e5)
      return { ev, daysUntil }
    })
    .filter(({ daysUntil }) => daysUntil >= 0 && daysUntil <= 14)
    .map(({ ev, daysUntil }) => {
      const label = daysUntil === 0 ? "Today!" : daysUntil === 1 ? "Tomorrow" : `In ${daysUntil} days`
      const bannerImg = bannerUrls[ev.id] ?? null
      return {
        id:         `evt-${ev.id}`,
        name:       ev.personName,
        category:   "family" as FollowCategory,
        update:     daysUntil === 0
          ? EV_MSG_FEED[ev.eventType]?.(ev.personName) ?? `${EV_EMOJI_FEED[ev.eventType]} ${ev.personName}`
          : `${EV_EMOJI_FEED[ev.eventType]} ${ev.personName} — ${label}`,
        platform:   `${label} · ${ev.eventType.charAt(0).toUpperCase() + ev.eventType.slice(1)}`,
        minutesAgo: daysUntil * 24 * 60,
        urgent:     daysUntil === 0,
        initials:   ev.personName.charAt(0),
        isReal:     true,
        imageUrl:   bannerImg ?? (ev.headshotDataUrl ?? undefined),
        link:       undefined,
      } as FeedItem
    })

  const allItems: FeedItem[] = [...alerts.map(a => ({ ...a })), ...allWallItems, ...calendarItems, ...eventFeedItems]
    .sort((a, b) => a.minutesAgo - b.minutesAgo)

  const displayed = filter === "all"
    ? allItems
    : filter === "friends-family"
      ? allItems.filter(a => a.category === "friends" || a.category === "family")
      : allItems.filter(a => a.category === (filter as FollowCategory))

  // ── Data slices ─────────────────────────────────────────
  // xl: 2 hero cards + 6 support cards + trending
  // lg: 1 rotating hero + 3/3 rotating support + trending
  // mobile: 1 rotating hero only

  displayedCountRef.current = displayed.length

  const hero1 = displayed[0] ?? null          // xl hero left / rotating hero
  const hero2 = displayed[1] ?? null          // xl hero right
  const rotatingHero = displayed[Math.min(heroAutoIdx, Math.max(displayed.length - 1, 0))] ?? hero1

  // xl: support = displayed[2..7] (6 cards)
  // xl: 4 visible at once, rotates between batch A [2..5] and batch B [4..7] (overlapping for continuity)
  const xlSupportA = displayed.slice(2, 6)   // batch A
  const xlSupportB = displayed.slice(4, 8)   // batch B (2 overlap for context)
  const xlSupport  = supportPage === 0 ? xlSupportA : (xlSupportB.length >= 2 ? xlSupportB : xlSupportA)
  // lg (not xl): support page 0 = displayed[2..4], page 1 = displayed[5..7]
  const lgSupport0 = displayed.slice(2, 5)
  const lgSupport1 = displayed.slice(5, 8)
  const lgSupport  = supportPage === 0 ? lgSupport0 : lgSupport1

  // trending: everything after the first 8 items
  const trendingAll = displayed.slice(8)
  const trending    = showAllTrending ? trendingAll : trendingAll.slice(0, 6)
  const hiddenTrendCount = trendingAll.length > 6 ? trendingAll.length - 6 : 0

    const closeReader = () => setExpanded(null)
  const prevItem    = () => setExpanded(i => i !== null && i > 0 ? i - 1 : i)
  const nextItem    = () => setExpanded(i => i !== null && i < displayed.length - 1 ? i + 1 : i)

  // Expand idx mapping — hero is 0, supporting starts at 1, trending starts at (1 + supporting.length)
  const heroExpandIdx = 0
  const supportExpandIdx = (i: number) => i + 1
  const trendExpandIdx = (i: number) => (showAllStories ? displayed.length : 4) + i

  // Today event
  const today   = new Date()
  const todayMD = `${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`
  const todayEvent = events.find(e => e.date === todayMD)
  const EV_EMOJI: Record<string,string> = { birthday:"🎂", anniversary:"💍", holiday:"🎉", custom:"⭐" }

  const statusColor = { loading:"text-gray-400", live:"text-emerald-500", partial:"text-amber-500", offline:"text-red-500" }

  return (
    <div className="flex-1 flex flex-col min-w-0 md:h-full md:overflow-hidden bg-white">

      {/* ── Header bar ─────────────────────────── */}
      <div className="shrink-0 px-5 pt-3 pb-2.5 bg-white border-b border-gray-100 sticky top-0 md:static z-20">
        <div className="flex items-center justify-between mb-2.5">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-[#B8960C] text-[#B8960C]" />
              <span className="text-[16px] md:text-[13px] font-black text-gray-900 uppercase tracking-[0.18em]">
                Today&apos;s Stories
              </span>
            </div>
            {newCount > 0 && (
              <span className="bg-[#B8960C] text-white text-[13px] md:text-[10px] font-bold px-2 py-0.5 rounded-full">
                +{newCount} new
              </span>
            )}
            <span className={cn("text-[13px] md:text-[10px] font-semibold flex items-center gap-1", statusColor[liveStatus])}>
              {(liveStatus==="live"||liveStatus==="partial") && <Wifi className="h-3 w-3"/>}
              {liveStatus==="offline" && <WifiOff className="h-3 w-3"/>}
              {liveStatus==="live" ? "Live" : liveStatus==="partial" ? "Partial" : liveStatus==="offline" ? "Offline" : ""}
              {lastFetch && <span className="text-gray-300 font-normal">· {lastFetch}</span>}
            </span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setNewCount(0); fetchAll(true) }}
              className="h-7 px-2 text-gray-400 hover:text-gray-700 text-xs gap-1">
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            </Button>
            {/* Story count indicator */}
            {displayed.length > 0 && (
              <span className="text-[14px] md:text-[11px] text-gray-400">{displayed.length} stories</span>
            )}
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {FILTERS.map(({ key, label }) => (
            <button key={key} onClick={() => { setFilter(key); setShowAllStories(false); setShowAllTrending(false) }}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-sm md:text-xs font-semibold transition-all border",
                filter === key
                  ? "bg-gray-900 text-white border-gray-900"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-100 border-gray-200"
              )}>
              {label}
            </button>
          ))}
          {/* Quick post button — visible when Friends & Family tab is active */}
          {filter === "friends-family" && !showPostForm && (
            <button
              onClick={() => setShowPostForm(true)}
              className="shrink-0 ml-auto flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-pink-50 text-pink-600 border border-pink-200 hover:bg-pink-100 transition-colors"
            >
              <Heart className="h-3 w-3 fill-pink-400 text-pink-400" /> + Post
            </button>
          )}
        </div>
      </div>

      {/* ── Paparazzi bar ─────────────────────── */}
      <PapBar enabled={papMode} onToggle={() => setPap(p => !p)} />

      {/* ── Feed ──────────────────────────────── */}
      <div className="md:flex-1 md:overflow-y-auto md:min-h-0">
        <div className="p-4 pb-20 md:pb-4 space-y-6">

          {/* Quick post form */}
          {showPostForm && (
            <QuickPostForm
              onPost={post => {
                setLocalPosts(prev => [post, ...prev])
                setShowPostForm(false)
                setFilter("friends-family")
              }}
              onCancel={() => setShowPostForm(false)}
            />
          )}

          {/* Birthday / event banner with optional headshot */}
          {todayEvent && (
            <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
              className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 px-4 py-3 flex items-center gap-3">
              {todayEvent.headshotDataUrl ? (
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-300 shrink-0 shadow-sm">
                  <img src={todayEvent.headshotDataUrl} alt={todayEvent.personName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <span className="text-3xl">{EV_EMOJI[todayEvent.eventType]??"⭐"}</span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-900 truncate">
                  {todayEvent.eventType==="birthday"    && `🎂 Happy Birthday, ${todayEvent.personName}!`}
                  {todayEvent.eventType==="anniversary" && `💍 Happy Anniversary, ${todayEvent.personName}!`}
                  {(todayEvent.eventType==="holiday"||todayEvent.eventType==="custom") && todayEvent.personName}
                </p>
                {todayEvent.notes && <p className="text-xs text-amber-700 truncate">{todayEvent.notes}</p>}
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════
              HERO SECTION
              xl: 2 side-by-side full-bleed cards
              below xl: 1 rotating card + dots
          ════════════════════════════════════ */}
          {loading ? (
            <div className="grid xl:grid-cols-2 gap-4">
              <Skeleton hero />
              <div className="hidden xl:block"><Skeleton hero /></div>
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-400 text-sm font-medium">No stories in this category</p>
            </div>
          ) : (
            <>
              {/* XL: Two heroes side by side */}
              <div className="hidden xl:grid grid-cols-2 gap-4">
                {hero1 && (
                  <HeroCard item={hero1} papMode={papMode} layoutId={`hero-${hero1.id}`}
                    onExpand={() => setExpanded(0)}
                    overrideImg={feedImgOverrides[getItemKey(hero1)]}
                    onEditImg={() => setImgEditItem(hero1)} />
                )}
                {hero2 && (
                  <HeroCard item={hero2} papMode={papMode} layoutId={`hero-${hero2.id}`}
                    onExpand={() => setExpanded(1)}
                    overrideImg={feedImgOverrides[getItemKey(hero2)]}
                    onEditImg={() => setImgEditItem(hero2)} />
                )}
              </div>

              {/* Below XL: Single rotating hero */}
              <div className="xl:hidden relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={rotatingHero?.id ?? "empty"}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                  >
                    {rotatingHero && (
                      <HeroCard
                        item={rotatingHero}
                        papMode={papMode}
                        layoutId={`hero-rot-${rotatingHero.id}`}
                        onExpand={() => setExpanded(heroAutoIdx)}
                        overrideImg={feedImgOverrides[getItemKey(rotatingHero)]}
                        onEditImg={() => setImgEditItem(rotatingHero)}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Dot indicators */}
                {displayed.length > 1 && (
                  <div className="flex justify-center gap-2 mt-3">
                    {displayed.slice(0, Math.min(displayed.length, 5)).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setHeroAutoIdx(i)}
                        className={cn(
                          "h-2 rounded-full transition-all duration-300",
                          i === heroAutoIdx
                            ? "w-6 bg-[#B8960C]"
                            : "w-2 bg-gray-300 hover:bg-gray-400"
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ════════════════════════════════════
              SUPPORTING STORIES
              xl: 6 cards (2 rows of 3)
              lg (not xl): 3 cards rotating to next 3
              mobile: hidden
          ════════════════════════════════════ */}
          {!loading && displayed.length > 2 && (
            <>
              {/* XL: 4 stories — BOTH batches always in DOM, CSS opacity crossfade only.
                  Images stay cached → no reload lag, no disappearing gap. */}
              {xlSupportA.length > 0 && (
                <div className="hidden xl:block">
                  <div className="relative">
                    {/* Batch A — always rendered; sets container height when visible */}
                    <div
                      className="grid grid-cols-4 gap-4 transition-opacity duration-500"
                      style={{ opacity: supportPage === 0 ? 1 : 0, pointerEvents: supportPage === 0 ? "auto" : "none" }}
                    >
                      {xlSupportA.map((item, idx) => (
                        <FeedCard key={item.id} item={item} papMode={papMode}
                          layoutId={`card-a-${item.id}`}
                          onExpand={() => setExpanded(2 + idx)}
                          overrideImg={feedImgOverrides[getItemKey(item)]}
                          onEditImg={() => setImgEditItem(item)} />
                      ))}
                    </div>
                    {/* Batch B — absolutely overlays batch A, crossfades in */}
                    {xlSupportB.length >= 2 && (
                      <div
                        className="absolute inset-0 grid grid-cols-4 gap-4 transition-opacity duration-500"
                        style={{ opacity: supportPage === 1 ? 1 : 0, pointerEvents: supportPage === 1 ? "auto" : "none" }}
                      >
                        {xlSupportB.map((item, idx) => (
                          <FeedCard key={item.id} item={item} papMode={papMode}
                            layoutId={`card-b-${item.id}`}
                            onExpand={() => setExpanded(4 + idx)}
                            overrideImg={feedImgOverrides[getItemKey(item)]}
                            onEditImg={() => setImgEditItem(item)} />
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Page dots */}
                  {xlSupportB.length >= 2 && (
                    <div className="flex justify-center gap-2 mt-3">
                      {[0, 1].map(p => (
                        <button key={p} onClick={() => setSupportPage(p)}
                          className={cn("h-1.5 rounded-full transition-all duration-300",
                            p === supportPage ? "w-6 bg-[#B8960C]" : "w-1.5 bg-gray-300 hover:bg-gray-400")} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* LG (not XL): 3 cards — same always-in-DOM approach */}
              {lgSupport0.length > 0 && (
                <div className="hidden lg:block xl:hidden">
                  <div className="relative">
                    {/* Batch 0 */}
                    <div
                      className="grid grid-cols-3 gap-4 transition-opacity duration-500"
                      style={{ opacity: supportPage === 0 ? 1 : 0, pointerEvents: supportPage === 0 ? "auto" : "none" }}
                    >
                      {lgSupport0.map((item, idx) => (
                        <FeedCard key={item.id} item={item} papMode={papMode}
                          layoutId={`card-lg0-${item.id}`}
                          onExpand={() => setExpanded(2 + idx)}
                          overrideImg={feedImgOverrides[getItemKey(item)]}
                          onEditImg={() => setImgEditItem(item)} />
                      ))}
                    </div>
                    {/* Batch 1 */}
                    {lgSupport1.length > 0 && (
                      <div
                        className="absolute inset-0 grid grid-cols-3 gap-4 transition-opacity duration-500"
                        style={{ opacity: supportPage === 1 ? 1 : 0, pointerEvents: supportPage === 1 ? "auto" : "none" }}
                      >
                        {lgSupport1.map((item, idx) => (
                          <FeedCard key={item.id} item={item} papMode={papMode}
                            layoutId={`card-lg1-${item.id}`}
                            onExpand={() => setExpanded(5 + idx)}
                            overrideImg={feedImgOverrides[getItemKey(item)]}
                            onEditImg={() => setImgEditItem(item)} />
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Page dots */}
                  {lgSupport1.length > 0 && (
                    <div className="flex justify-center gap-2 mt-3">
                      {[0, 1].map(p => (
                        <button key={p} onClick={() => setSupportPage(p)}
                          className={cn("h-1.5 rounded-full transition-all duration-300",
                            p === supportPage ? "w-5 bg-[#B8960C]" : "w-1.5 bg-gray-300")} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ════════════════════════════════════
              TRENDING NOW
              lg+: horizontal scroll or expanded grid
              mobile: hidden
          ════════════════════════════════════ */}
          {!loading && trendingAll.length > 0 && (
            <div className="hidden lg:block">
              <div className="gold-rule mb-5" />
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#B8960C]" />
                  <span className="text-[16px] md:text-[13px] font-black text-gray-900 uppercase tracking-[0.18em]">
                    Trending Now
                  </span>
                  <span className="text-[14px] md:text-[11px] text-gray-400">{trendingAll.length} stories</span>
                </div>
                {!showAllTrending && hiddenTrendCount > 0 && (
                  <button onClick={() => setShowAllTrending(true)}
                    className="text-[14px] md:text-[11px] font-bold text-[#B8960C] hover:text-[#9a7a08] flex items-center gap-1 transition-colors">
                    VIEW ALL ({hiddenTrendCount} more) <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                )}
                {showAllTrending && (
                  <button onClick={() => setShowAllTrending(false)}
                    className="text-[14px] md:text-[11px] font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
                    SHOW LESS <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {showAllTrending ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                  {trending.map((item, idx) => (
                    <FeedCard key={item.id} item={item} papMode={papMode}
                      layoutId={`trend-${item.id}`} onExpand={() => setExpanded(8 + idx)}
                      overrideImg={feedImgOverrides[getItemKey(item)]}
                      onEditImg={() => setImgEditItem(item)} />
                  ))}
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
                  {trending.map((item, idx) => (
                    <TrendingItem key={item.id} item={item} index={idx} featured={false}
                      papMode={papMode} layoutId={`trend-${item.id}`}
                      onExpand={() => setExpanded(8 + idx)} />
                  ))}
                </div>
              )}
            </div>
          )}

                    <div className="h-4" />
        </div>
      </div>

      {/* ── Full-screen reader ──────────────────── */}
      <AnimatePresence>
        {expandedIdx !== null && displayed[expandedIdx] && (
          <FullScreenReader
            key={displayed[expandedIdx].id}
            item={displayed[expandedIdx]}
            layoutId={
              expandedIdx !== null && displayed[expandedIdx]
                ? (expandedIdx <= 1
                    ? `hero-${displayed[expandedIdx].id}`
                    : expandedIdx < 8
                      ? `card-${displayed[expandedIdx].id}`
                      : `trend-${displayed[expandedIdx].id}`)
                : `hero-${displayed[0]?.id}`
            }
            onClose={closeReader}
            onPrev={prevItem}
            onNext={nextItem}
            hasPrev={expandedIdx > 0}
            hasNext={expandedIdx < displayed.length - 1}
            papMode={papMode}
          />
        )}
      </AnimatePresence>

      {/* ── Image Edit Modal ─────────────────────── */}
      {imgEditItem && (
        <ImageEditModal
          item={imgEditItem}
          currentOverride={feedImgOverrides[getItemKey(imgEditItem)]}
          onApply={applyImageOverride}
          onClear={(item) => {
            const key = getItemKey(item)
            const next = { ...feedImgOverrides }
            delete next[key]
            setFeedImgOverrides(next)
            try { localStorage.setItem("hp_feed_img_overrides", JSON.stringify(next)) } catch {}
            setImgEditItem(null)
          }}
          onClose={() => setImgEditItem(null)}
        />
      )}
    </div>
  )
}
