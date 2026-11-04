import axios from 'axios'

// Finds the 30 second Apple Music preview of a song.
// The matchmaking cards get their previews from Apple's iTunes API (through our server). Apple's search
// can also be called straight from the browser, so any song (for example one found on Spotify) can be looked up by name.

// songs we already looked up: "title|artist" -> the result (or null when Apple has no preview)
const found = {}

// "Hello (Remastered) - Live" -> "hello": makes two spellings of a title easy to compare
function simplify(text) {
  return text
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
}

// Returns { id, title, artist, preview, url, artwork } or null when there is no preview for this song
export async function findApplePreview(title, artist) {
  const key = title + '|' + artist
  if (found[key] !== undefined) return found[key]

  let result = null

  try {
    const res = await axios.get('https://itunes.apple.com/search', {
      params: { term: title + ' ' + artist, entity: 'song', country: 'sg', limit: 10 },
    })

    // only songs that have a preview can be played
    const songs = res.data.results.filter(song => song.previewUrl)

    // the best match has the same title and the same artist; otherwise take the first song with a preview
    let best = null
    for (const song of songs) {
      const sameTitle = simplify(song.trackName) === simplify(title)
      const sameArtist = simplify(artist).includes(simplify(song.artistName)) || simplify(song.artistName).includes(simplify(artist))
      if (sameTitle && sameArtist) {
        best = song
        break
      }
      if (best === null && sameTitle) best = song
    }
    if (best === null && songs.length) best = songs[0]

    if (best) {
      result = {
        id: best.trackId,
        title: best.trackName,
        artist: best.artistName,
        preview: best.previewUrl,
        url: best.trackViewUrl,
        // Apple gives a small picture; ask for a bigger one
        artwork: best.artworkUrl100.replace('100x100', '300x300'),
      }
    }
  } catch (error) {
    console.error('Could not look up the Apple preview', error)
    // a network problem is not remembered, so the next try can work
    return null
  }

  found[key] = result
  return result
}
