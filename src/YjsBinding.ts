import { Recipe } from '@collight/jotai-immer'
import { enablePatches } from 'immer'
import * as Y from 'yjs'

import { applyPatches, ApplyPatchFn, defaultApplyPatch } from './apply-patch'
import { ApplyYEventFn, applyYEvents, defaultApplyYEvent } from './apply-y-event'
import { Snapshot, YEvent, YObject } from './util'

enablePatches()

// MARK: YjsBinding
export type SubscriberFn<S extends Snapshot> = (snapshot: S, events: YEvent[], transaction: Y.Transaction) => void
export type UnsubscribeFn = () => void

export interface YjsBindingOptions<S extends Snapshot> {
  initialData: S
  applyPatch: ApplyPatchFn
  applyYEvent: ApplyYEventFn
}

export class YjsBinding<S extends Snapshot> {
  static from<S extends Snapshot>(y: YObject, options: Partial<YjsBindingOptions<S>> = {}): YjsBinding<S> {
    const binding = new this<S>(y, options.applyPatch ?? defaultApplyPatch, options.applyYEvent ?? defaultApplyYEvent)
    if (options.initialData) {
      binding.update((() => options.initialData) as Recipe<S>)
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
   * Update the snapshot with the immer recipe and let the data flow to yjs source
   */
  readonly update = (recipe: S | Recipe<S>): void => {
    this.snapshot = applyPatches(this.y, this.get(), recipe, this.applyPatch)
  }

  /**
   * Subscribe to yjs update
   */
  readonly subscribe = (fn: SubscriberFn<S>): UnsubscribeFn => {
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
  private readonly subscriptions = new Set<SubscriberFn<S>>()
  private readonly observer = (events: YEvent[], transaction: Y.Transaction): void => {
    this.snapshot = applyYEvents(this.get(), events, this.applyYEvent)
    this.subscriptions.forEach(fn => fn(this.get(), events, transaction))
  }

  constructor(
    readonly y: YObject,
    readonly applyPatch: ApplyPatchFn,
    readonly applyYEvent: ApplyYEventFn,
  ) {}
}

// MARK: bind
export function bind<S extends Snapshot>(y: YObject, options?: Partial<YjsBindingOptions<S>>): YjsBinding<S> {
  const binding = YjsBinding.from(y, options)
  binding.observe()
  return binding
}
