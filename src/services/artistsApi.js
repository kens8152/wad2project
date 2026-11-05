import { supabase } from '@/services/supabase'

// Fetch all artists from Supabase joined with their genre and event count
export async function getArtists() {
  const [
    { data: artists, error: artistsError },
    { data: eventArtists, error: eaError },
  ] = await Promise.all([
    supabase
      .from('artists')
      .select('id, name, tag, image_url, genre:genres(name, color)')
      .order('name'),
    supabase
      .from('event_artists')
      .select('artist_id'),
  ])

  if (artistsError) throw artistsError
  if (eaError) throw eaError

  // Count events per artist
  const counts = {}
  for (const row of eventArtists) {
    counts[row.artist_id] = (counts[row.artist_id] || 0) + 1
  }

  return artists.map(row => ({
    id: row.id,
    name: row.name,
    tag: row.tag || '',
    image: row.image_url || '/images/Artists/' + row.id + '.svg',
    genre: row.genre || { name: 'Unknown', color: '#6c757d' },
    genres: row.genre ? [row.genre.name] : [],
    venues: [],
    events: new Array(counts[row.id] || 0), // length = event count for sortArtists('events')
    nextEvent: null,
  }))
}
