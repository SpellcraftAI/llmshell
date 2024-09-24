export const compactNumber = (num: number | null, digits = 1) => {
  if (num === null || isNaN(num)) {
    return "N/A"
  }

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

export const compactUSD = (amount: number | null, digits = 2) => {
  if (amount === null || isNaN(amount)) {
    return "N/A"
  }

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