// src/utils/timeUtils.ts
export const format12Hour = (time24: string) => {
  if (!time24) return "—";
  const [h, m] = time24.split(":").map(Number);
  const hour = h % 12 === 0 ? 12 : h % 12;
  const period = h >= 12 ? "PM" : "AM";
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
};

export const formatTimeRange = (start: string, end: string) => {
  if (!start || !end) return "—";
  return `${format12Hour(start)} - ${format12Hour(end)}`;
};
