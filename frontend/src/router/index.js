import { createRouter, createWebHistory } from 'vue-router'
import BooksView from '../pages/BooksView.vue'
import CalendarView from '../pages/CalendarView.vue'
import FlowView from '../pages/FlowView.vue'
import LoginView from '../pages/LoginView.vue'
import AdminView from '../pages/admin/AdminView.vue'
import AdminUsersView from '../pages/admin/AdminUsersView.vue'
import AdminUserEditView from '../pages/admin/AdminUserEditView.vue'
import AdminTeamsView from '../pages/admin/AdminTeamsView.vue'
import AdminTeamEditView from '../pages/admin/AdminTeamEditView.vue'
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
    path: '/admin/users/create',
    component: AdminUserEditView,
    name: 'admin-users-create',
    meta: {
      requiresAuth: true,
      requiresSuperAdmin: true
    }
  },
  {
    path: '/admin/users/:id/edit',
    component: AdminUserEditView,
    name: 'admin-users-edit',
    meta: {
      requiresAuth: true,
      requiresSuperAdmin: true
    }
  },
  {
    path: '/admin/teams',
    component: AdminTeamsView,
    name: 'admin-teams',
    meta: {
      requiresAuth: true,
      requiresSuperAdmin: true
    }
  },
  {
    path: '/admin/teams/create',
    component: AdminTeamEditView,
    name: 'admin-teams-create',
    meta: {
      requiresAuth: true,
      requiresSuperAdmin: true
    }
  },
  {
    path: '/admin/teams/:id/edit',
    component: AdminTeamEditView,
    name: 'admin-teams-edit',
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
  const isSuperadminRoute = to.meta.requiresSuperAdmin

  if (isSuperadminRoute) {
    console.log('Navigating to superadmin route:', to.path)
    console.log('User authenticated:', usersStore.isAuthenticated)
    console.log('User is superadmin:', usersStore.isSuperAdmin)
    console.log('User has selected team:', usersStore.hasSelectedTeam)
    console.log('Current user:', usersStore.currentUser)
  }

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
    console.log('Redirecting non-superadmin away from admin route')
    next({
      name: 'books',
      query: { error: 'unauthorized-admin' }
    })
  } else if (requiresSuperAdmin && usersStore.isSuperAdmin && usersStore.currentTeam) {
    // Redirect superadmins in team mode away from admin routes
    console.log('Redirecting superadmin in team mode away from admin route')
    next({
      name: 'books',
      query: { error: 'unauthorized-admin' }
    })
  } else if (!isPublicRoute && usersStore.isAuthenticated && !usersStore.hasSelectedTeam && !requiresSuperAdmin) {
    // If authenticated but no team selected, redirect to login to show team selection
    // ONLY for non-admin routes (admin routes don't require team selection)
    console.log('Redirecting to login for team selection (non-admin route)')
    next('/login')
  } else {
    next()
  }
})

export default router