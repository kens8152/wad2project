import { computed, reactive, ref } from 'vue'
import { useEventsData } from './useEventsData'
import { addDays, startOfDay, dow } from '../../utils/events/date'

// Shared filter state for the Map and List screens (module-level, so toggling
// between them keeps the user's filters).
//
//  - `draft`   is what the sidebar controls edit.
//  - `applied` is what the results are computed from; "Apply filters" copies
//    draft → applied. (The search box is the one exception: it applies live.)

export const MAX_DISTANCE_KM = 20 // slider max; at max the label reads "20+ km" and means "no limit"
export const WEEK_DAYS = 7
export const DEFAULT_DISTANCE_KM = MAX_DISTANCE_KM // both sliders start fully open: any distance, and the whole week
export const DEFAULT_DAY = WEEK_DAYS - 1 // the date slider counts days from today (0 = today, 6 = in six days)

// the options in the sort dropdown (`value` is the key into `sorters` below)
export const SORTS = [
  { value: 'soonest', label: 'Earliest', icon: 'bi-clock' },
  { value: 'nearest', label: 'Nearest', icon: 'bi-geo-alt' },
  { value: 'popular', label: 'Most popular', icon: 'bi-fire' },
  { value: 'price', label: 'Price: low to high', icon: 'bi-tag' },
]

// One compare function per sort, used by .sort(): a negative result puts `a` first.
// `||` is a tiebreaker: if the first difference is 0 (equal), it falls through to the next one (the start time).
const sorters = {
  soonest: (a, b) => a.startsAt - b.startsAt, // earlier first (Dates subtract into milliseconds)
  nearest: (a, b) => a.distanceKm - b.distanceKm || a.startsAt - b.startsAt, // closer first
  popular: (a, b) => b.going - a.going || a.startsAt - b.startsAt, // `b - a` = bigger first
  price: (a, b) => a.price - b.price || a.startsAt - b.startsAt, // cheaper first
}

// An empty set of filters. It is a function so every call gives a fresh object (and fresh arrays),
// not one shared object that would get changed by whoever uses it.
const blank = () => ({
  q: '', // search text
  genres: [], // chosen genre ids (empty = every genre)
  artists: [], // chosen artist ids (empty = every artist)
  venue: null, // a venue id from a deep link, or null
  distance: DEFAULT_DISTANCE_KM,
  day: DEFAULT_DAY,
})

// Both are module-level, so the Map and List screens share them.
const draft = reactive(blank()) // what the sidebar is editing right now
const applied = reactive(blank()) // what the results are actually built from
const sort = ref('soonest') // the chosen sort, a key of `sorters`
const ready = ref(false) // true once init() has loaded the data and set up the filters

// copy a filter object, including NEW copies of its arrays (otherwise draft and applied would share the same arrays)
const clone = (f) => ({ ...f, genres: [...f.genres], artists: [...f.artists] })
// do two lists hold the same items, in any order?
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x))
// a URL query value can be a string or an array of strings: take the first one (or '' if missing)
const first = (v) => (Array.isArray(v) ? v[0] : v) || ''

let searchTimer = null // the pending search timeout (see setQuery)

// The user's saved preferences: the genres, artists, distance and date range they
// chose to keep. Remembered in the browser so they are still there next time.
const PREFERENCES_KEY = 'riffle.preferences'

// read the saved preferences from localStorage; gives null if there are none or they are broken
function loadPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY))
    if (saved && Array.isArray(saved.genres) && Array.isArray(saved.artists)) return saved
  } catch {
    /* nothing saved yet */
  }
  return null
}

const savedPreferences = ref(loadPreferences())

