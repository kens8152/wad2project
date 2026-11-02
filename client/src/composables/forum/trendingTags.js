import { computed, inject, provide } from 'vue'

export const TRENDING_COUNT = 5


export function topTags(posts, limit = TRENDING_COUNT) {
  const map = new Map()
  for (const post of posts) {
    const seen = new Set()
    for (const raw of post.tags ?? []) {
      const key = raw.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      const entry = map.get(key) ?? { key, name: raw, count: 0 }
      entry.count++
      map.set(key, entry)
    }
  }
  return [...map.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit)
}


export function provideTrendingTags(posts) {
  provide('trendingTags', computed(() => new Set(topTags(posts.value).map((t) => t.key))))
}

export function useTrendingTags() {
  const trending = inject('trendingTags', null)
  return (tag) => !!trending?.value.has(String(tag).toLowerCase())
}
