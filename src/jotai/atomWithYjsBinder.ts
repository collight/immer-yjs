import { atom } from 'jotai/vanilla'
import type * as Y from 'yjs'

import { bind } from '../Binder'
import type { Recipe, Snapshot } from '../util'

export function atomWithYjsBinder<S extends Snapshot>(yjsData: Y.Map<unknown> | Y.Array<unknown>) {
  const binder = bind<S>(yjsData)

  // Base atom holds the actual current snapshot state
  const internalAtom = atom(binder.get())

  // Subscribe to external updates from Binder
  internalAtom.onMount = set => {
    set(binder.get())
    const unsubscribe = binder.subscribe(next => {
      set(next)
    })
    return () => {
      unsubscribe()
      binder.unbind()
    }
  }

  // Public atom just proxies to the internal one, but supports Immer-style update
  const binderAtom = atom(
    get => get(internalAtom),
    (get, _set, recipe: Recipe<S>) => {
      get(internalAtom)
      binder.update(recipe)
    },
  )

  return binderAtom
}
