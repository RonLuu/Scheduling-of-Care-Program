export function expandOccurrences(
  { intervalType, intervalValue, startDate, endDate, occurrenceCount },
  windowStart,
  windowEnd
) {
  const results = [];
  if (!startDate) return results;

  const start = new Date(startDate);

  // Purchase-only items never generate tasks
  if (intervalType === "JustPurchase") return results;

  // One-time: emit exactly the start once (if in window)
  if (intervalType === "OneTime") {
    if (
      (!windowStart || start >= windowStart) &&
      (!windowEnd || start <= windowEnd)
    ) {
      results.push(start);
    }
    return results;
  }

  // Sanity: non-positive interval values would cause infinite loops
  const iv = Number(intervalValue) || 1;
  if (iv <= 0) return results;

  const byCount = Number.isInteger(occurrenceCount) && occurrenceCount > 0;
  const hasEnd = !!endDate;

  // Helper to step the date by the recurrence
  const step = (d) => {
    const nd = new Date(d);
    if (intervalType === "Daily") nd.setDate(nd.getDate() + iv);
    else if (intervalType === "Weekly") nd.setDate(nd.getDate() + 7 * iv);
    else if (intervalType === "Monthly") nd.setMonth(nd.getMonth() + iv);
    else if (intervalType === "Yearly") nd.setFullYear(nd.getFullYear() + iv);
    else return d; // unknown type => no progress; better to bail
    return nd;
  };

  // If the type isn't one of the supported ones, do nothing
  if (!["Daily", "Weekly", "Monthly", "Yearly"].includes(intervalType)) {
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
    if (
      (!windowStart || current >= windowStart) &&
      (!windowEnd || current <= windowEnd)
    ) {
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
