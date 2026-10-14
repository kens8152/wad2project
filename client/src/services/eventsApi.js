import axios from 'axios'

// All event data comes through here. For now it reads a JSON file in /public;
// when the backend is ready, only the url needs to change.
const EVENTS_URL = '/data/events.json'

export async function getEventData() {
  const response = await axios.get(EVENTS_URL)
  return response.data
}
