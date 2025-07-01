<template>
  <WorkspaceLayout>
    <div class="container p-3">
      <div class="bg-body-secondary rounded-3 shadow-sm p-3">
        <!-- Header -->
        <div class="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
          <h2 class="mb-0 text-light-emphasis fs-4">Transactions</h2>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-info d-flex align-items-center gap-1" type="button">
              <i class="bi bi-funnel"></i>
              <span class="d-none d-md-inline">Filter</span>
            </button>
            <button class="btn btn-outline-info d-flex align-items-center gap-1" type="button">
              <i class="bi bi-layout-three-columns"></i>
              <span class="d-none d-md-inline">Columns</span>
            </button>
            <button class="btn btn-info d-flex align-items-center gap-1" type="button">
              <i class="bi bi-plus-lg"></i>
              <span>Create</span>
            </button>
          </div>
        </div>
        <!-- Filters -->
        <form class="row g-2 align-items-end mb-3">
          <div class="col-12 col-md-6">
            <div class="form-floating">
              <input type="text" class="form-control bg-body-tertiary text-light-emphasis" id="search" placeholder="Search transactions">
              <label for="search" class="text-light-emphasis">Search</label>
            </div>
          </div>
          <div class="col-8 col-md-4">
            <div class="form-floating">
              <select class="form-select bg-body-tertiary text-light-emphasis" id="account">
                <option selected>All Accounts</option>
                <option>Debit Card</option>
                <option>Mexico Account</option>
              </select>
              <label for="account" class="text-light-emphasis">Account</label>
            </div>
          </div>
          <div class="col-4 col-md-2">
            <button class="btn btn-outline-info w-100" type="button">Reset Filters</button>
          </div>
        </form>
        <!-- Table -->
        <div class="table-responsive">
          <table class="table align-middle mb-0">
            <thead class="bg-info bg-opacity-10">
              <tr>
                <th scope="col">
                  <input class="form-check-input" type="checkbox" aria-label="Select all" />
                </th>
                <th class="text-light-emphasis text-start">Description</th>
                <th class="text-light-emphasis text-end">Amount</th>
                <th class="text-light-emphasis text-start">Account</th>
                <th class="text-light-emphasis text-start">Category</th>
                <th class="text-light-emphasis text-start">Type</th>
                <th class="text-light-emphasis text-end">Date</th>
                <th class="text-light-emphasis text-start">Note</th>
                <th class="text-light-emphasis text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              <!-- Example rows -->
              <tr>
                <td>
                  <input class="form-check-input" type="checkbox" aria-label="Select row" />
                </td>
                <td class="text-light-emphasis text-start">Supermarket</td>
                <td class="text-end text-info fw-semibold">- $54.20</td>
                <td class="text-light-emphasis text-start">Debit Card</td>
                <td class="text-start">
                  <span class="badge bg-info bg-opacity-75 text-light-emphasis">Groceries</span>
                </td>
                <td class="text-start">
                  <span class="badge bg-info bg-opacity-75 text-light-emphasis">Expense</span>
                </td>
                <td class="text-light-emphasis text-end">2025-07-01</td>
                <td class="text-light-emphasis text-start">Weekly food shopping</td>
                <td class="text-end">
                  <button class="btn btn-sm btn-info me-1" aria-label="Edit">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-info" aria-label="More">
                    <i class="bi bi-three-dots-vertical"></i>
                  </button>
                </td>
              </tr>
              <tr>
                <td>
                  <input class="form-check-input" type="checkbox" aria-label="Select row" />
                </td>
                <td class="text-light-emphasis text-start">Electric Company</td>
                <td class="text-end text-info fw-semibold">- $120.00</td>
                <td class="text-light-emphasis text-start">Debit Card</td>
                <td class="text-start">
                  <span class="badge bg-info bg-opacity-75 text-light-emphasis">Utilities</span>
                </td>
                <td class="text-start">
                  <span class="badge bg-info bg-opacity-75 text-light-emphasis">Expense</span>
                </td>
                <td class="text-light-emphasis text-end">2025-07-02</td>
                <td class="text-light-emphasis text-start">Monthly bill</td>
                <td class="text-end">
                  <button class="btn btn-sm btn-info me-1" aria-label="Edit">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-info" aria-label="More">
                    <i class="bi bi-three-dots-vertical"></i>
                  </button>
                </td>
              </tr>
              <tr>
                <td>
                  <input class="form-check-input" type="checkbox" aria-label="Select row" />
                </td>
                <td class="text-light-emphasis text-start">Employer Inc.</td>
                <td class="text-end text-info fw-semibold">+ $2,500.00</td>
                <td class="text-light-emphasis text-start">Mexico Account</td>
                <td class="text-start">
                  <span class="badge bg-info bg-opacity-75 text-light-emphasis">Wages</span>
                </td>
                <td class="text-start">
                  <span class="badge bg-info bg-opacity-75 text-light-emphasis">Income</span>
                </td>
                <td class="text-light-emphasis text-end">2025-07-03</td>
                <td class="text-light-emphasis text-start">Monthly salary</td>
                <td class="text-end">
                  <button class="btn btn-sm btn-info me-1" aria-label="Edit">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-info" aria-label="More">
                    <i class="bi bi-three-dots-vertical"></i>
                  </button>
                </td>
              </tr>
              <tr>
                <td>
                  <input class="form-check-input" type="checkbox" aria-label="Select row" />
                </td>
                <td class="text-light-emphasis text-start">Pizza Place</td>
                <td class="text-end text-info fw-semibold">- $32.00</td>
                <td class="text-light-emphasis text-start">Debit Card</td>
                <td class="text-start">
                  <span class="badge bg-info bg-opacity-75 text-light-emphasis">Restaurants</span>
                </td>
                <td class="text-start">
                  <span class="badge bg-info bg-opacity-75 text-light-emphasis">Expense</span>
                </td>
                <td class="text-light-emphasis text-end">2025-07-04</td>
                <td class="text-light-emphasis text-start">Dinner with friends</td>
                <td class="text-end">
                  <button class="btn btn-sm btn-info me-1" aria-label="Edit">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-info" aria-label="More">
                    <i class="bi bi-three-dots-vertical"></i>
                  </button>
                </td>
              </tr>
              <tr>
                <td>
                  <input class="form-check-input" type="checkbox" aria-label="Select row" />
                </td>
                <td class="text-light-emphasis text-start">Auto Finance</td>
                <td class="text-end text-info fw-semibold">- $400.00</td>
                <td class="text-light-emphasis text-start">Mexico Account</td>
                <td class="text-start">
                  <span class="badge bg-info bg-opacity-75 text-light-emphasis">Car Payment</span>
                </td>
                <td class="text-start">
                  <span class="badge bg-info bg-opacity-75 text-light-emphasis">Expense</span>
                </td>
                <td class="text-light-emphasis text-end">2025-07-05</td>
                <td class="text-light-emphasis text-start">Monthly payment</td>
                <td class="text-end">
                  <button class="btn btn-sm btn-info me-1" aria-label="Edit">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-info" aria-label="More">
                    <i class="bi bi-three-dots-vertical"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Pagination -->
        <div class="d-flex flex-wrap align-items-center justify-content-between mt-3 gap-2">
          <div class="text-light-emphasis small">
            Showing 1 to 5 of 5 results
          </div>
          <nav>
            <ul class="pagination mb-0">
              <li class="page-item disabled">
                <button class="page-link bg-body-tertiary text-light-emphasis">Previous</button>
              </li>
              <li class="page-item active">
                <button class="page-link bg-info text-light-emphasis border-info">1</button>
              </li>
              <li class="page-item disabled">
                <button class="page-link bg-body-tertiary text-light-emphasis">Next</button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  </WorkspaceLayout>
</template>

<script setup>
import WorkspaceLayout from '../../layouts/WorkspaceLayout.vue'
</script>