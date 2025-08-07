import * as Y from 'yjs'

export type YObject = Y.Map<unknown> | Y.Array<unknown>

export type JSONPrimitive = string | number | boolean | null

export type JSONValue = JSONPrimitive | JSONObject | JSONArray

export interface JSONObject {
  [member: string]: JSONValue
}

export type JSONArray = JSONValue[]

export type Snapshot = JSONObject | JSONArray

export type Recipe<S extends Snapshot> = (draft: S) => void

export function isJSONPrimitive(v: JSONValue): v is JSONPrimitive {
  const t = typeof v
  return t === 'string' || t === 'number' || t === 'boolean' || v === null
}

export function isJSONArray(v: JSONValue): v is JSONArray {
  return Array.isArray(v)
}

export function isJSONObject(v: JSONValue): v is JSONObject {
  return !isJSONArray(v) && typeof v === 'object'
}
