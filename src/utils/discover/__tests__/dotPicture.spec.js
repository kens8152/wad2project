import { describe, it, expect } from 'vitest'
import { pictureOf } from '../dotPicture'
import { getGraph } from '@/data/discover/discoverGraph'

const graph = getGraph()

describe('pictureOf', () => {
  it('builds the photo path from the genre and a number', () => {
    expect(pictureOf(graph.nodes[0])).toMatch(/^\/images\/Artists\/profile\/[a-z-]+-\d+\.jpg$/)
  })

  it('uses the dot\'s own genre in the file name', () => {
    const node = graph.nodes.find((n) => n.genre === 'hip-hop')
    expect(pictureOf(node)).toContain('/hip-hop-')
  })

  it('never gives two dots the same photo', () => {
    const paths = graph.nodes.map(pictureOf)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('numbers each genre from 1 with no gaps', () => {
    for (const genre of graph.genres) {
      const numbers = graph.nodes
        .filter((n) => n.genre === genre.id)
        .map((n) => Number(pictureOf(n).match(/-(\d+)\.jpg$/)[1]))
        .sort((a, b) => a - b)
      expect(numbers).toEqual(numbers.map((_, i) => i + 1))
    }
  })

  it('gives real artists the first numbers in their genre', () => {
    for (const genre of graph.genres) {
      const inGenre = graph.nodes.filter((n) => n.genre === genre.id)
      const realCount = inGenre.filter((n) => n.real).length
      const realNumbers = inGenre.filter((n) => n.real).map((n) => Number(pictureOf(n).match(/-(\d+)\.jpg$/)[1]))
      expect(realNumbers.every((n) => n <= realCount)).toBe(true)
    }
  })

  it('always gives the same dot the same photo', () => {
    expect(pictureOf(graph.nodes[5])).toBe(pictureOf(graph.nodes[5]))
  })
})
