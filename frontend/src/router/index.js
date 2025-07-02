import { createRouter, createWebHistory } from 'vue-router'
import BooksView from '../pages/BooksView.vue'
import CalendarView from '../pages/CalendarView.vue'
import FlowView from '../pages/FlowView.vue'
import LoginView from '../pages/LoginView.vue'
import AdminView from '../pages/admin/AdminView.vue'
import AdminUsersView from '../pages/admin/AdminUsersView.vue'
import TransactionsView from '../pages/transactions/TransactionsView.vue'


const routes = [
  {
    path: '/login',
    component: LoginView,
    meta: { public: true }
  },
  {
    path: '/',
    redirect: '/books'
  },
  {
    path: '/books',
    component: BooksView,
    name: 'books'
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
  {
    path: '/transactions',
    component: TransactionsView,
    name: 'transactions',
    meta: {
      requiresAuth: true,
      requiresSuperAdmin: false,
      public: false
    }
  }
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

  // If not authenticated and there's a token in localStorage, try to initialize
  if (!usersStore.isAuthenticated && !isPublicRoute && localStorage.getItem('token')) {
    try {
      // If initialization is already in progress, wait for it
      if (usersStore.isInitializing) {
        // Wait for initialization to complete
        while (usersStore.isInitializing) {
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      } else if (!usersStore.isInitialized) {
        // Start initialization if not done yet
        await usersStore.initializeFromToken()
      }
    } catch (error) {
      console.log('Failed to initialize from stored token:', error)
    }
  }

  if (!isPublicRoute && !usersStore.isAuthenticated) {
    next('/login')
  } else if (requiresSuperAdmin && !usersStore.isSuperAdmin) {
    // Redirect non-superadmins away from admin routes
    next('/books')
  } else {
    next()
  }
})

export default router