import axios from 'axios'
import { supabase } from '@/services/supabase'
import { useEventsStore } from '@/stores/events'

// Artist data comes from the Express server (server/server.js -> server/stores/artists.json).
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Profiles (bio, hometown, formed, socials, tracks) for specific artists
async function getArtistProfiles(artistIds) {
  if (!artistIds.length) return [];
  const res = await axios.get(`${API_BASE_URL}/matchmaking/artists`, { params: { ids: artistIds.join(',') } });
  return res.data;
}

// Full artist details for a list of ids:
// name, genre and tag from the events data, everything else from the server's artists.json
// (pass profiles in if you already have them, to skip the extra request)
export async function getArtistDetails(artistIds, profiles = null) {
  const eventsStore = useEventsStore();
  await eventsStore.fetchEvents();
  if (!profiles) profiles = await getArtistProfiles(artistIds);

  return artistIds.map(id => {
    const base = eventsStore.artists.find(artist => artist.id === id) || {};
    const genre = eventsStore.genres.find(g => g.id === base.genreId) || {};
    const profile = profiles.find(p => p.id === id) || {};

    return {
      id,
      name: base.name || id,
      genre: genre.name || '',
      genreColor: genre.color || '#6c757d',
      tag: base.tag || '',
      image: '/images/Artists/' + id + '.svg',
      bio: profile.bio || '',
      hometown: profile.hometown || '',
      formed: profile.formed || '',
      socials: profile.socials || {},
      tracks: profile.tracks || [],   // [{ id: Apple track id, title, preview, url, artwork }]
    };
  });
}

// A random batch of artists
export async function getArtists() {
  const res = await axios.get(`${API_BASE_URL}/matchmaking`);
  return getArtistDetails(res.data.map(artist => artist.id), res.data);
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
