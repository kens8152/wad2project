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

      <!-- .prevent stops the normal form reload. aria-busy indicates that login is processing. -->
      <form @submit.prevent="login" :aria-busy="loading">
        <div class="login-field">
          <!-- for links the label to the input with the matching ID. -->
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
             <!-- type="button" prevents submission. ! switches showPassword between true and false. -->
            <!-- aria-label describes the action, aria-pressed reports its state, and aria-controls identifies the affected input. -->
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
  /* Prevent this page from shrinking inside its parent flex layout. */
  flex-shrink: 0;

  /* Place the card at the top and centre it horizontally. */
  display: grid;
  place-items: start center;

  /* Use the small viewport height minus the navbar height.
     var uses --navbar-height when defined, otherwise it uses 88px. */
  min-height: calc(100svh - var(--navbar-height, 88px));

  /* Responsive vertical padding: minimum 28px, preferred 5vw, maximum 64px.
     Horizontal padding stays at 16px. */
  padding: clamp(28px, 5vw, 64px) 16px;

  /* Layer two soft colour gradients over the existing page background.
     rgba's final number controls colour transparency. */
  background:
    radial-gradient(ellipse at 15% 15%, rgba(238, 214, 246, 0.55), transparent 50%),
    radial-gradient(ellipse at 90% 85%, rgba(207, 228, 251, 0.55), transparent 50%);

  color: #14234b;
}

/* * selects all elements inside the page.
   Include padding and borders within their widths, including pseudo-elements. */
.login-page *,
.login-page *::before,
.login-page *::after {
  box-sizing: border-box;
}

.login-box {
  /* Provide the positioning reference for the decorative accent strip. */
  position: relative;

  /* Fill the available width, up to 480px. */
  width: 100%;
  max-width: 480px;

  /* Clip content to the card's rounded edges. */
  overflow: hidden;

  /* Let padding grow with the screen width, between 24px and 40px. */
  padding: clamp(24px, 5vw, 40px);

  border: 1px solid #e3e5f1;
  border-radius: 28px;
  background: #fff;

  /* Add a soft shadow beneath the card. */
  box-shadow: 0 16px 50px rgba(20, 35, 75, 0.07);
}

/* Position a thin colour strip across the top of the card. */
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

/* Centre the soundwave icon inside its coloured square. */
.login-icon {
  display: grid;
  place-items: center;
  width: 62px;
  height: 62px;

  /* auto centres the square horizontally. */
  margin: 0 auto 18px;

  border: 1px solid #e9def9;
  border-radius: 20px;
  background: linear-gradient(135deg, #fff0f7, #eee9ff);
  color: #7054dc;
  font-size: 32px;
}

/* Small introductory text above the main heading. */
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

  /* Scale the heading between 28px and 34px depending on screen width. */
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

/* Leave space between the form fields. */
.login-field {
  margin-bottom: 20px;
}

.login-field label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 700;
}

/* Keep absolutely positioned icons and buttons relative to their input wrapper. */
.input-wrap {
  position: relative;
}

.field-icon {
  position: absolute;
  top: 50%;
  left: 16px;

  /* Move the icon up by half its own height to centre it vertically. */
  transform: translateY(-50%);

  color: #7b85a1;

  /* Let clicks pass through the decorative icon to the input underneath. */
  pointer-events: none;
}

.input-wrap .form-control {
  width: 100%;
  min-height: 52px;

  /* Extra left padding leaves room for the field icon. */
  padding: 12px 16px 12px 44px;

  border: 1px solid #dce1ee;
  border-radius: 14px;
  background: #f8f9fd;
  color: #14234b;
  font-family: inherit;
  font-size: 16px;

  /* Smoothly animate changes when the input receives focus. */
  transition: border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
}

/* Style the hint text displayed inside empty inputs. */
.input-wrap .form-control::placeholder {
  color: #7b85a1;
  font-size: 14px;
}

/* Highlight the input currently selected by the user. */
.input-wrap .form-control:focus {
  border-color: #8b73df;
  outline: none;
  background: #fff;
  box-shadow: 0 0 0 4px rgba(112, 84, 220, 0.12);
}

/* Leave space on the right for the password visibility button. */
.input-wrap .password-input {
  padding-right: 52px;
}

/* Position the eye button inside the right side of the password field. */
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

/* Arrange the error icon and message beside each other. */
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

/* > selects a direct child. Keep the error icon from shrinking. */
.login-error > i {
  flex-shrink: 0;
  margin-top: 1px;
}

/* Allow long error messages to wrap instead of overflowing. */
.login-error > span {
  min-width: 0;
  overflow-wrap: anywhere;
}

/* Centre the spinner, text, and arrow inside the full-width login button. */
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

  /* Smoothly animate the hover colour, movement, and shadow. */
  transition: background-color 180ms ease, transform 180ms ease, box-shadow 180ms ease;
}

/* Visually indicate that these buttons cannot currently be used. */
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

/* Arrange the divider lines and text in one row. */
.login-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 24px 0 14px;
  color: #64708a;
  font-size: 11px;
}

/* Create decorative lines before and after the divider text. */
.login-divider::before,
.login-divider::after {
  content: '';

  /* Let both lines share the available space equally. */
  flex: 1;

  height: 1px;
  background: #e8ebf3;
}

/* Style the Continue browsing link as an outlined button. */
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

/* Centre the footer content and allow wrapping on narrow screens. */
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

/* Show a visible outline when buttons or links receive keyboard focus. */
.login-page button:focus-visible,
.login-page a:focus-visible {
  outline: 3px solid #7054dc;
  outline-offset: 3px;
}

/* Apply hover effects on devices that support hovering, such as a mouse. */
@media (hover: hover) {
  /* :not(:disabled) prevents the hover effect on a disabled button. */
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

/* Adjust the card's appearance on screens narrower than 576px. */
@media (max-width: 575.98px) {
  .login-box {
    border-radius: 22px;
  }

  .login-heading {
    margin-bottom: 24px;
  }
}

/* Respect the user's device setting to reduce motion by disabling transitions.
   !important gives this rule priority over the earlier transition declarations. */
@media (prefers-reduced-motion: reduce) {
  .login-page * {
    transition: none !important;
  }
}
</style>