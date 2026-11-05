import { describe, it, expect } from 'vitest'
import { isVideo } from '../media'
import { tagColor, tagStyle } from '../tagColor'

describe('isVideo', () => {
  it.each(['clip.mp4', 'clip.WEBM', 'clip.mov?token=1', 'https://x.co/a/clip.m4v#t=3'])(
    'treats %s as a video',
    (url) => {
      expect(isVideo(url)).toBe(true)
    },
  )

  it.each(['photo.jpg', 'photo.png', 'mp4-notes.txt', ''])('treats %s as not a video', (url) => {
    expect(isVideo(url)).toBe(false)
  })

  it('checks the type of a picked file', () => {
    expect(isVideo({ file: { type: 'video/mp4' } })).toBe(true)
    expect(isVideo({ file: { type: 'image/png' } })).toBe(false)
  })

  it('falls back to the url of an uploaded item', () => {
    expect(isVideo({ url: 'https://cdn/x.webm' })).toBe(true)
  })

  it('is false for nothing at all', () => {
    expect(isVideo(null)).toBeFalsy()
  })
})

describe('tagColor', () => {
  it('always gives the same tag the same colour', () => {
    expect(tagColor('jazz')).toBe(tagColor('jazz'))
  })

  it('ignores letter case', () => {
    expect(tagColor('Jazz')).toBe(tagColor('JAZZ'))
  })

  it('returns a non-empty colour for any tag', () => {
    expect(tagColor('anything-at-all')).toBeTruthy()
  })

  it('wraps the colour in a --tag style', () => {
    expect(tagStyle('jazz')).toEqual({ '--tag': tagColor('jazz') })
  })
})
