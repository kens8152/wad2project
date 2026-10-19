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