export function useEventFilters() {
  const data = useEventsData()
  const { events, artists, genres, venues, user } = data

  // ---- lifecycle ---------------------------------------------------------

  /** Load the catalog (once) and, if the URL carries filters, apply them. */
  async function init(query = {}) {
    await data.load()
    // only the first time: later visits keep the filters the user already set
    if (!ready.value) {
      Object.assign(draft, blank()) // Object.assign copies the values of blank() into the reactive object
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
    if (!artist && !venue && !q) return // a normal visit to /events: change nothing
    // start from blank so an old filter does not mix with the link, then fill in what the link asks for
    Object.assign(draft, blank(), {
      q,
      artists: artist ? [artist] : [],
      venue: venue || null,
      distance: venue ? MAX_DISTANCE_KM : DEFAULT_DISTANCE_KM, // a venue link must not be hidden by distance
    })
    commit()
  }

  // "Apply filters": copy draft → applied, which makes `results` recalculate
  function commit() {
    Object.assign(applied, clone(draft))
  }

  // ---- sidebar actions ---------------------------------------------------

  // add the id to the list if it is not there, remove it if it is (used for the genre and artist checkboxes)
  const toggleIn = (list, id) => {
    const i = list.indexOf(id)
    if (i === -1) list.push(id)
    else list.splice(i, 1)
  }
  const toggleGenre = (id) => toggleIn(draft.genres, id)
  const toggleArtist = (id) => toggleIn(draft.artists, id)

  // ---- preferences -------------------------------------------------------

  const hasPreferences = computed(() => savedPreferences.value !== null)

  /** Do the sidebar's current choices equal the saved preferences? */
  const draftMatchesPreferences = computed(() => {
    const p = savedPreferences.value
    return (
      p !== null &&
      sameSet(draft.genres, p.genres) &&
      sameSet(draft.artists, p.artists) &&
      draft.distance === p.distance &&
      draft.day === p.day
    )
  })

  /** Is anything chosen that is not the default (so there is something worth saving)? */
  const hasCustomChoices = computed(
    () =>
      draft.genres.length > 0 ||
      draft.artists.length > 0 ||
      draft.distance !== DEFAULT_DISTANCE_KM ||
      draft.day !== DEFAULT_DAY,
  )

  /** The heart glows when the choices differ from what is saved. */
  const canSavePreferences = computed(() => hasCustomChoices.value && !draftMatchesPreferences.value)

  /** The switch is on when the choices are exactly the saved preferences. */
  // A writable computed: `get` is what the switch shows, `set` runs when the user flips it.
  const preferencesOn = computed({
    get: () => draftMatchesPreferences.value,
    set: (on) => {
      if (on) {
        // switched on: load the saved choices into the sidebar
        const p = savedPreferences.value
        if (!p) return
        draft.genres = [...p.genres]
        draft.artists = [...p.artists]
        draft.distance = p.distance
        draft.day = p.day
      } else {
        // switched off: back to the defaults, but keep what is typed in the search box and the venue link
        Object.assign(draft, blank(), { q: draft.q, venue: draft.venue })
      }
      commit() // using or leaving your preferences takes effect straight away
    },
  })

  // the heart button: remember the sidebar's current choices (not the search text or venue)
  function savePreferences() {
    savedPreferences.value = {
      genres: [...draft.genres],
      artists: [...draft.artists],
      distance: draft.distance,
      day: draft.day,
    }
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(savedPreferences.value))
    } catch {
      /* private mode: keep them for this visit only */
    }
  }

  /** Search applies as you type (debounced) rather than waiting for Apply. */
  // Debounce: every key press cancels the timer from the last one and starts a new 200 ms timer,
  // so the list only filters once the user pauses typing.
  function setQuery(text) {
    draft.q = text
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => (applied.q = draft.q), 200)
  }

  // remove the venue filter straight away (the chip's "x" button)
  function clearVenue() {
    draft.venue = null
    applied.venue = null
  }

  // "Reset": everything back to the defaults, and applied immediately
  function reset() {
    Object.assign(draft, blank())
    commit()
  }

  // ---- derived -----------------------------------------------------------

  // Has the sidebar changed since the last Apply? (the Apply button uses this to light up)
  const isDirty = computed(
    () =>
      !sameSet(draft.genres, applied.genres) ||
      !sameSet(draft.artists, applied.artists) ||
      draft.distance !== applied.distance ||
      draft.day !== applied.day,
  )

  // The list the Map and List screens show. It is a computed, so it re-runs by itself whenever
  // `applied`, `sort` or the events change (including distances changing after live location).
  // Each condition reads "no filter set, OR the event matches", so an empty filter lets everything through.
  const results = computed(() => {
    const f = applied
    const q = f.q.trim().toLowerCase()
    return events.value
      .filter(
        (e) =>
          e.dayOffset >= 0 && // not an event in the past
          // A venue deep-link shows everything upcoming there, ignoring the week window.
          (f.venue ? e.venueId === f.venue : e.dayOffset <= f.day) &&
          (!f.genres.length || f.genres.includes(e.genreId)) &&
          (!f.artists.length || e.artistIds.some((id) => f.artists.includes(id))) && // any artist in the line-up matches
          (f.distance >= MAX_DISTANCE_KM || e.distanceKm <= f.distance) && // at the max the distance is "no limit"
          (!q || e.searchText.includes(q)), // searchText was built once in the service
      )
      .sort(sorters[sort.value]) // pick the compare function for the chosen sort
  })

  // how many events each genre has, e.g. { techno: 4, indie: 3 } (the numbers in the genre list)
  const genreCounts = computed(() => {
    const counts = {}
    events.value.forEach((e) => (counts[e.genreId] = (counts[e.genreId] || 0) + 1))
    return counts
  })

  /** The seven day labels under the date slider. */
  const days = computed(() => {
    const today = startOfDay()
    // Array.from({ length: 7 }, fn) builds a list of 7 items by calling fn for each index
    return Array.from({ length: WEEK_DAYS }, (_, i) => {
      const d = addDays(today, i)
      return { index: i, dow: i === 0 ? 'Today' : dow(d), num: d.getDate(), date: d }
    })
  })

  // the text above the date slider: "Today" or "Today – Thu 14"
  const dayRangeLabel = (day) => {
    if (day === 0) return 'Today'
    const d = addDays(startOfDay(), day)
    return `Today – ${dow(d)} ${d.getDate()}`
  }

  /** "FallingIslands" / "FallingIslands, Evanturetime" / "" */
  // the chosen artist ids turned into names; the `?.` and filter(Boolean) skip any id that is not found
  const artistSummary = computed(() =>
    applied.artists
      .map((id) => artists.value.find((a) => a.id === id)?.name)
      .filter(Boolean)
      .join(', '),
  )

  // the name of the venue from a deep link, or '' (shown in the venue chip)
  const venueName = computed(() => venues.value.find((v) => v.id === applied.venue)?.name || '')

  // How many filters are active (the number on the Filters button).
  // Each kind counts once, and a slider only counts when it is moved off its default.
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
    hasPreferences,
    canSavePreferences,
    savePreferences,
    artistSummary,
    venueName,
    activeCount,
    dayRangeLabel,
    // actions
    init,
    applyQuery,
    apply: commit, // the "Apply filters" button
    reset,
    toggleGenre,
    toggleArtist,
    setQuery,
    clearVenue,
  }
}
