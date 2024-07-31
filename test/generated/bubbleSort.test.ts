import { expect, test, describe } from "bun:test"
import { bubbleSort } from "./bubbleSort"

describe("bubbleSort", () => {
  test("sorts an unsorted array", () => {
    const unsorted = [64, 34, 25, 12, 22, 11, 90]
    const sorted = bubbleSort(unsorted)
    expect(sorted).toEqual([11, 12, 22, 25, 34, 64, 90])
  })

  test("handles an already sorted array", () => {
    const sorted = [1, 2, 3, 4, 5]
    const result = bubbleSort(sorted)
    expect(result).toEqual([1, 2, 3, 4, 5])
  })

  test("sorts an array with duplicate elements", () => {
    const unsorted = [5, 2, 8, 12, 1, 5, 8]
    const sorted = bubbleSort(unsorted)
    expect(sorted).toEqual([1, 2, 5, 5, 8, 8, 12])
  })

  test("handles an empty array", () => {
    const empty: number[] = []
    const result = bubbleSort(empty)
    expect(result).toEqual([])
  })

  test("handles an array with one element", () => {
    const singleElement = [42]
    const result = bubbleSort(singleElement)
    expect(result).toEqual([42])
  })
})