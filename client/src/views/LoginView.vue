<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/services/supabase.js'

const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

async function login() {
  errorMessage.value = ''
  loading.value = true

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value
    })

    if (error) throw error

    password.value = ''
    await router.push('/discover')
  } catch (error) {
    errorMessage.value = error.message || 'Login failed. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>


<template>
  <main class="login-page">
    <section class="login-box">
      <h1>Welcome back</h1>
      <p>Log in to your Riffle account.</p>

      <form @submit.prevent="login">
        <div class="mb-3">
          <label for="login-email">Email</label>
          <input id="login-email" v-model.trim="email" class="form-control mt-2" type="email" autocomplete="email" placeholder="Enter your email address" required :disabled="loading">
        </div>

        <div class="mb-3">
          <label for="login-password">Password</label>
          <input id="login-password" v-model="password" class="form-control mt-2" type="password" autocomplete="current-password" placeholder="Enter your password" required :disabled="loading">
        </div>

        <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>

        <button class="login-button" type="submit" :disabled="loading">{{ loading ? 'Logging in…' : 'Log in' }}</button>
      </form>

      <p class="signup-link">New to Riffle? <RouterLink to="/signup">Create an account</RouterLink></p>
      <RouterLink to="/discover" class="back-link">Continue browsing</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  padding: 40px 20px;
  color: #14234b;
}

.login-box {
  max-width: 450px;
  margin: 0 auto;
  padding: 30px;
  border: 1px solid #e0e5f0;
  border-radius: 20px;
  background-color: white;
}

.login-box h1 {
  text-align: center;
  font-size: 28px;
  font-weight: bold;
}

.login-box p {
  text-align: center;
  color: #64708a;
}

.login-button {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 25px;
  background-color: #14234b;
  color: white;
  font-size: 16px;
  cursor: pointer;
}

.login-button:disabled {
  opacity: 0.6;
}

.signup-link {
  margin-top: 20px;
}

.back-link {
  display: block;
  text-align: center;
  color: #14234b;
}

.login-box .error-message {
  color: #b42318;
}
</style>