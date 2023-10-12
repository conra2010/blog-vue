import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Quasar, Notify } from 'quasar'

// Import icon libraries
import '@quasar/extras/material-icons/material-icons.css'

// Import Quasar css
import 'quasar/src/css/index.sass'

import App from './App.vue'
import router from './router'

import mitt, { type Emitter } from 'mitt'

import { type MercureSourceEvents } from './lib/sse'

const app = createApp(App)

const emitter: Emitter<MercureSourceEvents> = mitt<MercureSourceEvents>()

app.use(createPinia())
app.use(router)

app.use(Quasar, {
    plugins: {
        Notify
    }, // import Quasar plugins and add here
    config: {
        notify: {}
    }
})

app.provide('emitter', emitter)

app.mount('#app')
