const ELECTRONIC = { name: 'Electronic', color: '#0f9d8a' }
const INDIE = { name: 'Indie Rock', color: '#f0452f' }
const POP = { name: 'Pop Music', color: '#1f6feb' }

export const STORE_ARTISTS = [
  {
    id: 'fallingislands',
    name: 'FallingIslands',
    tag: 'synthwave',
    image: '/images/Artists/fallingislands.svg',
    genre: ELECTRONIC,
    genres: [ELECTRONIC.name],
    venues: [],
    events: new Array(3),
    nextEvent: { dayOffset: 0, dateLabel: 'Thu, 29 Oct', timeLabel: '9:00 PM' },
  },
  {
    id: 'krunkle',
    name: 'Krunkle',
    tag: 'funk',
    image: '/images/Artists/krunkle.svg',
    genre: INDIE,
    genres: [INDIE.name],
    venues: [],
    events: new Array(1),
    nextEvent: { dayOffset: 1, dateLabel: 'Fri, 30 Oct', timeLabel: '8:00 PM' },
  },
  {
    id: 'lullaboy',
    name: 'Lullaboy',
    tag: 'bedroom-pop',
    image: '/images/Artists/lullaboy.svg',
    genre: POP,
    genres: [POP.name],
    venues: [],
    events: new Array(2),
    nextEvent: null,
  },
]

export const cloneArtists = () =>
  STORE_ARTISTS.map((a) => ({ ...a, genres: [...a.genres], events: new Array(a.events.length) }))
