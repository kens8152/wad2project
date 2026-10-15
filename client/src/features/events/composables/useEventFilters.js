import { computed, reactive, ref } from 'vue'
import { useEventsData } from './useEventsData'
import { addDays, startOfDay, dow } from '../utils/date'

// Shared filter state for the Map and List screens (module-level, so toggling
// between them keeps the user's filters).
//
//  - `draft`   is what the sidebar controls edit.
//  - `applied` is what the results are computed from; "Apply filters" copies
//    draft → applied. (The search box is the one exception: it applies live.)

export const MAX_DISTANCE_KM = 20 // slider max; at max the label reads "20+ km" and means "no limit"
export const WEEK_DAYS = 7
export const DEFAULT_DISTANCE_KM = 13
export const DEFAULT_DAY = WEEK_DAYS - 1

export const SORTS = [
  { value: 'soonest', label: 'Earliest', icon: 'bi-clock' },
  { value: 'nearest', label: 'Nearest', icon: 'bi-geo-alt' },
  { value: 'popular', label: 'Most popular', icon: 'bi-fire' },
  { value: 'price', label: 'Price: low to high', icon: 'bi-tag' },
]

const sorters = {
  soonest: (a, b) => a.startsAt - b.startsAt,
  nearest: (a, b) => a.distanceKm - b.distanceKm || a.startsAt - b.startsAt,
  popular: (a, b) => b.going - a.going || a.startsAt - b.startsAt,
  price: (a, b) => a.price - b.price || a.startsAt - b.startsAt,
}

const blank = () => ({
  q: '',
  genres: [],
  artists: [],
  venue: null,
  distance: DEFAULT_DISTANCE_KM,
  day: DEFAULT_DAY,
})

const draft = reactive(blank())
const applied = reactive(blank())
const sort = ref('soonest')
const ready = ref(false)

const clone = (f) => ({ ...f, genres: [...f.genres], artists: [...f.artists] })
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x))
const first = (v) => (Array.isArray(v) ? v[0] : v) || ''

let searchTimer = null

export function useEventFilters() {
  const data = useEventsData()
  const { events, artists, genres, venues, user } = data
  const preferred = computed(() => user.value.preferredGenreIds)

  // ---- lifecycle ---------------------------------------------------------

  /** Load the catalog (once) and, if the URL carries filters, apply them. */
  async function init(query = {}) {
    await data.load()
    if (!ready.value) {
      Object.assign(draft, blank(), { genres: [...preferred.value] })
      Object.assign(applied, clone(draft))
      ready.value = true
    }
    applyQuery(query)
  }

  /**
   * Supported deep links (used by the artist page, event page, global search):
   *   /events?artist=<artistId>   /events?venue=<venueId>   /events?q=<text>
   */
  function applyQuery(query) {
    const artist = first(query.artist)
    const venue = first(query.venue)
    const q = first(query.q)
    if (!artist && !venue && !q) return
    Object.assign(draft, blank(), {
      q,
      artists: artist ? [artist] : [],
      venue: venue || null,
      distance: venue ? MAX_DISTANCE_KM : DEFAULT_DISTANCE_KM,
    })
    commit()
  }

  function commit() {
    Object.assign(applied, clone(draft))
  }

  // ---- sidebar actions ---------------------------------------------------

  const toggleIn = (list, id) => {
    const i = list.indexOf(id)
    if (i === -1) list.push(id)
    else list.splice(i, 1)
  }
  const toggleGenre = (id) => toggleIn(draft.genres, id)
  const toggleArtist = (id) => toggleIn(draft.artists, id)

  /** "Your Preferences" is just a shortcut for "genres = the user's genres". */
  const preferencesOn = computed({
    get: () => draft.genres.length > 0 && sameSet(draft.genres, preferred.value),
    set: (on) => {
      draft.genres = on ? [...preferred.value] : []
    },
  })

  /** Search applies as you type (debounced) rather than waiting for Apply. */
  function setQuery(text) {
    draft.q = text
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => (applied.q = draft.q), 200)
  }

  function clearVenue() {
    draft.venue = null
    applied.venue = null
  }

  function reset() {
    Object.assign(draft, blank(), { genres: [...preferred.value] })
    commit()
  }

  // ---- derived -----------------------------------------------------------

  const isDirty = computed(
    () =>
      !sameSet(draft.genres, applied.genres) ||
      !sameSet(draft.artists, applied.artists) ||
      draft.distance !== applied.distance ||
      draft.day !== applied.day,
  )

  const results = computed(() => {
    const f = applied
    const q = f.q.trim().toLowerCase()
    return events.value
      .filter(
        (e) =>
          e.dayOffset >= 0 &&
          // A venue deep-link shows everything upcoming there, ignoring the week window.
          (f.venue ? e.venueId === f.venue : e.dayOffset <= f.day) &&
          (!f.genres.length || f.genres.includes(e.genreId)) &&
          (!f.artists.length || e.artistIds.some((id) => f.artists.includes(id))) &&
          (f.distance >= MAX_DISTANCE_KM || e.distanceKm <= f.distance) &&
          (!q || e.searchText.includes(q)),
      )
      .sort(sorters[sort.value])
  })

  const genreCounts = computed(() => {
    const counts = {}
    events.value.forEach((e) => (counts[e.genreId] = (counts[e.genreId] || 0) + 1))
    return counts
  })

  /** The seven day labels under the date slider. */
  const days = computed(() => {
    const today = startOfDay()
    return Array.from({ length: WEEK_DAYS }, (_, i) => {
      const d = addDays(today, i)
      return { index: i, dow: i === 0 ? 'Today' : dow(d), num: d.getDate(), date: d }
    })
  })

  const dayRangeLabel = (day) => {
    if (day === 0) return 'Today'
    const d = addDays(startOfDay(), day)
    return `Today – ${dow(d)} ${d.getDate()}`
  }

  /** "FallingIslands" / "FallingIslands, Evanturetime" / "" */
  const artistSummary = computed(() =>
    applied.artists
      .map((id) => artists.value.find((a) => a.id === id)?.name)
      .filter(Boolean)
      .join(', '),
  )

  const venueName = computed(() => venues.value.find((v) => v.id === applied.venue)?.name || '')

  const activeCount = computed(
    () =>
      (applied.genres.length ? 1 : 0) +
      (applied.artists.length ? 1 : 0) +
      (applied.distance < MAX_DISTANCE_KM && applied.distance !== DEFAULT_DISTANCE_KM ? 1 : 0) +
      (applied.day !== DEFAULT_DAY ? 1 : 0) +
      (applied.q.trim() ? 1 : 0) +
      (applied.venue ? 1 : 0),
  )

  return {
    // state
    draft,
    applied,
    sort,
    ready,
    // data passthrough
    events,
    artists,
    genres,
    user,
    loading: data.loading,
    error: data.error,
    // derived
    results,
    genreCounts,
    days,
    isDirty,
    preferencesOn,
    artistSummary,
    venueName,
    activeCount,
    dayRangeLabel,
    // actions
    init,
    applyQuery,
    apply: commit,
    reset,
    toggleGenre,
    toggleArtist,
    setQuery,
    clearVenue,
  }
}
