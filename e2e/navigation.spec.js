import { test, expect } from '@playwright/test'
import { mockSupabase } from './support/mockSupabase'

test.beforeEach(async ({ page }) => {
  await mockSupabase(page)
})

test.describe('Getting around the app', () => {
  test('the main navbar opens each section', async ({ page }) => {
    await page.goto('/events/list')
    const nav = page.getByRole('navigation', { name: 'Main' })

    await nav.getByRole('link', { name: 'Forum' }).click()
    await expect(page).toHaveURL(/\/forum$/)
    await expect(page).toHaveTitle('Forum · Riffle')

    await nav.getByRole('link', { name: 'Artists' }).click()
    await expect(page).toHaveURL(/\/artists$/)
    await expect(page).toHaveTitle('Artists · Riffle')

    await nav.getByRole('link', { name: 'Events' }).click()
    await expect(page).toHaveURL(/\/events$/)
    await expect(page).toHaveTitle('Events · Riffle')
  })

  test('an unknown address goes to the Events map', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')
    await expect(page).toHaveURL(/\/events$/)
  })
})

test.describe('Light and dark mode', () => {
  test('the navbar switch turns on dark mode and remembers it after a reload', async ({ page }) => {
    await page.goto('/events/list')
    await page.evaluate(() => localStorage.setItem('riffle-theme', 'light'))
    await page.reload()
    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-theme', 'light')

    await page.getByRole('button', { name: 'Switch to dark mode' }).click()

    await expect(html).toHaveAttribute('data-theme', 'dark')
    await expect(html).toHaveAttribute('data-bs-theme', 'dark')

    await page.reload()
    await expect(html).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible()
  })
})
