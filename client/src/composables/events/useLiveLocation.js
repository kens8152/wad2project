import { ref } from 'vue'
import { useEventsData } from './useEventsData'
import { useEventFilters } from './useEventFilters'
import { SG_BOUNDS } from '../../utils/events/onemap'
import { distanceKm } from '../../utils/events/geo'
import { toast } from '@/composables/useToast'

// Your real location for the Events pages. The browser asks for permission; once it is given, the map shows where you
// are and the distances (the "Within … km" filter and "Nearest" sort) are worked out from there. It keeps following
// you while the page is open.
//   status: 'idle' | 'asking' | 'on' | 'denied' | 'outside' | 'unsupported'
const status = ref('idle')
let watchId = null
let askedOnce = false
let lastFix = null

const MOVE_ENOUGH_KM = 0.03 // a smaller move than this (30 m) is only GPS wobble

function insideSingapore({ lat, lng }) {
  const [[south, west], [north, east]] = SG_BOUNDS
  return lat >= south && lat <= north && lng >= west && lng <= east
}

export function useLiveLocation() {
  const data = useEventsData()
  const filters = useEventFilters()

  function onFix(position) {
    const spot = { lat: position.coords.latitude, lng: position.coords.longitude, label: 'Your location' }
    if (!insideSingapore(spot)) {
      // the map only covers Singapore, so somebody elsewhere keeps the demo location
      stop()
      status.value = 'outside'
      toast('You seem to be outside Singapore, so the map keeps its default spot')
      return
    }
    if (lastFix && distanceKm(lastFix, spot) < MOVE_ENOUGH_KM) return
    const first = !lastFix
    lastFix = spot
    data.setLocation(spot)
    status.value = 'on'
    if (first) {
      filters.sort.value = 'nearest' // the events closest to you come first
      toast('Showing the events nearest to you')
    }
  }

  function onError(error) {
    stop()
    if (error.code === 1) {
      status.value = 'denied'
      toast('Location is blocked. Allow it in the address bar to see events near you')
    } else {
      status.value = 'idle'
      toast('Could not find your location, try again')
    }
  }

  function locate() {
    if (!('geolocation' in navigator)) {
      status.value = 'unsupported'
      toast('Your browser cannot share its location')
      return
    }
    if (status.value === 'asking') return
    stop()
    lastFix = null
    status.value = 'asking'
    watchId = navigator.geolocation.watchPosition(onFix, onError, { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 })
  }

  function stop() {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId)
    watchId = null
  }

  // the first visit to the Events pages asks right away (a blocked location is not asked again)
  async function askOnce() {
    if (askedOnce) return
    askedOnce = true
    try {
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
