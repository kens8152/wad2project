<script setup>
// ref creates reactive variables: when their values change, Vue updates the page.
import { ref } from 'vue'

// Vue Router lets us navigate between pages without reloading the whole website.
import { useRouter } from 'vue-router'

// This is the project's configured Supabase client.
import { supabase } from '@/services/supabase'

const router = useRouter()

// These variables store the values entered into the form.
const email = ref('')
const password = ref('')
const confirmPassword = ref('')

// These control whether each password field displays text or hidden characters.
const showPassword = ref(false)
const showConfirmPassword = ref(false)

// loading prevents repeated submissions and controls the loading indicator.
const loading = ref(false)

// The template displays these messages only when they contain text.
const errorMessage = ref('')
const successMessage = ref('')

async function createAccount() {
  // Stop if an account creation request is already running.
  if (loading.value) return

  // Clear messages from the previous attempt.
  errorMessage.value = ''
  successMessage.value = ''

  // Check that both passwords match before contacting Supabase.
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Your passwords do not match.'
    return
  }

  loading.value = true

  try {
    // Send the email and password to Supabase Authentication.
    // await waits for the request to finish before continuing.
    // data contains the result; error contains any reported failure.
    const { data, error } = await supabase.auth.signUp({
      email: email.value.trim(),
      password: password.value,
      options: {
        // Destination after email confirmation during local development.
        emailRedirectTo: 'http://127.0.0.1:5173/onboarding'
      }
    })

    // Pass Supabase's error to the catch block below.
    if (error) throw error

    // Clear both password fields after a successful signup request.
    password.value = ''
    confirmPassword.value = ''

    // A session means the user is already signed in.
    // Otherwise, ask the user to confirm their email before logging in.
    if (data.session) {
      await router.push('/onboarding')
    } else {
      successMessage.value = 'Check your email for a confirmation link. Confirm your email before logging in.'
    }
  } catch (error) {
    // Show the error message, or a fallback if no message is available.
    errorMessage.value = error.message || 'Account creation failed. Please try again.'
  } finally {
    // Runs after success or failure, allowing the user to submit again.
    loading.value = false
  }
}
</script>

<template>
  <main class="signup-page">
    <section class="signup-box" aria-labelledby="signup-heading">
      <div class="signup-accent" aria-hidden="true"></div>

      <header class="signup-heading">
        <span class="signup-icon" aria-hidden="true"><i class="bi bi-music-note-beamed"></i></span>
        <span class="signup-eyebrow">YOUR NEXT DISCOVERY STARTS HERE</span>
        <h1 id="signup-heading">Find your sound.</h1>
        <p>Join Riffle to save your favourites and discover more local music.</p>
      </header>
<!-- Run createAccount when submitted. .prevent stops the browser's normal page reload. aria-busy tells assistive technology that the form is processing. -->
      <form @submit.prevent="createAccount" :aria-busy="loading">
        <div class="signup-field">
          <label for="signup-email">Email address</label>
          <div class="input-wrap">
            <i class="bi bi-envelope field-icon" aria-hidden="true"></i>
<!-- v-model.trim updates email and removes spaces at the start and end. HTML checks the email format and required field before submission. -->
            <input id="signup-email" v-model.trim="email" class="form-control" type="email" autocomplete="email" placeholder="you@example.com" required :disabled="loading">
          </div>
        </div>

        <div class="signup-field">
          <label for="signup-password">Password</label>
          <div class="input-wrap">
            <i class="bi bi-lock field-icon" aria-hidden="true"></i>
            <input id="signup-password" v-model="password" class="form-control password-input" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" minlength="8" placeholder="Create a password" aria-describedby="password-hint" required :disabled="loading">
            <!-- type="button" prevents form submission. Clicking reverses showPassword, while the icon and accessible label update to match. -->
            <button class="password-toggle" type="button" :aria-label="showPassword ? 'Hide password' : 'Show password'" :aria-pressed="showPassword" aria-controls="signup-password" :disabled="loading" @click="showPassword = !showPassword">
              <i class="bi" :class="showPassword ? 'bi-eye-slash' : 'bi-eye'" aria-hidden="true"></i>
            </button>
          </div>
          <p id="password-hint" class="field-hint">Use at least 8 characters.</p>
        </div>

        <div class="signup-field">
          <label for="signup-confirm-password">Confirm password</label>
          <div class="input-wrap">
            <i class="bi bi-shield-check field-icon" aria-hidden="true"></i>
            <input id="signup-confirm-password" v-model="confirmPassword" class="form-control password-input" :type="showConfirmPassword ? 'text' : 'password'" autocomplete="new-password" minlength="8" placeholder="Repeat your password" required :disabled="loading">
