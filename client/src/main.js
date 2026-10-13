import { createApp } from 'vue'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import '@fontsource-variable/plus-jakarta-sans'
import './assets/styles/main.css'

import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')
