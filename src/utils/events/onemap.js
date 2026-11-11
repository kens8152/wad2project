// OneMap (Singapore Land Authority): the base map under the Events map.
// The map tiles are public, so no token is needed.
// Library credit: the map is drawn with Leaflet (https://leafletjs.com).
//
// How it fits together: OneMap supplies the map PICTURES (tiles), Leaflet is the library that
// fetches them and handles dragging and zooming, and our own Vue code (EventMap.vue) adds the pins on top.

// A map is not one big picture but a grid of small square images called "tiles".
//   {z} = the zoom level, {x} and {y} = which square of the grid.
// Leaflet works out which tiles the screen needs and replaces the three {...} parts with numbers as you pan and zoom.
export const TILE_URL = 'https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png'

// OneMap asks every map that uses its tiles to show this credit
// (Leaflet shows it in the bottom right corner of the map)
export const ATTRIBUTION =
  '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:20px;width:20px;" alt=""/>&nbsp;' +
  '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a>&nbsp;&copy;&nbsp;contributors&nbsp;&#124;&nbsp;' +
  '<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>'

// the tiles only cover Singapore
// Format: [[south, west], [north, east]], the bottom-left and top-right corners of a box as [latitude, longitude].
// The map is not allowed to move outside this box, and useLiveLocation uses it to tell if you are in Singapore.
export const SG_BOUNDS = [
  [1.144, 103.535],
  [1.494, 104.502],
]
// The furthest out you can zoom (a small number = zoomed out): about the whole island
export const MIN_ZOOM = 11
// The closest zoom. On a sharp (retina) screen the map asks OneMap for tiles one level closer than the zoom, and OneMap
// has none beyond level 19, so zooming to 19 left the map empty. 18 is the closest that always has tiles.
export const MAX_ZOOM = 18


// Why OneMap and not Google Maps?
// Google Maps needs an API key and billing. OneMap is free and made for Singapore, so it shows local detail like building names and MRT stations.
// The data is also local and official.
