// Profile pictures for the dots on the Discover page.
// Real artists use their image_url stored in Supabase (set via setArtistImages after the store loads).
// Made-up dots use the AI-generated profile photos from /images/Artists/profile/<genre>-<n>.jpg.

import { getGraph } from '@/data/discover/discoverGraph'

let slots = null
let artistImageMap = {} // artistId -> image_url, populated by setArtistImages()

// Call this once after the artists store loads so real dots show the same image as the artist page
export function setArtistImages(artists) {
  for (const a of artists) {
    if (a.id && a.image) {
      artistImageMap[a.id] = a.image
    }
  }
}

// photo slot numbers for every dot (real artists first within each genre)
function buildSlots() {
  const result = {}
  const graph = getGraph()

  for (const genre of graph.genres) {
    const inGenre = graph.nodes.filter(node => node.genre === genre.id)
    const realFirst = inGenre.filter(node => node.real).concat(inGenre.filter(node => !node.real))
    realFirst.forEach((node, position) => {
      result[node.id] = position + 1
    })
  }
  return result
}

// the picture of a dot, as an address an <img> or an SVG <image> can show
export function pictureOf(node) {
  // real artists: use the image from Supabase if available
  if (node.real && node.artistId && artistImageMap[node.artistId]) {
    return artistImageMap[node.artistId]
  }
  // fallback: profile jpg for fake dots (and real artists before the store loads)
  if (slots === null) slots = buildSlots()
  return '/images/Artists/profile/' + node.genre + '-' + slots[node.id] + '.jpg'
}
