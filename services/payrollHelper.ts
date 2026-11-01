export interface MonthlyCalculationResult {
  totalWorkedHours: number;
  totalAbsentHours: number;
  deductions: number;
  netPay: number;
  performanceScore: number;
  countableDays: number;
  stats: {
    worked: number;
    paidLeave: number;
    absent: number;
  };
}

/**
 * Returns YYYY-MM-DD using local time (prevents UTC date shifting).
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Safely extracts HH:MM from any ISO string, datetime, or time string
 * without being shifted by browser timezone differences.
 */
export function extractTimeString(isoOrTime?: string): string {
  if (!isoOrTime) return '';
  const trimmed = isoOrTime.trim();
  const match = trimmed.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const hours = match[1].padStart(2, '0');
    const minutes = match[2];
    return `${hours}:${minutes}`;
  }
  return '';
}

/**
 * Formats a time string or ISO string to user-friendly "HH:MM AM/PM"
 * preserving wall-clock values consistently across all timezones.
 */
export function formatWallClockTime(isoOrTime?: string): string {
  const timeStr = extractTimeString(isoOrTime);
  if (!timeStr) return '--:--';
  const [hStr, mStr] = timeStr.split(':');
  let hours = parseInt(hStr, 10);
  const minutes = mStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

/**
 * Calculates hours difference between two time or ISO strings.
 * Handles overnight shifts (crossing midnight) gracefully.
 */
export function calculateHoursBetween(startIsoOrTime?: string, endIsoOrTime?: string): number {
  if (!startIsoOrTime || !endIsoOrTime) return 0;
  const startTime = extractTimeString(startIsoOrTime);
  const endTime = extractTimeString(endIsoOrTime);
  if (!startTime || !endTime) return 0;

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);

  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;

  if (endMinutes < startMinutes) {
    // Crosses midnight
    endMinutes += 24 * 60;
  }

  const diffMinutes = endMinutes - startMinutes;
  const hours = diffMinutes / 60;
  return parseFloat(hours.toFixed(2));
}

/**
 * Determines uniform attendance status based on standard company rules:
 * - HOLIDAY / LEAVE explicit records preserved
 * - Clock in after 08:00 AM -> LATE
 * - Clock in at or before 08:00 AM -> PRESENT
 * - Explicit ABSENT -> ABSENT
 */
export function determineAttendanceStatus(record: {
  clockIn?: string;
  status?: string;
  notes?: string;
}): 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE' | 'HOLIDAY' {
  if (record.status === 'LEAVE') return 'LEAVE';
  if (record.status === 'HOLIDAY' || record.notes?.includes('HOLIDAY')) return 'HOLIDAY';

  if (record.clockIn) {
    const timeStr = extractTimeString(record.clockIn);
    if (timeStr) {
      const [h, m] = timeStr.split(':').map(Number);
      // Late threshold is 08:00 AM
      if (h > 8 || (h === 8 && m > 0)) {
        return 'LATE';
      }
      return 'PRESENT';
    }
  }

  if (record.status === 'LATE') return 'LATE';
  if (record.status === 'PRESENT') return 'PRESENT';
  if (record.status === 'ABSENT') return 'ABSENT';
  return (record.status as any) || 'ABSENT';
}

/**
 * Consolidates multiple attendance rows for the same employee on a given day.
 * Merges earliest clock-in, latest clock-out, and overtime records.
 */
