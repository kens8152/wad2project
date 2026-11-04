import { describe, it, expect } from 'vitest'
import { distanceKm } from '../distance'

describe('distanceKm (lat/lng arguments)', () => {
  it('returns 0 for the same point', () => {
    expect(distanceKm(1.3, 103.8, 1.3, 103.8)).toBe(0)
  })

  it('measures Bras Basah to Changi Airport as about 17 km', () => {
    expect(distanceKm(1.295, 103.849, 1.3644, 103.9915)).toBeCloseTo(17.6, 0)
  })

  it('gives the same distance in both directions', () => {
    const there = distanceKm(1.295, 103.849, 1.3521, 103.8198)
    const back = distanceKm(1.3521, 103.8198, 1.295, 103.849)
    expect(there).toBeCloseTo(back, 10)
  })

  it('never returns a negative distance', () => {
    expect(distanceKm(-1, -1, 1, 1)).toBeGreaterThan(0)
  })
})
