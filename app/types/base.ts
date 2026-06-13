// API response envelope — mirrors server/utils/response.ts (`ok`, `paginated`)
export interface ApiItem<T> {
  data: T
}

export interface ApiArray<T> {
  data: T[]
}

export interface ApiPaged<T> {
  data: T[]
  total: number
}
