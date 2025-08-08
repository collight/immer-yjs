/* eslint-disable @typescript-eslint/no-dynamic-delete */
import { describe, expect, test } from 'vitest'
import * as Y from 'yjs'

import { defaultApplyPatch, YjsBinding } from '../src'
import { createSampleObject, id1, id2, id3 } from './sample-data'

test('bind usage demo', () => {
  const doc = new Y.Doc()

  const initialObj = createSampleObject() // plain object

  const topLevelMap = 'map'

  // get reference of CRDT type for binding
  const map = doc.getMap(topLevelMap)

  // bind the top-level CRDT type, works for Y.Array as well
  const binding = YjsBinding.from<typeof initialObj>(map)
  binding.observe()

  // initialize document with sample data
  binding.update(() => {
    return initialObj
  })

  // snapshot reference should not change if no update
  expect(binding.get()).toBe(binding.get())

  // get current state as snapshot
  const snapshot1 = binding.get()

  // should equal to initial structurally
  expect(snapshot1).toStrictEqual(initialObj)

  // should equal to yjs structurally
  expect(snapshot1).toStrictEqual(map.toJSON())

  // get the reference to be compared after changes are made
  const yd1 = map.get(id1) as Y.Map<unknown>

  // nested objects / arrays are properly converted to Y.Maps / Y.Arrays
  expect(yd1).toBeInstanceOf(Y.Map)
  expect(yd1.get('topping')).toBeInstanceOf(Y.Array)

  const batters = yd1.get('batters') as Y.Map<unknown>
  expect(batters).toBeInstanceOf(Y.Map)

  const batter = batters.get('batter') as Y.Array<unknown>
  expect(batter).toBeInstanceOf(Y.Array)

  const batter0 = batter.get(0) as Y.Map<unknown>
  expect(batter0).toBeInstanceOf(Y.Map)
  expect(batter0.get('id')).toBeTypeOf('string')

  // update the state with immer
  binding.update(state => {
    state[id1]!.ppu += 0.1
    const d1 = state[id1]

    d1!.topping.splice(2, 2, { id: '7777', type: 'test1' }, { id: '8888', type: 'test2' })
    d1!.topping.push({ id: '9999', type: 'test3' })

    delete state[id3]
  })

  // get snapshot after modified
  const snapshot2 = binding.get()

  // snapshot1 unchanged
  expect(snapshot1).toStrictEqual(initialObj)

  // snapshot2 changed
  expect(snapshot1).not.equal(snapshot2)

  // changed properties should reflect what we did in update(...)
  expect(snapshot2[id1]!.ppu).toStrictEqual(0.65)
  expect(snapshot2[id1]!.topping.find(x => x.id === '9999')).toStrictEqual({ id: '9999', type: 'test3' })
  expect(snapshot2[id3]).toBeUndefined()

  // reference changed as well
  expect(snapshot2[id1]).not.toBe(snapshot1[id1])

  // unchanged properties should keep referential equality with previous snapshot
  expect(snapshot2[id2]).toBe(snapshot1[id2])
  expect(snapshot2[id1]!.batters).toBe(snapshot1[id1]!.batters)
  expect(snapshot2[id1]!.topping[0]).toBe(snapshot1[id1]!.topping[0])

  // the underlying yjs data type reflect changes as well
  expect(map.toJSON()).toStrictEqual(snapshot2)

  // but yjs data type should not change reference (they are mutated in-place whenever possible)
  expect(map).toBe(doc.getMap(topLevelMap))
  expect(map.get(id1)).toBe(yd1)
  expect((map.get(id1) as Y.Map<unknown>).get('topping')).toBe(yd1.get('topping'))

  // save the length for later comparison
  const expectLength = binding.get()[id1]!.batters.batter.length

  // change from y.js
  ;((yd1.get('batters') as Y.Map<unknown>).get('batter') as Y.Array<unknown>).push([{ id: '1005', type: 'test' }])

  // change reflected in snapshot
  expect(binding.get()[id1]!.batters.batter.at(-1)).toStrictEqual({ id: '1005', type: 'test' })

  // now the length + 1
  expect(binding.get()[id1]!.batters.batter.length).toBe(expectLength + 1)

  // delete something from yjs
  yd1.delete('topping')

  // deletion reflected in snapshot
  expect(binding.get()[id1]!.topping).toBeUndefined()

  // release the observer, so the CRDT type can be bind again
  binding.unobserve()
})

