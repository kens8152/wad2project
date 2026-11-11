// Geo helpers shared by the services and the map.

const EARTH_RADIUS_KM = 6371 // the average radius of the Earth

/** Great-circle distance between two {lat,lng} points, in km. */
// The "Haversine formula". The Earth is a sphere, so plain Pythagoras on latitude/longitude would be wrong.
// This gives the straight-line distance over the Earth's surface ("as the crow flies"),
// not the walking or MRT distance.
export function distanceKm(a, b) {
  const rad = (deg) => (deg * Math.PI) / 180 // the maths functions below need radians, not degrees
  const dLat = rad(b.lat - a.lat) // how far apart the two points are north-south
  const dLng = rad(b.lng - a.lng) // and east-west
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  // turn h (the "haversine" of the angle between the points) back into a distance along the surface
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

// "0.8km" for short distances (one decimal place), "12km" from 10km up (rounded)
export function formatDistance(km) {
  return km < 10 ? `${km.toFixed(1)}km` : `${Math.round(km)}km`
}

/** Deep links that work without any API key (open in Google Maps). */
// A deep link is just a URL that opens another app at the right place, so we do not need Google's API.
// "Search" shows a pin at the point; "directions" starts a route there by public transport.
export function mapsSearchUrl({ lat, lng }) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}
export function mapsDirectionsUrl({ lat, lng }) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=transit`
}
