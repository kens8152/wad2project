import axios from 'axios'

const CLIENT_ID = 'aa4e949f8a06492bbfaac8ecad2c7e52'
const REDIRECT_URI = 'http://127.0.0.1:5173/spotify-demo'
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

  if (returnTo === '/onboarding') {
    sessionStorage.setItem('riffle-spotify-return-to', '/onboarding')
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
  const verifier = localStorage.getItem('pkce_verifier')

  if (!verifier) {
    throw new Error('Missing PKCE verifier. Please connect Spotify again.')
  }

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

  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('token_expires_at', String(Date.now() + data.expires_in * 1000))

  if (data.refresh_token) {
    localStorage.setItem('refresh_token', data.refresh_token)
  }

  localStorage.removeItem('pkce_verifier')
  localStorage.removeItem('pkce_state')

  return data.access_token
}

export const refreshAccessToken = async () => {
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