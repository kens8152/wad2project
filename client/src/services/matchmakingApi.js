import { supabase } from '@/services/supabase'

const BATCH_SIZE = 7;

// Full artist details for a list of ids, in the same order as the ids
export async function getArtistDetails(artistIds) {
  if (!artistIds.length) return [];

  const { data, error } = await supabase
    .from('artists')
    .select('id, name, tag, bio, hometown, formed, socials, image_url, tracks, genre:genres(name, color)')
    .in('id', artistIds);
  if (error) throw error;

  return artistIds
    .map(id => data.find(row => row.id === id))
    .filter(Boolean)
    .map(row => ({
      id: row.id,
      name: row.name,
      genre: row.genre?.name || '',
      genreColor: row.genre?.color || '#6c757d',
      tag: row.tag || '',
      image: row.image_url || '/images/Artists/' + row.id + '.svg',
      bio: row.bio || '',
      hometown: row.hometown || '',
      formed: row.formed || '',
      socials: row.socials || {},
      tracks: row.tracks || [],   // [{ id: Apple track id, title }]
    }));
}

// Apple Music 30s previews for each artist's tracks
export async function addSongs(artists) {
  const trackIds = artists.flatMap(artist => artist.tracks.map(track => track.id));
  if (!trackIds.length) return artists;

  let songs = [];
  try {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${trackIds.join(',')}&country=sg`);
    songs = (await res.json()).results;
  } catch (err) {
    console.error('Could not load Apple previews', err);
  }

  return artists.map(artist => ({
    ...artist,
    tracks: artist.tracks
      .map(track => {
        const song = songs.find(s => s.trackId === track.id) || {};
        return { ...track, preview: song.previewUrl, url: song.trackViewUrl, artwork: song.artworkUrl100 };
      })
      .filter(track => track.preview),
  }));
}

// A random batch of artists, with songs
export async function getArtists() {
  const { data, error } = await supabase.from('artists').select('id');
  if (error) throw error;

  const ids = data.map(row => row.id);
  const randomIds = [];
  while (randomIds.length < BATCH_SIZE && ids.length) {
    randomIds.push(ids.splice(Math.floor(Math.random() * ids.length), 1)[0]);
  }

  return addSongs(await getArtistDetails(randomIds));
}

// Today's matchmaking rows for the logged-in user (action is null until they Skip / Follow)
export async function getTodaysArtistRows() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('matchmaking_actions')
    .select('artist_id, action')
    .gte('created_at', startOfToday.toISOString())
    .order('id');
  if (error) throw error;
  return data;
}

// Saves today's batch of artists with no action yet
export async function saveTodaysArtists(artistIds) {
  const rows = artistIds.map(artistId => ({ artist_id: artistId, action: null }));
  const { error } = await supabase.from('matchmaking_actions').insert(rows);
  if (error) throw error;
}

// Skip / Follow: fills in the action for that artist's row
export async function setArtistAction(artistId, action) {
  const { error } = await supabase
    .from('matchmaking_actions')
    .update({ action })
    .eq('artist_id', artistId)
    .is('action', null);
  if (error) throw error;
}

// Unsure: removes that artist's row
export async function removeArtistAction(artistId) {
  const { error } = await supabase
    .from('matchmaking_actions')
    .delete()
    .eq('artist_id', artistId)
    .is('action', null);
  if (error) throw error;
}

// Saved artists, newest first
export async function getSavedArtists() {
  const { data, error } = await supabase
    .from('saved_artists')
    .select('artist_id, saved_at')
    .order('saved_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addSavedArtist(artistId) {
  const { error } = await supabase.from('saved_artists').insert({ artist_id: artistId });
  if (error) throw error;
}

export async function removeSavedArtist(artistId) {
  const { error } = await supabase.from('saved_artists').delete().eq('artist_id', artistId);
  if (error) throw error;
}
