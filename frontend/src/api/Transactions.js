async function getTransanctions(params) {
  const response = await fetch('/api/transactions?' + new URLSearchParams(params))
  return await response.json()
}

async function getTransanction(id) {
  const response = await fetch(`/api/transactions/${id}`)
  return await response.json()
}

async function createTransanction(data) {
  const response = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return await response.json()
}

async function updateTransanction(id, data) {
  const response = await fetch(`/api/transactions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return await response.json()
}

async function deleteTransanction(id) {
  const response = await fetch(`/api/transactions/${id}`, {
    method: 'DELETE'
  })
  if (response.status !== 204) {
    throw new Error('Failed to delete transaction')
  }
  return true
}

export {
  getTransanctions,
  getTransanction,
  createTransanction,
  updateTransanction,
  deleteTransanction
}