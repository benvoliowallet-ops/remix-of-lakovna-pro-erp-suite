// Utility functions for working days calculations
// Slovak holidays for 2024-2026 (fixed holidays)
const SLOVAK_HOLIDAYS = [
  '01-01', // Deň vzniku Slovenskej republiky
  '01-06', // Traja králi
  '05-01', // Sviatok práce
  '05-08', // Deň víťazstva nad fašizmom
  '07-05', // Sviatok sv. Cyrila a Metoda
  '08-29', // Výročie SNP
  '09-01', // Deň Ústavy SR
  '09-15', // Sedembolestná Panna Mária
  '11-01', // Sviatok všetkých svätých
  '11-17', // Deň boja za slobodu a demokraciu
  '12-24', // Štedrý deň
  '12-25', // Prvý sviatok vianočný
  '12-26', // Druhý sviatok vianočný
];

// Easter dates (pre-calculated for 2024-2030)
const EASTER_HOLIDAYS: Record<number, string[]> = {
  2024: ['03-29', '04-01'], // Veľký piatok, Veľkonočný pondelok
  2025: ['04-18', '04-21'],
  2026: ['04-03', '04-06'],
  2027: ['03-26', '03-29'],
  2028: ['04-14', '04-17'],
  2029: ['03-30', '04-02'],
  2030: ['04-19', '04-22'],
};

/**
 * Check if a date is a Slovak holiday
 */
export function isSlovakHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  
  // Check fixed holidays
  if (SLOVAK_HOLIDAYS.includes(monthDay)) {
    return true;
  }
  
  // Check Easter holidays
  const easterDates = EASTER_HOLIDAYS[year];
  if (easterDates && easterDates.includes(monthDay)) {
    return true;
  }
  
  return false;
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Check if a date is a working day
 */
export function isWorkingDay(date: Date): boolean {
  return !isWeekend(date) && !isSlovakHoliday(date);
}

/**
 * Calculate working days until a deadline from today
 * Returns negative number if past deadline
 */
export function getWorkingDaysUntil(deadline: Date | string | null): number | null {
  if (!deadline) return null;
  
  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);
  
  const isPast = deadlineDate < today;
  let startDate = isPast ? deadlineDate : today;
  let endDate = isPast ? today : deadlineDate;
  
  let workingDays = 0;
  const currentDate = new Date(startDate);
  
  while (currentDate < endDate) {
    currentDate.setDate(currentDate.getDate() + 1);
    if (isWorkingDay(currentDate)) {
      workingDays++;
    }
  }
  
  return isPast ? -workingDays : workingDays;
}

/**
 * Check if deadline is critically soon (1 working day or less)
 */
export function isDeadlineCritical(deadline: Date | string | null): boolean {
  const workingDays = getWorkingDaysUntil(deadline);
  if (workingDays === null) return false;
  return workingDays <= 1 && workingDays >= 0;
}

/**
 * Check if deadline is soon (2-3 working days)
 */
export function isDeadlineSoon(deadline: Date | string | null): boolean {
  const workingDays = getWorkingDaysUntil(deadline);
  if (workingDays === null) return false;
  return workingDays <= 3 && workingDays > 1;
}

/**
 * Check if deadline is overdue
 */
export function isDeadlineOverdue(deadline: Date | string | null): boolean {
  const workingDays = getWorkingDaysUntil(deadline);
  if (workingDays === null) return false;
  return workingDays < 0;
}

/**
 * Get deadline status for visual indicators
 */
export type DeadlineStatus = 'critical' | 'soon' | 'overdue' | 'ok' | 'none';

export function getDeadlineStatus(deadline: Date | string | null): DeadlineStatus {
  if (!deadline) return 'none';
  
  if (isDeadlineOverdue(deadline)) return 'overdue';
  if (isDeadlineCritical(deadline)) return 'critical';
  if (isDeadlineSoon(deadline)) return 'soon';
  return 'ok';
}
