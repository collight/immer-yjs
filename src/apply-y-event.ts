import { isJSONArray, isJSONObject, JSONArray, JSONObject, JSONValue } from '@collight/json-serde'
import { produce } from 'immer'
import * as Y from 'yjs'

import { Snapshot, YEvent, YObject } from './util'

export type ApplyYEventFn = typeof defaultApplyYEvent

function toPlainValue(v: YObject | JSONValue): JSONValue {
  if (v instanceof Y.Map || v instanceof Y.Array) {
    return v.toJSON() as JSONObject | JSONArray
  } else {
    return v
  }
}

// MARK: Apply Y Event to Snapshot
export function defaultApplyYEvent(target: JSONValue, event: YEvent): void {
  if (event instanceof Y.YMapEvent) {
    if (!isJSONObject(target)) {
      throw new Error(`applyYEvent: a YMapEvent expects a JSON object target, but got ${JSON.stringify(target)}`)
    }
    for (const [key, change] of event.changes.keys) {
      switch (change.action) {
        case 'add':
        case 'update':
          target[key] = toPlainValue(event.target.get(key) as YObject | JSONValue)
          break
        case 'delete':
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete target[key]
          break
      }
    }
  } else if (event instanceof Y.YArrayEvent) {
    if (!isJSONArray(target)) {
      throw new Error(`applyYEvent: a YArrayEvent expects an array target, but got ${JSON.stringify(target)}`)
    }
    let retain = 0
    for (const change of event.changes.delta) {
      if (change.retain !== undefined) {
        retain += change.retain
      }
      if (change.delete !== undefined) {
        target.splice(retain, change.delete)
      }
      if (change.insert !== undefined) {
        if (Array.isArray(change.insert)) {
          target.splice(retain, 0, ...change.insert.map(toPlainValue))
        } else {
          target.splice(retain, 0, toPlainValue(change.insert))
        }
        retain += change.insert.length
      }
    }
  }
}

export function applyYEvents<S extends Snapshot>(
  snapshot: S,
  events: YEvent[],
  applyYEvent: typeof defaultApplyYEvent,
): S {
  return produce(snapshot, (draft: JSONValue) => {
    for (const event of events) {
      const target = event.path.reduce((obj, key) => {
        // @ts-expect-error: We know that the path is valid
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return obj[key]
      }, draft)

      applyYEvent(target, event)
    }
  })
}
