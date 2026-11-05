import { readFileSync } from 'node:fs'

function supabaseUrl() {
  if (process.env.VITE_SUPABASE_URL) return process.env.VITE_SUPABASE_URL
  const env = readFileSync(new URL('../../.env', import.meta.url), 'utf8')
  const line = env.split('\n').find((l) => l.startsWith('VITE_SUPABASE_URL='))
  return line.slice('VITE_SUPABASE_URL='.length).trim().replace(/^['"]|['"]$/g, '')
}

function base64url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

export const TEST_USER = { id: '00000000-0000-4000-8000-000000000001', email: 'fan@riffle.test' }

export async function signIn(page) {
  const storageKey = `sb-${new URL(supabaseUrl()).hostname.split('.')[0]}-auth-token`
  const expiresAt = Math.floor(Date.now() / 1000) + 3600
  const accessToken = [
    base64url({ alg: 'HS256', typ: 'JWT' }),
    base64url({ sub: TEST_USER.id, email: TEST_USER.email, role: 'authenticated', aud: 'authenticated', exp: expiresAt }),
    'test-signature',
  ].join('.')

  const session = {
    access_token: accessToken,
    refresh_token: 'test-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: expiresAt,
    user: {
      id: TEST_USER.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: TEST_USER.email,
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-01-01T00:00:00Z',
    },
  }

  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [storageKey, JSON.stringify(session)],
  )
}
