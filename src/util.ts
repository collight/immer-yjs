import { ReadonlyJSONArray, ReadonlyJSONObject } from '@collight/json-serde'
import * as Y from 'yjs'

// MARK: Y
export type YObject = Y.Map<unknown> | Y.Array<unknown>

export type YEvent = Y.YEvent<Y.AbstractType<unknown>>

// MARK: Snapshot
export type Snapshot = ReadonlyJSONArray | ReadonlyJSONObject
