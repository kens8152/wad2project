import axios from 'axios';

const CLIENT_ID = 'aa4e949f8a06492bbfaac8ecad2c7e52'; // Find this in your Spotify Developer Dashboard
const REDIRECT_URI = 'https://localhost:5173/callback'; // Must match your dashboard exactly
const SCOPES = 'user-read-private user-read-email user-top-read'; // Add scopes you need

// 1. Generate cryptographic random strings for PKCE
const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return transform(values, possible);
};

const transform = (values, possible) => {
  let text = '';
  for (let i = 0; i < values.length; i++) {
    text += possible.charAt(values[i] % possible.length);
  }
  return text;
};

const sha256 = async (plain) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
};

const base64encode = (input) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

// 2. Redirect User to Spotify Login
export const redirectToSpotifyLogin = async () => {
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  // Store codeVerifier locally so we can use it after the redirect
  window.localStorage.setItem('spotify_code_verifier', codeVerifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    redirect_uri: REDIRECT_URI,
  });

  window.location.href = `https://spotify.com{params.toString()}`;
};

// 3. Exchange Code for Access & Refresh Tokens
export const getTokensWithCode = async (code) => {
  const codeVerifier = window.localStorage.getItem('spotify_code_verifier');

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  });

  const response = await axios.post('https://spotify.com', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  storeTokens(response.data);
  return response.data.access_token;
};

// 4. Silently Refresh Expired Tokens
export const refreshAccessToken = async () => {
  const refreshToken = window.localStorage.getItem('spotify_refresh_token');
  if (!refreshToken) throw new Error('No refresh token available');

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await axios.post('https://spotify.com', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  storeTokens(response.data);
  return response.data.access_token;
};

const storeTokens = (data) => {
  window.localStorage.setItem('spotify_access_token', data.access_token);
  if (data.refresh_token) {
    window.localStorage.setItem('spotify_refresh_token', data.refresh_token);
  }
  // Calculate exact token expiry timestamp
  const expiryTime = new Date().getTime() + data.expires_in * 1000;
  window.localStorage.setItem('spotify_token_expiry', expiryTime);
};
