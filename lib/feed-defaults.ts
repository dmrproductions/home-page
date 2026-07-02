export interface NewsFeed {
  id: string; source: string; url: string; category: string
  enabled: boolean; builtin: boolean; addedAt: string
}

export const DEFAULT_FEEDS: NewsFeed[] = [
  { id: "b1", source: "TMZ",             url: "https://www.tmz.com/rss.xml",                                      category: "celebrities", enabled: true, builtin: true, addedAt: "" },
  { id: "b2", source: "Page Six",        url: "https://pagesix.com/feed/",                                        category: "celebrities", enabled: true, builtin: true, addedAt: "" },
  { id: "b3", source: "E! News",         url: "https://www.eonline.com/syndication/feeds/rssfeeds/topstories.xml", category: "celebrities", enabled: true, builtin: true, addedAt: "" },
  { id: "b4", source: "Billboard",       url: "https://www.billboard.com/feed/",                                  category: "celebrities", enabled: true, builtin: true, addedAt: "" },
  { id: "b5", source: "WWD",             url: "https://wwd.com/feed/",                                            category: "industry",    enabled: true, builtin: true, addedAt: "" },
  { id: "b6", source: "Fashionista",     url: "https://fashionista.com/.rss/full/",                               category: "industry",    enabled: true, builtin: true, addedAt: "" },
  { id: "b7", source: "Vogue",           url: "https://www.vogue.com/feed/rss",                                   category: "industry",    enabled: true, builtin: true, addedAt: "" },
  { id: "b8", source: "Fortune",         url: "https://fortune.com/feed/",                                        category: "businesses",  enabled: true, builtin: true, addedAt: "" },
  { id: "b9", source: "Business Insider",url: "https://feeds.businessinsider.com/custom/all",                     category: "businesses",  enabled: true, builtin: true, addedAt: "" },
]