export function consolidateDayRecords<T extends {
  status?: string;
  clockIn?: string;
  clockOut?: string;
  overtimeIn?: string;
  overtimeOut?: string;
  notes?: string;
  employeeId?: string;
  date?: string;
}>(records: T[]): (T & { status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE' | 'HOLIDAY' }) | null {
  if (!records || records.length === 0) return null;
  if (records.length === 1) {
    const r = records[0];
    return {
      ...r,
      status: determineAttendanceStatus(r)
    };
  }

  let bestClockIn: string | undefined = undefined;
  let bestClockOut: string | undefined = undefined;
  let bestOtIn: string | undefined = undefined;
  let bestOtOut: string | undefined = undefined;
  let resolvedStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE' | 'HOLIDAY' = 'ABSENT';
  let combinedNotes = '';

  for (const rec of records) {
    if (rec.notes) {
      if (!combinedNotes.includes(rec.notes)) {
        combinedNotes = combinedNotes ? `${combinedNotes}; ${rec.notes}` : rec.notes;
      }
    }

    const st = determineAttendanceStatus(rec);
    if (st === 'PRESENT') resolvedStatus = 'PRESENT';
    else if (st === 'LATE' && resolvedStatus !== 'PRESENT') resolvedStatus = 'LATE';
    else if (st === 'HOLIDAY' && resolvedStatus !== 'PRESENT' && resolvedStatus !== 'LATE') resolvedStatus = 'HOLIDAY';
    else if (st === 'LEAVE' && resolvedStatus === 'ABSENT') resolvedStatus = 'LEAVE';

    if (rec.clockIn) {
      if (!bestClockIn || rec.clockIn < bestClockIn) {
        bestClockIn = rec.clockIn;
      }
    }
    if (rec.clockOut) {
      if (!bestClockOut || rec.clockOut > bestClockOut) {
        bestClockOut = rec.clockOut;
      }
    }
    if (rec.overtimeIn) {
      if (!bestOtIn || rec.overtimeIn < bestOtIn) bestOtIn = rec.overtimeIn;
    }
    if (rec.overtimeOut) {
      if (!bestOtOut || rec.overtimeOut > bestOtOut) bestOtOut = rec.overtimeOut;
    }
  }

  const primary = records[0];
  return {
    ...primary,
    status: resolvedStatus,
    clockIn: bestClockIn,
    clockOut: bestClockOut,
    overtimeIn: bestOtIn,
    overtimeOut: bestOtOut,
    notes: combinedNotes || primary.notes
  };
}

export function calculateEmployeeMonthStats(
  employee: { salary: number },
  attendanceRecords: Array<{
    employeeId: string;
    date?: string;
    status?: string;
    clockIn?: string;
    clockOut?: string;
    overtimeIn?: string;
    overtimeOut?: string;
    notes?: string;
  }>,
  leaveRecords: Array<{ employeeId: string; startDate: string; endDate: string; status: string }>,
  monthIndex: number,
  year: number
): MonthlyCalculationResult {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const todayStr = getLocalDateString();
  const standardMonthlyHours = daysInMonth * 10;
  const hourlyRate = (employee.salary || 0) / (standardMonthlyHours > 0 ? standardMonthlyHours : 300);

  let totalWorkedHours = 0;
  let totalAbsentHours = 0;
  let totalScore = 0;
  let countableDays = 0;
  let paidLeaveHours = 0;

  const empAttendance = attendanceRecords.filter(a => {
    if (!a.date) return false;
    const cleanDate = a.date.substring(0, 10);
    const [y, m] = cleanDate.split('-');
    return parseInt(m, 10) - 1 === monthIndex && parseInt(y, 10) === year;
  });

  const empLeaves = leaveRecords.filter(l => {
    if (l.status !== 'APPROVED') return false;
    const start = new Date(l.startDate);
    const end = new Date(l.endDate);
    return start.getMonth() <= monthIndex && end.getMonth() >= monthIndex && start.getFullYear() === year;
  });

  const isDateOnLeave = (dateStr: string) => {
    const d = new Date(dateStr).getTime();
    return empLeaves.some(l => {
      const s = new Date(l.startDate).getTime();
      const e = new Date(l.endDate).getTime();
      return d >= s && d <= e;
    });
  };

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, monthIndex, d);
    const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isFriday = dateObj.getDay() === 5;
    const isPastDate = dateStr < todayStr;
    const isToday = dateStr === todayStr;

    const logsForDay = empAttendance.filter(a => a.date?.substring(0, 10) === dateStr);
    const log = consolidateDayRecords(logsForDay);
    const onLeave = isDateOnLeave(dateStr);

    if (isFriday) {
      totalWorkedHours += 10;
      paidLeaveHours += 10;
      // If employee worked on Friday, add actual worked hours
      if (log && log.clockIn && log.clockOut) {
        const extraHours = calculateHoursBetween(log.clockIn, log.clockOut);
        if (extraHours > 0 && extraHours < 24) {
          totalWorkedHours += extraHours;
        }
      }
    } else if (onLeave || (log && log.status === 'LEAVE')) {
      paidLeaveHours += 10;
      totalWorkedHours += 10;
      totalScore += 100;
      countableDays++;
    } else if (log && log.status === 'HOLIDAY') {
      paidLeaveHours += 10;
      totalWorkedHours += 10;
      totalScore += 100;
      countableDays++;
    } else if (log && log.clockIn) {
      let hoursWorked = 0;
      if (log.clockOut) {
        hoursWorked = calculateHoursBetween(log.clockIn, log.clockOut);
        if (hoursWorked <= 0 || hoursWorked > 24) {
          hoursWorked = 10;
        }
      } else if (isToday) {
        // Shift currently in progress today
        const now = new Date();
        const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const elapsed = calculateHoursBetween(log.clockIn, nowTime);
        hoursWorked = Math.min(10, Math.max(1, elapsed));
      } else {
        // Forgotten clock-out on a past day: default to full shift
        hoursWorked = 10;
      }

      // Add any overtime if recorded
      if (log.overtimeIn && log.overtimeOut) {
        const ot = calculateHoursBetween(log.overtimeIn, log.overtimeOut);
        if (ot > 0 && ot < 12) {
          hoursWorked += ot;
        }
      }

      totalWorkedHours += hoursWorked;
      if (hoursWorked < 10 && !isToday) {
        totalAbsentHours += (10 - hoursWorked);
      }

      const st = log.status;
      if (st === 'PRESENT') {
        totalScore += 100;
        countableDays++;
      } else if (st === 'LATE') {
        totalScore += 70;
        countableDays++;
      } else {
        totalScore += 100;
        countableDays++;
      }
    } else if (log && log.status === 'ABSENT') {
      if (isPastDate || (isToday && new Date().getHours() >= 17)) {
        totalAbsentHours += 10;
        totalScore += 0;
        countableDays++;
      }
    } else if (isPastDate) {
      // Past working day with no record
      totalAbsentHours += 10;
      totalScore += 0;
      countableDays++;
    }
  }

  const performanceScore = countableDays > 0 ? Math.round(totalScore / countableDays) : 100;
  const deductions = Math.round(totalAbsentHours * hourlyRate);
  const netPay = Math.max(0, Math.round((employee.salary || 0) - deductions));

  return {
    totalWorkedHours: parseFloat(totalWorkedHours.toFixed(1)),
    totalAbsentHours: parseFloat(totalAbsentHours.toFixed(1)),
    deductions,
    netPay,
    performanceScore,
    countableDays,
    stats: {
      worked: parseFloat(totalWorkedHours.toFixed(1)),
      paidLeave: paidLeaveHours,
      absent: parseFloat(totalAbsentHours.toFixed(1))
    }
  };
}

