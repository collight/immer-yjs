import { AtomWithImmer, Recipe } from '@collight/jotai-immer'
import { atom } from 'jotai/vanilla'

import type { Snapshot, YObject } from '../util'
import { YjsBinding, YjsBindingOptions } from '../YjsBinding'

export function atomWithImmerYjs<S extends Snapshot>(
  y: YObject,
  options?: Partial<YjsBindingOptions<S>>,
): AtomWithImmer<S> {
  const binding = YjsBinding.from(y, options)

  // Base atom holds the actual current snapshot state
  const internalAtom = atom(binding.get())

  // Subscribe to external updates from Binding
  internalAtom.onMount = set => {
    binding.observe()
    set(binding.get())
    const unsubscribe = binding.subscribe(next => {
      set(next)
    })
    return (): void => {
      unsubscribe()
      binding.unobserve()
    }
  }

  return atom(
    get => get(internalAtom),
    (get, _set, recipe: S | Recipe<S>) => {
      get(internalAtom)
      binding.update(recipe)
    },
  ) as AtomWithImmer<S>
}
