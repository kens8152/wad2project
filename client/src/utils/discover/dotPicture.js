// Profile pictures for the dots on the Discover page.
// Every dot has its own portrait photo: no two artists ever share a picture. The photos are in public/images/Artists/profile/,
// named "<genre id>-<number>.jpg" (indie-rock-1.jpg, indie-rock-2.jpg, ...), as many as the genre has dots.
// (They were made with an AI image generator, since the artists in the web are sample artists.)
// Inside a genre the dots take the numbers in turn, the artists with a real artist page first.

import { getGraph } from '@/data/discover/discoverGraph'

let slots = null

// the number of the photo of every dot: { dot id: number }
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
  if (slots === null) slots = buildSlots()
  return '/images/Artists/profile/' + node.genre + '-' + slots[node.id] + '.jpg'
}
