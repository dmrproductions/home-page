export interface AppItem {
  id: string
  name: string
  emoji: string
  url: string
  category: AppCategory
}

export type AppCategory =
  | "ai-tools"
  | "social"
  | "productivity"
  | "fashion"
  | "entertainment"

export type FollowCategory =
  | "friends"
  | "family"
  | "industry"
  | "businesses"
  | "celebrities"

export interface FollowedPerson {
  id: string
  name: string
  handle: string
  category: FollowCategory
  initials: string
  avatarUrl?: string
  latestUpdate: string
  storyLink?: string
  profileUrl?: string
  platform: string
  minutesAgo: number
  isLive: boolean
  isReal?: boolean
}

export interface NewsAlert {
  id: string
  name: string
  category: FollowCategory
  update: string
  platform: string
  minutesAgo: number
  urgent: boolean
  initials: string
  imageUrl: string
  link?: string        // real article URL
  isReal?: boolean     // true = from live RSS feed
}

export interface FamilyPhoto {
  id: string
  name: string
  dataUrl: string
  uploadedAt: string
}

export type EventType = "birthday" | "anniversary" | "holiday" | "custom"

export interface FamilyEvent {
  id: string
  personName: string
  eventType: EventType
  date: string  // "MM-DD" format
  notes?: string
  photoId?: string
  headshotDataUrl?: string   // optional per-person headshot photo (base64 dataUrl)
}
