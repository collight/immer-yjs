import { WritableDraft } from 'immer'
import * as Y from 'yjs'

// MARK: JSON
export type JSONPrimitive = string | number | boolean | null

export type JSONValue = JSONPrimitive | JSONArray | JSONObject

export type JSONArray = JSONValue[]

export interface JSONObject {
  [property: string]: JSONValue
}

// MARK: Readonly JSON
export type ReadonlyJSONValue = JSONPrimitive | ReadonlyJSONArray | ReadonlyJSONObject

export type ReadonlyJSONArray = readonly JSONValue[]

export interface ReadonlyJSONObject {
  readonly [property: string]: ReadonlyJSONValue
}

// MARK: Predicates
export function isJSONPrimitive(v: ReadonlyJSONValue): v is JSONPrimitive {
  const t = typeof v
  return t === 'string' || t === 'number' || t === 'boolean' || v === null
}

export function isJSONArray(v: JSONValue): v is JSONArray
export function isJSONArray(v: ReadonlyJSONValue): v is ReadonlyJSONArray
export function isJSONArray(v: ReadonlyJSONValue): boolean {
  return Array.isArray(v)
}

export function isJSONObject(v: JSONValue): v is JSONObject
export function isJSONObject(v: ReadonlyJSONValue): v is ReadonlyJSONObject
export function isJSONObject(v: ReadonlyJSONValue): boolean {
  return !isJSONArray(v) && typeof v === 'object'
}

// MARK: Y
export type YObject = Y.Map<unknown> | Y.Array<unknown>

export type YEvent = Y.YEvent<Y.AbstractType<unknown>>

// MARK: Snapshot
export type Snapshot = ReadonlyJSONArray | ReadonlyJSONObject

export type Recipe<S extends Snapshot> = (draft: WritableDraft<S>) => void
