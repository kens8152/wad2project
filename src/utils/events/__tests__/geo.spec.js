import { describe, it, expect } from 'vitest'
import { distanceKm, formatDistance, mapsSearchUrl, mapsDirectionsUrl } from '../geo'

const BRAS_BASAH = { lat: 1.295, lng: 103.849 }
const CHANGI = { lat: 1.3644, lng: 103.9915 }

describe('distanceKm ({lat,lng} arguments)', () => {
  it('returns 0 for the same point', () => {
    expect(distanceKm(BRAS_BASAH, BRAS_BASAH)).toBe(0)
  })

  it('agrees with the known distance to Changi Airport', () => {
    expect(distanceKm(BRAS_BASAH, CHANGI)).toBeCloseTo(17.6, 0)
  })
})

describe('formatDistance', () => {
  it('shows one decimal place under 10 km', () => {
    expect(formatDistance(3.456)).toBe('3.5km')
  })

  it('rounds to a whole number from 10 km up', () => {
    expect(formatDistance(12.6)).toBe('13km')
  })

  it('treats exactly 10 km as a whole number', () => {
    expect(formatDistance(10)).toBe('10km')
  })

  it('shows 0.0km for zero distance', () => {
    expect(formatDistance(0)).toBe('0.0km')
  })
})

describe('Google Maps links', () => {
  it('builds a search link containing the coordinates', () => {
    expect(mapsSearchUrl(BRAS_BASAH)).toBe('https://www.google.com/maps/search/?api=1&query=1.295,103.849')
  })

  it('builds a transit directions link to the destination', () => {
    const url = mapsDirectionsUrl(CHANGI)
    expect(url).toContain('destination=1.3644,103.9915')
    expect(url).toContain('travelmode=transit')
  })
})
