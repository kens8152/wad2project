import { test, expect } from '@playwright/test'
import { mockSupabase } from './support/mockSupabase'
import { mockMatchmakingBackend } from './support/matchmakingBackend'
import { signIn } from './support/session'

const ARTIST_DOT = 'FallingIslands, Electronic'

const openCard = (page) => page.locator('.web__card.is-open')
const searchBox = (page) => page.getByRole('searchbox', { name: 'Search artists' })

test.describe('Discover as a guest', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page)
    await page.goto('/discover')
    await expect(page.getByRole('application', { name: /Web of artists/ })).toBeVisible()
  })

  test('shows the web of artists with a legend', async ({ page }) => {
    await expect(page.getByText(/\d+ artists · \d+ links/)).toBeVisible()
    await expect(page.getByText('Bigger dot = more fans')).toBeVisible()
  })

  test('clicking a dot opens that artist\'s card, with sign up to follow', async ({ page }) => {
    await page.getByRole('button', { name: ARTIST_DOT }).click()

    await expect(openCard(page)).toContainText('FallingIslands')
    await expect(openCard(page).getByRole('link', { name: 'Sign up to follow' })).toBeVisible()

    await openCard(page).getByRole('button', { name: 'Close' }).click()
    await expect(openCard(page)).toHaveCount(0)
  })

  test('the card links to the artist page', async ({ page }) => {
    await page.getByRole('button', { name: ARTIST_DOT }).click()
    await openCard(page).getByRole('link', { name: /Go to artist page/ }).click()
    await expect(page).toHaveURL(/\/artists\/fallingislands$/)
  })

  test('trying to search asks the guest to log in', async ({ page }) => {
    await searchBox(page).click()
    const notice = page.getByRole('status').filter({ hasText: 'Log in to use this' })
    await expect(notice).toBeVisible()
    await expect(notice.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/signup')
  })

  test('the Guide walks through the page and can be skipped', async ({ page }) => {
    await page.getByRole('button', { name: 'Guide' }).click()
    await expect(page.getByText('Find a scene')).toBeVisible()

    await page.getByRole('button', { name: 'Skip tour' }).click()
    await expect(page.getByText('Find a scene')).toHaveCount(0)
  })
})

test.describe('Discover when logged in', () => {
  let db

  test.beforeEach(async ({ page }) => {
    await mockSupabase(page)
    db = await mockMatchmakingBackend(page)
    await signIn(page)
    await page.goto('/discover')
    await expect(page.getByRole('button', { name: /Recommended for you/ })).toBeVisible()
  })

  test('searching for an artist and picking them opens their card', async ({ page }) => {
    await searchBox(page).fill('Falling')
    await page.locator('.search-results').getByRole('button', { name: /FallingIslands/ }).click()

    await expect(openCard(page)).toContainText('FallingIslands')
    await expect(searchBox(page)).toHaveValue('')
  })

  test('following an artist from their card saves it', async ({ page }) => {
    await page.getByRole('button', { name: ARTIST_DOT }).click()
    await openCard(page).getByRole('button', { name: 'Follow' }).click()

    await expect(openCard(page).getByRole('button', { name: 'Following' })).toBeVisible()
    expect(db.followed_artists.map((row) => row.artist_id)).toEqual(['fallingislands'])
    await expect(page.getByText(/Saved artists by genre/)).toBeVisible()
  })

  test('switching a genre off and clearing the filters', async ({ page }) => {
    const pill = page.locator('.genre-pill').filter({ hasText: 'Electronic' })
    await pill.click()
    await expect(pill).toHaveAttribute('aria-pressed', 'false')

    await page.getByRole('button', { name: 'Clear filters' }).click()
    await expect(pill).toHaveAttribute('aria-pressed', 'true')
  })

  test('"Recommended for you" uses the taste profile', async ({ page }) => {
    await page.getByRole('button', { name: /Recommended for you/ }).click()

    const panel = page.locator('.recommended')
    await expect(panel.getByText('Picked from your taste profile')).toBeVisible()
    await expect(panel.locator('.recommended-row')).toHaveCount(6)
  })
})