export type ReconciliationAnomalyType = 
  | 'OVERTIME_UNAPPROVED'
  | 'SHORTFALL'
  | 'MISSING_CLOCKOUT'
  | 'LATE_ARRIVAL'
  | 'EARLY_DEPARTURE'
  | 'ABSENT_UNEXCUSED'
  | 'WEEKLY_CAP_EXCEEDED'
  | 'BALANCED';

export interface WeeklyDailyRecord {
  dateStr: string;
  dayName: string;
  hours: number;
  hasOvertime: boolean;
  isFriday: boolean;
  isToday: boolean;
  isTargetDate: boolean;
}

export interface WeeklyHoursBreakdown {
  weeklyAllocatedHours: number; // e.g. 60.0h (10h/day * 6 days)
  weeklyLoggedHours: number;    // sum of hours worked in the work week
  weeklyExcessHours: number;    // weeklyLoggedHours - weeklyAllocatedHours
  weeklyPercentage: number;     // (weeklyLoggedHours / weeklyAllocatedHours) * 100
  isWeeklyExceeded: boolean;    // weeklyLoggedHours > weeklyAllocatedHours
  isWeeklyApproaching: boolean; // weeklyLoggedHours >= weeklyAllocatedHours * 0.9 && !isWeeklyExceeded
  dailyBreakdown: WeeklyDailyRecord[];
}

