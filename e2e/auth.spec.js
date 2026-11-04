import { test, expect } from '@playwright/test'
import { mockSupabase } from './support/mockSupabase'

test.beforeEach(async ({ page }) => {
  await mockSupabase(page)
})

test.describe('Logging in', () => {
  test('a wrong password shows an error and stays on the login page', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel('Email address').fill('fan@riffle.test')
    await page.getByLabel('Password', { exact: true }).fill('wrong-password')
    await page.getByRole('button', { name: 'Log in to Riffle' }).click()

    await expect(page.getByRole('alert')).toContainText('Invalid login credentials')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('the show password button reveals what was typed', async ({ page }) => {
    await page.goto('/login')
    const password = page.getByLabel('Password', { exact: true })
    await password.fill('secret123')
    await expect(password).toHaveAttribute('type', 'password')

    await page.getByRole('button', { name: 'Show password' }).click()

    await expect(password).toHaveAttribute('type', 'text')
  })

  test('"Create an account" leads to the sign up page', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: 'Create an account' }).click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('"Continue browsing" lets a guest explore without logging in', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: 'Continue browsing' }).click()
    await expect(page).toHaveURL(/\/discover$/)
  })
})
