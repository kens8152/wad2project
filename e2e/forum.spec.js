import { test, expect } from '@playwright/test'
import { mockSupabase } from './support/mockSupabase'


test.beforeEach(async ({ page }) => {
  await mockSupabase(page)
  await page.goto('/forum')
  await expect(page.getByText('Looking for a drummer')).toBeVisible()
})

test.describe('Forum: finding posts', () => {
  test('lists every post, newest first', async ({ page }) => {
    const titles = page.getByText(/Jazz night at TinBox|Looking for a drummer|Best synthwave albums/)
    await expect(titles).toHaveText(['Looking for a drummer', 'Best synthwave albums', 'Jazz night at TinBox'])
  })

  test('searching by tag shows only matching posts', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Search the forum' }).fill('synthwave')

    await expect(page.getByText('Best synthwave albums')).toBeVisible()
    await expect(page.getByText('Looking for a drummer')).toBeHidden()
    await expect(page.getByText('Jazz night at TinBox')).toBeHidden()
  })

  test('clearing the search shows every post again', async ({ page }) => {
    const search = page.getByRole('searchbox', { name: 'Search the forum' })
    await search.fill('drummer')
    await expect(page.getByText('Jazz night at TinBox')).toBeHidden()

    await page.getByRole('button', { name: 'Clear search' }).click()

    await expect(search).toHaveValue('')
    await expect(page.getByText('Jazz night at TinBox')).toBeVisible()
  })

  test('sorting by upvotes reorders the posts', async ({ page }) => {
    await page.getByRole('button', { name: /Sort by/ }).click()
    await page.getByRole('menuitemradio', { name: 'Upvotes' }).click()
    await page.getByRole('menuitemradio', { name: 'Fewest first' }).click()

    const titles = page.getByText(/Jazz night at TinBox|Looking for a drummer|Best synthwave albums/)
    await expect(titles).toHaveText(['Jazz night at TinBox', 'Best synthwave albums', 'Looking for a drummer'])
  })

  test('opening a post shows the full post', async ({ page }) => {
    await page.getByText('Best synthwave albums').click()

    await expect(page).toHaveURL(/\/forum\/post\/103$/)
    await expect(page.getByRole('heading', { name: 'Best synthwave albums' })).toBeVisible()
    await expect(page.getByText('Drop your favourites below')).toBeVisible()
  })
})
