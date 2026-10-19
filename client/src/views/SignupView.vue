<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/services/supabase'

const router = useRouter()
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

async function createAccount() {
  errorMessage.value = ''
  successMessage.value = ''

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Your passwords do not match.'
    return
  }

  loading.value = true

  try {
    const { data, error } = await supabase.auth.signUp({
    email: email.value.trim(),
    password: password.value,
    options: {
        emailRedirectTo: 'http://127.0.0.1:5173/onboarding'
    }
    })

    if (error) throw error

    password.value = ''
    confirmPassword.value = ''

    if (data.session) {
      await router.push('/onboarding')
    } else {
      successMessage.value = 'Check your email for a confirmation link. Confirm your email before logging in.'
    }
  } catch (error) {
    errorMessage.value = error.message || 'Account creation failed. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="signup-page">
    <section class="signup-box">
      <h1>Join Riffle</h1>
      <p>Discover local music and build your taste profile.</p>

      <form @submit.prevent="createAccount">
        <div class="mb-3">
          <label for="signup-email">Email</label>
          <input id="signup-email" v-model.trim="email" class="form-control mtmail" autocomplete="email" placeholder="you@example.com-2" type="e" required :disabled="loading">
        </div>

        <div class="mb-3">
          <label for="signup-password">Password</label>
          <input id="signup-password" v-model="password" class="form-control mt-2" type="password" autocomplete="new-password" minlength="8" placeholder="At least 8 characters" required :disabled="loading">
        </div>

        <div class="mb-3">
          <label for="signup-confirm-password">Confirm password</label>
          <input id="signup-confirm-password" v-model="confirmPassword" class="form-control mt-2" type="password" autocomplete="new-password" minlength="8" placeholder="Repeat your password" required :disabled="loading">
        </div>

        <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
        <p v-if="successMessage" class="success-message" role="status">{{ successMessage }}</p>

        <button class="signup-button" type="submit" :disabled="loading">{{ loading ? 'Creating account…' : 'Create account' }}</button>
      </form>

      <RouterLink to="/discover" class="back-link">Continue browsing</RouterLink>
    </section>
  </main>
</template>


<style scoped>
.signup-page {
  padding: 40px 20px;
  color: #14234b;
}

.signup-box {
  max-width: 450px;
  margin: 0 auto;
  padding: 30px;
  border: 1px solid #e0e5f0;
  border-radius: 20px;
  background-color: white;
}

.signup-box h1 {
  text-align: center;
  font-size: 28px;
  font-weight: bold;
}

.signup-box > p {
  text-align: center;
  color: #64708a;
  margin-bottom: 25px;
}

.signup-button {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 25px;
  background-color: #14234b;
  color: white;
  font-size: 16px;
  cursor: pointer;
}

.signup-button:disabled {
  opacity: 0.6;
}

.back-link {
  display: block;
  margin-top: 20px;
  text-align: center;
  color: #14234b;
}

.error-message {
  color: #b42318;
}

.success-message {
  color: #18754a;
}
</style>

