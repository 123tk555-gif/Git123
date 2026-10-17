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

/** { demo, resetLabel, maxTasks }。体験版かどうかなど */
export function fetchAppInfo() {
  return request('/api/app-info')
}

export async function fetchColumnSort(status) {
  const { sort } = await request(`/api/columns/${status}/sort`)
  return sort
}

export function changeColumnSort(status, sort) {
  return sendJson('PUT', `/api/columns/${status}/sort`, { sort })
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

/** status の列の「手動の並び順」の index 番目(0 が先頭)に移す。index が大きすぎるときは末尾 */
export function moveTask(id, status, index) {
  return sendJson('PUT', `/api/tasks/${id}/position`, { status, index })
}

/** ゴミ箱に移す(すぐには消えない) */
export function deleteTask(id) {
  return request(`/api/tasks/${id}`, { method: 'DELETE' })
}

/** { retentionDays, items: [{ task, deletedAt, purgeAt }] } */
export function fetchTrash() {
  return request('/api/trash')
}

export function restoreTask(id) {
  return request(`/api/trash/${id}/restore`, { method: 'POST' })
}

export function purgeTask(id) {
  return request(`/api/trash/${id}`, { method: 'DELETE' })
}

export function emptyTrash() {
  return request('/api/trash', { method: 'DELETE' })
}

/** 新しい順の操作履歴 */
export function fetchHistory(limit = 100) {
  return request(`/api/history?limit=${limit}`)
}
