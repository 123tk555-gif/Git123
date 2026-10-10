/** サーバーが返したエラーの内容(message と、項目ごとの errors)を持つ */
export class ApiError extends Error {
  constructor(message, fieldErrors = []) {
    super(message)
    this.fieldErrors = fieldErrors
  }
}

const NETWORK_ERROR_MESSAGE =
  'サーバーにつながりませんでした。サーバー(Spring Boot)とデータベース(Docker)が起動しているか確認してください。'

async function request(url, options = {}) {
  let response
  try {
    response = await fetch(url, options)
  } catch {
    throw new ApiError(NETWORK_ERROR_MESSAGE)
  }
  if (response.status === 204) return null
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    if (!body?.message || response.status >= 500) throw new ApiError(NETWORK_ERROR_MESSAGE)
    throw new ApiError(body.message, body.errors ?? [])
  }
  return body
}

function sendJson(method, url, data) {
  return request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function fetchColumnSort(status) {
  const { sort } = await request(`/api/columns/${status}/sort`)
  return sort
}

export function fetchTasks(status, sort) {
  return request(`/api/tasks?status=${status}&sort=${sort}`)
}

export function createTask(task) {
  return sendJson('POST', '/api/tasks', task)
}

export function updateTask(id, task) {
  return sendJson('PUT', `/api/tasks/${id}`, task)
}

export function deleteTask(id) {
  return request(`/api/tasks/${id}`, { method: 'DELETE' })
}