export interface ShiftReconciliationItem {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  avatar?: string;
  department?: string;
  branchName?: string;
  date: string;
  shiftId: string;
  shiftName: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  scheduledHours: number;
  lateThreshold: string;
  actualClockIn?: string;
  actualClockOut?: string;
  actualOvertimeIn?: string;
  actualOvertimeOut?: string;
  regularHoursWorked: number;
  overtimeHoursWorked: number;
  totalHoursWorked: number;
  varianceHours: number; // totalHoursWorked - scheduledHours
  anomalies: ReconciliationAnomalyType[];
  isApproved: boolean;
  approvalNote?: string;
  attendanceRecord?: any | null;
  status: 'APPROVED' | 'REQUIRES_REVIEW' | 'IN_SYNC';
  isActiveShiftToday: boolean;
  // Weekly hours tracking & alerts
  weeklyBreakdown: WeeklyHoursBreakdown;
  isWeeklyCapExceeded: boolean;
}

/**
 * Returns the 7 days of the standard work week (Saturday to Friday) for any given target date.
 */
export function getWorkWeekDays(targetDateStr: string): Array<{
  dateStr: string;
  dayName: string;
  dayNumber: number;
  isFriday: boolean;
  isToday: boolean;
  isTargetDate: boolean;
}> {
  const [y, m, d] = targetDateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);
  const dayOfWeek = targetDate.getDay(); // 0 is Sun, 5 is Fri, 6 is Sat
  // Work week in Somalia / East Africa starts on Saturday (day 6)
  const daysSinceSaturday = (dayOfWeek + 1) % 7;
  const satDate = new Date(targetDate);
  satDate.setDate(targetDate.getDate() - daysSinceSaturday);

  const days: Array<{
    dateStr: string;
    dayName: string;
    dayNumber: number;
    isFriday: boolean;
    isToday: boolean;
    isTargetDate: boolean;
  }> = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayStr = getLocalDateString();

  for (let i = 0; i < 7; i++) {
    const cur = new Date(satDate);
    cur.setDate(satDate.getDate() + i);
    const dateStr = getLocalDateString(cur);
    const curDay = cur.getDay();
    days.push({
      dateStr,
      dayName: dayNames[curDay],
      dayNumber: curDay,
      isFriday: curDay === 5,
      isToday: dateStr === todayStr,
      isTargetDate: dateStr === targetDateStr
    });
  }
  return days;
}

/**
 * Computes shift reconciliation details for an employee on a given date,
 * including automated calculation of weekly accumulated hours and cap exceedance.
 */
