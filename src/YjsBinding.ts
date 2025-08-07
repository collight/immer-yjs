import { enablePatches, Patch } from 'immer'
import * as Y from 'yjs'

import { applyPatches, defaultApplyPatch } from './apply-patch'
import { applyYEvents } from './apply-y-event'
import { Recipe, Snapshot, YObject } from './util'

enablePatches()

// MARK: Binding
export type ListenerFn<S extends Snapshot> = (snapshot: S) => void
export type UnsubscribeFn = () => void

export type ApplyPatchFn = (yTarget: YObject, patch: Patch) => void
export type CustomApplyPatchFn = (
  ...params: [...Parameters<ApplyPatchFn>, originalApplyPatch: typeof defaultApplyPatch]
) => void

export interface YjsBindingOptions<S extends Snapshot> {
  initialData: S
  applyPatch: CustomApplyPatchFn
}

export class YjsBinding<S extends Snapshot> {
  static from<S extends Snapshot>(y: YObject, options: Partial<YjsBindingOptions<S>> = {}) {
    const optionsApplyPatch = options.applyPatch
    const applyPatch: ApplyPatchFn = optionsApplyPatch
      ? (yTarget, patch) => optionsApplyPatch(yTarget, patch, defaultApplyPatch)
      : defaultApplyPatch
    return new this(y, options.initialData ?? (y.toJSON() as S), applyPatch)
  }

  /**
   * Return the latest snapshot
   */
  readonly get = (): S => {
    return this.snapshot
  }

  /**
   * Update the snapshot with the recipe and let the data flow to yjs source
   */
  readonly update = (recipe: Recipe<S>): void => {
    this.snapshot = applyPatches(this.y, this.get(), recipe, this.applyPatch)
  }

  /**
   * Subscribe to yjs update
   */
  readonly subscribe = (fn: ListenerFn<S>): UnsubscribeFn => {
    this.subscriptions.add(fn)
    return () => void this.subscriptions.delete(fn)
  }

  /**
   * Enable flow from yjs update to snapshot
   */
  readonly observe = (): void => {
    this.y.observeDeep(this.observer)
  }

  /**
   * Disable flow from yjs update to snapshot
   */
  readonly unobserve = (): void => {
    this.y.unobserveDeep(this.observer)
  }

  private readonly subscriptions = new Set<ListenerFn<S>>()
  private readonly observer: (events: Y.YEvent<Y.AbstractType<unknown>>[]) => void = (
    events: Y.YEvent<Y.AbstractType<unknown>>[],
  ) => {
    this.snapshot = applyYEvents(this.get(), events)
    this.subscriptions.forEach(fn => fn(this.get()))
  }

  constructor(
    readonly y: YObject,
    private snapshot: S,
    readonly applyPatch: ApplyPatchFn,
  ) {}
}
