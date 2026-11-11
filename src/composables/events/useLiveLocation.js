import { ref } from 'vue'
import { useEventsData } from './useEventsData'
import { useEventFilters } from './useEventFilters'
import { SG_BOUNDS } from '../../utils/events/onemap' // the box that Singapore sits in
import { distanceKm } from '../../utils/events/geo'
import { toast } from '@/composables/useToast' // the small message that pops up

// Your real location for the Events pages. The browser asks for permission; once it is given, the map shows where you
// are and the distances (the "Within … km" filter and "Nearest" sort) are worked out from there. It keeps following
// you while the page is open.
// The location is only used in the browser to work out distances; it is not sent anywhere.
//   status: 'idle' | 'asking' | 'on' | 'denied' | 'outside' | 'unsupported'
// These are module-level, so the button and the map share one status and one GPS watch.
const status = ref('idle')
let watchId = null // the id the browser gives the running watch, needed to stop it again
let askedOnce = false // askOnce() only asks automatically the first time
let lastFix = null // the last position we accepted (used to ignore tiny moves)

const MOVE_ENOUGH_KM = 0.03 // a smaller move than this (30 m) is only GPS wobble

// is this point inside the Singapore box?
function insideSingapore({ lat, lng }) {
  const [[south, west], [north, east]] = SG_BOUNDS // pull the four edges out of the nested array
  return lat >= south && lat <= north && lng >= west && lng <= east
}

export function useLiveLocation() {
  const data = useEventsData()
  const filters = useEventFilters()

  // Called by the browser every time it has a position for us (the success callback).
  function onFix(position) {
    const spot = { lat: position.coords.latitude, lng: position.coords.longitude, label: 'Your location' }
    if (!insideSingapore(spot)) {
      // the map only covers Singapore, so somebody elsewhere keeps the demo location
      stop()
      status.value = 'outside'
      toast('You seem to be outside Singapore, so the map keeps its default spot')
      return
    }
    // ignore tiny changes, so the map and the distances do not jitter while you stand still
    if (lastFix && distanceKm(lastFix, spot) < MOVE_ENOUGH_KM) return
    const first = !lastFix
    lastFix = spot
    data.setLocation(spot) // moves the map's "you" marker and recalculates every distance
    status.value = 'on'
    if (first) {
      filters.sort.value = 'nearest' // the events closest to you come first
      toast('Showing the events nearest to you')
    }
  }

  // Called by the browser when it cannot get a position (the error callback).
  function onError(error) {
    stop()
    if (error.code === 1) {
      // code 1 = PERMISSION_DENIED: the user (or the browser settings) said no
      status.value = 'denied'
      toast('Location is blocked. Allow it in the address bar to see events near you')
    } else {
      // any other problem (no signal, timed out): the user can simply try again
      status.value = 'idle'
      toast('Could not find your location, try again')
    }
  }

  // Start following the user's position.
  function locate() {
    if (!('geolocation' in navigator)) {
      status.value = 'unsupported'
      toast('Your browser cannot share its location')
      return
    }
    if (status.value === 'asking') return // already waiting for an answer
    stop() // never keep two watches running
    lastFix = null
    status.value = 'asking'
    // watchPosition keeps calling onFix as you move (getCurrentPosition would only answer once).
    //  enableHighAccuracy: false = quicker and kinder to the battery (Wi-Fi / mobile positioning is enough for a city map)
    //  timeout: give up after 15 s; maximumAge: a position up to 10 s old is fine
    watchId = navigator.geolocation.watchPosition(onFix, onError, { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 })
  }

  // Stop following the position.
  function stop() {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId)
    watchId = null
  }

  // the first visit to the Events pages asks right away (a blocked location is not asked again)
  async function askOnce() {
    if (askedOnce) return
    askedOnce = true
    try {
      // the Permissions API lets us check if location is already blocked, without showing a pop-up
      const permission = await navigator.permissions?.query({ name: 'geolocation' })
      if (permission?.state === 'denied') {
        status.value = 'denied'
        return
      }
    } catch {
      /* the permission cannot be read here: just ask */
    }
    locate()
  }

  // the button: turns it on, or turns it off again when it is on
  function toggle() {
    if (status.value === 'on' || status.value === 'asking') {
      stop()
      status.value = 'idle'
      return
    }
    if (status.value === 'denied') {
      toast('Location is blocked. Allow it in the address bar, then press this again')
    }
    locate()
  }

  return { status, locate, askOnce, toggle }
}
