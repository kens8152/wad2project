const ELECTRONIC = { id: 'electronic', name: 'Electronic', color: '#0f9d8a' }
const INDIE = { id: 'indie-rock', name: 'Indie Rock', color: '#f0452f' }
const POP = { id: 'pop', name: 'Pop Music', color: '#1f6feb' }

const FALLING = { id: 'fallingislands', name: 'FallingIslands', genreId: 'electronic', tag: 'synthwave' }
const KRUNKLE = { id: 'krunkle', name: 'Krunkle', genreId: 'indie-rock', tag: 'funk' }
const LULLABOY = { id: 'lullaboy', name: 'Lullaboy', genreId: 'pop', tag: 'r&b' }

function event(id, genre, venue, artists, dayOffset) {
  return {
    id,
    genre,
    venue: { id: venue.toLowerCase(), name: venue },
    artists,
    headliner: artists[0],
    dayOffset,
    dateLabel: `Day ${dayOffset}`,
    timeLabel: '9:00 PM',
  }
}

export const STORE_EVENTS = [
  event('falling-tinbox', ELECTRONIC, 'TinBox', [FALLING], 0),
  event('falling-kilo', ELECTRONIC, 'Kilo Lounge', [FALLING], 4),
  event('krunkle-battlebox', INDIE, 'BattleBox', [KRUNKLE], 2),
  event('lullaboy-tinbox', POP, 'TinBox', [LULLABOY], 6),
  event('lullaboy-past', POP, 'Esplanade', [LULLABOY], -10),
]

export const EVENT_JSON = {
  genres: [ELECTRONIC, INDIE, POP],
  artists: [FALLING, KRUNKLE, LULLABOY],
  venues: [
    { id: 'tinbox', name: 'TinBox', area: 'Bras Basah', lat: 1.2985, lng: 103.8508 },
    { id: 'battlebox', name: 'BattleBox', area: 'Fort Canning', lat: 1.2945, lng: 103.8461 },
    { id: 'kilo', name: 'Kilo Lounge', area: 'Kallang', lat: 1.3107, lng: 103.8714 },
  ],
  events: [
    { id: 'falling-tinbox', genreId: 'electronic', artistIds: ['fallingislands'], venueId: 'tinbox', dayOffset: 0, time: '21:00', price: 25, going: 118 },
    { id: 'falling-kilo', genreId: 'electronic', artistIds: ['fallingislands'], venueId: 'kilo', dayOffset: 4, time: '20:00', price: 30, going: 40 },
    { id: 'krunkle-battlebox', genreId: 'indie-rock', artistIds: ['krunkle'], venueId: 'battlebox', dayOffset: 2, time: '19:30', price: 15, going: 60 },
    { id: 'lullaboy-tinbox', genreId: 'pop', artistIds: ['lullaboy'], venueId: 'tinbox', dayOffset: 6, time: '21:00', price: 20, going: 75 },
  ],
}
