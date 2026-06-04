export function ok<T>(data: T) {
  return { data }
}

export function paginated<T>(data: T[], total: number) {
  return { data, total }
}
