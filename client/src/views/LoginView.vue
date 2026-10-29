<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/services/supabase.js'
import { useUserStore } from '@/stores/user.js'

const router = useRouter()
const userStore = useUserStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')

async function login() {
  if (loading.value) return

  errorMessage.value = ''
  loading.value = true

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value
    })

    if (error) throw error

    if (!data.user) {
      throw new Error('Your account could not be loaded. Please try again.')
    }

    password.value = ''

    const { data: profile, error: profileError } = await supabase.from('profiles').select('display_name, onboarding_completed').eq('id', data.user.id).maybeSingle()

    if (profileError) {
      throw new Error('You are signed in, but your profile could not be loaded. Please try logging in again.')
    }

    if (userStore.user.id !== data.user.id) {
      throw new Error('Your account session changed. Please try again.')
    }

    if (profile) {
      userStore.updateDisplayName(profile.display_name)
    }

    if (profile && profile.onboarding_completed === true) {
      await router.replace('/discover')
    } else {
      await router.replace('/onboarding')
    }
  } catch (error) {
    errorMessage.value = error.message || 'Login failed. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>


<template>
  <main class="login-page">
    <section class="login-box" aria-labelledby="login-heading">
      <div class="login-accent" aria-hidden="true"></div>

      <header class="login-heading">
        <span class="login-icon" aria-hidden="true"><i class="bi bi-soundwave"></i></span>
        <span class="login-eyebrow">BACK TO YOUR SOUND</span>
        <h1 id="login-heading">Welcome back.</h1>
        <p>Your favourite artists and next discoveries are waiting.</p>
      </header>

      <form @submit.prevent="login" :aria-busy="loading">
        <div class="login-field">
          <label for="login-email">Email address</label>
          <div class="input-wrap">
            <i class="bi bi-envelope field-icon" aria-hidden="true"></i>
            <input id="login-email" v-model.trim="email" class="form-control" type="email" autocomplete="email" placeholder="you@example.com" required :disabled="loading">
          </div>
        </div>

        <div class="login-field">
          <label for="login-password">Password</label>
          <div class="input-wrap">
            <i class="bi bi-lock field-icon" aria-hidden="true"></i>
            <input id="login-password" v-model="password" class="form-control password-input" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" placeholder="Enter your password" required :disabled="loading">
            <button class="password-toggle" type="button" :aria-label="showPassword ? 'Hide password' : 'Show password'" :aria-pressed="showPassword" aria-controls="login-password" :disabled="loading" @click="showPassword = !showPassword">
              <i class="bi" :class="showPassword ? 'bi-eye-slash' : 'bi-eye'" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <div v-if="errorMessage" class="login-error" role="alert">
          <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
          <span>{{ errorMessage }}</span>
        </div>

        <button class="login-button" type="submit" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
          <span>{{ loading ? 'Logging in…' : 'Log in to Riffle' }}</span>
          <i v-if="!loading" class="bi bi-arrow-right" aria-hidden="true"></i>
        </button>

        <span class="visually-hidden" role="status">{{ loading ? 'Logging in. Please wait.' : '' }}</span>
      </form>

      <p class="signup-link">New around here? <RouterLink to="/signup">Create an account</RouterLink></p>

      <div class="login-divider"><span>or explore first</span></div>

      <RouterLink to="/discover" class="back-link"><i class="bi bi-compass" aria-hidden="true"></i> Continue browsing</RouterLink>

      <p class="login-footer"><i class="bi bi-music-note-beamed" aria-hidden="true"></i> Discover local. Find your sound.</p>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  display: grid;
  place-items: start center;
  min-height: calc(100svh - var(--navbar-height, 88px));
  padding: clamp(28px, 5vw, 64px) 16px;
  background:
    radial-gradient(ellipse at 15% 15%, rgba(238, 214, 246, 0.55), transparent 50%),
    radial-gradient(ellipse at 90% 85%, rgba(207, 228, 251, 0.55), transparent 50%),
    #f7f7fc;
  color: #14234b;
}

.login-page *,
.login-page *::before,
.login-page *::after {
  box-sizing: border-box;
}

.login-box {
  position: relative;
  width: 100%;
  max-width: 480px;
  overflow: hidden;
  padding: clamp(24px, 5vw, 40px);
  border: 1px solid #e3e5f1;
  border-radius: 28px;
  background: #fff;
  box-shadow: 0 16px 50px rgba(20, 35, 75, 0.07);
}

