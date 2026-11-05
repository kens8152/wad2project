import { distanceKm } from '@/utils/events/geo'

// "New gigs near me": gigs added since your last visit, at a venue within NEAR_KM of you.
// Without your location (not allowed yet, or not supported) every new gig counts.
export const NEAR_KM = 10

// Your location, only if you have already allowed it, so opening the app never pops up a surprise permission prompt.
export async function locationIfAllowed() {
  try {
    if (!navigator.geolocation || !navigator.permissions) return null
    const permission = await navigator.permissions.query({ name: 'geolocation' })
    if (permission.state !== 'granted') return null

    const position = await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, maximumAge: 10 * 60 * 1000 }),
    )
    return { lat: position.coords.latitude, lng: position.coords.longitude }
  } catch {
    return null
  }
}

// Turns the new gigs into notification rows for this person
export function nearbyGigNotifications(userId, events, location) {
  const rows = []
  for (const event of events) {
    const venue = event.venue
    const hasPlace = venue && venue.lat != null && venue.lng != null

    if (location && hasPlace && distanceKm(location, venue) > NEAR_KM) continue

    const where = venue ? ' at ' + venue.name : ''
    const when = event.date_label ? ' (' + event.date_label + ')' : ''
    rows.push({
      user_id: userId,
      type: 'event',
      actor_name: null,
      body: (location ? 'New gig near you: ' : 'New gig: ') + event.title + where + when,
      link: '/events/' + event.id,
      dedupe_key: 'event:' + event.id,
    })
  }
  return rows
}
