// The "web of dots" on the Discover page: one dot per artist, a line between two artists
// who share fans.
//
// The shape of the web (where every dot is, how big it is, and which dots are joined) comes from
// webData.js. What each dot IS (its name, mood) is filled in here from sample data, because there is
// no backend for shared audiences yet:
//   - the 15 real artists from the Events data sit on the biggest dots of their genre
//     (they have an artist page and gigs)
//   - every other dot is a made-up local act with a name that never changes

import { artists as realArtists } from '@/data/events/mockData'
import { WEB_DOTS, WEB_EDGES } from './webData'

// labelX / labelY: where the genre name is written on the map
export const GENRES = [
  { id: 'indie-rock', label: 'Indie Rock', color: '#f0452f', labelX: 362, labelY: 297 },
  { id: 'pop', label: 'Pop Music', color: '#1f6feb', labelX: 388, labelY: 634 },
  { id: 'mandopop', label: 'Contemporary Mandopop', color: '#f0529c', labelX: 645, labelY: 246 },
  { id: 'electronic', label: 'Electronic', color: '#0f9d8a', labelX: 509, labelY: 96 },
  { id: 'hip-hop', label: 'Hip-Hop', color: '#9b2fd6', labelX: 778, labelY: 525 },
  { id: 'traditional', label: 'Traditional Ethnic Music', color: '#f59e0b', labelX: 282, labelY: 552 },
]

export const MOODS = ['Chill', 'Energetic', 'Late night']

// how likely each mood is in each genre (chill, energetic, late night)
const MOOD_CHANCE = {
  'indie-rock': [0.5, 0.2, 0.3],
  pop: [0.4, 0.4, 0.2],
  mandopop: [0.5, 0.2, 0.3],
  electronic: [0.15, 0.4, 0.45],
  'hip-hop': [0.1, 0.5, 0.4],
  traditional: [0.7, 0.15, 0.15],
}

// words for the made-up act names ("Neon Lanterns", "Paper Tides" ...)
const ADJECTIVES = ['Neon', 'Paper', 'Velvet', 'Static', 'Lunar', 'Coral', 'Hollow', 'Golden', 'Midnight', 'Tidal', 'Kopi', 'Monsoon', 'Harbour', 'Satellite', 'Glass', 'Little', 'Wild', 'Silver', 'Crimson', 'Echo', 'Orchid', 'Night', 'Sunday', 'Amber']
const NOUNS = ['Lanterns', 'Tides', 'Atlas', 'Bloom', 'Ferries', 'Signals', 'Avenue', 'Machines', 'Rooftops', 'Weather', 'Comets', 'Gardens', 'Theory', 'Hearts', 'Parade', 'Mangroves', 'Radio', 'Monarchs', 'Season', 'Collective', 'Club', 'Arcade', 'Ghosts', 'Riot']

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// 2400 fans -> "2.4k"
export function formatFans(fans) {
  if (fans < 1000) return String(fans)
  return (fans / 1000).toFixed(1).replace('.0', '') + 'k'
}

// the same dot always gets the same mood (a number between 0 and 1 worked out from its position in the list)
function pickMood(genreId, index) {
  const chances = MOOD_CHANCE[genreId]
  const roll = ((index * 37 + 11) % 100) / 100
  if (roll < chances[0]) return MOODS[0]
  if (roll < chances[0] + chances[1]) return MOODS[1]
  return MOODS[2]
}

