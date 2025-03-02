import { createApp } from 'vue';
import { createPinia } from 'pinia';
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import 'bootstrap-icons/font/bootstrap-icons.css';
import './style.css';
import { createMemoryHistory, createRouter } from 'vue-router';
import HomeView from './pages/HomeView.vue';
import CalendarView from './pages/CalendarView.vue';
import MonthlyView from './pages/MonthlyView.vue';
import SplitView from './pages/SplitView.vue';
import LoginView from './pages/LoginView.vue';
import App from './App.vue';

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: '/login',
      component: LoginView,
      meta: { public: true }
    },
    { path: '/', component: SplitView },
    { path: '/home', component: HomeView },
    { path: '/split', component: SplitView },
    { path: '/calendar', component: CalendarView },
    { path: '/monthly', component: MonthlyView },
  ],
});

// Navigation guard
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('token')
  const isPublicRoute = to.meta.public

  if (!isPublicRoute && !isAuthenticated) {
    next('/login')
  } else {
    next()
  }
})

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(router);
app.mount('#app');