test('boolean in array', () => {
  const doc = new Y.Doc()

  const map = doc.getMap('data')

  const binding = YjsBinding.from<{ k1: boolean; k2: boolean; k3: boolean[] }>(map)
  binding.observe()

  binding.update(state => {
    state.k1 = true
    state.k2 = false
    state.k3 = [true, false, true]
  })

  expect(map.toJSON()).toStrictEqual({ k1: true, k2: false, k3: [true, false, true] })
})

test('customize applyPatch', () => {
  const doc = new Y.Doc()

  const map = doc.getMap('data')

  const initialObj = createSampleObject() // plain object

  const binding = YjsBinding.from<typeof initialObj>(map, {
    applyPatch: (target, patch) => {
      // you can inspect the patch.path and decide what to do with target
      // optionally delegate to the default patch handler
      // (modify target/patch before delegating as you want)
      defaultApplyPatch(target, patch)
      // can also postprocessing after the default behavior is applied
    },
  })
  binding.observe()

  binding.update(() => initialObj)

  expect(binding.get()).toStrictEqual(initialObj)

  expect(binding.get()).toStrictEqual(map.toJSON())

  expect(binding.get()).toBe(binding.get())
})

describe('array splice', () => {
  const prepareArrayDoc = (...items: number[]): { doc: Y.Doc; binding: YjsBinding<{ array: number[] }> } => {
    const doc = new Y.Doc()
    const binding = YjsBinding.from<{ array: number[] }>(doc.getMap('data'), {
      applyPatch: (target, patch) => {
        defaultApplyPatch(target, patch)
      },
    })
    binding.observe()
    binding.update(data => {
      data.array = items
    })
    return { doc, binding }
  }

  test('remove nonexistent item', () => {
    const { binding } = prepareArrayDoc()

    binding.update(data => {
      data.array.splice(0, 1)
    })

    expect(binding.get().array.length).toBe(0)
  })

  test('remove single item', () => {
    const { binding } = prepareArrayDoc(1)

    binding.update(data => {
      data.array.splice(0, 1)
    })

    expect(binding.get().array.length).toBe(0)
  })

  test('remove first item of many', () => {
    const { binding } = prepareArrayDoc(1, 2, 3)

    // results in ops
    // replace array[0] value 2
    // replace array[1] value 3
    // replace array.length value 2
    binding.update(data => {
      data.array.splice(0, 1)
    })

    expect(binding.get().array.length).toBe(2)
  })

  test('remove last multiple items', () => {
    const { binding } = prepareArrayDoc(1, 2, 3, 4)

    binding.update(data => {
      data.array.splice(2, 2)
    })

    const result = binding.get().array
    expect(result.length).toBe(2)
    expect(result[0]).toBe(1)
    expect(result[1]).toBe(2)
  })

  test('replace last multiple items', () => {
    const { binding } = prepareArrayDoc(1, 2, 3, 4)

    binding.update(data => {
      data.array.splice(2, 2, 5, 6)
    })

    const result = binding.get().array
    expect(result.length).toBe(4)
    expect(result[0]).toBe(1)
    expect(result[1]).toBe(2)
    expect(result[2]).toBe(5)
    expect(result[3]).toBe(6)
  })

  test('remove first multiple items', () => {
    const { binding } = prepareArrayDoc(1, 2, 3, 4)

    binding.update(data => {
      data.array.splice(0, 2)
    })

    const result = binding.get().array
    expect(result.length).toBe(2)
    expect(result[0]).toBe(3)
    expect(result[1]).toBe(4)
  })

  test('replace first multiple items', () => {
    const { binding } = prepareArrayDoc(1, 2, 3, 4)

    binding.update(data => {
      data.array.splice(0, 2, 5, 6)
    })

    const result = binding.get().array
    expect(result.length).toBe(4)
    expect(result[0]).toBe(5)
    expect(result[1]).toBe(6)
    expect(result[2]).toBe(3)
    expect(result[3]).toBe(4)
  })
})
