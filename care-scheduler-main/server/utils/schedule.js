export function expandOccurrences({ intervalType, intervalValue, startDate, endDate, occurrenceCount }, windowStart, windowEnd) {
  const results = [];
  if (!startDate) return results;

  const start = new Date(startDate);
  const byCount = Number.isInteger(occurrenceCount) && occurrenceCount > 0;
  const hasEnd  = !!endDate;

  // Helper to step the date by the recurrence
  const step = (d) => {
    const nd = new Date(d);
    if (intervalType === "Daily")   nd.setDate(nd.getDate() + intervalValue);
    if (intervalType === "Weekly")  nd.setDate(nd.getDate() + 7 * intervalValue);
    if (intervalType === "Monthly") nd.setMonth(nd.getMonth() + intervalValue);
    if (intervalType === "Yearly")  nd.setFullYear(nd.getFullYear() + intervalValue);
    return nd;
  };

  // One-time
  if (intervalType === "OneTime") {
    if ((!windowStart || start >= windowStart) && (!windowEnd || start <= windowEnd)) results.push(start);
    return results;
  }

  let count = 0;
  let current = new Date(start);

  while (true) {
    // stop conditions
    if (byCount && count >= occurrenceCount) break;
    if (hasEnd && endDate && current > new Date(endDate)) break;
    if (windowEnd && current > windowEnd) break;

    // add if in window
    if ((!windowStart || current >= windowStart) && (!windowEnd || current <= windowEnd)) {
      results.push(new Date(current));
    }

    // advance
    count++;
    current = step(current);

    // sanity cap to avoid infinite loop (e.g., bad intervalValue)
    if (results.length > 10000) break;
  }

  return results;
}