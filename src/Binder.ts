import { enablePatches, Patch } from 'immer'
import * as Y from 'yjs'

import { applyPatches, defaultApplyPatch } from './apply-patch'
import { applyYEvents } from './apply-y-event'
import { Recipe, Snapshot } from './util'

enablePatches()

// MARK: Binder
export type ListenerFn<S extends Snapshot> = (snapshot: S) => void
export type UnsubscribeFn = () => void

export interface Binder<S extends Snapshot> {
  /**
   * Release the binder.
   */
  unbind: () => void

  /**
   * Return the latest snapshot.
   */
  get: () => S

  /**
   * Update the snapshot as well as the corresponding y.js data.
   * Same usage as `produce` from `immer`.
   */
  update: (recipe: Recipe<S>) => void

  /**
   * Subscribe to snapshot update, fired when:
   *   1. User called update(fn).
   *   2. y.js source.observeDeep() fired.
   */
  subscribe: (fn: ListenerFn<S>) => UnsubscribeFn
}

export interface Options {
  /**
   * Customize immer patch application.
   * Should apply patch to the target y.js data.
   * @param target The y.js data to be modified.
   * @param patch The patch that should be applied, please refer to 'immer' patch documentation.
   * @param applyPatch the default behavior to apply patch, call this to handle the normal case.
   */
  applyPatch?: (target: Y.Map<unknown> | Y.Array<unknown>, patch: Patch, applyPatch: typeof defaultApplyPatch) => void
}

/**
 * Bind y.js data type.
 * @param source The y.js data type to bind.
 * @param options Change default behavior, can be omitted.
 */
export function bind<S extends Snapshot>(y: Y.Map<unknown> | Y.Array<unknown>, options?: Options): Binder<S> {
  let snapshot = y.toJSON() as S

  const get = () => snapshot

  const subscription = new Set<ListenerFn<S>>()

  const observer = (events: Y.YEvent<Y.AbstractType<unknown>>[]) => {
    snapshot = applyYEvents(get(), events)
    subscription.forEach(fn => fn(get()))
  }

  y.observeDeep(observer)
  const unbind = () => y.unobserveDeep(observer)

  const applyPatchInOption = options ? options.applyPatch : undefined

  const applyPatch = applyPatchInOption
    ? (target: Y.Map<unknown> | Y.Array<unknown>, patch: Patch) => applyPatchInOption(target, patch, defaultApplyPatch)
    : defaultApplyPatch

  const update = (recipe: Recipe<S>) => {
    const doc = y.doc

    const doApplyUpdate = () => {
      applyPatches(y, get(), recipe, applyPatch)
    }

    if (doc) {
      Y.transact(doc, doApplyUpdate)
    } else {
      doApplyUpdate()
    }
  }

  const subscribe = (fn: ListenerFn<S>) => {
    subscription.add(fn)
    return () => void subscription.delete(fn)
  }

  return {
    unbind,
    get,
    update,
    subscribe,
  }
}
