async function getCategories(params) {
  const response = await fetch('/api/categories?' + new URLSearchParams(params))
  return await response.json
}

async function getCategory(id) {
  const response = await fetch(`/api/categories/${id}`)
  return await response.json
}

async function createCategory(data) {
  const response = await fetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return await response.json
}

async function updateCategory(id, data) {
  const response = await fetch(`/api/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return await response.json
}

async function deleteCategory(id) {
  const response = await fetch(`/api/categories/${id}`, {
    method: 'DELETE'
  })
  if (response.status !== 204) {
    throw new Error('Failed to delete category')
  }
  return true
}

export {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
}