<!-- Store the confirmation separately so createAccount can compare the two passwords. -->
            <button class="password-toggle" type="button" :aria-label="showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'" :aria-pressed="showConfirmPassword" aria-controls="signup-confirm-password" :disabled="loading" @click="showConfirmPassword = !showConfirmPassword">
              <i class="bi" :class="showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'" aria-hidden="true"></i>
            </button>
          </div>
        </div>
<!-- v-if displays this error only when errorMessage contains text. role="alert" announces the error to screen readers. -->
        <div v-if="errorMessage" class="signup-alert signup-alert--error" role="alert">
          <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
          <span>{{ errorMessage }}</span>
        </div>
<!-- Display confirmation instructions after signup when email verification is needed. -->
        <div v-if="successMessage" class="signup-alert signup-alert--success" role="status">
          <i class="bi bi-envelope-check" aria-hidden="true"></i>
          <span>{{ successMessage }}</span>
        </div>
<!-- Disable submission while loading and show Bootstrap's spinner until the request finishes. -->
        <button class="signup-button" type="submit" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
          <span>{{ loading ? 'Creating account…' : 'Create my account' }}</span>
          <i v-if="!loading" class="bi bi-arrow-right" aria-hidden="true"></i>
        </button>
<!-- Bootstrap's visually-hidden class hides this message visually while keeping it available to screen readers. -->
        <span class="visually-hidden" role="status">{{ loading ? 'Creating your account. Please wait.' : '' }}</span>
      </form>
<!-- RouterLink navigates to another Vue route without a full page reload. -->
      <p class="login-link">Already part of Riffle? <RouterLink to="/login">Log in</RouterLink></p>

      <div class="signup-divider"><span>or explore first</span></div>

      <RouterLink to="/discover" class="back-link"><i class="bi bi-compass" aria-hidden="true"></i> Continue browsing</RouterLink>

      <p class="signup-footer"><i class="bi bi-music-note-beamed" aria-hidden="true"></i> Discover local. Find your sound.</p>
    </section>
  </main>
</template>



<style scoped>
.signup-page {
  /* Centre the card horizontally and leave space around the page.calc() subtracts the assumed navbar height from the browser height */
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: calc(100vh - 88px);
  padding: 48px 16px;
  /* soft colour glows only: the standard page background (with its dot grid) shows through underneath */
  background:
    radial-gradient(ellipse at 15% 15%, rgba(238, 214, 246, 0.55), transparent 50%),
    radial-gradient(ellipse at 90% 85%, rgba(207, 228, 251, 0.55), transparent 50%);
  color: var(--riffle-ink);
}

/* Apply border-box to all elements inside the signup page, including their before and after pseudo-elements, so padding and borders are included in their widths. */
.signup-page *,
.signup-page *::before,
.signup-page *::after {
  box-sizing: border-box;
}

.signup-box {
  position: relative;
  width: 100%;
  max-width: 480px;
  overflow: hidden;
  padding: 40px;
  border: 1px solid var(--riffle-border);
  border-radius: 28px;
  background: var(--riffle-surface);
  box-shadow: 0 16px 50px rgba(20, 35, 75, 0.07);
}

.signup-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
  background: linear-gradient(90deg, #ffc9dc, #cfc5f8, #c9e9f4);
}

.signup-heading {
  margin-bottom: 28px;
  text-align: center;
}

