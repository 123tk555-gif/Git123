async function getJson(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${url} の取得に失敗しました(${response.status})`)
  }
  return response.json()
}

export async function fetchColumnSort(status) {
  const { sort } = await getJson(`/api/columns/${status}/sort`)
  return sort
}

export function fetchTasks(status, sort) {
  return getJson(`/api/tasks?status=${status}&sort=${sort}`)
}
