import axios from 'axios'

const CLIENT_ID = 'aa4e949f8a06492bbfaac8ecad2c7e52'
const REDIRECT_URI = `${import.meta.env.VITE_APP_URL}/spotify-demo`
const SCOPES = 'user-read-private user-read-email playlist-read-private user-top-read'

const AUTH_URL = 'https://accounts.spotify.com/authorize'
const TOKEN_URL = 'https://accounts.spotify.com/api/token'

const generateRandomString = (length) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(values, value => chars[value % chars.length]).join('')
}

const sha256 = (plain) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain))

const base64encode = (buffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

export const loginWithSpotify = async (returnTo = '') => {
  const verifier = generateRandomString(64)
  const challenge = base64encode(await sha256(verifier))
  const state = generateRandomString(16)

  localStorage.setItem('pkce_verifier', verifier)
  localStorage.setItem('pkce_state', state)

  if (returnTo === '/onboarding' || returnTo === '/profile') {
    sessionStorage.setItem('riffle-spotify-return-to', returnTo)
  } else {
    sessionStorage.removeItem('riffle-spotify-return-to')
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state
  })

  window.location.href = `${AUTH_URL}?${params.toString()}`
}

export const exchangeCodeForToken = async (code) => {
  const accountId = localStorage.getItem('riffle-spotify-owner')
  const verifier = localStorage.getItem('pkce_verifier')

  if (!verifier) {
    throw new Error('Missing PKCE verifier. Please connect Spotify again.')
  }

  // Exchange Spotify's authorisation code for access and refresh tokens.
  const { data } = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )

  // Ignore the response if the account or connection changed during the request.
  if (localStorage.getItem('riffle-spotify-owner') !== accountId || localStorage.getItem('pkce_verifier') !== verifier) {
    throw new Error('Your account or Spotify connection changed. Please connect again.')
  }

  // Save the access token so onboarding can use it to import genres and search songs.
  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('token_expires_at', String(Date.now() + data.expires_in * 1000))

  if (data.refresh_token) {
    localStorage.setItem('refresh_token', data.refresh_token)
  }

  // Remove the temporary verification details after a successful exchange.
  localStorage.removeItem('pkce_verifier')
  localStorage.removeItem('pkce_state')

  return data.access_token
}

export const refreshAccessToken = async () => {
  const accountId = localStorage.getItem('riffle-spotify-owner')
  const refreshToken = localStorage.getItem('refresh_token')

  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  const { data } = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )
  // Do not restore tokens after logout, an account switch, or disconnection.
  if (localStorage.getItem('riffle-spotify-owner') !== accountId || localStorage.getItem('refresh_token') !== refreshToken) {
    throw new Error('Your Spotify connection changed. Please connect again.')
  }

  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('token_expires_at', String(Date.now() + data.expires_in * 1000))

  if (data.refresh_token) {
    localStorage.setItem('refresh_token', data.refresh_token)
  }

  return data.access_token
}

export const logout = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('token_expires_at')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('pkce_verifier')
  localStorage.removeItem('pkce_state')
  sessionStorage.removeItem('riffle-spotify-return-to')
}