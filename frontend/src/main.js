import { createApp } from 'vue';
import { createPinia } from 'pinia';
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import 'bootstrap-icons/font/bootstrap-icons.css';
import './style.css';
import { createWebHistory, createRouter } from 'vue-router';
import App from './App.vue';
import WorkspacesView from './pages/WorkspacesView.vue';
import CalendarView from './pages/CalendarView.vue';
import FlowView from './pages/FlowView.vue';
import LoginView from './pages/LoginView.vue';

// Create the router instance
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      component: LoginView,
      meta: { public: true }
    },
    { path: '/', redirect: '/workspaces' },
    {
      path: '/workspaces',
      component: WorkspacesView,
      name: 'workspaces'
    },
    {
      path: '/calendar',
      component: CalendarView,
      name: 'calendar'
    },
    {
      path: '/flow',
      component: FlowView,
      name: 'flow'
    },
  ],
});

// Clear any existing app instances (this can help during hot reloading)
const rootElement = document.getElementById('app');
if (rootElement && rootElement.__vue_app__) {
  rootElement.__vue_app__.unmount();
}

// Create a single Pinia instance
const pinia = createPinia();

// Create a single Vue app instance
const app = createApp(App);

// Use plugins
app.use(pinia);
app.use(router);

// Mount the app
app.mount('#app');
