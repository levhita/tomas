import { createRouter, createWebHistory } from 'vue-router'
import WorkspacesView from '../pages/WorkspacesView.vue'
import CalendarView from '../pages/CalendarView.vue'
import FlowView from '../pages/FlowView.vue'
import LoginView from '../pages/LoginView.vue'
import AdminView from '../pages/AdminView.vue'
import AdminUsersView from '../pages/AdminUsersView.vue'

const routes = [
  {
    path: '/login',
    component: LoginView,
    meta: { public: true }
  },
  {
    path: '/',
    redirect: '/workspaces'
  },
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
  {
    path: '/admin',
    component: AdminView,
    name: 'admin',
    meta: {
      requiresAuth: true,
      requiresSuperAdmin: true
    }
  },
  {
    path: '/admin/users',
    component: AdminUsersView,
    name: 'admin-users',
    meta: {
      requiresAuth: true,
      requiresSuperAdmin: true
    }
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard for authentication and admin access
router.beforeEach(async (to, from, next) => {
  // Import the users store after Pinia is set up
  const { useUsersStore } = await import('../stores/users')
  const usersStore = useUsersStore()

  const isPublicRoute = to.meta.public
  const requiresSuperAdmin = to.meta.requiresSuperAdmin

  // Wait a moment for auth initialization if coming from a fresh page load
  if (!usersStore.isAuthenticated && !isPublicRoute) {
    // Give some time for auth initialization
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  if (!isPublicRoute && !usersStore.isAuthenticated) {
    next('/login')
  } else if (requiresSuperAdmin && !usersStore.isSuperAdmin) {
    // Redirect non-superadmins away from admin routes
    next('/workspaces')
  } else {
    next()
  }
})

export default router