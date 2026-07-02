/**
 * Tiny in-memory cache so TopBar can search the current feed
 * without prop-drilling. NewsFeed writes here after each fetch;
 * TopBar reads here on keystroke.
 */

export interface CachedItem {
  id: string
  title: string
  source: string
  category: string
  link?: string
  imageUrl?: string
  minutesAgo: number
}

let _items: CachedItem[] = []

export const feedCache = {
  set(items: CachedItem[]) { _items = items },
  get(): CachedItem[]     { return _items },
  search(q: string): CachedItem[] {
    const lower = q.toLowerCase().trim()
    if (!lower) return []
    return _items.filter(item =>
      item.title.toLowerCase().includes(lower) ||
      item.source.toLowerCase().includes(lower) ||
      item.category.toLowerCase().includes(lower)
    ).slice(0, 6)
  },
}
