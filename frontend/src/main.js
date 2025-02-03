import { createApp } from 'vue';
import { createPinia } from 'pinia';
import './style.css';
import { createMemoryHistory, createRouter } from 'vue-router'
import HomeView from './pages/HomeView.vue'
import CalendarView from './pages/CalendarView.vue'
import MonthlyView from './pages/MonthlyView.vue'
import App from './App.vue';

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/calendar', component: CalendarView },
    { path: '/monthly', component: MonthlyView },
  ],
})

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(router);
app.mount('#app');
