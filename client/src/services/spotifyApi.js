import axios from 'axios';
import { refreshAccessToken } from './spotifyAuth';

const spotifyApi = axios.create({
  baseURL: 'https://spotify.com',
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
      window.localStorage.clear();
      window.location.href = '/'; // send back to login page
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default spotifyApi;
