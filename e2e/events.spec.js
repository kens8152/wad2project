import { test, expect } from '@playwright/test'
import { mockSupabase } from './support/mockSupabase'

test.beforeEach(async ({ page }) => {
  await mockSupabase(page)
  await page.goto('/events/list')
  await expect(page.locator('.list-card').first()).toBeVisible()
})

test.describe('Events: browsing upcoming gigs', () => {
  test('shows a list of upcoming events', async ({ page }) => {
    await expect(page).toHaveTitle('Events · Riffle')
    expect(await page.locator('.list-card').count()).toBeGreaterThan(0)
  })

  test('searching narrows the list to matching events', async ({ page }) => {
    const total = await page.locator('.list-card').count()
    const firstTitle = (await page.locator('.list-card__title').first().innerText()).trim()

    await page.getByRole('searchbox', { name: 'Search events, artists or venues' }).fill(firstTitle)

    await expect(page.locator('.list-card__title').first()).toHaveText(firstTitle)
    expect(await page.locator('.list-card').count()).toBeLessThanOrEqual(total)
  })

  test('a search with no matches shows the empty state and Reset brings events back', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Search events, artists or venues' }).fill('zzzz no such gig')

    await expect(page.getByRole('heading', { name: 'No events match these filters' })).toBeVisible()

    await page.locator('.events-shell__state').getByRole('button', { name: 'Reset filters' }).click()
    await expect(page.locator('.list-card').first()).toBeVisible()
  })

  test('opening an event shows its detail page', async ({ page }) => {
    const firstTitle = (await page.locator('.list-card__title').first().innerText()).trim()

    await page.getByRole('link', { name: firstTitle }).first().click()

    await expect(page).toHaveURL(/\/events\/[^/]+$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Line-up' })).toBeVisible()
  })

  test('sorting by price puts the cheapest events first', async ({ page }) => {
    await page.getByRole('button', { name: /Sort by/ }).click()
    await page.getByRole('option', { name: 'Price: low to high' }).click()

    await expect(page.getByRole('button', { name: /Sort by/ })).toContainText('Price: low to high')
    const prices = await page.locator('.chip--price').allInnerTexts()
    const values = prices.map((p) => (/free/i.test(p) ? 0 : Number(p.replace(/[^\d.]/g, ''))))
    expect(values).toEqual([...values].sort((a, b) => a - b))
  })

  test('switching between the list and map views keeps the user on Events', async ({ page }) => {
    const toggle = page.getByRole('group', { name: 'Events view' })

    await toggle.getByRole('link', { name: 'Map' }).click()
    await expect(page).toHaveURL(/\/events$/)
    await expect(toggle.getByRole('link', { name: 'Map' })).toHaveAttribute('aria-current', 'page')

    await toggle.getByRole('link', { name: 'List' }).click()
    await expect(page).toHaveURL(/\/events\/list$/)
    await expect(page.locator('.list-card').first()).toBeVisible()
  })

  test('a guest is asked to log in before saving an event', async ({ page }) => {
    await page.getByRole('button', { name: 'Save event' }).first().click()

    await expect(page.getByText('Please log in to save events.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save event' }).first()).toHaveAttribute('aria-pressed', 'false')
  })

  test('a guest is asked to log in before saving from the event page', async ({ page }) => {
    const firstTitle = (await page.locator('.list-card__title').first().innerText()).trim()
    await page.getByRole('link', { name: firstTitle }).first().click()
    await expect(page.getByRole('heading', { name: 'Line-up' })).toBeVisible()

    await page.getByRole('button', { name: 'Save event' }).click()

    await expect(page.getByText('Please log in to save events.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save event' })).toHaveAttribute('aria-pressed', 'false')
  })
})
