export function makeMatchArtist(id, name, genre = 'Indie Rock', genreColor = '#f0452f') {
  return {
    id,
    name,
    genre,
    genreColor,
    tag: 'live',
    image: `/images/Artists/${id}.svg`,
    bio: '',
    hometown: 'Singapore',
    formed: '2020',
    socials: {},
    tracks: [{ id: 1, title: `${name} song`, preview: 'p.m4a', url: 'u', artwork: 'a100x100.jpg' }],
  }
}

export const KRUNKLE = makeMatchArtist('krunkle', 'Krunkle')
export const AIYNA = makeMatchArtist('aiyna', 'ai.yna', 'Pop Music', '#1f6feb')
export const LOKA = makeMatchArtist('loka-nada', 'Loka Nada', 'Traditional', '#f59e0b')
