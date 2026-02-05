import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const PH_TZ = "Asia/Manila";

/**
 * Format an ISO string to PH date (MM-DD-YYYY)
 * @param isoString
 * @returns string
 */
export function formatToPhilippineDate(isoString) {
  if (!isoString) return "";
  const datePH = dayjs.utc(isoString).tz(PH_TZ);
  const month = datePH.format("MM");
  const day = datePH.format("DD");
  const year = datePH.format("YYYY");
  return `${month}-${day}-${year}`;
}

/**
 * Format an ISO string to PH datetime (YYYY-MM-DD HH:mm:ss)
 * @param isoString
 * @returns string
 */
export function formatToPhilippineDateTime(isoString) {
  if (!isoString) return "";
  return dayjs.utc(isoString).tz(PH_TZ).format("YYYY-MM-DD HH:mm:ss");
}

/**
 * Get current PH time as dayjs object
 */
export function nowPH() {
  return dayjs().tz(PH_TZ);
}

/**
 * Get current PH datetime string (YYYY-MM-DD HH:mm:ss)
 */
export function currentPHDateTime() {
  return nowPH().format("YYYY-MM-DD HH:mm:ss");
}

/**
 * Convert a UTC ISO string to PH dayjs object
 * @param isoString
 */
export function toPH(isoString) {
  return dayjs.utc(isoString).tz(PH_TZ);
}

/**
 * Difference in minutes between two PH times
 * @param date1 ISO string or Date
 * @param date2 ISO string or Date
 */
export function diffMinutesPH(date1, date2) {
  return dayjs(date1).tz(PH_TZ).diff(dayjs(date2).tz(PH_TZ), "minute");
}
