import { Recipe } from '@collight/jotai-immer'
import { Patch, produceWithPatches } from 'immer'
import * as Y from 'yjs'

import { isJSONArray, isJSONObject, isJSONPrimitive, JSONValue, Snapshot, YObject } from './util'

export type ApplyPatchFn = typeof defaultApplyPatch

function toYType(v: JSONValue): YObject | JSONValue | undefined {
  if (isJSONPrimitive(v)) {
    return v
  } else if (isJSONArray(v)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Y.Array.from(v.map(toYType).filter(v => v !== undefined) as any[])
  } else if (isJSONObject(v)) {
    return new Y.Map(Object.entries(v).map(([k, v]) => [k, toYType(v)]))
  } else {
    return undefined
  }
}

function replaceYTarget(yTarget: YObject, value: JSONValue): void {
  if (yTarget instanceof Y.Map) {
    if (!isJSONObject(value)) {
      throw new Error(`Cannot update a Y.Map with a non-object value ${JSON.stringify(value)}`)
    }
    yTarget.clear()
    for (const k in value) {
      yTarget.set(k, toYType(value[k]!))
    }
  } else if (yTarget instanceof Y.Array) {
    if (!isJSONArray(value)) {
      throw new Error(`Cannot update a Y.Array with a non-array value ${JSON.stringify(value)}`)
    }
    yTarget.delete(0, yTarget.length)
    yTarget.push(value.map(toYType))
  } else {
    throw new Error(`The yTarget must be either Y.Map or Y.Array, but got ${JSON.stringify(yTarget)}`)
  }
}

function applyPatchToProperty(yTarget: YObject, op: Patch['op'], property: string | number, value: JSONValue): void {
  if (yTarget instanceof Y.Map) {
    if (typeof property === 'string') {
      switch (op) {
        case 'add':
        case 'replace':
          yTarget.set(property, toYType(value))
          break
        case 'remove':
          yTarget.delete(property)
          break
      }
    } else {
      throw new Error(`The property applying to a Y.Map must be a string, but got ${property}`)
    }
  } else if (yTarget instanceof Y.Array) {
    if (typeof property === 'number') {
      switch (op) {
        case 'add':
          yTarget.insert(property, [toYType(value)])
          break
        case 'replace':
          yTarget.delete(property)
          yTarget.insert(property, [toYType(value)])
          break
        case 'remove':
          yTarget.delete(property)
          break
      }
    } else if (property === 'length') {
      if (typeof value !== 'number') {
        throw new Error(`The value applying to a Y.Array length must be a number, but got ${JSON.stringify(value)}`)
      }
      if (value < yTarget.length) {
        const diff = yTarget.length - value
        yTarget.delete(value, diff)
      }
    } else {
      throw new Error(`The property applying to a Y.Array must be either number or length, but got ${property}`)
    }
  } else {
    throw new Error(`The yTarget must be either Y.Map or Y.Array, but got ${JSON.stringify(yTarget)}`)
  }
}

// MARK: Apply Patch to Y Target
export function defaultApplyPatch(yTarget: YObject, patch: Patch): void {
  const { path, op } = patch
  const value = patch.value as JSONValue

  // Apply patch to the whole yjs target
  if (path.length === 0) {
    if (op !== 'replace') {
      throw new Error(`Cannot apply patch to the whole yjs target with op ${op}`)
    }
    console.log('replaceYTarget dbg')
    replaceYTarget(yTarget, value)
    return
  }

  let yNestedTarget = yTarget
  for (let i = 0; i < path.length - 1; ++i) {
    const key = path[i]
    yNestedTarget = yNestedTarget.get(key as never) as YObject
  }

  const property = path[path.length - 1]!
  console.log('applyPatchToProperty dbg')
  applyPatchToProperty(yNestedTarget, op, property, value)
}

export function applyPatches<S extends Snapshot>(
  yTarget: YObject,
  snapshot: S,
  recipe: S | Recipe<S>,
  applyPatch: typeof defaultApplyPatch,
): S {
  const [newSnapshot, patches] = produceWithPatches(
    snapshot,
    typeof recipe === 'function' ? recipe : ((_ => recipe) as Recipe<S>),
  )
  for (const patch of patches) {
    applyPatch(yTarget, patch)
  }
  return newSnapshot
}
