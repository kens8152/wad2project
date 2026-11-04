import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SongPreview from '../SongPreview.vue'

const TRACK = {
  id: 11,
  title: 'Groove Machine',
  preview: 'https://audio.example/groove.m4a',
  url: 'https://music.apple.com/track/11',
  artwork: 'https://img.example/groove.jpg',
}

const mountSong = (open = false) => mount(SongPreview, { props: { track: TRACK, open } })
const audio = (wrapper) => wrapper.get('audio').element

describe('SongPreview', () => {
  it('shows the song title as a play row when closed', () => {
    const wrapper = mountSong()
    const row = wrapper.get('.song-row')
    expect(row.text()).toBe('Groove Machine')
    expect(row.isVisible()).toBe(true)
  })

  it('loads the Apple preview into the audio player', () => {
    expect(audio(mountSong()).getAttribute('src')).toBe(TRACK.preview)
  })

  it('clicking the row asks the parent to open it and starts playing', async () => {
    const wrapper = mountSong()
    const play = vi.spyOn(audio(wrapper), 'play')

    await wrapper.get('.song-row').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('open')).toHaveLength(1)
    expect(play).toHaveBeenCalled()
  })

  it('shows the player with a Play button when open', () => {
    const wrapper = mountSong(true)
    expect(wrapper.get('button[aria-label="Play"]').exists()).toBe(true)
    expect(wrapper.get('a[aria-label="Listen on Apple Music"]').attributes('href')).toBe(TRACK.url)
  })

  it('the play button switches to Pause while playing, and back', async () => {
    const wrapper = mountSong(true)

    await wrapper.get('button[aria-label="Play"]').trigger('click')
    expect(wrapper.find('button[aria-label="Pause"]').exists()).toBe(true)

    await wrapper.get('button[aria-label="Pause"]').trigger('click')
    expect(wrapper.find('button[aria-label="Play"]').exists()).toBe(true)
  })

  it('plays only the 10-second chorus clip, starting 10 seconds in', async () => {
    const wrapper = mountSong(true)
    await wrapper.get('audio').trigger('loadedmetadata')
    expect(audio(wrapper).currentTime).toBe(10)
    expect(wrapper.get('input[aria-label="Seek"]').attributes('max')).toBe('10')
  })

  it('seeking moves within the clip', async () => {
    const wrapper = mountSong(true)
    await wrapper.get('input[aria-label="Seek"]').setValue('4')
    expect(audio(wrapper).currentTime).toBe(14)
  })

  it('stops by itself at the end of the clip', async () => {
    const wrapper = mountSong(true)
    const pause = vi.spyOn(audio(wrapper), 'pause')
    audio(wrapper).currentTime = 21
    await wrapper.get('audio').trigger('timeupdate')
    expect(pause).toHaveBeenCalled()
  })

  it('pauses when the parent closes it', async () => {
    const wrapper = mountSong(true)
    const pause = vi.spyOn(audio(wrapper), 'pause')
    await wrapper.setProps({ open: false })
    expect(pause).toHaveBeenCalled()
  })

  it('stops playing when the card is removed', () => {
    const wrapper = mountSong(true)
    const pause = vi.spyOn(audio(wrapper), 'pause')
    wrapper.unmount()
    expect(pause).toHaveBeenCalled()
  })
})
