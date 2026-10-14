import axios from 'axios'

const CLIENT_ID = 'aa4e949f8a06492bbfaac8ecad2c7e52'

const REDIRECT_URI = 'http://127.0.0.1:5173/spotify-demo'
const SCOPES = 'user-read-private user-read-email playlist-read-private user-top-read'

const AUTH_URL = 'https://accounts.spotify.com/authorize'
const TOKEN_URL = 'https://accounts.spotify.com/api/token'

// ---- PKCE helpers -------------------------------------------------------
const generateRandomString = (length) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(values, (v) => chars[v % chars.length]).join('')
}

const sha256 = (plain) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain))

const base64encode = (buffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

// ---- Auth flow ----------------------------------------------------------
// Named to match the component's import
export const loginWithSpotify = async () => {
  const verifier = generateRandomString(64)
  const challenge = base64encode(await sha256(verifier))
  const state = generateRandomString(16)

  localStorage.setItem('pkce_verifier', verifier)
  localStorage.setItem('pkce_state', state) // the component checks this on return

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
  })

  window.location.href = `${AUTH_URL}?${params.toString()}`
}

// Returns the access token (the component stores it and the expiry itself)
export const exchangeCodeForToken = async (code) => {
  const verifier = localStorage.getItem('pkce_verifier')
  if (!verifier) throw new Error('Missing PKCE verifier. Please log in again.')

  const { data } = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )

  localStorage.removeItem('pkce_verifier')
  localStorage.removeItem('pkce_state')
  if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token)
  return data.access_token
}

// Optional: silent refresh, if you later want sessions longer than 1 hour
export const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) throw new Error('No refresh token available')

  const { data } = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )

  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('token_expires_at', String(Date.now() + data.expires_in * 1000))
  if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token)
  return data.access_token
}

// The component calls logout() and then resets its own refs
export const logout = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('token_expires_at')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('pkce_verifier')
  localStorage.removeItem('pkce_state')
}