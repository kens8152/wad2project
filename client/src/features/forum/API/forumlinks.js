import { computed, reactive } from 'vue'
import { supabase } from '@/services/supabase.js'

const EVENT_DETAIL_ROUTE = 'event-detail'
const ARTIST_DETAIL_ROUTE = 'artist-detail'

export const catalog = reactive({
  artists: [],
  events: [],
  loading: false,
  loaded: false,
  error: '',
})

function toArtist(row, events) {
  const upcoming = events
    .filter((e) => (e.day_offset ?? -1) >= 0)
    .sort((a, b) => a.day_offset - b.day_offset)[0]

  return {
    type: 'artist',
    id: row.id,
    title: row.name,
    image: row.image_url,
    genreName: row.genre?.name,
    genreColor: row.genre?.color,
    tag: row.tag,
    venues: [...new Set(events.map((e) => e.venue?.name).filter(Boolean))],
    eventCount: events.length,
    nextEvent: upcoming ? { dateLabel: upcoming.date_label, timeLabel: upcoming.time_label } : null,
    search: [row.name, row.genre?.name, row.tag, row.hometown].filter(Boolean).join(' ').toLowerCase(),
  }
}

function toEvent(row, artistNames) {
  const artistIds = (row.event_artists ?? []).map((r) => r.artist_id)
  return {
    type: 'event',
    id: row.id,
    title: row.title,
    image: row.image,
    genreName: row.genre?.name,
    genreColor: row.genre?.color,
    venueName: row.venue?.name,
    dow: row.dow,
    dayNumber: row.day_number,
    month: row.month,
    dateLabel: row.date_label,
    timeLabel: row.time_label,
    price: Number(row.price ?? 0),
    going: row.going ?? 0,
    tag: row.tag,
    artistIds,
    search: [
      row.title,
      row.venue?.name,
      row.genre?.name,
      row.tag,
      ...artistIds.map((id) => artistNames.get(id)),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  }
}

let inflight = null

export function loadCatalog() {
  if (catalog.loaded) return Promise.resolve()
  if (inflight) return inflight

  catalog.loading = true
  catalog.error = ''

  inflight = (async () => {
    try {
      const [artistRes, eventRes] = await Promise.all([
        supabase
          .from('artists')
          .select('id, name, tag, hometown, image_url, genre:genres(id, name, color)')
          .order('name'),
        supabase
          .from('events')
          .select(
            'id, title, image, dow, day_number, month, date_label, time_label, day_offset, price, going, tag, genre:genres(id, name, color), venue:venues(id, name, address), event_artists(artist_id)',
          )
          .order('day_offset', { ascending: false }),
      ])
      if (artistRes.error) throw artistRes.error
      if (eventRes.error) throw eventRes.error

      const eventsByArtist = new Map()
      for (const row of eventRes.data) {
        for (const link of row.event_artists ?? []) {
          if (!eventsByArtist.has(link.artist_id)) eventsByArtist.set(link.artist_id, [])
          eventsByArtist.get(link.artist_id).push(row)
        }
      }

      const artists = artistRes.data.map((row) => toArtist(row, eventsByArtist.get(row.id) ?? []))
      const names = new Map(artists.map((a) => [a.id, a.title]))

      catalog.artists = artists
      catalog.events = eventRes.data.map((row) => toEvent(row, names))
      catalog.loaded = true
    } catch (err) {
      console.error('Could not load events and artists:', err.message)
      catalog.error = 'Could not load events and artists.'
    } finally {
      catalog.loading = false
      inflight = null
    }
  })()

  return inflight
}

const artistMap = computed(() => new Map(catalog.artists.map((a) => [a.id, a])))
const eventMap = computed(() => new Map(catalog.events.map((e) => [e.id, e])))

export const getArtist = (id) => artistMap.value.get(String(id)) ?? null
export const getEvent = (id) => eventMap.value.get(String(id)) ?? null

export const eventArtists = (event) => event.artistIds.filter((id) => artistMap.value.has(id))

export function detailRoute(item) {
  return {
    name: item.type === 'event' ? EVENT_DETAIL_ROUTE : ARTIST_DETAIL_ROUTE,
    params: { id: item.id },
  }
}