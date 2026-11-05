// Landing page showcase data (real Riffle artists and venues)

const photo = (file) => `/images/Artists/profile/${file}.jpg`

export const GENRES = [
  { id: 'indie-rock', name: 'Indie Rock', color: 'var(--genre-indie-rock)' },
  { id: 'pop', name: 'Pop', color: 'var(--genre-pop)' },
  { id: 'mandopop', name: 'Mandopop', color: 'var(--genre-mandopop)' },
  { id: 'electronic', name: 'Electronic', color: 'var(--genre-electronic)' },
  { id: 'hip-hop', name: 'Hip-Hop', color: 'var(--genre-hip-hop)' },
  { id: 'traditional', name: 'Traditional', color: 'var(--genre-traditional)' },
]

const genre = (id) => GENRES.find((g) => g.id === id)

export const SHOWCASE_ARTISTS = [
  { name: 'FallingIslands', genre: genre('electronic'), image: photo('electronic-1') },
  { name: 'ai.yna', genre: genre('pop'), image: photo('pop-2') },
  { name: 'Cloudy Yan', genre: genre('mandopop'), image: photo('mandopop-2') },
  { name: 'Kin Leonn', genre: genre('hip-hop'), image: photo('hip-hop-1') },
  { name: 'Forest Bloom', genre: genre('indie-rock'), image: photo('indie-rock-2') },
  { name: 'Velvet Atlas', genre: genre('traditional'), image: photo('traditional-15') },
  { name: 'Evanturetime', genre: genre('electronic'), image: photo('electronic-2') },
  { name: 'Glass Mangroves', genre: genre('mandopop'), image: photo('mandopop-26') },
  { name: 'Static Weather', genre: genre('hip-hop'), image: photo('hip-hop-8') },
  { name: 'Amber Monarchs', genre: genre('pop'), image: photo('pop-36') },
  { name: 'Neon Signals', genre: genre('electronic'), image: photo('electronic-17') },
  { name: 'Kopi Parade', genre: genre('pop'), image: photo('pop-9') },
  { name: 'Lunar Tides', genre: genre('mandopop'), image: photo('mandopop-28') },
  { name: 'Silver Collective', genre: genre('hip-hop'), image: photo('hip-hop-9') },
]

export const VENUES = [
  { id: 'tinbox', name: 'TinBox', lat: 1.2985, lng: 103.8508 },
  { id: 'battlebox', name: 'BattleBox', lat: 1.2928, lng: 103.8465 },
  { id: 'kilo', name: 'Kilo Lounge', lat: 1.303, lng: 103.869 },
  { id: 'esplanade-annexe', name: 'Esplanade Annexe', lat: 1.2897, lng: 103.8553 },
  { id: 'projector', name: 'The Projector', lat: 1.3029, lng: 103.8638 },
  { id: 'haji-lane', name: 'Haji Lane Social Club', lat: 1.3006, lng: 103.8587 },
  { id: 'clarke-quay', name: 'Clarke Quay', lat: 1.2886, lng: 103.8466 },
  { id: 'tekka', name: 'Tekka Courtyard', lat: 1.3066, lng: 103.8508 },
  { id: 'mount-emily', name: 'Mount Emily', lat: 1.3016, lng: 103.8493 },
  { id: 'bay-east', name: 'Bay East Lawn', lat: 1.2816, lng: 103.861 },
]

export const TICKETS = [
  { artist: 'FallingIslands', venue: 'BattleBox', day: 'FRI', date: '14', month: 'NOV', time: '8:00 PM', genre: genre('electronic') },
  { artist: 'ai.yna', venue: 'Esplanade Annexe', day: 'SAT', date: '15', month: 'NOV', time: '7:30 PM', genre: genre('pop') },
  { artist: 'Cloudy Yan', venue: 'Mount Emily', day: 'SUN', date: '16', month: 'NOV', time: '6:00 PM', genre: genre('mandopop') },
  { artist: 'Kin Leonn', venue: 'Haji Lane Social Club', day: 'WED', date: '19', month: 'NOV', time: '9:00 PM', genre: genre('hip-hop') },
  { artist: 'Forest Bloom', venue: 'TinBox', day: 'FRI', date: '21', month: 'NOV', time: '8:30 PM', genre: genre('indie-rock') },
  { artist: 'Velvet Atlas', venue: 'Tekka Courtyard', day: 'SAT', date: '22', month: 'NOV', time: '5:00 PM', genre: genre('traditional') },
]

export const CHATTER = [
  { who: 'Rosa', text: 'Anyone going to FallingIslands at BattleBox?', votes: 24 },
  { who: 'Joel', text: 'Count me in! Front row or nothing', votes: 11 },
  { who: 'Mei', text: '@Aryan you have to hear Cloudy Yan live', votes: 37, mention: '@Aryan' },
  { who: 'Ravi', text: 'Matchmaking just found me 3 new favourites', votes: 52 },
]
