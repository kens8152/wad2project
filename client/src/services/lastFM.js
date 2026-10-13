import axios from "axios";

const LASTFM_KEY = 'f25905dc6b0a401b819f17f72c971095'

const BATCH = 5 // so can send 5 Last.fm requests at once instad of 1 by 1, make it quicker
const IGNORE = ['seen live', 'favorites', 'favourite', 'favourites', 'female vocalists', 'male vocalists']

export async function getTopGenres(artists) {

    const scores = {}

    for (let start = 0; start < artists.length; start += BATCH) {
      const batch = artists.slice(start, start + BATCH)

      //fetch genres of each artist
      const results = await Promise.all(
        batch.map((artist) =>
          axios
            .get('https://ws.audioscrobbler.com/2.0/', {
              params: {
                method: 'artist.getTopTags',
                artist: artist.name,
                api_key: LASTFM_KEY,
                format: 'json',
                autocorrect: 1,
              },
            })
            .catch(() => null) 
        )
      )

      results.forEach((res, j) => {
        if (!res) {
          return
        }
        const weight = artists.length - (start + j)
        ;(res.data.toptags?.tag || []).slice(0, 5).forEach((t) => {
          const g = t.name.toLowerCase()
          if (IGNORE.includes(g)) return
          scores[g] = (scores[g] || 0) + weight * (Number(t.count) / 100)
        })
      })

      if (start + BATCH < artists.length) await new Promise((r) => setTimeout(r, 1000))
    }

    // to get top 3 genres
    return Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre)

}