export function computeShiftReconciliation(
  employee: { id: string; name: string; employeeIdCode: string; avatar?: string; department?: string; shiftId?: string },
  date: string,
  attendanceRecords: Array<{
    id?: string;
    employeeId: string;
    date: string;
    status: string;
    clockIn?: string;
    clockOut?: string;
    overtimeIn?: string;
    overtimeOut?: string;
    notes?: string;
    deviceId?: string;
  }>,
  shifts: Array<{ id: string; name: string; startTime: string; endTime: string; lateThreshold: string }>,
  branchName?: string
): ShiftReconciliationItem {
  const assignedShift = shifts.find(s => s.id === employee.shiftId) || {
    id: 'default',
    name: 'Standard Morning',
    startTime: '07:00',
    endTime: '17:00',
    lateThreshold: '08:00'
  };

  let scheduledHours = calculateHoursBetween(assignedShift.startTime, assignedShift.endTime);
  if (scheduledHours <= 0) scheduledHours = 10.0;

  const dayRecords = attendanceRecords.filter(a => a.employeeId === employee.id && a.date?.substring(0, 10) === date);
  const record = consolidateDayRecords(dayRecords);

  const todayStr = getLocalDateString();
  const isToday = date === todayStr;
  const isPastDate = date < todayStr;

  const clockIn = record?.clockIn;
  const clockOut = record?.clockOut;
  const overtimeIn = record?.overtimeIn;
  const overtimeOut = record?.overtimeOut;

  const isActiveShiftToday = Boolean(isToday && clockIn && !clockOut && record?.status !== 'ABSENT');

  let regularHours = 0;
  if (clockIn && clockOut) {
    regularHours = calculateHoursBetween(clockIn, clockOut);
  } else if (isActiveShiftToday) {
    const now = new Date();
    const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const elapsed = calculateHoursBetween(clockIn, nowTime);
    regularHours = Math.max(0.1, Math.min(scheduledHours, elapsed));
  } else if (record?.status === 'HOLIDAY' || record?.status === 'LEAVE') {
    regularHours = scheduledHours;
  } else if (clockIn && !clockOut && isPastDate) {
    // Missing clock-out in past: defaulted to scheduled hours
    regularHours = scheduledHours;
  }

  let overtimeHours = 0;
  if (overtimeIn && overtimeOut) {
    overtimeHours = calculateHoursBetween(overtimeIn, overtimeOut);
  } else if (regularHours > scheduledHours) {
    overtimeHours = parseFloat((regularHours - scheduledHours).toFixed(2));
    regularHours = scheduledHours;
  }

  const totalHoursWorked = parseFloat((regularHours + overtimeHours).toFixed(2));
  const varianceHours = parseFloat((totalHoursWorked - scheduledHours).toFixed(2));

  // --- WEEKLY ACCUMULATED HOURS CALCULATION ---
  const workWeekDays = getWorkWeekDays(date);
  let weeklyLoggedHours = 0;
  const dailyBreakdown: WeeklyDailyRecord[] = [];

  // Standard work week = 6 working days (Sat to Thu) * scheduled hours per day
  const weeklyAllocatedHours = parseFloat((scheduledHours * 6).toFixed(1));

  workWeekDays.forEach(day => {
    const dayPunches = attendanceRecords.filter(a => a.employeeId === employee.id && a.date?.substring(0, 10) === day.dateStr);
    const dayRec = consolidateDayRecords(dayPunches);
    let dayTotalHours = 0;
    let dayHasOT = false;

    if (dayRec && dayRec.clockIn) {
      if (dayRec.clockOut) {
        dayTotalHours = calculateHoursBetween(dayRec.clockIn, dayRec.clockOut);
      } else if (day.isToday) {
        const now = new Date();
        const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        dayTotalHours = Math.max(0.1, calculateHoursBetween(dayRec.clockIn, nowTime));
      } else {
        dayTotalHours = scheduledHours;
      }

      if (dayRec.overtimeIn && dayRec.overtimeOut) {
        const ot = calculateHoursBetween(dayRec.overtimeIn, dayRec.overtimeOut);
        dayTotalHours += ot;
        dayHasOT = true;
      } else if (dayTotalHours > scheduledHours) {
        dayHasOT = true;
      }
    } else if (dayRec?.status === 'HOLIDAY' || dayRec?.status === 'LEAVE') {
      dayTotalHours = 0; // Excused leave doesn't add to worked overtime cap
    }

    dayTotalHours = parseFloat(dayTotalHours.toFixed(2));
    weeklyLoggedHours += dayTotalHours;

    dailyBreakdown.push({
      dateStr: day.dateStr,
      dayName: day.dayName,
      hours: dayTotalHours,
      hasOvertime: dayHasOT,
      isFriday: day.isFriday,
      isToday: day.isToday,
      isTargetDate: day.isTargetDate
    });
  });

  weeklyLoggedHours = parseFloat(weeklyLoggedHours.toFixed(1));
  const weeklyExcessHours = parseFloat((weeklyLoggedHours - weeklyAllocatedHours).toFixed(1));
  const weeklyPercentage = Math.round((weeklyLoggedHours / (weeklyAllocatedHours || 60)) * 100);
  const isWeeklyExceeded = weeklyLoggedHours > weeklyAllocatedHours;
  const isWeeklyApproaching = !isWeeklyExceeded && weeklyLoggedHours >= (weeklyAllocatedHours * 0.9);

  const weeklyBreakdown: WeeklyHoursBreakdown = {
    weeklyAllocatedHours,
    weeklyLoggedHours,
    weeklyExcessHours: Math.max(0, weeklyExcessHours),
    weeklyPercentage,
    isWeeklyExceeded,
    isWeeklyApproaching,
    dailyBreakdown
  };

  const anomalies: ReconciliationAnomalyType[] = [];

  const isApproved = Boolean(
    record?.notes?.includes('[APPROVED:') || 
    record?.notes?.includes('[WAIVED:')
  );
  const approvalMatch = record?.notes?.match(/\[(APPROVED|WAIVED):[^\]]+\]/);
  const approvalNote = approvalMatch ? approvalMatch[0] : undefined;

  const isHolidayOrLeave = record?.status === 'HOLIDAY' || record?.status === 'LEAVE';

  if (!isHolidayOrLeave) {
    if (record?.status === 'ABSENT' || (!record && isPastDate)) {
      anomalies.push('ABSENT_UNEXCUSED');
    }

    if (clockIn && !clockOut && !isToday) {
      anomalies.push('MISSING_CLOCKOUT');
    }

    if (clockIn) {
      const inTime = extractTimeString(clockIn);
      const thresholdTime = extractTimeString(assignedShift.lateThreshold) || '08:00';
      if (inTime > thresholdTime) {
        anomalies.push('LATE_ARRIVAL');
      }
    }

    if (clockOut) {
      const outTime = extractTimeString(clockOut);
      const shiftEndTime = extractTimeString(assignedShift.endTime) || '17:00';
      const [oh, om] = outTime.split(':').map(Number);
      const [seh, sem] = shiftEndTime.split(':').map(Number);
      const outMins = oh * 60 + om;
      const seMins = seh * 60 + sem;
      if (outMins < seMins - 15) {
        anomalies.push('EARLY_DEPARTURE');
      }
    }

    if (overtimeHours > 0 || varianceHours > 0.25) {
      if (!isApproved) {
        anomalies.push('OVERTIME_UNAPPROVED');
      }
    }

    if (varianceHours < -0.25 && !isActiveShiftToday) {
      if (!isApproved) {
        anomalies.push('SHORTFALL');
      }
    }

    // Weekly hours cap exceedance anomaly
    if (isWeeklyExceeded) {
      if (!isApproved) {
        anomalies.push('WEEKLY_CAP_EXCEEDED');
      }
    }
  }

  if (anomalies.length === 0) {
    anomalies.push('BALANCED');
  }

  let status: 'APPROVED' | 'REQUIRES_REVIEW' | 'IN_SYNC' = 'IN_SYNC';
  if (isApproved) {
    status = 'APPROVED';
  } else if (anomalies.some(a => a !== 'BALANCED')) {
    status = 'REQUIRES_REVIEW';
  }

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    employeeCode: employee.employeeIdCode,
    avatar: employee.avatar,
    department: employee.department,
    branchName,
    date,
    shiftId: assignedShift.id,
    shiftName: assignedShift.name,
    scheduledStartTime: assignedShift.startTime,
    scheduledEndTime: assignedShift.endTime,
    scheduledHours,
    lateThreshold: assignedShift.lateThreshold,
    actualClockIn: clockIn,
    actualClockOut: clockOut,
    actualOvertimeIn: overtimeIn,
    actualOvertimeOut: overtimeOut,
    regularHoursWorked: parseFloat(regularHours.toFixed(2)),
    overtimeHoursWorked: parseFloat(overtimeHours.toFixed(2)),
    totalHoursWorked,
    varianceHours,
    anomalies,
    isApproved,
    approvalNote,
    attendanceRecord: record,
    status,
    isActiveShiftToday,
    weeklyBreakdown,
    isWeeklyCapExceeded: isWeeklyExceeded
  };
}

