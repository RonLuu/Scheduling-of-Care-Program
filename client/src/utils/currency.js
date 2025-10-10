/**
 * Round a number to 2 decimal places to avoid floating-point precision issues
 * @param {number} value - The value to round
 * @returns {number} - The rounded value
 */
export function roundToTwoDecimals(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Parse a string input as a currency value and round to 2 decimal places
 * @param {string|number} value - The value to parse
 * @returns {number} - The parsed and rounded value
 */
export function parseCurrency(value) {
  const parsed = parseFloat(value);
  if (isNaN(parsed)) return 0;
  return roundToTwoDecimals(parsed);
}