.signup-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 62px;
  height: 62px;
  margin: 0 auto 18px;
  border: 1px solid #e9def9;
  border-radius: 20px;
  background: linear-gradient(135deg, #fff0f7, #eee9ff);
  color: #7054dc;
  font-size: 28px;
}

.signup-eyebrow {
  display: block;
  margin-bottom: 10px;
  color: #7054dc;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.5px;
  line-height: 1.7;
}

.signup-heading h1 {
  margin: 0 0 10px;
  color: var(--riffle-ink);
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -1px;
  line-height: 1.2;
}

.signup-heading p {
  max-width: 310px;
  margin: 0 auto;
  color: var(--riffle-muted);
  font-size: 14px;
  line-height: 1.7;
}

.signup-field {
  margin-bottom: 20px;
}

.signup-field label {
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
  color: var(--riffle-muted);
  pointer-events: none;
}

.input-wrap .form-control {
  width: 100%;
  min-height: 52px;
  padding: 12px 16px 12px 44px;
  border: 1px solid #dce1ee;
  border-radius: 14px;
  background: var(--riffle-surface-soft);
  color: var(--riffle-ink);
  font-family: inherit;
  font-size: 16px;
  transition: border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
}

.input-wrap .form-control::placeholder {
  color: var(--riffle-muted);
  font-size: 14px;
}

.input-wrap .form-control:focus {
  border-color: #8b73df;
  outline: none;
  background: var(--riffle-surface);
  box-shadow: 0 0 0 4px rgba(112, 84, 220, 0.12);
}

.input-wrap .password-input {
  padding-right: 52px;
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  transform: translateY(-50%);
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--riffle-muted);
  cursor: pointer;
}

.field-hint {
  margin: 7px 0 0;
  color: var(--riffle-muted);
  font-size: 12px;
}

.signup-alert {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 18px;
  padding: 12px 14px;
  border: 1px solid;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.6;
}

.signup-alert > i {
  flex-shrink: 0;
  margin-top: 1px;
}

.signup-alert > span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.signup-alert--error {
  border-color: #f1d0d0;
  background: #fff4f4;
  color: #b42318;
}

.signup-alert--success {
  border-color: #cae7d9;
  background: #edfaf5;
  color: #18754a;
}

.signup-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-height: 52px;
  padding: 12px 20px;
  border: none;
  border-radius: 14px;
  background: #7c4dff;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 5px 14px rgba(20, 35, 75, 0.12);
  transition: background-color 180ms ease, transform 180ms ease, box-shadow 180ms ease;
}

.signup-button:disabled,
.password-toggle:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.login-link {
  margin: 22px 0 0;
  color: var(--riffle-muted);
  font-size: 13px;
  line-height: 1.8;
  text-align: center;
}

.login-link a {
  color: #6346c6;
  font-weight: 700;
  text-decoration: none;
}

.signup-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 24px 0 14px;
  color: var(--riffle-muted);
  font-size: 11px;
}

.signup-divider::before,
.signup-divider::after {
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
  border: 1px solid var(--riffle-border);
  border-radius: 14px;
  color: var(--riffle-ink);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: background-color 180ms ease, border-color 180ms ease;
}

.signup-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin: 24px 0 0;
  color: var(--riffle-muted);
  font-size: 11px;
  text-align: center;
}

.signup-footer i {
  color: #9b73cd;
}

.signup-page button:focus-visible,
.signup-page a:focus-visible {
  outline: 3px solid #7054dc;
  outline-offset: 3px;
}

@media (hover: hover) {
  .signup-button:not(:disabled):hover {
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

  .login-link a:hover {
    text-decoration: underline;
  }
}

/* Use smaller spacing and text on screens narrower than 576px. */
@media (max-width: 575.98px) {
  .signup-page {
    padding: 28px 16px;
  }

  .signup-box {
    padding: 24px;
    border-radius: 22px;
  }

  .signup-heading {
    margin-bottom: 24px;
  }

  .signup-heading h1 {
    font-size: 28px;
  }
}

</style>