function buildGraph() {
  const genreById = {}
  for (const genre of GENRES) {
    genreById[genre.id] = genre
  }

  // one node for every dot in the design
  const nodes = WEB_DOTS.map((dot, index) => {
    const genre = genreById[dot[3]]
    const diameter = dot[2]
    return {
      index: index,
      id: '',
      name: '',
      genre: genre.id,
      color: genre.color,
      x: dot[0],
      y: dot[1],
      r: (diameter / 2) * 1.3,
      // bigger dot = more fans
      fans: Math.round(150 + (diameter - 5) * 380),
      mood: pickMood(genre.id, index),
      real: false,
      artistId: null,
      tag: '',
    }
  })

  // how many lines each dot has
  const lineCount = nodes.map(() => 0)
  for (const pair of WEB_EDGES) {
    lineCount[pair[0]] = lineCount[pair[0]] + 1
    lineCount[pair[1]] = lineCount[pair[1]] + 1
  }

  // the real artists go on the best connected, biggest dots of their genre (so their card has people to show)
  const usedNames = {}
  for (const genre of GENRES) {
    const biggestFirst = nodes
      .filter(node => node.genre === genre.id && lineCount[node.index] >= 3)
      .sort((a, b) => b.r + lineCount[b.index] - (a.r + lineCount[a.index]))
    const real = realArtists.filter(artist => artist.genreId === genre.id)

    real.forEach((artist, position) => {
      const node = biggestFirst[position]
      if (!node) return
      node.id = artist.id
      node.name = artist.name
      node.real = true
      node.artistId = artist.id
      node.tag = artist.tags[0]
      usedNames[artist.name.toLowerCase()] = true
    })
  }

  // every other dot is a made-up act: an adjective and a noun, picked in a fixed pattern so the names never change
  let counter = 0
  for (const node of nodes) {
    if (node.real) continue

    let name = ''
    do {
      name = ADJECTIVES[(counter * 7) % ADJECTIVES.length] + ' ' + NOUNS[(counter * 5 + Math.floor(counter / ADJECTIVES.length)) % NOUNS.length]
      counter = counter + 1
    } while (usedNames[name.toLowerCase()])

    usedNames[name.toLowerCase()] = true
    node.name = name
    node.id = 'act-' + slugify(name)
  }

  // the lines
  const edges = WEB_EDGES.map(pair => ({ a: pair[0], b: pair[1] }))

  // who is next to whom (biggest fan bases first, so the card lists the best known names)
  const neighbours = nodes.map(() => [])
  for (const edge of edges) {
    neighbours[edge.a].push(edge.b)
    neighbours[edge.b].push(edge.a)
  }
  for (const list of neighbours) {
    list.sort((p, q) => nodes[q].fans - nodes[p].fans)
  }

  // bounding box of every dot, used to centre the web
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const node of nodes) {
    minX = Math.min(minX, node.x - node.r)
    maxX = Math.max(maxX, node.x + node.r)
    minY = Math.min(minY, node.y - node.r)
    maxY = Math.max(maxY, node.y + node.r)
  }

  // the middle of each genre's dots (used to place "Your taste profile")
  const centroids = {}
  for (const genre of GENRES) {
    const own = nodes.filter(node => node.genre === genre.id)
    let sumX = 0
    let sumY = 0
    for (const node of own) {
      sumX = sumX + node.x
      sumY = sumY + node.y
    }
    centroids[genre.id] = { x: sumX / own.length, y: sumY / own.length }
  }

  return { nodes, edges, neighbours, genres: GENRES, genreById, centroids, bounds: { minX, maxX, minY, maxY } }
}

let cached = null

// built once, then shared
export function getGraph() {
  if (cached === null) cached = buildGraph()
  return cached
}

// where "Your taste profile" sits: between the dots of the genres the user likes
export function tasteSpot(genreIds) {
  const graph = getGraph()
  const middle = { x: (graph.bounds.minX + graph.bounds.maxX) / 2, y: (graph.bounds.minY + graph.bounds.maxY) / 2 }
  const chosen = genreIds.filter(id => graph.centroids[id])
  if (chosen.length === 0) return middle

  let x = 0
  let y = 0
  for (const id of chosen) {
    x = x + graph.centroids[id].x
    y = y + graph.centroids[id].y
  }
  // pulled a little towards the middle of the web so the ring never sits on top of one genre
  return { x: (x / chosen.length) * 0.7 + middle.x * 0.3, y: (y / chosen.length) * 0.7 + middle.y * 0.3 }
}

// artists to suggest: the biggest ones in the user's genres
export function recommendedNodes(genreIds, count) {
  const graph = getGraph()
  const pool = graph.nodes.filter(node => genreIds.length === 0 || genreIds.includes(node.genre))
  pool.sort((a, b) => b.fans - a.fans)
  return pool.slice(0, count)
}
