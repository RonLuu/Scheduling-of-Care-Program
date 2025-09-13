/**
 * Format currency in Australian Dollars
 */
export const aud = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

/**
 * Format frequency for display
 */
export const formatFrequency = (freq) => {
  if (!freq || !freq.intervalType) return "";

  if (freq.intervalType === "JustPurchase") {
    return "Just purchase (no recurrence)";
  }

  if (freq.intervalType === "OneTime") {
    const d = freq.startDate
      ? new Date(freq.startDate).toLocaleDateString()
      : "";
    return d ? `One-time (${d})` : "One-time";
  }

  const n = Number(freq.intervalValue || 1);
  const unit = freq.intervalType.toLowerCase();
  const singular =
    {
      daily: "day",
      weekly: "week",
      monthly: "month",
      yearly: "year",
    }[unit] || unit;

  return `Every ${n} ${n === 1 ? singular : singular + "s"}`;
};

/**
 * Convert budget period to annual amount
 */
export const toAnnualBudget = (type, amt) => {
  const n = Number(amt) || 0;
  if (type === "Week") return n * 52.15; // AU weeks per year
  if (type === "Month") return n * 12;
  return n; // Year
};

/**
 * Display user helper
 */
export const displayUser = (u) => {
  if (!u) return "Unknown";
  if (typeof u === "string") return u; // id string fallback
  return u.name || u.email || "Unknown";
};

/**
 * Format date for display
 */
export const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString();
};

/**
 * Format datetime for display
 */
export const formatDateTime = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleString();
};

/**
 * Format time for display
 */
export const formatTime = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};
