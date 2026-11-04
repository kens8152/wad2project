import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/matchmakingApi', () => ({
  getSavedArtists: vi.fn(),
  addSavedArtist: vi.fn(),
  removeSavedArtist: vi.fn(),
}))

const api = await import('@/services/matchmakingApi')
const { useSavedArtists } = await import('../useSavedArtists')

let saved

beforeEach(async () => {
  vi.mocked(api.getSavedArtists).mockResolvedValue([
    { artist_id: 'krunkle', saved_at: '2026-11-02' },
    { artist_id: 'lullaboy', saved_at: '2026-11-01' },
  ])
  vi.mocked(api.addSavedArtist).mockResolvedValue()
  vi.mocked(api.removeSavedArtist).mockResolvedValue()
  saved = useSavedArtists()
  await saved.loadSaved()
})

describe('useSavedArtists', () => {
  it('loads the saved artists and returns the rows', async () => {
    const rows = await saved.loadSaved()
    expect(rows).toHaveLength(2)
    expect(saved.savedIds.value).toEqual(['krunkle', 'lullaboy'])
  })

  it('knows which artists are saved', () => {
    expect(saved.isSaved('krunkle')).toBe(true)
    expect(saved.isSaved('aiyna')).toBe(false)
  })

  it('saving an artist adds it and tells Supabase', async () => {
    const nowSaved = await saved.toggleSaved('aiyna')
    expect(nowSaved).toBe(true)
    expect(saved.isSaved('aiyna')).toBe(true)
    expect(api.addSavedArtist).toHaveBeenCalledWith('aiyna')
  })

  it('saving a saved artist again removes it', async () => {
    const nowSaved = await saved.toggleSaved('krunkle')
    expect(nowSaved).toBe(false)
    expect(saved.isSaved('krunkle')).toBe(false)
    expect(api.removeSavedArtist).toHaveBeenCalledWith('krunkle')
  })

  it('updates the list before Supabase answers', () => {
    vi.mocked(api.addSavedArtist).mockReturnValue(new Promise(() => {}))
    saved.toggleSaved('aiyna')
    expect(saved.isSaved('aiyna')).toBe(true)
  })

  it('puts the list back and passes the error on when saving fails', async () => {
    vi.mocked(api.addSavedArtist).mockRejectedValue(new Error('offline'))
    await expect(saved.toggleSaved('aiyna')).rejects.toThrow('offline')
    expect(saved.isSaved('aiyna')).toBe(false)
  })

  it('puts the artist back when unsaving fails', async () => {
    vi.mocked(api.removeSavedArtist).mockRejectedValue(new Error('offline'))
    await expect(saved.toggleSaved('krunkle')).rejects.toThrow()
    expect(saved.isSaved('krunkle')).toBe(true)
  })

  it('shares one list between every page that uses it', async () => {
    const other = useSavedArtists()
    await saved.toggleSaved('aiyna')
    expect(other.isSaved('aiyna')).toBe(true)
  })
})
