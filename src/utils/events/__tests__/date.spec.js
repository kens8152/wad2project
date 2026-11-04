import { describe, it, expect } from 'vitest'
import {
  startOfDay,
  addDays,
  withTime,
  dow,
  time12,
  timeCompact,
  dayLabel,
  dayLabelYear,
  cardStamp,
} from '../date'

const SAT_19_SEP_2026 = new Date(2026, 8, 19)

describe('startOfDay', () => {
  it('drops the time but keeps the date', () => {
    const d = startOfDay(new Date(2026, 8, 19, 21, 45, 30))
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
    expect(d.getDate()).toBe(19)
  })
})

describe('addDays', () => {
  it('moves forward within a month', () => {
    expect(addDays(SAT_19_SEP_2026, 2).getDate()).toBe(21)
  })

  it('rolls over into the next month', () => {
    const d = addDays(SAT_19_SEP_2026, 12)
    expect(d.getMonth()).toBe(9)
    expect(d.getDate()).toBe(1)
  })

  it('does not change the date it was given', () => {
    const original = new Date(SAT_19_SEP_2026)
    addDays(original, 5)
    expect(original).toEqual(SAT_19_SEP_2026)
  })
})

describe('withTime', () => {
  it('sets hours and minutes from an "HH:MM" string', () => {
    const d = withTime(SAT_19_SEP_2026, '21:30')
    expect(d.getHours()).toBe(21)
    expect(d.getMinutes()).toBe(30)
  })
})

describe('time12', () => {
  it.each([
    ['00:00', '12:00 AM'],
    ['09:05', '9:05 AM'],
    ['12:00', '12:00 PM'],
    ['21:00', '9:00 PM'],
  ])('formats %s as %s', (hhmm, expected) => {
    expect(time12(withTime(SAT_19_SEP_2026, hhmm))).toBe(expected)
  })
})

describe('timeCompact', () => {
  it('leaves out ":00" on the hour', () => {
    expect(timeCompact(withTime(SAT_19_SEP_2026, '20:00'))).toBe('8PM')
  })

  it('keeps the minutes when they are not zero', () => {
    expect(timeCompact(withTime(SAT_19_SEP_2026, '19:30'))).toBe('7:30PM')
  })

  it('shows midnight as 12AM', () => {
    expect(timeCompact(withTime(SAT_19_SEP_2026, '00:00'))).toBe('12AM')
  })
})

describe('labels', () => {
  it('gives the short day name', () => {
    expect(dow(SAT_19_SEP_2026)).toBe('Sat')
  })

  it('builds a day label', () => {
    expect(dayLabel(SAT_19_SEP_2026)).toBe('Sat 19 Sep')
  })

  it('builds a day label with the year', () => {
    expect(dayLabelYear(SAT_19_SEP_2026)).toBe('Sat 19 Sep 2026')
  })

  it('builds the uppercase map card stamp', () => {
    expect(cardStamp(withTime(SAT_19_SEP_2026, '20:00'))).toBe('SAT 19 SEP · 8PM')
  })
})
