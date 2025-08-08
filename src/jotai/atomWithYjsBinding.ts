import { atom, WritableAtom } from 'jotai/vanilla'

import type { Recipe, Snapshot, YObject } from '../util'
import { YjsBinding, YjsBindingOptions } from '../YjsBinding'

export function atomWithYjsBinding<S extends Snapshot>(
  y: YObject,
  options?: Partial<YjsBindingOptions<S>>,
): WritableAtom<S, [recipe: Recipe<S>], void> {
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

  // Public atom just proxies to the internal one, but supports Immer-style update
  const bindingAtom = atom(
    get => get(internalAtom),
    (get, _set, recipe: Recipe<S>) => {
      get(internalAtom)
      binding.update(recipe)
    },
  )

  return bindingAtom
}
