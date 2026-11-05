import { supabase } from '@/services/supabase'

// Fetch all event data from Supabase, returning the same shape as the old JSON file
// so the events store does not need to change.
export async function getEventData() {
  const [
    { data: genres, error: genresError },
    { data: artists, error: artistsError },
    { data: venues, error: venuesError },
    { data: eventArtists, error: eaError },
    { data: events, error: eventsError },
  ] = await Promise.all([
    supabase.from('genres').select('id, name, color'),
    supabase.from('artists').select('id, name, tag, genre_id'),
    supabase.from('venues').select('*'),
    supabase.from('event_artists').select('event_id, artist_id'),
    supabase.from('events').select('id, title, image, genre_id, venue_id, headliner_id, day_offset, dow, day_number, month, date_label, start_time, time_label, price, going, tag'),
  ])

  if (genresError) throw genresError
  if (artistsError) throw artistsError
  if (venuesError) throw venuesError
  if (eaError) throw eaError
  if (eventsError) throw eventsError

  // Build artistIds array per event
  const artistIdsByEvent = {}
  for (const row of eventArtists) {
    if (!artistIdsByEvent[row.event_id]) artistIdsByEvent[row.event_id] = []
    artistIdsByEvent[row.event_id].push(row.artist_id)
  }

  // Map to the shape the events store expects
  const mappedEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    image: e.image,
    genreId: e.genre_id,
    venueId: e.venue_id,
    headlinerId: e.headliner_id,
    artistIds: artistIdsByEvent[e.id] || [],
    dayOffset: e.day_offset,
    dow: e.dow,
    dayNumber: e.day_number,
    month: e.month,
    dateLabel: e.date_label,
    time: e.start_time,
    timeLabel: e.time_label,
    price: e.price,
    going: e.going,
    tag: e.tag,
  }))

  const mappedArtists = artists.map(a => ({
    id: a.id,
    name: a.name,
    tag: a.tag || '',
    genreId: a.genre_id,
  }))

  return {
    genres,
    artists: mappedArtists,
    venues,
    events: mappedEvents,
  }
}
