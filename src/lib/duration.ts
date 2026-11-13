/** "15 min", "1 h", "1 h 30 min", "2 days", "1 week". */
export function formatMinutes(total: number) {
  if (total === 0) return "0 min";
  if (total % 10080 === 0) {
    const weeks = total / 10080;
    return `${weeks} week${weeks === 1 ? "" : "s"}`;
  }
  if (total % 1440 === 0) {
    const days = total / 1440;
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}