export interface EmployeeWeeklyWageEstimate {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department?: string;
  branchName?: string;
  avatar?: string;
  monthlySalary: number;
  hourlyRate: number;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  allocatedHours: number;
  regularWages: number;
  overtimeWages: number;
  totalWagesDue: number;
  isApproved: boolean;
  isWeeklyExceeded: boolean;
  status: 'APPROVED' | 'REQUIRES_REVIEW' | 'IN_SYNC';
}

export interface WeeklyPayrollSummary {
  weekDateRange: string;
  totalEstimatedWages: number;
  totalRegularWages: number;
  totalOvertimeWages: number;
  totalReconciledHours: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
  staffCount: number;
  averageHourlyRate: number;
  staffEstimates: EmployeeWeeklyWageEstimate[];
}

/**
 * Calculates estimated weekly payroll wages due based on reconciled attendance hours
 * and each employee's base monthly salary / hourly rate.
 */
export function calculateWeeklyPayrollSummary(
  reconciliationItems: ShiftReconciliationItem[],
  employees: Array<{ id: string; salary: number; department?: string }>
): WeeklyPayrollSummary {
  const staffEstimates: EmployeeWeeklyWageEstimate[] = [];
  let totalEstimatedWages = 0;
  let totalRegularWages = 0;
  let totalOvertimeWages = 0;
  let totalRegularHours = 0;
  let totalOvertimeHours = 0;
  let totalHourlyRateSum = 0;

  for (const item of reconciliationItems) {
    const emp = employees.find(e => e.id === item.employeeId);
    const monthlySalary = emp?.salary || 0;
    // Standard 30-day month with 10h/day = 300 monthly hours
    const hourlyRate = parseFloat((monthlySalary > 0 ? monthlySalary / 300 : 2.5).toFixed(2));
    totalHourlyRateSum += hourlyRate;

    const allocatedHours = item.weeklyBreakdown.weeklyAllocatedHours || 60;
    const loggedHours = item.weeklyBreakdown.weeklyLoggedHours || 0;

    const regularHours = Math.min(allocatedHours, loggedHours);
    const overtimeHours = Math.max(0, loggedHours - allocatedHours);

    const regularWages = parseFloat((regularHours * hourlyRate).toFixed(2));
    // Overtime paid at standard 1.5x hourly rate
    const overtimeWages = parseFloat((overtimeHours * (hourlyRate * 1.5)).toFixed(2));
    const totalWagesDue = parseFloat((regularWages + overtimeWages).toFixed(2));

    totalRegularWages += regularWages;
    totalOvertimeWages += overtimeWages;
    totalEstimatedWages += totalWagesDue;
    totalRegularHours += regularHours;
    totalOvertimeHours += overtimeHours;

    staffEstimates.push({
      employeeId: item.employeeId,
      employeeName: item.employeeName,
      employeeCode: item.employeeCode,
      department: item.department,
      branchName: item.branchName,
      avatar: item.avatar,
      monthlySalary,
      hourlyRate,
      regularHours: parseFloat(regularHours.toFixed(1)),
      overtimeHours: parseFloat(overtimeHours.toFixed(1)),
      totalHours: parseFloat(loggedHours.toFixed(1)),
      allocatedHours,
      regularWages,
      overtimeWages,
      totalWagesDue,
      isApproved: item.isApproved,
      isWeeklyExceeded: item.isWeeklyCapExceeded,
      status: item.status
    });
  }

  const staffCount = reconciliationItems.length;
  const averageHourlyRate = staffCount > 0 ? parseFloat((totalHourlyRateSum / staffCount).toFixed(2)) : 0;
  const totalReconciledHours = parseFloat((totalRegularHours + totalOvertimeHours).toFixed(1));

  // Determine week range label (e.g. from dailyBreakdown)
  let weekDateRange = '';
  if (reconciliationItems[0]?.weeklyBreakdown.dailyBreakdown.length > 0) {
    const days = reconciliationItems[0].weeklyBreakdown.dailyBreakdown;
    const firstDay = days[0];
    const lastDay = days[days.length - 1];
    weekDateRange = `${firstDay.dayName} (${firstDay.dateStr}) – ${lastDay.dayName} (${lastDay.dateStr})`;
  }

  return {
    weekDateRange,
    totalEstimatedWages: parseFloat(totalEstimatedWages.toFixed(2)),
    totalRegularWages: parseFloat(totalRegularWages.toFixed(2)),
    totalOvertimeWages: parseFloat(totalOvertimeWages.toFixed(2)),
    totalReconciledHours,
    totalRegularHours: parseFloat(totalRegularHours.toFixed(1)),
    totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(1)),
    staffCount,
    averageHourlyRate,
    staffEstimates
  };
}

