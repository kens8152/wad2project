import { test, expect } from '@playwright/test'
import { mockSupabase } from './support/mockSupabase'
import { mockNotificationsBackend } from './support/notificationsBackend'
import { signIn } from './support/session'

const rows = (page) => page.locator('.notification-line')
const unreadText = (page) => page.locator('.notifications-head p')

test.describe('Notifications as a guest', () => {
  test('asks the user to log in', async ({ page }) => {
    await mockSupabase(page)
    await page.goto('/notifications')
    await expect(page.getByText('Please log in to see your notifications.')).toBeVisible()
  })
})

test.describe('Notifications when logged in', () => {
  let db

  async function open(page, options) {
    await mockSupabase(page)
    db = await mockNotificationsBackend(page, options)
    await signIn(page)
    await page.goto('/notifications')
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  }

  test('lists replies, mentions and votes, with the unread count and navbar dot', async ({ page }) => {
    await open(page)
    await expect(rows(page)).toHaveText([
      'Rosa replied to your post "Jazz night at TinBox"',
      'Mei mentioned you in a post: "Looking for a drummer"',
      'Joel upvoted your post "Jazz night at TinBox"',
      'Ravi downvoted your post "Jazz night at TinBox"',
    ])
    await expect(unreadText(page)).toHaveText('3 unread')
    await expect(page.locator('.riffle-nav__dot').last()).toBeVisible()
  })

  test('the Votes tab shows only upvotes and downvotes', async ({ page }) => {
    await open(page)
    await page.getByRole('tab', { name: 'Votes' }).click()
    await expect(rows(page)).toHaveText(['Joel upvoted your post "Jazz night at TinBox"', 'Ravi downvoted your post "Jazz night at TinBox"'])
  })

  test('opening a reply notification goes to the real forum post and marks it read', async ({ page }) => {
    await open(page)
    await rows(page).first().click()
    await expect(page).toHaveURL(/\/forum\/post\/101$/)
    await expect(page.getByRole('heading', { name: 'Jazz night at TinBox' })).toBeVisible()
    expect(db.notifications.find((n) => n.id === 'r1').read_at).not.toBeNull()
  })

  test('"Mark all as read" clears the count and the navbar dot', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: 'Mark all as read' }).click()
    await expect(unreadText(page)).toHaveText('You are all caught up')
    await expect(page.locator('a[href="/notifications"] .riffle-nav__dot')).toHaveCount(0)
    expect(db.notifications.every((n) => n.read_at)).toBe(true)
  })

  test('the × removes a notification, and "Clear read" removes the read ones', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: 'Remove notification' }).first().click()
    await expect(rows(page)).toHaveCount(3)

    await page.getByRole('button', { name: 'Clear read' }).click()
    await expect(rows(page)).toHaveCount(2)
    expect(db.notifications.map((n) => n.id)).toEqual(['m1', 'd1'])
  })

  test('switching off post votes is saved', async ({ page }) => {
    await open(page)
    await page.getByRole('switch', { name: 'Post votes' }).uncheck()
    await expect.poll(() => db.notification_settings[0]).toMatchObject({ post_votes: false })

    await page.reload()
    await expect(page.getByRole('switch', { name: 'Post votes' })).not.toBeChecked()
    await expect(page.getByRole('switch', { name: 'Mentions' })).toBeChecked()
  })

  test('a gig added since the last visit shows up under Events', async ({ page }) => {
    const yesterday = new Date(Date.now() - 24 * 3600000).toISOString()
    await open(page, {
      settings: { last_events_check: yesterday },
      events: [
        {
          id: 'moon-carrot-tinbox',
          title: 'Moon Carrot Live',
          date_label: 'Sat, 14 Nov',
          created_at: new Date().toISOString(),
          venue: { name: 'TinBox', lat: 1.2985, lng: 103.8508 },
        },
      ],
    })
    await page.getByRole('tab', { name: 'Events' }).click()
    await expect(rows(page)).toHaveText(['New gig: Moon Carrot Live at TinBox (Sat, 14 Nov)'])
  })
})
