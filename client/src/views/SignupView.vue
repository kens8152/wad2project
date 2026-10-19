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
      password: password.value
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

