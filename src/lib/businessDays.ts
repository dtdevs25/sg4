export function getBusinessDaysInMonth(year: number, month: number): number {
  let count = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }
  return count;
}

export function getBusinessDaysPassedInMonth(year: number, month: number, maxDay: number): number {
  let count = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const limit = Math.min(maxDay, daysInMonth);
  for (let i = 1; i <= limit; i++) {
    const d = new Date(year, month, i);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }
  return count;
}
