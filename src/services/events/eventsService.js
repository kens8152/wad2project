// Events data access layer.
//
// Everything the Events screens need comes through these async functions, so
// swapping the mock data for the real backend later only means changing the
// bodies below (the components and composables don't care where data comes
// from). Return shapes are the "hydrated" shapes the UI uses: artists/venues
// already joined onto each event, dates already as Date objects.

// the raw data (ids, dayOffset, "HH:mm" times); `events` is renamed so it is clear these are not processed yet
import { artists, events as rawEvents, friends, genres, venues } from '../../data/events/mockData'
import { addDays, startOfDay, withTime, timeCompact, dow, time12 } from '../../utils/events/date'
import { distanceKm } from '../../utils/events/geo'

// how long the fake "network request" takes, so the loading state behaves like it would with a real server
const NETWORK_DELAY_MS = 150

// a promise that finishes after `ms` milliseconds: `await wait()` pauses the function for that long
const wait = (ms = NETWORK_DELAY_MS) => new Promise((resolve) => setTimeout(resolve, ms))

// turns a list into a lookup table: byId(venues).get('tinbox') gives the TinBox venue straight away, no looping needed
const byId = (list) => new Map(list.map((item) => [item.id, item]))

// "Hydrating" an event = filling in everything the raw event only refers to by id:
// the full artist / venue / genre objects, real Date objects, the distance from the user, and the search text.
// `location` is the user's {lat, lng}, used to work out how far each venue is.
function hydrate(location) {
  const today = startOfDay()

  // lookup tables, built once so each event can find its artist / venue / genre / friends quickly
  const artistMap = byId(artists)
  const venueMap = byId(venues)
  const genreMap = byId(genres)
  const friendMap = byId(friends)

  return rawEvents.map((raw) => {
    // join: swap each id for the whole object it points to (like a SQL join)
    const venue = venueMap.get(raw.venueId)  
    const genre = genreMap.get(raw.genreId)   // to retrieve the entire genre data for that event using the genreId
    const headliner = artistMap.get(raw.headliner)
    const supports = raw.supports.map((id) => artistMap.get(id))

    // dayOffset (0 = today, 3 = in three days) + "20:00" become real dates, so the demo always has a live upcoming week
    const startsAt = withTime(addDays(today, raw.dayOffset), raw.time)
    const doorsAt = withTime(addDays(today, raw.dayOffset), raw.doors)

    // one list of everyone playing, the headliner first; `...` puts the supports into the same list
    const lineup = [
      { artist: headliner, role: 'Headliner' },
      ...supports.map((artist) => ({ artist, role: 'Support' })),
    ]

    // flatMap collects every artist’s tags into one flat list, new Set() removes duplicates,
    // and [... ] turns the Set back into an array.
    // ... copies only the items from an array/object (not the entire array/object) and pastes them into the new array/object
    const tags = [...new Set(lineup.flatMap((l) => l.artist.tags))]

    // an event with no name of its own is called "<headliner> at <venue>"
    const title = raw.name || `${headliner.name} at ${venue.listName}`

    return {
      id: raw.id,
      title,
      heroTitle: raw.name ? `${raw.name} @ ${venue.fullName}` : `${headliner.name} @ ${venue.fullName}`,
      about: raw.about,
      genre,
      genreId: raw.genreId,
      venue,
      venueId: raw.venueId,
      headliner,
      lineup,
      artistIds: lineup.map((l) => l.artist.id), // used by the artist filter
      tags,
      dayOffset: raw.dayOffset, // used by the date filter
      startsAt,
      doorsAt,
      // ready-made text for the cards and the event page, so the components do not format dates themselves
      doorsLabel: time12(doorsAt), // "7:30 PM"
      timeLabel: time12(startsAt), // "8:00 PM"
      timeCompact: timeCompact(startsAt), // "8PM"
      dowLabel: dow(startsAt), // "Thu"
      // The first set starts at `startsAt`; each act after that is +45 min and
      // the headliner closes the night.
      // (the line-up is headliner-first, so it is reversed: the supports play first and the headliner last)
      setTimes: [...lineup].reverse().map((l, i) => ({
        artist: l.artist,
        time: timeCompact(new Date(startsAt.getTime() + i * 45 * 60000)), // i acts later = i x 45 minutes (in milliseconds)
      })),
      price: raw.price,
      free: raw.free,
      entry: raw.entry,
      going: raw.going, // how many people are going (used by the "Most popular" sort)
      friends: raw.friendIds.map((id) => friendMap.get(id)),
      palette: raw.palette, // the colour scheme of the picture (see EventCover)
      distanceKm: distanceKm(location, venue), // used by the distance filter and the "Nearest" sort
      ticketUrl: `https://www.sistic.com.sg/`,
      // Everything a person might search for, as one lower-case string.
      // It is built once here, so searching is just `e.searchText.includes(text)` instead of checking many fields on every keystroke.
      searchText: [
        title,
        genre.label,
        venue.name,
        venue.listName,
        venue.fullName,
        ...lineup.map((l) => l.artist.name),
        ...tags,
      ]
        .join(' ')
        .toLowerCase(),
    }
  })
}

/** Everything the filter UI + results need in one go. */
// The one function the rest of the app calls to get events. It returns the events plus the lists the filter sidebar needs.
export async function fetchEventCatalog(location) {
  await wait() // pretend to talk to a server
  const eventList = hydrate(location)

  // count how many events each artist is in, for the "Artists" list in the filter sidebar
  const artistEventCounts = new Map()
  eventList.forEach((e) => e.artistIds.forEach((id) => artistEventCounts.set(id, (artistEventCounts.get(id) || 0) + 1)))

  return {
    events: eventList,
    genres,
    venues,
    artists: artists
      .map((a) => ({ ...a, eventCount: artistEventCounts.get(a.id) || 0 })) // each artist plus their number of events
      .filter((a) => a.eventCount > 0) // only artists who actually have an event
      .sort((a, b) => b.eventCount - a.eventCount || a.name.localeCompare(b.name)), // most events first, ties A-Z
  }
}

// ---- Discussion (local mock; the forum owner will replace this) -----------

// sample comments shown on every event's Discussions tab
const seedComments = [
  { id: 'c1', author: 'synthkid', hue: 260, minutesAgo: 60, text: 'An analogue set in a bunker? This is going to sound unreal.', votes: 12 },
  { id: 'c2', author: 'nightbus', hue: 30, minutesAgo: 32, text: 'Been waiting to hear the full set live. See you there!', votes: 5 },
  { id: 'c3', author: 'waveform', hue: 200, minutesAgo: 10, text: 'What synths are they bringing? Would love a closer look at the rig after the set.', votes: 3 },
]

export async function fetchDiscussion() {
  await wait(80)
  // hand out copies, so a comment added or voted on in one place never changes the sample list itself
  return seedComments.map((c) => ({ ...c }))
}
