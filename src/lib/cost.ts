import type { LanguageModelUsage } from "ai"

/** As of 9/11/24. */
export enum ANTHROPIC_PRICES {
  Input = 3 / 1_000_000,
  Output = 5 / 1_000_000
}

export interface TokensCost {
  input: number
  output: number
  total: number
}

export const getCost = (usage: LanguageModelUsage): TokensCost => {
  const input = usage.promptTokens * ANTHROPIC_PRICES.Input 
  const output = usage.completionTokens * ANTHROPIC_PRICES.Output
  const total = input + output

  return { input, output, total }
}