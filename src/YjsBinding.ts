import { enablePatches, Patch } from 'immer'
import * as Y from 'yjs'

import { applyPatches, defaultApplyPatch } from './apply-patch'
import { applyYEvents } from './apply-y-event'
import { Recipe, Snapshot, YObject } from './util'

enablePatches()

// MARK: YjsBinding
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
    const binding = new this<S>(y, applyPatch)
    if (options.initialData) {
      binding.update(() => options.initialData)
    }
    return binding
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

  private snapshot = this.y.toJSON() as S
  private readonly subscriptions = new Set<ListenerFn<S>>()
  private readonly observer = (events: Y.YEvent<Y.AbstractType<unknown>>[]): void => {
    this.snapshot = applyYEvents(this.get(), events)
    this.subscriptions.forEach(fn => fn(this.get()))
  }

  constructor(
    readonly y: YObject,
    readonly applyPatch: ApplyPatchFn,
  ) {}
}

// MARK: bind
export function bind<S extends Snapshot>(y: YObject, options?: Partial<YjsBindingOptions<S>>) {
  const binding = YjsBinding.from(y, options)
  binding.observe()
  return binding
}
