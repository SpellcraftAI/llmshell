export const compactNumber = (num: number, digits = 1) => {
  const formatter = Intl.NumberFormat(
    "en-US", 
    { 
      notation: "compact", 
      compactDisplay: "short", 
      maximumFractionDigits: digits
    }
  )
  
  return formatter.format(num)
}

export const compactUSD = (amount: number, digits = 2) => {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    compactDisplay: "short",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })

  return formatter.format(amount)
}