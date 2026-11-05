import { describe, it, expect } from 'vitest'
import { topTags, TRENDING_COUNT } from '../trendingTags'

const post = (...tags) => ({ tags })

describe('topTags', () => {
  it('ranks tags by how many posts use them', () => {
    const posts = [post('gig'), post('gig', 'jazz'), post('gig', 'jazz', 'indie')]
    expect(topTags(posts).map((t) => t.key)).toEqual(['gig', 'jazz', 'indie'])
  })

  it('counts tags case-insensitively and keeps the first spelling', () => {
    const posts = [post('Jazz'), post('jazz'), post('JAZZ')]
    expect(topTags(posts)).toEqual([{ key: 'jazz', name: 'Jazz', count: 3 }])
  })

  it('counts a tag only once per post', () => {
    expect(topTags([post('gig', 'GIG', 'gig')])[0].count).toBe(1)
  })

  it('breaks ties alphabetically', () => {
    const posts = [post('rock'), post('blues'), post('pop')]
    expect(topTags(posts).map((t) => t.name)).toEqual(['blues', 'pop', 'rock'])
  })

  it(`returns at most ${TRENDING_COUNT} tags by default`, () => {
    const posts = [post('a', 'b', 'c', 'd', 'e', 'f', 'g')]
    expect(topTags(posts)).toHaveLength(TRENDING_COUNT)
  })

  it('respects a custom limit', () => {
    expect(topTags([post('a', 'b', 'c')], 2)).toHaveLength(2)
  })

  it('ignores posts with no tags', () => {
    expect(topTags([{}, { tags: null }, post()])).toEqual([])
  })
})
