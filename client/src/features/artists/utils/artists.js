// Helper functions for the Artists page.
// They are plain JavaScript (no Vue): data goes in, data comes out.

// add the value to the list if it is not there, remove it if it is
export function toggleInList(list, value) {
  const index = list.indexOf(value)
  if (index === -1) {
    list.push(value)
  } else {
    list.splice(index, 1)
  }
}

// Find the soonest event that has not happened yet
// (dayOffset 0 = today, 1 = tomorrow, negative = already passed)
export function getNextEvent(events) {
  let next = null
  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    if (event.dayOffset >= 0) {
      if (next === null || event.dayOffset < next.dayOffset) {
        next = event
      }
    }
  }
  return next
}

// a lookup: genre id -> genre (name and colour)
// we use it to find the artist's own genre and its colour
function makeGenreLookup(events) {
  const lookup = {}
  for (let i = 0; i < events.length; i++) {
    const genre = events[i].genre
    lookup[genre.id] = genre
  }
  return lookup
}

// Turn the list of events into a list of artists (each artist only once)
export function buildArtists(events) {
  const genreById = makeGenreLookup(events)
  const artistList = []

  for (let i = 0; i < events.length; i++) {
    const event = events[i]

    // an event can have more than one artist
    for (let j = 0; j < event.artists.length; j++) {
      const eventArtist = event.artists[j]

      // check if we already added this artist (compare by name)
      let artist = null
      for (let k = 0; k < artistList.length; k++) {
        if (artistList[k].name.toLowerCase() === eventArtist.name.toLowerCase()) {
          artist = artistList[k]
        }
      }

      // if not, create a new one
      if (artist === null) {
        // the artist's own genre (if we can't find it, use this event's genre)
        let ownGenre = genreById[eventArtist.genreId]
        if (!ownGenre) {
          ownGenre = event.genre
        }

        artist = {
          id: eventArtist.id,
          name: eventArtist.name,
          tag: eventArtist.tag,
          genre: ownGenre, // used for the genre pill and the card colour
          image: '/images/Artists/' + eventArtist.id + '.svg', // the picture on the card
          genres: [],
          venues: [],
          events: [],
        }
        artistList.push(artist)
      }

      // add this event's info to the artist (no duplicates)
      // only add the artist's own genre, not whatever genre the event is listed under
      if (!artist.genres.includes(artist.genre.name)) {
        artist.genres.push(artist.genre.name)
      }
      if (!artist.venues.includes(event.venue.name)) {
        artist.venues.push(event.venue.name)
      }
      artist.events.push(event)
    }
  }

  // work out the next event for each artist
  for (let i = 0; i < artistList.length; i++) {
    artistList[i].nextEvent = getNextEvent(artistList[i].events)
  }

  return artistList
}

// look for an option with this name, or create it if it does not exist yet
function findOrAddOption(options, name, color) {
  for (let i = 0; i < options.length; i++) {
    if (options[i].name === name) {
      return options[i]
    }
  }
  const option = { name: name, color: color, count: 0 }
  options.push(option)
  return option
}

// the genre checkboxes: name, colour and how many artists have that genre
export function buildGenreOptions(events, artists) {
  const options = []

  // first get every genre and its colour from the events
  for (let i = 0; i < events.length; i++) {
    const genre = events[i].genre
    findOrAddOption(options, genre.name, genre.color)
  }

  // then count how many artists have each genre
  for (let i = 0; i < artists.length; i++) {
    const genres = artists[i].genres
    for (let j = 0; j < genres.length; j++) {
      findOrAddOption(options, genres[j], '').count++
    }
  }

  return options.sort(function (a, b) {
    return a.name.localeCompare(b.name)
  })
}

// the venue checkboxes: name and how many artists play there
export function buildVenueOptions(artists) {
  const options = []

  for (let i = 0; i < artists.length; i++) {
    const venues = artists[i].venues
    for (let j = 0; j < venues.length; j++) {
      findOrAddOption(options, venues[j], '').count++
    }
  }

  return options.sort(function (a, b) {
    return a.name.localeCompare(b.name)
  })
}

// is at least one of the artist's items in the chosen list?
export function hasAny(artistItems, chosenItems) {
  for (let i = 0; i < artistItems.length; i++) {
    if (chosenItems.includes(artistItems[i])) {
      return true
    }
  }
  return false
}

// sort a list of artists ('name', 'events' or 'soonest')
export function sortArtists(list, sortBy) {
  if (sortBy === 'name') {
    list.sort(function (a, b) {
      return a.name.localeCompare(b.name)
    })
  } else if (sortBy === 'events') {
    list.sort(function (a, b) {
      return b.events.length - a.events.length
    })
  } else if (sortBy === 'soonest') {
    list.sort(function (a, b) {
      // artists with no upcoming event go to the bottom
      const dayA = a.nextEvent === null ? 999 : a.nextEvent.dayOffset
      const dayB = b.nextEvent === null ? 999 : b.nextEvent.dayOffset
      return dayA - dayB
    })
  }
  return list
}

// favourite artists go first (everyone keeps the order they already had)
export function favouritesFirst(artists, favouriteIds) {
  const favouriteArtists = []
  const otherArtists = []

  for (let i = 0; i < artists.length; i++) {
    if (favouriteIds.includes(artists[i].id)) {
      favouriteArtists.push(artists[i])
    } else {
      otherArtists.push(artists[i])
    }
  }

  return favouriteArtists.concat(otherArtists)
}