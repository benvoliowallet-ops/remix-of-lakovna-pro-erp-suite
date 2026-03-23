/**
 * Parse a localized number string to a number.
 * Handles both comma (Slovak/EU) and dot (US) as decimal separators.
 * 
 * Examples:
 * - "10" → 10
 * - "10,5" → 10.5
 * - "10.5" → 10.5
 * - "1.234,56" → 1234.56
 * - "1,234.56" → 1234.56
 */
export function parseLocalizedNumber(value: string): number {
  if (!value || value === "") return 0;
  
  let str = String(value).trim();
  
  // Remove any whitespace (thousands separator in some locales)
  str = str.replace(/\s/g, "");
  
  // Detect format - whether comma or dot is the decimal separator
  const lastComma = str.lastIndexOf(",");
  const lastDot = str.lastIndexOf(".");
  
  const isCommaDecimal = lastComma > lastDot;
  
  if (isCommaDecimal) {
    // Comma as decimal: 1.234,56 → 1234.56
    str = str.replace(/\./g, "");
    str = str.replace(",", ".");
  } else {
    // Dot as decimal: 1,234.56 → 1234.56
    str = str.replace(/,/g, "");
  }
  
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}
