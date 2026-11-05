import { test, expect } from '@playwright/test'
import { mockSupabase } from './support/mockSupabase'
import { mockMatchmakingBackend, MATCH_ARTIST_NAMES } from './support/matchmakingBackend'
import { signIn } from './support/session'

const currentArtist = (page) => page.locator('.main-card .card-title')

async function swipe(page, label) {
  const before = (await currentArtist(page).innerText()).trim()
  await page.getByRole('button', { name: label, exact: true }).click()
  await expect(currentArtist(page)).not.toHaveText(before)
}

test.describe('Matchmaking as a guest', () => {
  test('asks the user to log in', async ({ page }) => {
    await mockSupabase(page)
    await page.goto('/matchmaking')
    await expect(page.getByText('Please log in to discover artists.')).toBeVisible()
    await page.getByRole('link', { name: 'log in', exact: true }).click()
    await expect(page).toHaveURL(/\/login$/)
  })
})

test.describe('Matchmaking when logged in', () => {
  let db

  test.beforeEach(async ({ page }) => {
    await mockSupabase(page)
    db = await mockMatchmakingBackend(page)
    await signIn(page)
    await page.goto('/matchmaking')
    await expect(page.getByRole('heading', { name: 'Discover Local Artists' })).toBeVisible()
    await expect(currentArtist(page)).toBeVisible()
  })

  test('shows an artist card with a song preview ready to play', async ({ page }) => {
    const name = (await currentArtist(page).innerText()).trim()
    expect(MATCH_ARTIST_NAMES).toContain(name)

    const card = page.locator('.main-card')
    await expect(card.getByText(`${name} Anthem`).filter({ visible: true })).toBeVisible()
    await expect(card.getByRole('button', { name: 'Play' })).toBeVisible()
    await expect(card.getByRole('link', { name: 'Listen on Apple Music' })).toHaveAttribute('href', /music\.apple\.com/)
  })

  test('liking an artist counts it and moves to the next card', async ({ page }) => {
    const liked = (await currentArtist(page).innerText()).trim()

    await swipe(page, 'Like')

    await expect(page.getByText('1 liked · building your taste profile')).toBeVisible()
    expect(db.matchmaking_actions.find((r) => r.action === 'follow')).toBeTruthy()
    expect(liked).not.toBe((await currentArtist(page).innerText()).trim())
  })

  test('swiping through the whole batch ends with a taste summary', async ({ page }) => {
    await swipe(page, 'Like')
    await swipe(page, 'Skip')
    await page.getByRole('button', { name: 'Like', exact: true }).click()

    await expect(page.getByRole('heading', { name: 'Your taste profile just got sharper' })).toBeVisible()
    await expect(page.locator('.finish-stat strong')).toHaveText(['2', '1', '2'])
    await expect(page.getByRole('link', { name: 'Review your swipes' })).toBeVisible()
  })

  test('refreshing keeps today\'s batch and what was already liked', async ({ page }) => {
    const liked = (await currentArtist(page).innerText()).trim()
    await swipe(page, 'Like')

    await page.reload()

    await expect(page.getByText('1 liked · building your taste profile')).toBeVisible()
    await expect(currentArtist(page)).toBeVisible()
    await expect(currentArtist(page)).not.toHaveText(liked)
    await expect(page.locator('.main-card .badge').filter({ hasText: '/' })).toHaveText('1 / 2')
  })

  test('saving an artist puts them on the Saved artists page', async ({ page }) => {
    const name = (await currentArtist(page).innerText()).trim()

    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Unsave' })).toHaveAttribute('aria-pressed', 'true')

    await page.goto('/profile/saved-artists')
    await expect(page.locator('.artist-card h3')).toHaveText([name])
  })

  test('swipes show up in the match history, where they can be filtered and changed', async ({ page }) => {
    await swipe(page, 'Like')
    await swipe(page, 'Skip')

    await page.getByRole('link', { name: 'Match history' }).click()
    await expect(page).toHaveURL(/\/profile\/match-history$/)
    const cards = page.locator('.history-card')
    await expect(cards).toHaveCount(2)

    await page.getByRole('group', { name: 'Filter history' }).getByRole('button', { name: 'Liked' }).click()
    await expect(cards).toHaveCount(1)

    await page.getByRole('group', { name: 'Filter history' }).getByRole('button', { name: 'All' }).click()
    await cards.filter({ hasText: 'Skipped' }).getByRole('button', { name: 'Like instead' }).click()
    await expect(cards.filter({ hasText: 'Skipped' })).toHaveCount(0)
  })

  test('skipping everyone ends the batch with no liked artists', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Skip the rest' })).toHaveCount(0)
    await swipe(page, 'Skip')
    await swipe(page, 'Skip')
    await page.getByRole('button', { name: 'Skip', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Your taste profile just got sharper' })).toBeVisible()
    await expect(page.getByText('You did not like anyone this round')).toBeVisible()
  })
})
