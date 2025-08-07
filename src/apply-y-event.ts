import { produce } from 'immer'
import * as Y from 'yjs'

import { isJSONArray, isJSONObject, JSONArray, JSONObject, JSONValue, Snapshot, YObject } from './util'

function toPlainValue(v: YObject | JSONValue) {
  if (v instanceof Y.Map || v instanceof Y.Array) {
    return v.toJSON() as JSONObject | JSONArray
  } else {
    return v
  }
}

// MARK: Apply Y Event to Snapshot
function applyYEvent(base: JSONValue, event: Y.YEvent<Y.AbstractType<unknown>>) {
  if (event instanceof Y.YMapEvent && isJSONObject(base)) {
    const source = event.target as Y.Map<unknown>

    for (const [key, change] of event.changes.keys) {
      switch (change.action) {
        case 'add':
        case 'update':
          base[key] = toPlainValue(source.get(key) as YObject | JSONValue)
          break
        case 'delete':
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete base[key]
          break
      }
    }
  } else if (event instanceof Y.YArrayEvent && isJSONArray(base)) {
    const arr = base as unknown as unknown[]

    let retain = 0
    for (const change of event.changes.delta) {
      if (change.retain !== undefined) {
        retain += change.retain
      }
      if (change.delete !== undefined) {
        arr.splice(retain, change.delete)
      }
      if (change.insert !== undefined) {
        if (Array.isArray(change.insert)) {
          arr.splice(retain, 0, ...change.insert.map(toPlainValue))
        } else {
          arr.splice(retain, 0, toPlainValue(change.insert))
        }
        retain += change.insert.length
      }
    }
  }
}

export function applyYEvents<S extends Snapshot>(snapshot: S, events: Y.YEvent<Y.AbstractType<unknown>>[]) {
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
