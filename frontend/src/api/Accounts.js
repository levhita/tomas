async function getAccounts(params) {
  const response = await fetch('/api/accounts?' + new URLSearchParams(params))
  return await response.json()
}

async function getAccount(id) {
  const response = await fetch(`/api/accounts/${id}`)
  return await response.json()
}

async function createAccount(data) {
  const response = await fetch('/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return await response.json()
}

async function updateAccount(id, data) {
  const response = await fetch(`/api/accounts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return await response.json()
}

async function deleteAccount(id) {
  const response = await fetch(`/api/accounts/${id}`, {
    method: 'DELETE'
  })
  if (response.status !== 204) {
    throw new Error('Failed to delete account')
  }
  return true
}

export {
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount
}