<template>
  <GeneralLayout>
    <div class="container-fluid">
      <div class="row">
        <div class="col-12">
          <h1 class="mb-4">
            <i class="bi bi-gear-fill me-2"></i>
            Administration
          </h1>

          <div class="alert alert-info">
            <i class="bi bi-info-circle me-2"></i>
            Administration panel coming soon. This section will allow superadmins to manage users, system settings, and
            other administrative tasks.
          </div>

          <div class="row">
            <div class="col-md-4">
              <div class="card">
                <div class="card-body">
                  <h5 class="card-title">
                    <i class="bi bi-people me-2"></i>
                    User Management
                  </h5>
                  <p class="card-text">Manage users, permissions, and access rights.</p>
                  <button class="btn btn-primary" disabled>
                    Coming Soon
                  </button>
                </div>
              </div>
            </div>

            <div class="col-md-4">
              <div class="card">
                <div class="card-body">
                  <h5 class="card-title">
                    <i class="bi bi-gear me-2"></i>
                    System Settings
                  </h5>
                  <p class="card-text">Configure system-wide settings and preferences.</p>
                  <button class="btn btn-primary" disabled>
                    Coming Soon
                  </button>
                </div>
              </div>
            </div>

            <div class="col-md-4">
              <div class="card">
                <div class="card-body">
                  <h5 class="card-title">
                    <i class="bi bi-bar-chart me-2"></i>
                    Analytics
                  </h5>
                  <p class="card-text">View system usage and performance metrics.</p>
                  <button class="btn btn-primary" disabled>
                    Coming Soon
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </GeneralLayout>
</template>

<script setup>
import GeneralLayout from '../layouts/GeneralLayout.vue'
</script>