import axios from 'axios'

// Artist data comes from the Express server (server/server.js -> /artists-matchmaking).
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function getArtists() {
  const res = await axios.get(`${API_BASE_URL}/matchmaking`);
  return res.data;
}

export async function setArtistAction(artistId, userId, action) {
  const res = await axios.post(`${API_BASE_URL}/matchmaking`, { artistId, userId, action });
}

export async function refreshArtists(artists) {
  const res = await axios.post(`${API_BASE_URL}/matchmaking/refresh`, { artists });
  return res.data;
}

export async function saveArtist(artistId, userId) {
  const res = await axios.post(`${API_BASE_URL}/matchmaking/save`, { artistId, userId });
}
