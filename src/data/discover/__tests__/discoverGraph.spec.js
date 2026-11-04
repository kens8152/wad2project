import { describe, it, expect } from 'vitest'
import { GENRES, MOODS, formatFans, getGraph, tasteSpot, recommendedNodes } from '../discoverGraph'
import { WEB_DOTS, WEB_EDGES } from '../webData'
import { artists as realArtists } from '@/data/events/mockData'

const graph = getGraph()

describe('formatFans', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1000, '1k'],
    [2400, '2.4k'],
    [12050, '12.1k'],
  ])('shows %i fans as "%s"', (fans, label) => {
    expect(formatFans(fans)).toBe(label)
  })
})

describe('getGraph: the web of dots', () => {
  it('has one dot for every dot in the design and one line for every link', () => {
    expect(graph.nodes).toHaveLength(WEB_DOTS.length)
    expect(graph.edges).toHaveLength(WEB_EDGES.length)
  })

  it('is built once and then shared', () => {
    expect(getGraph()).toBe(graph)
  })

  it('gives every dot a unique id and a unique name', () => {
    expect(new Set(graph.nodes.map((n) => n.id)).size).toBe(graph.nodes.length)
    expect(new Set(graph.nodes.map((n) => n.name.toLowerCase())).size).toBe(graph.nodes.length)
  })

  it('gives every dot a known genre, its colour and a mood', () => {
    const genreIds = GENRES.map((g) => g.id)
    for (const node of graph.nodes) {
      expect(genreIds).toContain(node.genre)
      expect(node.color).toBe(graph.genreById[node.genre].color)
      expect(MOODS).toContain(node.mood)
    }
  })

  it('gives bigger dots more fans', () => {
    const [small, big] = [...graph.nodes].sort((a, b) => a.r - b.r).filter((_, i, all) => i === 0 || i === all.length - 1)
    expect(big.fans).toBeGreaterThan(small.fans)
  })

  it('places every real artist on a dot of their own genre', () => {
    const real = graph.nodes.filter((n) => n.real)
    expect(real).toHaveLength(realArtists.length)
    for (const node of real) {
      const artist = realArtists.find((a) => a.id === node.artistId)
      expect(node.name).toBe(artist.name)
      expect(node.genre).toBe(artist.genreId)
    }
  })

  it('names the made-up acts "act-…" and gives them no artist page', () => {
    const demo = graph.nodes.filter((n) => !n.real)
    expect(demo.every((n) => n.id.startsWith('act-') && n.artistId === null)).toBe(true)
  })

  it('lists neighbours both ways, biggest fan base first', () => {
    const { a, b } = graph.edges[0]
    expect(graph.neighbours[a]).toContain(b)
    expect(graph.neighbours[b]).toContain(a)
    for (const list of graph.neighbours) {
      const fans = list.map((i) => graph.nodes[i].fans)
      expect(fans).toEqual([...fans].sort((x, y) => y - x))
    }
  })

  it('puts every dot inside the bounding box', () => {
    for (const node of graph.nodes) {
      expect(node.x - node.r).toBeGreaterThanOrEqual(graph.bounds.minX)
      expect(node.x + node.r).toBeLessThanOrEqual(graph.bounds.maxX)
    }
  })

  it('has a centre point for every genre', () => {
    expect(Object.keys(graph.centroids).sort()).toEqual(GENRES.map((g) => g.id).sort())
  })
})

describe('tasteSpot ("Your taste profile" ring)', () => {
  const middle = {
    x: (graph.bounds.minX + graph.bounds.maxX) / 2,
    y: (graph.bounds.minY + graph.bounds.maxY) / 2,
  }

  it('sits in the middle of the web when no genres are chosen', () => {
    expect(tasteSpot([])).toEqual(middle)
  })

  it('ignores genres it does not know', () => {
    expect(tasteSpot(['polka'])).toEqual(middle)
  })

  it('moves towards a chosen genre but stays pulled to the middle', () => {
    const centre = graph.centroids.electronic
    const spot = tasteSpot(['electronic'])
    expect(spot.x).toBeCloseTo(centre.x * 0.7 + middle.x * 0.3, 5)
    expect(spot.y).toBeCloseTo(centre.y * 0.7 + middle.y * 0.3, 5)
  })

  it('sits between two chosen genres', () => {
    const a = tasteSpot(['pop'])
    const b = tasteSpot(['electronic'])
    const both = tasteSpot(['pop', 'electronic'])
    expect(both.x).toBeCloseTo((a.x + b.x) / 2, 5)
    expect(both.y).toBeCloseTo((a.y + b.y) / 2, 5)
  })
})

describe('recommendedNodes', () => {
  it('returns the requested number of artists', () => {
    expect(recommendedNodes([], 6)).toHaveLength(6)
  })

  it('picks the biggest artists first', () => {
    const fans = recommendedNodes([], 10).map((n) => n.fans)
    expect(fans).toEqual([...fans].sort((a, b) => b - a))
  })

  it('only picks from the chosen genres', () => {
    const picks = recommendedNodes(['hip-hop', 'pop'], 8)
    expect(picks.every((n) => ['hip-hop', 'pop'].includes(n.genre))).toBe(true)
  })

  it('does not change the order of the shared graph', () => {
    const before = graph.nodes.map((n) => n.id)
    recommendedNodes(['pop'], 3)
    expect(graph.nodes.map((n) => n.id)).toEqual(before)
  })
})
