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