import { test, expect } from '@playwright/test'
import { mockSupabase } from './support/mockSupabase'

const cards = (page) => page.locator('.artist-card')
const cardTitles = (page) => page.locator('.artist-card h3')

test.beforeEach(async ({ page }) => {
  await mockSupabase(page)
  await page.goto('/artists')
  await expect(cards(page).first()).toBeVisible()
})

test.describe('Artists: finding an artist', () => {
  test('lists the artists performing near you', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Artists', level: 1 })).toBeVisible()
    await expect(page.getByText(/\d+ artists performing near you/)).toBeVisible()
    expect(await cards(page).count()).toBeGreaterThan(1)
  })

  test('searching by name narrows the list', async ({ page }) => {
    const name = (await cardTitles(page).first().innerText()).trim()

    await page.getByPlaceholder('Search artists').fill(name)

    await expect(cardTitles(page)).toHaveText([name])
    await expect(page.getByText(`1 artist matching "${name}"`)).toBeVisible()
  })

  test('a genre filter only applies after pressing Apply', async ({ page }) => {
    const total = await cards(page).count()
    const firstGenre = page.locator('.filters__group').first().getByRole('checkbox').first()

    await firstGenre.check()
    await expect(page.getByRole('button', { name: 'Apply changes' })).toBeVisible()
    await expect(cards(page)).toHaveCount(total)

    await page.getByRole('button', { name: 'Apply changes' }).click()

    await expect(page.getByRole('button', { name: 'Apply filters' })).toBeVisible()
    expect(await cards(page).count()).toBeLessThan(total)
  })

  test('a search with no results offers to reset the filters', async ({ page }) => {
    const total = await cards(page).count()
    await page.getByPlaceholder('Search artists').fill('zzzz nobody')

    await expect(page.getByRole('heading', { name: 'No artists match these filters' })).toBeVisible()
    await page.locator('.artists-shell__state').getByRole('button', { name: 'Reset filters' }).click()

    await expect(cards(page)).toHaveCount(total)
  })

  test('sorting by name puts the artists in A-Z order', async ({ page }) => {
    await page.getByRole('button', { name: /Sort by/ }).click()
    await page.getByRole('option', { name: 'Name (A-Z)' }).click()

    const names = await cardTitles(page).allInnerTexts()
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })
})

test.describe('Artists: an artist profile', () => {
  test('opening a card shows the artist profile', async ({ page }) => {
    const name = (await cardTitles(page).first().innerText()).trim()

    await cards(page).first().click()

    await expect(page).toHaveURL(/\/artists\/[^/]+$/)
    await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible()
  })

  test('an unknown artist shows a friendly message with a way back', async ({ page }) => {
    await page.goto('/artists/no-such-artist')
    await expect(page.getByRole('heading', { name: "We couldn't find this artist" })).toBeVisible()
    await page.getByRole('link', { name: 'Back to artists' }).click()
    await expect(page).toHaveURL(/\/artists$/)
  })

  test('a guest pressing Follow is asked to log in', async ({ page }) => {
    await page.getByRole('button', { name: 'Follow' }).first().click()
    await expect(page.getByText('Please log in to follow artists.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Follow' }).first()).toHaveAttribute('aria-pressed', 'false')
  })
})
