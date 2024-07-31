import { describe, it, expect } from "bun:test"
import { mergeSort } from "./mergeSort"

describe("mergeSort", () => {
  it("should sort an array of numbers in ascending order", () => {
    const unsortedArray = [64, 34, 25, 12, 22, 11, 90]
    const sortedArray = mergeSort(unsortedArray)
    expect(sortedArray).toEqual([11, 12, 22, 25, 34, 64, 90])
  })

  it("should return the same array if it contains only one element", () => {
    const singleElementArray = [42]
    const result = mergeSort(singleElementArray)
    expect(result).toEqual([42])
  })

  it("should correctly sort an array with duplicate elements", () => {
    const arrayWithDuplicates = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]
    const sortedArray = mergeSort(arrayWithDuplicates)
    expect(sortedArray).toEqual([1, 1, 2, 3, 3, 4, 5, 5, 5, 6, 9])
  })

  it("should return an empty array when given an empty array", () => {
    const emptyArray: number[] = []
    const result = mergeSort(emptyArray)
    expect(result).toEqual([])
  })
})