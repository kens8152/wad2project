import { test, expect } from '@playwright/test'
import { mockSupabase } from './support/mockSupabase'
import { mockMatchmakingBackend } from './support/matchmakingBackend'
import { signIn, TEST_USER } from './support/session'

test.describe('Profile as a guest', () => {
  test('asks the user to log in', async ({ page }) => {
    await mockSupabase(page)
    await page.goto('/profile')
    await expect(page.getByText('Please log in to manage your preferences.')).toBeVisible()
  })
})

test.describe('Profile when logged in', () => {
  let db

  test.beforeEach(async ({ page }) => {
    await mockSupabase(page)
    db = await mockMatchmakingBackend(page)
    db.followed_artists.push({ artist_id: 'krunkle', followed_at: '2026-11-01T10:00:00Z' })
    db.matchmaking_actions.push({ id: 900, artist_id: 'aiyna', action: 'follow', created_at: '2026-11-02T10:00:00Z' })
    await signIn(page)
    await page.addInitScript(
      ([key]) => window.localStorage.setItem(key, JSON.stringify(['fallingislands-battlebox'])),
      [`riffle.savedEvents:${TEST_USER.id}`],
    )
    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: 'Test Fan', level: 1 })).toBeVisible()
  })

  test('shows the profile header and stats', async ({ page }) => {
    await expect(page.getByText('@testfan')).toBeVisible()
    await expect(page.locator('.spec').filter({ hasText: 'Following' }).locator('dd')).toHaveText('1')
    await expect(page.locator('.spec').filter({ hasText: 'Favourite songs' }).locator('dd')).toHaveText('2')
  })

  test('the Artists tab lists followed artists and opens their page', async ({ page }) => {
    const tabs = page.getByRole('tablist', { name: 'Your profile' })
    await expect(tabs.getByRole('tab', { name: /Artists/ })).toHaveAttribute('aria-selected', 'true')

    await page.locator('.artist-tile').getByRole('link', { name: /Krunkle/ }).click()
    await expect(page).toHaveURL(/\/artists\/krunkle$/)
  })

  test('unfollowing from the profile removes the artist', async ({ page }) => {
    await page.getByRole('button', { name: 'Unfollow Krunkle' }).click()
    await expect(page.getByText('You are not following any artists yet.')).toBeVisible()
    expect(db.followed_artists).toHaveLength(0)
  })

  test('the Liked tab shows artists liked in matchmaking', async ({ page }) => {
    await page.getByRole('tab', { name: /Liked/ }).click()
    await expect(page.locator('.liked-tile')).toContainText('ai.yna')
  })

  test('the Events tab shows saved events and opens them', async ({ page }) => {
    await page.getByRole('tab', { name: /Events/ }).click()
    const row = page.locator('.event-row').first()
    await expect(row).toBeVisible()
    await row.click()
    await expect(page).toHaveURL(/\/events\/fallingislands-battlebox$/)
  })

  test('the Songs and Taste tabs show what was picked in onboarding', async ({ page }) => {
    await page.getByRole('tab', { name: /Songs/ }).click()
    await expect(page.locator('.song-rows li').first()).toContainText('Glimmer')

    await page.getByRole('tab', { name: /Taste/ }).click()
    await expect(page.locator('.genre-tag')).toHaveText(['Pop Music', 'Electronic'])
  })

  test('resetting the taste profile needs a confirmation and clears liked artists', async ({ page }) => {
    await page.getByRole('tab', { name: /Liked/ }).click()
    await page.getByRole('button', { name: /Reset taste profile/ }).click()

    const dialog = page.getByRole('alertdialog', { name: 'Reset your taste profile?' })
    await expect(dialog.getByRole('button', { name: 'Yes, erase it' })).toBeDisabled()

    await dialog.getByRole('checkbox').check()
    await dialog.getByRole('button', { name: 'Yes, erase it' }).click()

    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole('tab', { name: /Liked/ }).locator('.tab-count')).toHaveText('0')
    expect(db.matchmaking_actions).toHaveLength(0)
  })

  test('"Edit profile" opens onboarding', async ({ page }) => {
    await page.getByRole('button', { name: /Edit profile/ }).click()
    await expect(page).toHaveURL(/\/onboarding$/)
  })
})
