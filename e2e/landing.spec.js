import { test, expect } from '@playwright/test'
import { mockSupabase } from './support/mockSupabase'

const scrollTo = (page, fraction) =>
  page.evaluate(async (f) => {
    const s = document.querySelector('.app-main')
    const target = (s.scrollHeight - s.clientHeight) * f
    const from = s.scrollTop
    for (let k = 1; k <= 10; k++) {
      s.scrollTop = from + ((target - from) * k) / 10
      await new Promise((r) => requestAnimationFrame(r))
    }
  }, fraction)

const scrollIntoTrack = (page, track, screens) =>
  page.evaluate(
    async ([name, extra]) => {
      const s = document.querySelector('.app-main')
      const section = document.querySelector(`[data-track="${name}"]`)
      const spacer = section.parentElement.classList.contains('pin-spacer') ? section.parentElement : section
      const start = s.scrollTop + spacer.getBoundingClientRect().top - s.getBoundingClientRect().top
      const target = start + s.clientHeight * extra
      const from = s.scrollTop
      for (let k = 1; k <= 12; k++) {
        s.scrollTop = from + ((target - from) * k) / 12
        await new Promise((r) => requestAnimationFrame(r))
      }
    },
    [track, screens],
  )

test.describe('Landing page', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page)
  })

  test('the home page opens on the landing page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/welcome$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Find your next favourite artist.' })).toBeVisible()
  })

  test('scrolling plays through every track, and the song bar follows', async ({ page }) => {
    await page.goto('/welcome')
    const now = page.locator('.timeline__now')
    await expect(now).toHaveText(/Intro/)

    const tracks = [
      ['Discover', 'A web of sounds'],
      ['Matchmaking', 'Swipe your way'],
      ['Events', 'Tonight, somewhere'],
      ['Community', 'Find your people'],
      ['Encore', 'Drop the needle'],
    ]
    for (const [track, heading] of tracks) {
      await page.locator(`[data-track="${track}"]`).evaluate((el) => {
        const s = document.querySelector('.app-main')
        s.scrollTop += el.getBoundingClientRect().top - s.getBoundingClientRect().top - 40
      })
      await expect(page.getByRole('heading', { name: new RegExp(heading) })).toBeInViewport()
      await expect(now).toHaveText(new RegExp(track))
    }
    await expect(page.getByRole('progressbar', { name: 'Page progress' })).not.toHaveAttribute('aria-valuenow', '0')
  })

  test('the matchmaking cards fly into a deck and the top card gets liked', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 860 })
    await page.goto('/welcome')
    await page.locator('.pin-spacer [data-track="Matchmaking"]').waitFor({ state: 'attached' })
    await scrollIntoTrack(page, 'Matchmaking', 1.6)
    await expect(page.locator('.deck-card').last()).toBeInViewport()
    await scrollIntoTrack(page, 'Matchmaking', 2.6)
    await expect(page.locator('.deck-card').last().locator('.stamp--like')).toHaveCSS('opacity', '1')
  })

  test('the calls to action open the app', async ({ page }) => {
    await page.goto('/welcome')
    await page.getByRole('link', { name: 'Start exploring' }).first().click()
    await expect(page).toHaveURL(/\/discover$/)

    await page.goto('/welcome')
    await page.getByRole('link', { name: 'Match me with artists' }).first().click()
    await expect(page).toHaveURL(/\/matchmaking$/)
  })

  test('with reduced motion everything is readable straight away', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/welcome')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('.deck-step-2')).toHaveCSS('opacity', '1')
    await expect(page.locator('.disc-step-2')).toHaveCSS('opacity', '1')
  })

  test('no sideways scrolling on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/welcome')
    await scrollTo(page, 0.5)
    await expect(async () => {
      await scrollIntoTrack(page, 'Encore', 0)
      await expect(page.getByRole('heading', { name: /Drop the needle/ })).toBeInViewport({ timeout: 1000 })
    }).toPass()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
})
