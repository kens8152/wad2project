import { describe, it, expect, vi, afterEach } from 'vitest'
import { NEAR_KM, locationIfAllowed, nearbyGigNotifications } from '../useNearbyGigs'

const ME = { lat: 1.295, lng: 103.849 }
const tinbox = { id: 't', title: 'Near', date_label: 'Sat, 14 Nov', venue: { name: 'TinBox', lat: 1.2985, lng: 103.8508 } }
const changi = { id: 'c', title: 'Far', venue: { name: 'Changi', lat: 1.3644, lng: 103.9915 } }
const nowhere = { id: 'n', title: 'Somewhere', venue: { name: 'Pop-up', lat: null, lng: null } }

function fakeBrowser({ state = 'granted', fails = false } = {}) {
  vi.stubGlobal('navigator', {
    permissions: { query: vi.fn(async () => ({ state })) },
    geolocation: {
      getCurrentPosition: vi.fn((ok, bad) => (fails ? bad(new Error('timeout')) : ok({ coords: { latitude: 1.3, longitude: 103.85 } }))),
    },
  })
  return navigator
}

afterEach(() => vi.unstubAllGlobals())

describe('nearbyGigNotifications', () => {
  it(`keeps only gigs within ${NEAR_KM} km of you`, () => {
    const rows = nearbyGigNotifications('me', [tinbox, changi], ME)
    expect(rows).toEqual([
      {
        user_id: 'me',
        type: 'event',
        actor_name: null,
        body: 'New gig near you: Near at TinBox (Sat, 14 Nov)',
        link: '/events/t',
        dedupe_key: 'event:t',
      },
    ])
  })

  it('without your location, every new gig counts', () => {
    const rows = nearbyGigNotifications('me', [tinbox, changi], null)
    expect(rows.map((r) => r.link)).toEqual(['/events/t', '/events/c'])
    expect(rows[1].body).toBe('New gig: Far at Changi')
  })

  it('keeps gigs whose venue has no location', () => {
    expect(nearbyGigNotifications('me', [nowhere], ME)).toHaveLength(1)
  })

  it('makes nothing when there are no new gigs', () => {
    expect(nearbyGigNotifications('me', [], ME)).toEqual([])
  })
})

describe('locationIfAllowed', () => {
  it('reads your location when you have already allowed it', async () => {
    fakeBrowser()
    expect(await locationIfAllowed()).toEqual({ lat: 1.3, lng: 103.85 })
  })

  it('never asks for permission', async () => {
    const browser = fakeBrowser({ state: 'prompt' })
    expect(await locationIfAllowed()).toBeNull()
    expect(browser.geolocation.getCurrentPosition).not.toHaveBeenCalled()
  })

  it('gives up quietly when the location cannot be found', async () => {
    fakeBrowser({ fails: true })
    expect(await locationIfAllowed()).toBeNull()
  })

  it('gives up quietly when the browser has no location support', async () => {
    vi.stubGlobal('navigator', {})
    expect(await locationIfAllowed()).toBeNull()
  })
})