.login-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
  background: linear-gradient(90deg, #ffc9dc, #cfc5f8, #c9e9f4);
}

.login-heading {
  margin-bottom: 30px;
  text-align: center;
}

.login-icon {
  display: grid;
  place-items: center;
  width: 62px;
  height: 62px;
  margin: 0 auto 18px;
  border: 1px solid #e9def9;
  border-radius: 20px;
  background: linear-gradient(135deg, #fff0f7, #eee9ff);
  color: #7054dc;
  font-size: 32px;
}

.login-eyebrow {
  display: block;
  margin-bottom: 10px;
  color: #7054dc;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.7px;
}

.login-heading h1 {
  margin: 0 0 10px;
  color: #14234b;
  font-size: clamp(28px, 5vw, 34px);
  font-weight: 800;
  letter-spacing: -1px;
  line-height: 1.2;
}

.login-heading p {
  max-width: 300px;
  margin: 0 auto;
  color: #64708a;
  font-size: 14px;
  line-height: 1.7;
}

.login-field {
  margin-bottom: 20px;
}

.login-field label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 700;
}

.input-wrap {
  position: relative;
}

.field-icon {
  position: absolute;
  top: 50%;
  left: 16px;
  transform: translateY(-50%);
  color: #7b85a1;
  pointer-events: none;
}

.input-wrap .form-control {
  width: 100%;
  min-height: 52px;
  padding: 12px 16px 12px 44px;
  border: 1px solid #dce1ee;
  border-radius: 14px;
  background: #f8f9fd;
  color: #14234b;
  font-family: inherit;
  font-size: 16px;
  transition: border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
}

.input-wrap .form-control::placeholder {
  color: #7b85a1;
  font-size: 14px;
}

.input-wrap .form-control:focus {
  border-color: #8b73df;
  outline: none;
  background: #fff;
  box-shadow: 0 0 0 4px rgba(112, 84, 220, 0.12);
}

.input-wrap .password-input {
  padding-right: 52px;
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 5px;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  transform: translateY(-50%);
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #64708a;
  cursor: pointer;
}

.login-error {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 18px;
  padding: 12px 14px;
  border: 1px solid #f1d0d0;
  border-radius: 12px;
  background: #fff4f4;
  color: #b42318;
  font-size: 13px;
  line-height: 1.6;
}

.login-error > i {
  flex-shrink: 0;
  margin-top: 1px;
}

.login-error > span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.login-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-height: 52px;
  padding: 12px 20px;
  border: none;
  border-radius: 14px;
  background: #14234b;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 5px 14px rgba(20, 35, 75, 0.12);
  transition: background-color 180ms ease, transform 180ms ease, box-shadow 180ms ease;
}

.login-button:disabled,
.password-toggle:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.signup-link {
  margin: 22px 0 0;
  color: #64708a;
  font-size: 13px;
  line-height: 1.8;
  text-align: center;
}

.signup-link a {
  color: #6346c6;
  font-weight: 700;
  text-decoration: none;
}

.login-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 24px 0 14px;
  color: #64708a;
  font-size: 11px;
}

.login-divider::before,
.login-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e8ebf3;
}

.back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  padding: 10px 16px;
  border: 1px solid #e0e5f0;
  border-radius: 14px;
  color: #14234b;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: background-color 180ms ease, border-color 180ms ease;
}

.login-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin: 24px 0 0;
  color: #64708a;
  font-size: 11px;
  text-align: center;
}

.login-footer i {
  color: #9b73cd;
}

.login-page button:focus-visible,
.login-page a:focus-visible {
  outline: 3px solid #7054dc;
  outline-offset: 3px;
}

@media (hover: hover) {
  .login-button:not(:disabled):hover {
    transform: translateY(-2px);
    background: #253969;
    box-shadow: 0 8px 20px rgba(20, 35, 75, 0.18);
  }

  .password-toggle:not(:disabled):hover {
    background: #eee9ff;
    color: #6346c6;
  }

  .back-link:hover {
    border-color: #d4c7f4;
    background: #f7f3ff;
    color: #513ba0;
  }

  .signup-link a:hover {
    text-decoration: underline;
  }
}

@media (max-width: 575.98px) {
  .login-box {
    border-radius: 22px;
  }

  .login-heading {
    margin-bottom: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-page * {
    transition: none !important;
  }
}
</style>