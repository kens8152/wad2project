import axios from 'axios';
import { refreshAccessToken } from './spotifyAuth';

const spotifyApi = axios.create({
baseURL: 'https://api.spotify.com/v1',
});

// Axios Request Interceptor to catch expired tokens before making a request
spotifyApi.interceptors.request.use(async (config) => {
  let token = window.localStorage.getItem('spotify_access_token');
  const expiry = window.localStorage.getItem('spotify_token_expiry');

  // Check if token is expired (or expires within next 10 seconds)
  if (token && expiry && new Date().getTime() > Number(expiry) - 10000) {
    try {
      token = await refreshAccessToken();
    } catch (err) {
      console.error('Failed to refresh token, forcing re-login', err);
      window.localStorage.removeItem('spotify_access_token');
      window.localStorage.removeItem('spotify_token_expiry');

      window.location.href = '/'; // Return to home route
      throw err;
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});


export async function fetchTopArtists(token, limit = 15) {
  const {data} = await axios.get(
    `https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=${limit}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return data.items
}

// Search Spotify for songs
export async function searchSongs(query) {
  const response = await spotifyApi.get('/search', {
    params: {
      q: query,
      type: 'track',
      limit: 5
    }
  })

  return response.data.tracks.items
}
export default spotifyApi;
