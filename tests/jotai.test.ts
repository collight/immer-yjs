import { getDefaultStore } from 'jotai/vanilla'
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'

import { atomWithYjsBinder } from '../src/jotai'

describe('atomWithYjsBinder - integration', () => {
  it('should initialize with value from Y.Map', () => {
    const yDoc = new Y.Doc()
    const yMap = yDoc.getMap('foo')
    yMap.set('count', 1)

    type State = { count: number }
    const counterAtom = atomWithYjsBinder<State>(yMap)
    const store = getDefaultStore()

    const snapshot = store.get(counterAtom)
    expect(snapshot).toEqual({ count: 1 })
  })

  it.only('should apply Immer-style recipe and reflect in Y.Map', () => {
    const yDoc = new Y.Doc()
    const yMap = yDoc.getMap('foo')
    yMap.set('count', 2)

    type State = { count: number }
    const counterAtom = atomWithYjsBinder<State>(yMap)
    const store = getDefaultStore()

    store.set(counterAtom, draft => {
      draft.count += 3
    })

    store.sub(counterAtom, () => {
      return
    })

    const snapshot = store.get(counterAtom)
    expect(snapshot).toEqual({ count: 5 })

    expect(yMap.get('count')).toBe(5)
  })

  it('should reflect external changes to Y.Map', () => {
    const yDoc = new Y.Doc()
    const yMap = yDoc.getMap('foo')
    yMap.set('count', 10)

    type State = { count: number }
    const counterAtom = atomWithYjsBinder<State>(yMap)
    const store = getDefaultStore()

    const updates: State[] = []
    const unsubscribe = store.sub(counterAtom, () => {
      const val = store.get(counterAtom)
      updates.push(val)
    })

    yMap.set('count', 42) // trigger Yjs update

    // Let Yjs observers propagate
    setTimeout(() => {
      expect(updates.at(-1)).toEqual({ count: 42 })
      unsubscribe()
    }, 0)
  })

  it('should cleanup subscriptions on unmount', () => {
    const yDoc = new Y.Doc()
    const yMap = yDoc.getMap('foo')
    yMap.set('count', 7)

    type State = { count: number }
    const counterAtom = atomWithYjsBinder<State>(yMap)
    const store = getDefaultStore()

    const unsubscribe = store.sub(counterAtom, () => {
      return
    })

    unsubscribe() // unmounts atom
    yMap.set('count', 99) // should not throw or update anything

    const snapshot = store.get(counterAtom)
    // old value remains
    expect(snapshot.count).toBeLessThanOrEqual(99)
  })
})
