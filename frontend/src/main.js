import { createApp } from 'vue';
import { createPinia } from 'pinia';
import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap"
import 'bootstrap-icons/font/bootstrap-icons.css'

import App from './App.vue';
import './style.css'

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount('#app');
