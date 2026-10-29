// OneMap (Singapore Land Authority): the base map under the Events map.
// The map tiles are public, so no token is needed.
// Library credit: the map is drawn with Leaflet (https://leafletjs.com).

export const TILE_URL = 'https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png'

// OneMap asks every map that uses its tiles to show this credit
export const ATTRIBUTION =
  '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:20px;width:20px;" alt=""/>&nbsp;' +
  '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a>&nbsp;&copy;&nbsp;contributors&nbsp;&#124;&nbsp;' +
  '<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>'

// the tiles only cover Singapore
export const SG_BOUNDS = [
  [1.144, 103.535],
  [1.494, 104.502],
]
export const MIN_ZOOM = 11
export const MAX_ZOOM = 19
