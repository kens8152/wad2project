import axios from 'axios'

// Artist data comes from the Express server (server/server.js -> /artists).
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function getArtists() {
  const response = await axios.get(`${API_BASE_URL}/artists`)
  return response.data
}
