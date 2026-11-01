import React, { useState, useEffect, useMemo } from 'react';
import { Employee, Attendance, Xarun, Branch, Shift } from '../types';
import { API } from '../services/api';
import { 
  getLocalDateString, 
  extractTimeString, 
  formatWallClockTime, 
  determineAttendanceStatus, 
  consolidateDayRecords,
  computeShiftReconciliation,
  ShiftReconciliationItem,
  calculateHoursBetween,
  getWorkWeekDays,
  calculateWeeklyPayrollSummary,
  WeeklyPayrollSummary
} from '../services/payrollHelper';

interface HRMAttendanceTrackerProps {
  employees: Employee[];
  xarumo: Xarun[];
  branches: Branch[];
  branch?: string;
  hardwareUrl?: string; // Prop for status checking
}

const HRMAttendanceTracker: React.FC<HRMAttendanceTrackerProps> = ({ 
  employees, xarumo, branches, branch = 'all', hardwareUrl
}) => {
  const [activeTab, setActiveTab] = useState<'ATTENDANCE_LOG' | 'SHIFT_RECONCILIATION'>('SHIFT_RECONCILIATION');
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [selectedXarunId, setSelectedXarunId] = useState<string>('all');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branch);
  const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
  const [weekAttendanceData, setWeekAttendanceData] = useState<Attendance[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [reconFilter, setReconFilter] = useState<'ALL' | 'REVIEW_NEEDED' | 'WEEKLY_EXCEEDED' | 'OVERTIME' | 'SHORTFALL' | 'APPROVED'>('ALL');
  const [showPayrollBreakdown, setShowPayrollBreakdown] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Sync prop changes
  useEffect(() => {
    setSelectedBranchId(branch);
  }, [branch]);

  const [, setPreviousAttendanceData] = useState<Record<string, Attendance[]>>({});
  const [, setLoading] = useState(false);
  
  // Status State
  const [serviceStatus, setServiceStatus] = useState<'ONLINE' | 'OFFLINE' | 'CHECKING'>('CHECKING');
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [serviceLogs, setServiceLogs] = useState<string[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<{empId: string, record: Attendance | null} | null>(null);
  const [editForm, setEditForm] = useState<{status: string, clockIn: string, clockOut: string, notes: string}>({
      status: 'PRESENT', clockIn: '', clockOut: '', notes: ''
  });

  // Load shifts on mount
  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const data = await API.shifts.getAll();
        setShifts(data || []);
      } catch (err) {
        console.error("Failed to load shifts:", err);
      }
    };
    fetchShifts();
  }, []);

  // Clear feedback toast after 4s
  useEffect(() => {
    if (actionFeedback) {
      const timer = setTimeout(() => setActionFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionFeedback]);

  useEffect(() => {
    loadAttendance();
    const interval = setInterval(loadAttendance, 10000);
    return () => clearInterval(interval);
  }, [selectedDate, employees]);

  // Status Polling
  useEffect(() => {
    if (!hardwareUrl) {
      setServiceStatus('OFFLINE');
      return;
    }
    
    const checkService = async () => {
        try {
            const res = await fetch(`${hardwareUrl}/`);
            if (res.ok) setServiceStatus('ONLINE');
            else setServiceStatus('OFFLINE');
        } catch { 
            setServiceStatus('OFFLINE'); 
        }
    };
    
    checkService();
    const timer = setInterval(checkService, 5000);
    return () => clearInterval(timer);
  }, [hardwareUrl]);

  const isFriday = (dateStr: string) => {
      if (!dateStr) return false;
      const clean = dateStr.substring(0, 10);
      const [y, m, d] = clean.split('-').map(Number);
      return new Date(y, m - 1, d).getDay() === 5; // 5 is Friday
  };

  const fetchLogs = async () => {
    if (!hardwareUrl) return;
    setLogsLoading(true);
    try {
        const res = await fetch(`${hardwareUrl}/logs`);
        const data = await res.json();
        setServiceLogs(data.logs || []);
    } catch (e) {
        console.error(e);
        setServiceLogs(["Failed to fetch logs. Service might be down."]);
    } finally {
        setLogsLoading(false);
    }
  };

  const triggerAbsentCheck = async () => {
    if (!hardwareUrl) return;
    if (!confirm("Ma hubtaa inaad hada socodsiiso 'Absent Check'?\nTani waxay ABSENT ka dhigaysaa cid kasta oo aan imaan maanta.")) return;
    
    try {
        const res = await fetch(`${hardwareUrl}/trigger-absent`, { method: 'POST' });
        if (res.ok) {
            alert("Amar waa la diray! Hubi Logs-ka.");
            fetchLogs();
            setTimeout(loadAttendance, 2000);
        } else {
            alert("Khalad ayaa dhacay markii la dirayay amarka.");
        }
    } catch (e) {
        alert("Cilad xiriirka server-ka.");
    }
  };

  const loadAttendance = async () => {
    setLoading(true);
    let data = await API.attendance.getByDate(selectedDate);
    
    // Auto-mark absent for missing records on non-Fridays (only for past dates)
    const isFri = isFriday(selectedDate);
    const todayStr = getLocalDateString();
    const isPastDate = selectedDate < todayStr;
    
    // CLEANUP: If selectedDate is today, delete any ABSENT records that have no clockIn
    if (selectedDate === todayStr) {
        const autoAbsents = data.filter(a => a.status === 'ABSENT' && !a.clockIn);
        if (autoAbsents.length > 0) {
            for (const a of autoAbsents) {
                if (a.id) await API.attendance.delete(a.id);
            }
            data = await API.attendance.getByDate(selectedDate);
        }
    }

    if (!isFri && isPastDate) {
        const missingEmployees = employees.filter(emp => !data.some(a => a.employeeId === emp.id));
        if (missingEmployees.length > 0) {
            for (const emp of missingEmployees) {
                await API.attendance.save({
                    employeeId: emp.id,
                    date: selectedDate,
                    status: 'ABSENT',
                    deviceId: 'SYSTEM-AUTO'
                });
            }
            data = await API.attendance.getByDate(selectedDate);
        }
    }

    setAttendanceData(data);

    // Fetch full work week attendance (Saturday to Friday) for weekly cap monitoring & payroll summary
    const workWeekDays = getWorkWeekDays(selectedDate);
    try {
      const weekPromises = workWeekDays.map(d => API.attendance.getByDate(d.dateStr));
      const weekResults = await Promise.all(weekPromises);
      const combinedWeek = weekResults.flat();
      setWeekAttendanceData(combinedWeek);
    } catch (err) {
      console.error("Failed to load full work week attendance:", err);
    }

    // Fetch attendance for the last 3 days for warning streak logic
    const [selY, selM, selD] = selectedDate.split('-').map(Number);
    const baseDate = new Date(selY, selM - 1, selD);
    const prevDaysData: Record<string, Attendance[]> = {};
    for (let i = 1; i <= 3; i++) {
      const prevDate = new Date(baseDate);
      prevDate.setDate(baseDate.getDate() - i);
      const prevDateStr = getLocalDateString(prevDate);
      prevDaysData[prevDateStr] = await API.attendance.getByDate(prevDateStr);
    }
    setPreviousAttendanceData(prevDaysData);

    // Apply warning streak logic
    for (const employee of employees) {
      let consecutiveAbsences = 0;

      for (let i = 0; i < 3; i++) {
        const checkDate = new Date(baseDate);
        checkDate.setDate(baseDate.getDate() - i);
        const checkDateStr = getLocalDateString(checkDate);
        const dailyAttendance = (i === 0 ? data : prevDaysData[checkDateStr]) || [];
        const empDailyRecords = dailyAttendance.filter(a => a.employeeId === employee.id);
        const employeeRecord = consolidateDayRecords(empDailyRecords);

        const isCheckFriday = checkDate.getDay() === 5;
        
        if (isCheckFriday || employeeRecord?.status === 'HOLIDAY' || employeeRecord?.status === 'LEAVE') {
            if (employeeRecord?.status === 'PRESENT' || employeeRecord?.status === 'LATE') {
                break;
            }
            continue;
        }

        if (employeeRecord?.status === 'ABSENT' || (!employeeRecord && checkDateStr < todayStr)) {
          consecutiveAbsences++;
        } else {
          break;
        }
      }

      if (consecutiveAbsences >= 3 && !employee.warning) {
        const warningMsg = 'Digniin: Maqnaansho isku xigta 3 maalmood';
        await API.employees.save({ ...employee, warning: warningMsg, consecutiveAbsences: 3 });
      } else if (consecutiveAbsences < 3 && employee.warning) {
        await API.employees.save({ ...employee, warning: undefined, consecutiveAbsences: 0 });
      }
    }

    setLoading(false);
  };

  const openEditModal = (empId: string, record: Attendance | null | undefined) => {
      setEditingRecord({ empId, record: record || null });
      if (record) {
          setEditForm({
              status: record.status,
              clockIn: extractTimeString(record.clockIn),
              clockOut: extractTimeString(record.clockOut),
              notes: record.notes || ''
          });
      } else {
          setEditForm({ status: 'PRESENT', clockIn: '08:00', clockOut: '17:00', notes: '' });
      }
  };

  const handleSaveEdit = async () => {
      if (!editingRecord) return;
      
      const formatDateTime = (timeStr: string) => {
          if (!timeStr) return undefined;
          return `${selectedDate}T${timeStr}:00`;
      };

      const clockInVal = formatDateTime(editForm.clockIn);
      const clockOutVal = formatDateTime(editForm.clockOut);
      
      let resolvedStatus = editForm.status;
      if (editForm.status === 'PRESENT' || editForm.status === 'LATE') {
        resolvedStatus = determineAttendanceStatus({ clockIn: clockInVal, status: editForm.status });
      }

      const newRecord: Partial<Attendance> = {
          id: editingRecord.record?.id,
          employeeId: editingRecord.empId,
          date: selectedDate,
          status: resolvedStatus as any,
          clockIn: clockInVal,
          clockOut: clockOutVal,
          notes: editForm.notes,
          deviceId: editingRecord.record?.deviceId || 'MANUAL-EDIT'
      };

      await API.attendance.save(newRecord);
      setEditingRecord(null);
      setActionFeedback("✅ Diiwaanka si sax ah ayaa wax looga beddelay!");
      await loadAttendance();
  };

  const handleMarkAsHoliday = async () => {
      if (!window.confirm(`Ma hubtaa inaad maalintaan (${selectedDate}) ka dhigto fasax (Holiday) dhammaan shaqaalaha?`)) return;
      
      setLoading(true);
      try {
          for (const emp of filteredEmployees) {
              const existingRecord = attendanceData.find(a => a.employeeId === emp.id);
              const newRecord: Partial<Attendance> = {
                  id: existingRecord?.id,
                  employeeId: emp.id,
                  date: selectedDate,
                  status: 'HOLIDAY',
                  notes: 'Public Holiday / Ciid',
                  deviceId: existingRecord?.deviceId || 'SYSTEM-HOLIDAY'
              };
              await API.attendance.save(newRecord);
          }
          await loadAttendance();
          setActionFeedback('🌴 Maalintaan waxaa loo diiwaan geliyay fasax guud (Holiday).');
      } catch (error: any) {
          console.error("Error marking holiday:", error);
          alert(`Cilad ayaa dhacday: ${error.message || error}`);
      } finally {
          setLoading(false);
      }
  };

  const handleRemoveHoliday = async () => {
      if (!window.confirm(`Ma hubtaa inaad fasaxa ka qaaddo maalintaan (${selectedDate})?`)) return;
      
      setLoading(true);
      try {
          for (const emp of filteredEmployees) {
              const record = attendanceData.find(a => a.employeeId === emp.id);
              if (record && record.status === 'HOLIDAY') {
                  if (record.clockIn) {
                      await API.attendance.save({
                          ...record,
                          status: 'PRESENT',
                          notes: record.notes?.replace('HOLIDAY - Public Holiday / Ciid', '')?.replace('HOLIDAY - ', '')?.replace('HOLIDAY', '')?.trim() || ''
                      });
                  } else {
                      if (record.id) {
                          await API.attendance.delete(record.id);
                      }
                  }
              }
          }
          await loadAttendance();
          setActionFeedback('Fasaxii guud waa laga qaaday maalintaan.');
      } catch (error: any) {
          console.error("Error removing holiday:", error);
          alert(`Cilad ayaa dhacday: ${error.message || error}`);
      } finally {
          setLoading(false);
      }
  };

  // --- RECONCILIATION APPROVAL WORKFLOW HANDLERS ---
  const handleApproveOvertime = async (item: ShiftReconciliationItem) => {
    try {
      const todayStr = getLocalDateString();
      const existing = item.attendanceRecord;
      const cleanNotes = (existing?.notes || '').replace(/\[(APPROVED|WAIVED):[^\]]+\]/g, '').trim();
      const otTag = `[APPROVED: OT +${item.overtimeHoursWorked.toFixed(1)}h by Management ${todayStr}]`;
      const newNotes = cleanNotes ? `${cleanNotes} ${otTag}` : otTag;

      await API.attendance.save({
        id: existing?.id,
        employeeId: item.employeeId,
        date: item.date,
        status: (existing?.status as any) || 'PRESENT',
        clockIn: item.actualClockIn,
        clockOut: item.actualClockOut,
        overtimeIn: item.actualOvertimeIn,
        overtimeOut: item.actualOvertimeOut,
        notes: newNotes,
        deviceId: existing?.deviceId || 'MANUAL-RECON'
      });

      setActionFeedback(`✅ Saacadaha dheeraadka ah (+${item.overtimeHoursWorked.toFixed(1)}h) ee ${item.employeeName} si rasmi ah ayaa loo ansixiyay!`);
      await loadAttendance();
    } catch (error: any) {
      console.error("Error approving overtime:", error);
      alert(`Cilad ayaa dhacday: ${error.message || error}`);
    }
  };

  const handleApproveWeeklyOvertime = async (item: ShiftReconciliationItem) => {
    try {
      const todayStr = getLocalDateString();
      const existing = item.attendanceRecord;
      const cleanNotes = (existing?.notes || '').replace(/\[(APPROVED|WAIVED):[^\]]+\]/g, '').trim();
      const weeklyTag = `[APPROVED: Weekly OT +${item.weeklyBreakdown.weeklyExcessHours.toFixed(1)}h exceeding ${item.weeklyBreakdown.weeklyAllocatedHours}h limit by Management ${todayStr}]`;
      const newNotes = cleanNotes ? `${cleanNotes} ${weeklyTag}` : weeklyTag;

      await API.attendance.save({
        id: existing?.id,
        employeeId: item.employeeId,
        date: item.date,
        status: (existing?.status as any) || 'PRESENT',
        clockIn: item.actualClockIn,
        clockOut: item.actualClockOut,
        overtimeIn: item.actualOvertimeIn,
        overtimeOut: item.actualOvertimeOut,
        notes: newNotes,
        deviceId: existing?.deviceId || 'MANUAL-WEEKLY-RECON'
      });

      setActionFeedback(`🚨 Saacadaha dheeraadka ah ee toddobaadka (+${item.weeklyBreakdown.weeklyExcessHours.toFixed(1)}h) ee ${item.employeeName} si rasmi ah ayaa loo ansixiyay!`);
      await loadAttendance();
    } catch (error: any) {
      console.error("Error approving weekly overtime:", error);
      alert(`Cilad ayaa dhacday: ${error.message || error}`);
    }
  };

  const handleWaiveShortfall = async (item: ShiftReconciliationItem) => {
    try {
      const todayStr = getLocalDateString();
      const existing = item.attendanceRecord;
      const cleanNotes = (existing?.notes || '').replace(/\[(APPROVED|WAIVED):[^\]]+\]/g, '').trim();
      const waiveTag = `[WAIVED: Shortfall of ${Math.abs(item.varianceHours).toFixed(1)}h excused by Management ${todayStr}]`;
      const newNotes = cleanNotes ? `${cleanNotes} ${waiveTag}` : waiveTag;

      await API.attendance.save({
        id: existing?.id,
        employeeId: item.employeeId,
        date: item.date,
        status: (existing?.status as any) || 'PRESENT',
        clockIn: item.actualClockIn,
        clockOut: item.actualClockOut,
        overtimeIn: item.actualOvertimeIn,
        overtimeOut: item.actualOvertimeOut,
        notes: newNotes,
        deviceId: existing?.deviceId || 'MANUAL-RECON'
      });

      setActionFeedback(`✅ Dhimista saacadaha ee ${item.employeeName} waa la cafiyay (Excused)!`);
      await loadAttendance();
    } catch (error: any) {
      console.error("Error waiving shortfall:", error);
      alert(`Cilad ayaa dhacday: ${error.message || error}`);
    }
  };

  const handleApproveReconciliation = async (item: ShiftReconciliationItem) => {
    try {
      const todayStr = getLocalDateString();
      const existing = item.attendanceRecord;
      const cleanNotes = (existing?.notes || '').replace(/\[(APPROVED|WAIVED):[^\]]+\]/g, '').trim();
      const reconTag = `[APPROVED: Shift reconciled by Management ${todayStr}]`;
      const newNotes = cleanNotes ? `${cleanNotes} ${reconTag}` : reconTag;

      await API.attendance.save({
        id: existing?.id,
        employeeId: item.employeeId,
        date: item.date,
        status: (existing?.status as any) || 'PRESENT',
        clockIn: item.actualClockIn,
        clockOut: item.actualClockOut,
        overtimeIn: item.actualOvertimeIn,
        overtimeOut: item.actualOvertimeOut,
        notes: newNotes,
        deviceId: existing?.deviceId || 'MANUAL-RECON'
      });

      setActionFeedback(`✅ Shift-ka ${item.employeeName} si rasmi ah ayaa loo saxiixay (Signed Off).`);
      await loadAttendance();
    } catch (error: any) {
      console.error("Error approving reconciliation:", error);
      alert(`Cilad ayaa dhacday: ${error.message || error}`);
    }
  };

  const handleRevokeApproval = async (item: ShiftReconciliationItem) => {
    try {
      const existing = item.attendanceRecord;
      if (!existing) return;
      const cleanNotes = (existing.notes || '').replace(/\[(APPROVED|WAIVED):[^\]]+\]/g, '').trim();

      await API.attendance.save({
        ...existing,
        notes: cleanNotes
      });

      setActionFeedback(`🔄 Ansixintii dib baa looga laabtay shaqaalaha ${item.employeeName}.`);
      await loadAttendance();
    } catch (error: any) {
      console.error("Error revoking approval:", error);
      alert(`Cilad ayaa dhacday: ${error.message || error}`);
    }
  };

  const handleBulkApprove = async (pendingItems: ShiftReconciliationItem[]) => {
    if (pendingItems.length === 0) return;
    if (!window.confirm(`Ma hubtaa inaad hal mar ansixiso dhamaan ${pendingItems.length} qof ee u baahan dib-u-eegista?`)) return;

    setLoading(true);
    try {
      const todayStr = getLocalDateString();
      for (const item of pendingItems) {
        const existing = item.attendanceRecord;
        const cleanNotes = (existing?.notes || '').replace(/\[(APPROVED|WAIVED):[^\]]+\]/g, '').trim();
        let tag = `[APPROVED: Shift reconciled by Management ${todayStr}]`;
        if (item.isWeeklyCapExceeded) {
          tag = `[APPROVED: Weekly OT +${item.weeklyBreakdown.weeklyExcessHours.toFixed(1)}h by Management ${todayStr}]`;
        } else if (item.anomalies.includes('OVERTIME_UNAPPROVED')) {
          tag = `[APPROVED: OT +${item.overtimeHoursWorked.toFixed(1)}h by Management ${todayStr}]`;
        } else if (item.anomalies.includes('SHORTFALL')) {
          tag = `[WAIVED: Shortfall excused by Management ${todayStr}]`;
        }
        const newNotes = cleanNotes ? `${cleanNotes} ${tag}` : tag;

        await API.attendance.save({
          id: existing?.id,
          employeeId: item.employeeId,
          date: item.date,
          status: (existing?.status as any) || 'PRESENT',
          clockIn: item.actualClockIn,
          clockOut: item.actualClockOut,
          overtimeIn: item.actualOvertimeIn,
          overtimeOut: item.actualOvertimeOut,
          notes: newNotes,
          deviceId: existing?.deviceId || 'BULK-APPROVE'
        });
      }

      setActionFeedback(`✨ Dhamaan ${pendingItems.length} qof diiwaankooda si guul leh ayaa loo ansixiyay!`);
      await loadAttendance();
    } catch (error: any) {
      console.error("Error in bulk approve:", error);
      alert(`Cilad ayaa dhacday: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkApproveWeekly = async (items: ShiftReconciliationItem[]) => {
    if (items.length === 0) return;
    if (!window.confirm(`Ma hubtaa inaad ansixiso saacadaha dheeraadka ah ee toddobaadka dhamaan ${items.length} shaqaale ee dhaafeen xadka?`)) return;

    setLoading(true);
    try {
      const todayStr = getLocalDateString();
      for (const item of items) {
        const existing = item.attendanceRecord;
        const cleanNotes = (existing?.notes || '').replace(/\[(APPROVED|WAIVED):[^\]]+\]/g, '').trim();
        const tag = `[APPROVED: Weekly OT +${item.weeklyBreakdown.weeklyExcessHours.toFixed(1)}h by Management ${todayStr}]`;
        const newNotes = cleanNotes ? `${cleanNotes} ${tag}` : tag;

        await API.attendance.save({
          id: existing?.id,
          employeeId: item.employeeId,
          date: item.date,
          status: (existing?.status as any) || 'PRESENT',
          clockIn: item.actualClockIn,
          clockOut: item.actualClockOut,
          overtimeIn: item.actualOvertimeIn,
          overtimeOut: item.actualOvertimeOut,
          notes: newNotes,
          deviceId: existing?.deviceId || 'BULK-WEEKLY-APPROVE'
        });
      }

      setActionFeedback(`🚨 Dhamaan ${items.length} shaqaale saacadahooda toddobaadka ee dheeraadka ah waa la ansixiyay!`);
      await loadAttendance();
    } catch (error: any) {
      console.error("Error in bulk weekly approve:", error);
      alert(`Cilad ayaa dhacday: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = (items: ShiftReconciliationItem[]) => {
    const headers = [
      'Shaqaale',
      'ID Code',
      'Department',
      'Branch',
      'Shift',
      'Jadwalka (Scheduled)',
      'Target Saacadood',
      'Clock In',
      'Clock Out',
      'Regular Saacadood',
      'Daily OT',
      'Wadarta Maanta',
      'Daily Variance',
      'Weekly Logged',
      'Weekly Cap',
      'Weekly Status',
      'Hourly Rate ($)',
      'Est Weekly Wages ($)',
      'Xaaladda Maanta',
      'Audit / Ansixinta'
    ];

    const rows = items.map(i => {
      const emp = employees.find(e => e.id === i.employeeId);
      const rate = parseFloat(((emp?.salary || 0) / 300).toFixed(2));
      const regW = Math.min(i.weeklyBreakdown.weeklyAllocatedHours, i.weeklyBreakdown.weeklyLoggedHours) * rate;
      const otW = Math.max(0, i.weeklyBreakdown.weeklyLoggedHours - i.weeklyBreakdown.weeklyAllocatedHours) * (rate * 1.5);
      const totalW = (regW + otW).toFixed(2);

      return [
        `"${i.employeeName}"`,
        `"${i.employeeCode}"`,
        `"${i.department || 'N/A'}"`,
        `"${i.branchName || 'HQ'}"`,
        `"${i.shiftName}"`,
        `"${i.scheduledStartTime} - ${i.scheduledEndTime}"`,
        i.scheduledHours.toFixed(1),
        `"${formatWallClockTime(i.actualClockIn)}"`,
        `"${formatWallClockTime(i.actualClockOut)}"`,
        i.regularHoursWorked.toFixed(1),
        i.overtimeHoursWorked.toFixed(1),
        i.totalHoursWorked.toFixed(1),
        i.varianceHours > 0 ? `+${i.varianceHours.toFixed(1)}h` : `${i.varianceHours.toFixed(1)}h`,
        i.weeklyBreakdown.weeklyLoggedHours.toFixed(1),
        i.weeklyBreakdown.weeklyAllocatedHours.toFixed(1),
        i.isWeeklyCapExceeded ? `EXCEEDED (+${i.weeklyBreakdown.weeklyExcessHours.toFixed(1)}h)` : `${i.weeklyBreakdown.weeklyPercentage}%`,
        rate.toFixed(2),
        totalW,
        `"${i.status}"`,
        `"${i.approvalNote || (i.isApproved ? 'Approved' : 'Pending')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Shift_Reconciliation_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPayrollEstimate = (summary: WeeklyPayrollSummary) => {
    const headers = [
      'Staff Name',
      'Employee Code',
      'Department',
      'Branch',
      'Base Monthly Salary ($)',
      'Hourly Rate ($)',
      'Allocated Hours',
      'Reconciled Logged Hours',
      'Regular Hours',
      'Overtime Hours',
      'Regular Wages ($)',
      'Overtime Wages ($ @ 1.5x)',
      'Estimated Total Wages Due ($)',
      'Approval Status'
    ];

    const rows = summary.staffEstimates.map(s => [
      `"${s.employeeName}"`,
      `"${s.employeeCode}"`,
      `"${s.department || 'N/A'}"`,
      `"${s.branchName || 'HQ'}"`,
      s.monthlySalary.toFixed(2),
      s.hourlyRate.toFixed(2),
      s.allocatedHours.toFixed(1),
      s.totalHours.toFixed(1),
      s.regularHours.toFixed(1),
      s.overtimeHours.toFixed(1),
      s.regularWages.toFixed(2),
      s.overtimeWages.toFixed(2),
      s.totalWagesDue.toFixed(2),
      `"${s.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Weekly_Payroll_Estimate_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredEmployees = employees.filter(emp => {
    const passXarun = selectedXarunId === 'all' || emp.xarunId === selectedXarunId;
    const passBranch = selectedBranchId === 'all' || emp.branchId === selectedBranchId;
    const isActive = emp.status?.toUpperCase() !== 'TERMINATED' && 
                     emp.status?.toUpperCase() !== 'SUSPENDED' && 
                     emp.status?.toUpperCase() !== 'INACTIVE';
    return passXarun && passBranch && isActive;
  });

  // Map consolidated records for filtered employees
  const employeeConsolidatedMap = new Map<string, ReturnType<typeof consolidateDayRecords>>();
  filteredEmployees.forEach(emp => {
    const empRecords = attendanceData.filter(a => a.employeeId === emp.id);
    employeeConsolidatedMap.set(emp.id, consolidateDayRecords(empRecords));
  });

  const presentCount = filteredEmployees.filter(emp => {
    const rec = employeeConsolidatedMap.get(emp.id);
    return rec?.status === 'PRESENT' || rec?.status === 'LATE';
  }).length;

  const absentCount = filteredEmployees.filter(emp => {
    const rec = employeeConsolidatedMap.get(emp.id);
    return rec?.status === 'ABSENT';
  }).length;

  const leaveCount = filteredEmployees.filter(emp => {
    const rec = employeeConsolidatedMap.get(emp.id);
    return rec?.status === 'LEAVE';
  }).length;

  const holidayCount = filteredEmployees.filter(emp => {
    const rec = employeeConsolidatedMap.get(emp.id);
    return rec?.status === 'HOLIDAY';
  }).length;

  const isFri = isFriday(selectedDate);

  // Compute shift reconciliation items with full weekly accumulated hours
  const reconciliationItems = useMemo(() => {
    const activeAttendancePool = weekAttendanceData.length > 0 ? weekAttendanceData : attendanceData;
    return filteredEmployees.map(emp => {
      const branchName = emp.branchId && emp.branchId !== 'all' 
        ? (branches.find(b => b.id === emp.branchId)?.name || 'Branch') 
        : 'HQ / Main';
      return computeShiftReconciliation(emp, selectedDate, activeAttendancePool, shifts, branchName);
    });
  }, [filteredEmployees, selectedDate, attendanceData, weekAttendanceData, shifts, branches]);

  // Compute Weekly Payroll Summary
  const weeklyPayrollSummary = useMemo(() => {
    return calculateWeeklyPayrollSummary(reconciliationItems, employees);
  }, [reconciliationItems, employees]);

  // Aggregate KPI summary for Shift Reconciliation
  const totalScheduledHours = useMemo(() => {
    return reconciliationItems.reduce((acc, curr) => acc + curr.scheduledHours, 0);
  }, [reconciliationItems]);

  const totalLoggedHours = useMemo(() => {
    return reconciliationItems.reduce((acc, curr) => acc + curr.totalHoursWorked, 0);
  }, [reconciliationItems]);

  const netVarianceHours = parseFloat((totalLoggedHours - totalScheduledHours).toFixed(2));

  const pendingReviewItems = useMemo(() => {
    return reconciliationItems.filter(i => i.status === 'REQUIRES_REVIEW');
  }, [reconciliationItems]);

  const weeklyExceededItems = useMemo(() => {
    return reconciliationItems.filter(i => i.isWeeklyCapExceeded);
  }, [reconciliationItems]);

  const overtimeItems = useMemo(() => {
    return reconciliationItems.filter(i => i.overtimeHoursWorked > 0 || i.anomalies.includes('OVERTIME_UNAPPROVED'));
  }, [reconciliationItems]);

  const shortfallItems = useMemo(() => {
    return reconciliationItems.filter(i => 
      i.anomalies.includes('SHORTFALL') || 
      i.anomalies.includes('LATE_ARRIVAL') || 
      i.anomalies.includes('EARLY_DEPARTURE') ||
      i.anomalies.includes('MISSING_CLOCKOUT') ||
      i.anomalies.includes('ABSENT_UNEXCUSED')
    );
  }, [reconciliationItems]);

  const approvedItems = useMemo(() => {
    return reconciliationItems.filter(i => i.status === 'APPROVED');
  }, [reconciliationItems]);

  // Filtered list based on user's sub-filter selection
  const displayedReconciliationItems = useMemo(() => {
    if (reconFilter === 'REVIEW_NEEDED') return pendingReviewItems;
    if (reconFilter === 'WEEKLY_EXCEEDED') return weeklyExceededItems;
    if (reconFilter === 'OVERTIME') return overtimeItems;
    if (reconFilter === 'SHORTFALL') return shortfallItems;
    if (reconFilter === 'APPROVED') return approvedItems;
    return reconciliationItems;
  }, [reconFilter, reconciliationItems, pendingReviewItems, weeklyExceededItems, overtimeItems, shortfallItems, approvedItems]);

  const editingEmployee = editingRecord ? employees.find(e => e.id === editingRecord.empId) : null;
  const editingShift = editingEmployee 
    ? (shifts.find(s => s.id === editingEmployee.shiftId) || { id: 'default', name: 'Standard Morning', startTime: '07:00', endTime: '17:00', lateThreshold: '08:00' })
    : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Toast Feedback Banner */}
      {actionFeedback && (
        <div className="fixed top-6 right-6 z-[70000] max-w-md bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <span className="text-xl">✨</span>
            <p className="text-xs font-bold leading-relaxed">{actionFeedback}</p>
          </div>
          <button 
            onClick={() => setActionFeedback(null)} 
            className="text-white/60 hover:text-white text-xs font-black uppercase px-2 py-1 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">
            ⚖️
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">
              HRM Shift & Attendance Hub
            </h2>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-400">
                Isbarbardhigga saacadaha jadwalsan, qiyaasta mushaharka & digniinaha toddobaadka
              </span>
              <div 
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => { setShowLogsModal(true); fetchLogs(); }}
              >
                <span className={`w-2 h-2 rounded-full ${serviceStatus === 'ONLINE' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                <span className="text-[10px] font-black uppercase font-mono text-slate-600">
                  {serviceStatus === 'ONLINE' ? 'DEVICE ONLINE' : 'DEVICE OFFLINE'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Date, Company, Branch Selectors */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {isFri && (
            <div className="px-4 py-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-black uppercase flex items-center gap-2">
              🕌 Jimco (Fasax Guud)
            </div>
          )}

          <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Shirkadda</label>
            <select
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-800 font-bold text-xs cursor-pointer"
              value={selectedXarunId}
              onChange={e => { setSelectedXarunId(e.target.value); setSelectedBranchId('all'); }}
            >
              <option value="all">Dhamaan Shirkadaha</option>
              {xarumo.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Bakhaarka</label>
            <select
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-800 font-bold text-xs cursor-pointer"
              value={selectedBranchId}
              onChange={e => setSelectedBranchId(e.target.value)}
            >
              <option value="all">Dhamaan Bakhaarada</option>
              {branches
                  .filter(b => b.type !== 'STORE' && (selectedXarunId === 'all' || b.xarunId === selectedXarunId))
                  .map(b => <option key={b.id} value={b.id}>{b.name}</option>)
              }
            </select>
          </div>

          <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Taariikhda</label>
            <div className="flex items-center gap-1.5">
              <input 
                type="date" 
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-800 font-bold text-xs"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
              <button 
                onClick={handleMarkAsHoliday}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all whitespace-nowrap"
                title="Dhig maalintaan fasax guud dhammaan shaqaalaha"
              >
                🌴 Fasax
              </button>
              <button 
                onClick={handleRemoveHoliday}
                className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-black text-xs transition-all"
                title="Ka qaad fasaxa maalintaan"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Primary View Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 w-fit">
          <button
            onClick={() => setActiveTab('SHIFT_RECONCILIATION')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2.5 ${
              activeTab === 'SHIFT_RECONCILIATION'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>⚖️ Shift Reconciliation</span>
            {pendingReviewItems.length > 0 ? (
              <span className="text-[10px] py-0.5 px-2 bg-amber-400 text-slate-950 font-black rounded-md">
                {pendingReviewItems.length} Need Review
              </span>
            ) : (
              <span className="text-[10px] py-0.5 px-2 bg-emerald-500/20 text-emerald-400 font-mono rounded-md">
                Synced
              </span>
            )}
            {weeklyExceededItems.length > 0 && (
              <span className="text-[10px] py-0.5 px-2 bg-rose-600 text-white font-black rounded-md animate-pulse">
                🚨 {weeklyExceededItems.length} Over Cap
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ATTENDANCE_LOG')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2.5 ${
              activeTab === 'ATTENDANCE_LOG'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>📋 Live Attendance Log</span>
            <span className="text-[10px] py-0.5 px-2 bg-slate-200/80 rounded-md text-slate-700 font-mono">
              {filteredEmployees.length}
            </span>
          </button>
        </div>

        {/* Action Controls for Reconciliation View */}
        {activeTab === 'SHIFT_RECONCILIATION' && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => handleExportPayrollEstimate(weeklyPayrollSummary)}
              className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs"
              title="Dhoofi warbixinta qiyaasta mushaharka toddobaadka"
            >
              <span>💵 Export Payroll CSV</span>
            </button>
            <button
              onClick={() => handleExportCSV(displayedReconciliationItems)}
              className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
              title="Dhoofi warbixinta shift reconciliation ee maanta"
            >
              <span>📥 Export Shift CSV</span>
            </button>
            {pendingReviewItems.length > 0 && (
              <button
                onClick={() => handleBulkApprove(pendingReviewItems)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
              >
                <span>✨ Bulk Approve ({pendingReviewItems.length})</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* SERVICE LOGS MODAL */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[50000] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
                <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tight">System Logs & Diagnostics</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Python Bridge Status: {serviceStatus}</p>
                    </div>
                    <button onClick={() => setShowLogsModal(false)} className="text-white/70 hover:text-white">✕</button>
                </div>
                
                <div className="p-6 bg-black text-green-400 font-mono text-xs overflow-y-auto flex-1 space-y-1 h-96">
                    {logsLoading ? (
                        <p className="animate-pulse">Loading logs from server...</p>
                    ) : serviceLogs.length > 0 ? (
                        serviceLogs.map((log, idx) => <div key={idx} className="border-b border-white/10 pb-1 mb-1">{log}</div>)
                    ) : (
                        <p className="text-slate-500 italic">No logs available or service offline.</p>
                    )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                    <button 
                        onClick={fetchLogs} 
                        className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
                    >
                        🔄 Refresh Logs
                    </button>
                    <button 
                        onClick={triggerAbsentCheck} 
                        className="flex-[2] py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all"
                    >
                        ⚡ Run "Absent" Check Now
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* VIEW 1: SHIFT RECONCILIATION VIEW */}
      {activeTab === 'SHIFT_RECONCILIATION' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* WEEKLY PAYROLL SUMMARY CARD */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-7 rounded-[2rem] shadow-xl border border-slate-800">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-inner">
                  💵
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-xl font-black tracking-tight uppercase text-white">
                      Weekly Payroll Summary
                    </h3>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Estimated Wages Due
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium mt-1">
                    Qiyaasta mushaharka la bixinayo iyadoo lagu saleynayo saacadaha la xaqiijiyay ({weeklyPayrollSummary.totalReconciledHours}h) & qiimaha saacadda (Overtime 1.5×).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {weeklyPayrollSummary.weekDateRange && (
                  <div className="px-3.5 py-2 bg-white/10 rounded-xl text-xs font-mono text-slate-300 border border-white/10">
                    📅 {weeklyPayrollSummary.weekDateRange}
                  </div>
                )}
                <button
                  onClick={() => setShowPayrollBreakdown(!showPayrollBreakdown)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/10 flex items-center gap-1.5"
                >
                  <span>{showPayrollBreakdown ? '▲ Qari Faahfaahinta' : '▼ Faahfaahinta Shaqaalaha'}</span>
                </button>
                <button
                  onClick={() => handleExportPayrollEstimate(weeklyPayrollSummary)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5"
                >
                  <span>📥 Export CSV</span>
                </button>
              </div>
            </div>

            {/* 4 Financial Metric Panels */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">
                  Total Estimated Wages Due
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black font-mono tracking-tight text-white tabular-nums">
                    ${weeklyPayrollSummary.totalEstimatedWages.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                  Reconciled for {weeklyPayrollSummary.staffCount} staff
                </span>
              </div>

              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">
                  Regular Wages (Base)
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black font-mono text-slate-200 tabular-nums">
                    ${weeklyPayrollSummary.totalRegularWages.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                  {weeklyPayrollSummary.totalRegularHours.toFixed(1)} hrs @ 1.0× regular rate
                </span>
              </div>

              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-1">
                  Overtime Pay (@ 1.5× Rate)
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black font-mono text-amber-300 tabular-nums">
                    +${weeklyPayrollSummary.totalOvertimeWages.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                  +{weeklyPayrollSummary.totalOvertimeHours.toFixed(1)} hrs approved overtime
                </span>
              </div>

              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest block mb-1">
                  Avg Rate & Active Staff
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black font-mono text-indigo-200 tabular-nums">
                    ${weeklyPayrollSummary.averageHourlyRate.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">/hr avg</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                  {weeklyPayrollSummary.staffCount} active employees
                </span>
              </div>
            </div>

            {/* Collapsible Individual Staff Wage Breakdown Table */}
            {showPayrollBreakdown && (
              <div className="mt-6 pt-6 border-t border-white/10 animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                    Faahfaahinta Mushaharka Shaqaale Kasta (Staff Wage Estimates)
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Formula: (Regular Hours × Base Rate) + (OT Hours × 1.5× Rate)
                  </span>
                </div>

                <div className="overflow-x-auto max-h-72 overflow-y-auto no-scrollbar border border-white/10 rounded-2xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-white/10 text-slate-300 text-[10px] uppercase font-black tracking-wider sticky top-0">
                      <tr>
                        <th className="px-4 py-3">Shaqaalaha</th>
                        <th className="px-3 py-3">Mushaharka / Saacaddii</th>
                        <th className="px-3 py-3 text-center">Saacadaha Toddobaadka</th>
                        <th className="px-3 py-3 text-right">Regular Pay ($)</th>
                        <th className="px-3 py-3 text-right">OT Pay ($ @ 1.5×)</th>
                        <th className="px-4 py-3 text-right text-emerald-400">Total Wage Due ($)</th>
                        <th className="px-3 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {weeklyPayrollSummary.staffEstimates.map(staff => (
                        <tr key={staff.employeeId} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-2.5 font-sans">
                            <div className="flex items-center gap-2.5">
                              <img src={staff.avatar || 'https://via.placeholder.com/150'} className="w-7 h-7 rounded-lg object-cover" alt="" />
                              <div>
                                <span className="font-bold text-white block text-xs">{staff.employeeName}</span>
                                <span className="text-[9px] text-slate-400 block font-mono">{staff.employeeCode} · {staff.department || 'HQ'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-slate-300">
                            <div>${staff.monthlySalary.toFixed(0)}/mo</div>
                            <div className="text-[10px] text-emerald-400 font-bold">${staff.hourlyRate.toFixed(2)}/hr</div>
                          </td>
                          <td className="px-3 py-2.5 text-center tabular-nums">
                            <span className="text-white font-bold">{staff.totalHours.toFixed(1)}h</span>
                            <div className="text-[9px] text-slate-400">
                              {staff.regularHours.toFixed(1)}h reg + {staff.overtimeHours.toFixed(1)}h OT
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-200">
                            ${staff.regularWages.toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {staff.overtimeWages > 0 ? (
                              <span className="text-amber-300 font-bold">+${staff.overtimeWages.toFixed(2)}</span>
                            ) : (
                              <span className="text-slate-500">$0.00</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-bold text-emerald-300 text-sm">
                            ${staff.totalWagesDue.toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5 text-center font-sans">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              staff.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                              'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {staff.status === 'APPROVED' ? 'Approved' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* AUTOMATED WEEKLY EXCEEDANCE ALERT BANNER */}
          {weeklyExceededItems.length > 0 && (
            <div className="bg-rose-50 border-2 border-rose-300/80 rounded-3xl p-6 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 animate-in slide-in-from-top duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center text-2xl shadow-md shrink-0">
                  🚨
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-black text-rose-950 uppercase tracking-tight">
                      Digniin: Shaqaale Dhaafay Saacadaha Loo Qoondeeyay Toddobaadkan
                    </h4>
                    <span className="bg-rose-600 text-white text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full shadow-xs animate-pulse">
                      {weeklyExceededItems.length} Staff Exceeded
                    </span>
                  </div>
                  <p className="text-xs text-rose-800 font-medium mt-1 leading-relaxed max-w-3xl">
                    Nidaamku wuxuu ogaaday in {weeklyExceededItems.length} shaqaale ay dhaafeen xadka saacadaha todobaadka ({reconciliationItems[0]?.weeklyBreakdown.weeklyAllocatedHours || 60.0}h standard cap). Fadlan kormeero saacadaha dheeraadka ah si loo waafajiyo shuruucda shaqada iyo miisaaniyadda mushaharka.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full lg:w-auto shrink-0">
                <button
                  onClick={() => setReconFilter('WEEKLY_EXCEEDED')}
                  className="flex-1 lg:flex-none px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm whitespace-nowrap"
                >
                  Fiiri Kuwa Dhaafay ({weeklyExceededItems.length})
                </button>
                <button
                  onClick={() => handleBulkApproveWeekly(weeklyExceededItems)}
                  className="flex-1 lg:flex-none px-4 py-2.5 bg-white border-2 border-rose-200 hover:bg-rose-100/60 text-rose-800 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm whitespace-nowrap"
                >
                  Ansixi Dhammaan
                </button>
              </div>
            </div>
          )}

          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Today Scheduled</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-800 font-mono tabular-nums">{totalScheduledHours.toFixed(1)}</span>
                <span className="text-xs font-bold text-slate-500">hrs</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium mt-1 block">{filteredEmployees.length} staff shifts</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Today Logged</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 font-mono tabular-nums">{totalLoggedHours.toFixed(1)}</span>
                <span className="text-xs font-bold text-slate-500">hrs</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium mt-1 block">Actual attendance</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Net Daily Variance</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-black font-mono tabular-nums ${
                  netVarianceHours > 0 ? 'text-emerald-600' : netVarianceHours < 0 ? 'text-rose-600' : 'text-slate-700'
                }`}>
                  {netVarianceHours > 0 ? `+${netVarianceHours.toFixed(1)}` : netVarianceHours.toFixed(1)}
                </span>
                <span className="text-xs font-bold text-slate-500">hrs</span>
              </div>
              <span className="text-[10px] font-medium text-slate-400 mt-1 block">
                {netVarianceHours > 0 ? 'Overtime balance' : netVarianceHours < 0 ? 'Shortfall deficit' : 'Balanced'}
              </span>
            </div>

            {/* AUTOMATED WEEKLY EXCEEDANCE KPI */}
            <div 
              onClick={() => setReconFilter('WEEKLY_EXCEEDED')}
              className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${
                weeklyExceededItems.length > 0 
                  ? 'bg-rose-50/70 border-rose-300 hover:border-rose-400 ring-2 ring-rose-200/50' 
                  : 'bg-white border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase tracking-wider block mb-1 ${weeklyExceededItems.length > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                  🚨 Weekly Exceeded
                </span>
                {weeklyExceededItems.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-black font-mono tabular-nums ${weeklyExceededItems.length > 0 ? 'text-rose-700' : 'text-slate-600'}`}>
                  {weeklyExceededItems.length}
                </span>
                <span className="text-xs font-bold text-slate-500">staff</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                {weeklyExceededItems.length > 0 ? 'Over weekly limit' : 'All within cap'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider block mb-1">Daily OT Anomalies</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-amber-600 font-mono tabular-nums">{overtimeItems.length}</span>
                <span className="text-xs font-bold text-slate-500">cases</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium mt-1 block">Daily shift overages</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider block mb-1">Shortfall / Late</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-rose-600 font-mono tabular-nums">{shortfallItems.length}</span>
                <span className="text-xs font-bold text-slate-500">staff</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium mt-1 block">Deficits or unpunched</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block mb-1">Approved Status</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-indigo-600 font-mono tabular-nums">{approvedItems.length}</span>
                <span className="text-xs font-bold text-slate-500">/ {filteredEmployees.length}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                {pendingReviewItems.length} pending sign-off
              </span>
            </div>
          </div>

          {/* Sub-Filter Controls */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setReconFilter('ALL')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  reconFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Dhamaan ({reconciliationItems.length})
              </button>

              <button
                onClick={() => setReconFilter('REVIEW_NEEDED')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  reconFilter === 'REVIEW_NEEDED'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                }`}
              >
                <span>⚠️ U Baahan Dib-u-eegis</span>
                <span className="font-mono">({pendingReviewItems.length})</span>
              </button>

              {/* AUTOMATED WEEKLY EXCEEDANCE FILTER PILL */}
              <button
                onClick={() => setReconFilter('WEEKLY_EXCEEDED')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  reconFilter === 'WEEKLY_EXCEEDED'
                    ? 'bg-rose-600 text-white font-black'
                    : weeklyExceededItems.length > 0 
                    ? 'text-rose-700 bg-rose-50 border border-rose-300 font-black hover:bg-rose-100' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>🚨 Dhaafay Toddobaadka</span>
                <span className="font-mono">({weeklyExceededItems.length})</span>
              </button>

              <button
                onClick={() => setReconFilter('OVERTIME')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  reconFilter === 'OVERTIME'
                    ? 'bg-indigo-600 text-white font-black'
                    : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                }`}
              >
                <span>⚡ Saacadaha Dheeraadka ah</span>
                <span className="font-mono">({overtimeItems.length})</span>
              </button>

              <button
                onClick={() => setReconFilter('SHORTFALL')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  reconFilter === 'SHORTFALL'
                    ? 'bg-rose-600 text-white font-black'
                    : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                }`}
              >
                <span>🔻 Saacadaha Dhiman</span>
                <span className="font-mono">({shortfallItems.length})</span>
              </button>

              <button
                onClick={() => setReconFilter('APPROVED')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  reconFilter === 'APPROVED'
                    ? 'bg-emerald-600 text-white font-black'
                    : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                }`}
              >
                <span>✅ La Ansixiyay</span>
                <span className="font-mono">({approvedItems.length})</span>
              </button>
            </div>

            <div className="text-xs font-semibold text-slate-400">
              Muujinaya <span className="font-mono font-bold text-slate-700">{displayedReconciliationItems.length}</span> diiwaan
            </div>
          </div>

          {/* Reconciliation Data Table with Weekly Accumulated Hours & Wage Column */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-200/80">
                    <th className="px-5 py-4">Shaqaalaha</th>
                    <th className="px-4 py-4">Shift-ka Jadwalsan</th>
                    <th className="px-4 py-4 text-center">Soo-gelista (Punches)</th>
                    <th className="px-4 py-4 text-center">Saacadaha Maanta</th>
                    <th className="px-4 py-4 text-center">Farqiga Maanta</th>
                    <th className="px-4 py-4">Toddobaadka (Weekly Cap & Wage)</th>
                    <th className="px-4 py-4">Ciladaha (Discrepancies)</th>
                    <th className="px-4 py-4 text-center">Xaaladda Ansixinta</th>
                    <th className="px-5 py-4 text-right">Tallaabada Maamulka</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedReconciliationItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">
                        Wax diiwaan ah lagama helin shuruudahan la doortay.
                      </td>
                    </tr>
                  ) : (
                    displayedReconciliationItems.map(item => {
                      const isOvertime = item.varianceHours > 0.25 || item.overtimeHoursWorked > 0;
                      const isShortfall = item.varianceHours < -0.25;
                      const hasClockIn = Boolean(item.actualClockIn);
                      const hasClockOut = Boolean(item.actualClockOut);
                      const wb = item.weeklyBreakdown;

                      const emp = employees.find(e => e.id === item.employeeId);
                      const hourlyRate = parseFloat(((emp?.salary || 0) / 300).toFixed(2));
                      const regW = Math.min(wb.weeklyAllocatedHours, wb.weeklyLoggedHours) * hourlyRate;
                      const otW = Math.max(0, wb.weeklyLoggedHours - wb.weeklyAllocatedHours) * (hourlyRate * 1.5);
                      const totalEstimatedWage = parseFloat((regW + otW).toFixed(2));

                      return (
                        <tr 
                          key={item.employeeId} 
                          className={`hover:bg-slate-50/70 transition-colors ${
                            item.isWeeklyCapExceeded 
                              ? 'bg-rose-50/30' 
                              : item.status === 'REQUIRES_REVIEW' 
                              ? 'bg-amber-50/20' 
                              : ''
                          }`}
                        >
                          {/* Staff Column */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <img 
                                src={item.avatar || 'https://via.placeholder.com/150'} 
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200/80 shadow-xs" 
                                alt="" 
                              />
                              <div>
                                <span className="font-bold text-slate-900 text-sm tracking-tight block">
                                  {item.employeeName}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-mono text-slate-400 font-semibold">{item.employeeCode}</span>
                                  {item.department && (
                                    <span className="text-[10px] text-slate-500 font-medium">· {item.department}</span>
                                  )}
                                  <span className="text-[10px] text-slate-400">· {item.branchName}</span>
                                </div>
                                <div className="text-[10px] font-mono font-semibold text-emerald-700 mt-0.5">
                                  ${hourlyRate.toFixed(2)}/hr · Est: <span className="font-bold">${totalEstimatedWage.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Scheduled Shift Column */}
                          <td className="px-4 py-4">
                            <div>
                              <span className="text-xs font-bold text-slate-800 block">
                                {item.shiftName}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[11px] font-mono text-slate-600 font-semibold">
                                  {item.scheduledStartTime} – {item.scheduledEndTime}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  ({item.scheduledHours.toFixed(1)}h/day)
                                </span>
                              </div>
                              <span className="text-[9px] text-slate-400 block mt-0.5">
                                Late &gt; {item.lateThreshold}
                              </span>
                            </div>
                          </td>

                          {/* Actual Punches Column */}
                          <td className="px-4 py-4 text-center">
                            <div className="inline-flex flex-col items-center">
                              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold">
                                <span className={hasClockIn ? 'text-emerald-700' : 'text-slate-300'}>
                                  {formatWallClockTime(item.actualClockIn)}
                                </span>
                                <span className="text-slate-300">→</span>
                                <span className={hasClockOut ? 'text-rose-700' : 'text-slate-300'}>
                                  {formatWallClockTime(item.actualClockOut)}
                                </span>
                              </div>

                              {item.actualOvertimeIn && item.actualOvertimeOut && (
                                <div className="text-[10px] font-mono text-indigo-600 font-medium mt-0.5">
                                  OT: {formatWallClockTime(item.actualOvertimeIn)} - {formatWallClockTime(item.actualOvertimeOut)}
                                </div>
                              )}

                              {item.isActiveShiftToday && (
                                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mt-0.5">
                                  🟢 Active Now
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Logged Hours Breakdown Column */}
                          <td className="px-4 py-4 text-center">
                            <div>
                              <span className="text-sm font-bold font-mono text-slate-900 tabular-nums">
                                {item.totalHoursWorked.toFixed(1)} hrs
                              </span>
                              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                Reg: {item.regularHoursWorked.toFixed(1)}h
                                {item.overtimeHoursWorked > 0 && (
                                  <span className="text-indigo-600 font-semibold"> | OT: +{item.overtimeHoursWorked.toFixed(1)}h</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Variance vs Scheduled Column */}
                          <td className="px-4 py-4 text-center">
                            <div className="inline-block">
                              <span className={`inline-flex items-center gap-1 font-mono text-xs font-bold px-2.5 py-1 rounded-md tabular-nums ${
                                isOvertime
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                  : isShortfall
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200/80'
                              }`}>
                                {item.varianceHours > 0 ? (
                                  <span>+{item.varianceHours.toFixed(1)}h OT</span>
                                ) : item.varianceHours < 0 ? (
                                  <span>{item.varianceHours.toFixed(1)}h Short</span>
                                ) : (
                                  <span>0.0h On Target</span>
                                )}
                              </span>
                            </div>
                          </td>

                          {/* AUTOMATED WEEKLY ALLOCATED HOURS & WAGE COLUMN */}
                          <td className="px-4 py-4 min-w-[220px]">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-mono font-bold text-slate-800 tabular-nums">
                                  {wb.weeklyLoggedHours.toFixed(1)} <span className="text-slate-400 font-normal">/ {wb.weeklyAllocatedHours.toFixed(1)}h</span>
                                </span>

                                {/* Alert Badge */}
                                {item.isWeeklyCapExceeded ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-mono font-black px-2 py-0.5 rounded bg-rose-600 text-white shadow-xs animate-pulse">
                                    🚨 +{wb.weeklyExcessHours.toFixed(1)}h EXCEEDED
                                  </span>
                                ) : wb.isWeeklyApproaching ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                    ⚡ {wb.weeklyPercentage}% (Near Cap)
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono text-slate-400 font-medium">
                                    {wb.weeklyPercentage}% cap
                                  </span>
                                )}
                              </div>

                              {/* Progress Meter Bar */}
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/70">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    item.isWeeklyCapExceeded 
                                      ? 'bg-rose-600' 
                                      : wb.isWeeklyApproaching 
                                      ? 'bg-amber-500' 
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, wb.weeklyPercentage)}%` }}
                                ></div>
                              </div>

                              {/* Day by Day Mini Chips (Saturday to Friday) */}
                              <div className="flex items-center gap-1 pt-0.5">
                                {wb.dailyBreakdown.map((d, dIdx) => (
                                  <div 
                                    key={dIdx}
                                    title={`${d.dayName} (${d.dateStr}): ${d.hours.toFixed(1)} hrs worked`}
                                    className={`flex-1 text-center py-0.5 rounded text-[8px] font-mono font-bold border transition-colors ${
                                      d.isTargetDate
                                        ? 'bg-slate-900 text-white border-slate-900 ring-1 ring-slate-900'
                                        : d.hasOvertime 
                                        ? 'bg-amber-100 text-amber-900 border-amber-200' 
                                        : d.hours > 0 
                                        ? 'bg-slate-100 text-slate-700 border-slate-200' 
                                        : d.isFriday
                                        ? 'bg-emerald-50/60 text-emerald-600 border-emerald-100'
                                        : 'bg-slate-50 text-slate-300 border-slate-100'
                                    }`}
                                  >
                                    <span className="block leading-none">{d.dayName.substring(0, 2)}</span>
                                    <span className="block text-[7px] leading-tight font-normal">{d.hours > 0 ? d.hours.toFixed(0) : '-'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>

                          {/* Discrepancies / Anomalies Tag Column */}
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {item.anomalies.map((ano, idx) => {
                                if (ano === 'BALANCED') {
                                  return (
                                    <span key={idx} className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                      ✓ On Schedule
                                    </span>
                                  );
                                }
                                if (ano === 'WEEKLY_CAP_EXCEEDED') {
                                  return (
                                    <span key={idx} className="text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-300 animate-pulse">
                                      🚨 Weekly Cap Exceeded
                                    </span>
                                  );
                                }
                                if (ano === 'OVERTIME_UNAPPROVED') {
                                  return (
                                    <span key={idx} className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                      ⚡ Overtime ({item.varianceHours > 0 ? `+${item.varianceHours.toFixed(1)}h` : `+${item.overtimeHoursWorked.toFixed(1)}h`})
                                    </span>
                                  );
                                }
                                if (ano === 'SHORTFALL') {
                                  return (
                                    <span key={idx} className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                      🔻 Shortfall ({item.varianceHours.toFixed(1)}h)
                                    </span>
                                  );
                                }
                                if (ano === 'LATE_ARRIVAL') {
                                  return (
                                    <span key={idx} className="text-[10px] font-semibold text-orange-800 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                                      ⏰ Late Arrival
                                    </span>
                                  );
                                }
                                if (ano === 'EARLY_DEPARTURE') {
                                  return (
                                    <span key={idx} className="text-[10px] font-semibold text-orange-800 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                                      🏃 Early Departure
                                    </span>
                                  );
                                }
                                if (ano === 'MISSING_CLOCKOUT') {
                                  return (
                                    <span key={idx} className="text-[10px] font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                      ❓ Missing Clock-Out
                                    </span>
                                  );
                                }
                                if (ano === 'ABSENT_UNEXCUSED') {
                                  return (
                                    <span key={idx} className="text-[10px] font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                      ❌ Absent
                                    </span>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          </td>

                          {/* Approval Status Column */}
                          <td className="px-4 py-4 text-center">
                            <div>
                              {item.status === 'APPROVED' ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                                    <span>✓ APPROVED</span>
                                  </span>
                                  {item.approvalNote && (
                                    <span 
                                      className="text-[9px] text-slate-500 font-mono mt-1 max-w-[130px] truncate block" 
                                      title={item.approvalNote}
                                    >
                                      {item.approvalNote.replace('[', '').replace(']', '')}
                                    </span>
                                  )}
                                </div>
                              ) : item.status === 'REQUIRES_REVIEW' ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-300">
                                    <span>⚠️ REVIEW NEEDED</span>
                                  </span>
                                  <span className="text-[9px] text-amber-600 font-medium mt-0.5">
                                    Pending sign-off
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-md">
                                  IN SYNC
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Management Action Column */}
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* If Exceeded Weekly Cap */}
                              {item.isWeeklyCapExceeded && !item.isApproved && (
                                <button
                                  onClick={() => handleApproveWeeklyOvertime(item)}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold tracking-tight shadow-xs transition-all flex items-center gap-1"
                                  title="Ansixi saacadaha dheeraadka ah ee toddobaadka"
                                >
                                  <span>🚨 Ansixi Weekly OT</span>
                                </button>
                              )}

                              {/* If Unapproved Daily Overtime */}
                              {item.anomalies.includes('OVERTIME_UNAPPROVED') && !item.isWeeklyCapExceeded && !item.isApproved && (
                                <button
                                  onClick={() => handleApproveOvertime(item)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold tracking-tight shadow-xs transition-all flex items-center gap-1"
                                  title="Ansixi saacadaha dheeraadka ah ee maanta"
                                >
                                  <span>✓ Ansixi OT</span>
                                </button>
                              )}

                              {/* If Shortfall */}
                              {item.anomalies.includes('SHORTFALL') && !item.isApproved && (
                                <button
                                  onClick={() => handleWaiveShortfall(item)}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold tracking-tight shadow-xs transition-all flex items-center gap-1"
                                  title="Cafi dhimista saacadaha (Waive Shortfall)"
                                >
                                  <span>🛡️ Cafi Dhimista</span>
                                </button>
                              )}

                              {/* If generic review needed and not approved */}
                              {item.status === 'REQUIRES_REVIEW' && !item.isWeeklyCapExceeded && !item.anomalies.includes('OVERTIME_UNAPPROVED') && !item.anomalies.includes('SHORTFALL') && (
                                <button
                                  onClick={() => handleApproveReconciliation(item)}
                                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold tracking-tight shadow-xs transition-all flex items-center gap-1"
                                  title="Ansixi shift-ka oo saxiix"
                                >
                                  <span>✓ Saxiix Shift</span>
                                </button>
                              )}

                              {/* If already approved, allow revoking */}
                              {item.isApproved && (
                                <button
                                  onClick={() => handleRevokeApproval(item)}
                                  className="px-2 py-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg text-[10px] font-bold transition-all"
                                  title="Dib uga laabo ansixintan"
                                >
                                  Ka Noqo
                                </button>
                              )}

                              {/* Quick Edit Punch Button */}
                              <button
                                onClick={() => openEditModal(item.employeeId, item.attendanceRecord)}
                                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition-all"
                                title="Wax ka beddel saacadaha dhabta ah"
                              >
                                ✏️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: ORIGINAL LIVE ATTENDANCE LOG VIEW */}
      {activeTab === 'ATTENDANCE_LOG' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Jooga (Present)</p>
                <p className="text-2xl font-black text-emerald-600">{presentCount}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Maqan (Absent)</p>
                <p className="text-2xl font-black text-rose-600">{absentCount}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fasax (Leave)</p>
                <p className="text-2xl font-black text-indigo-600">{leaveCount}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ciid (Holiday)</p>
                <p className="text-2xl font-black text-amber-500">{holidayCount}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Staff</p>
                <p className="text-2xl font-black text-slate-600">{filteredEmployees.length}</p>
            </div>
          </div>

          {/* Main Attendance Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-200/80">
                    <th className="px-6 py-5">Shaqaalaha</th>
                    <th className="px-6 py-5 text-center">Clock In</th>
                    <th className="px-6 py-5 text-center">Clock Out</th>
                    <th className="px-6 py-5 text-center bg-indigo-50/30">OT In</th>
                    <th className="px-6 py-5 text-center bg-indigo-50/30">OT Out</th>
                    <th className="px-6 py-5 text-center">Status</th>
                    <th className="px-6 py-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map(emp => {
                    const record = employeeConsolidatedMap.get(emp.id);
                    const displayStatus = record ? record.status : null;

                    return (
                      <tr key={emp.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={emp.avatar || 'https://via.placeholder.com/150'} className="w-10 h-10 rounded-xl shadow-xs border border-slate-200 object-cover" alt="" />
                            <div>
                              <span className="font-bold text-slate-800 block text-sm tracking-tight">{emp.name}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                {emp.branchId && emp.branchId !== 'all' ? (branches.find(b => b.id === emp.branchId)?.name || 'Branch') : '🌍 Dhammaan (HQ)'}
                              </span>
                              {emp.warning && (
                                <div className="relative inline-block ml-2 group/tooltip">
                                  <span className="cursor-help inline-block text-amber-500">⚠️</span>
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-[10px] font-bold rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all whitespace-nowrap z-50 shadow-xl border border-slate-700">
                                    {emp.warning}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-xs font-bold text-emerald-600">
                          {formatWallClockTime(record?.clockIn)}
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-xs font-bold text-rose-600">
                          {formatWallClockTime(record?.clockOut)}
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-xs font-bold text-indigo-600 bg-indigo-50/30">
                          {formatWallClockTime(record?.overtimeIn)}
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-xs font-bold text-indigo-600 bg-indigo-50/30">
                          {formatWallClockTime(record?.overtimeOut)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {record ? (
                            <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              displayStatus === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' :
                              displayStatus === 'ABSENT' ? 'bg-rose-100 text-rose-800' : 
                              displayStatus === 'LEAVE' ? 'bg-indigo-100 text-indigo-800' : 
                              displayStatus === 'HOLIDAY' ? 'bg-amber-100 text-amber-800' : 
                              displayStatus === 'LATE' ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-800'
                            }`}>
                              {displayStatus}
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic select-none">--</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => openEditModal(emp.id, record as Attendance)}
                            className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-900 hover:text-white transition-all text-xs font-bold"
                            title="Edit Record"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SLIDE-OVER */}
      {editingRecord && (
          <div className="fixed inset-0 z-[60000] overflow-hidden">
              <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-300"
                onClick={() => setEditingRecord(null)}
              ></div>
              
              <div className="absolute inset-y-0 right-0 max-w-full flex">
                  <div className="w-screen max-w-md animate-in slide-in-from-right duration-300 ease-out">
                      <div className="h-full flex flex-col bg-white shadow-2xl rounded-l-3xl overflow-hidden">
                          <div className="p-8 bg-slate-900 text-white">
                              <div className="flex items-center justify-between">
                                  <div>
                                    <h3 className="text-xl font-black tracking-tight uppercase">Edit Attendance Record</h3>
                                    {editingEmployee && (
                                      <p className="text-xs text-slate-300 font-bold mt-1">
                                        {editingEmployee.name} ({editingEmployee.employeeIdCode})
                                      </p>
                                    )}
                                  </div>
                                  <button 
                                    onClick={() => setEditingRecord(null)} 
                                    className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all"
                                  >✕</button>
                              </div>

                              {/* Scheduled Shift Reference Banner */}
                              {editingShift && (
                                <div className="mt-4 p-3 bg-white/10 rounded-xl border border-white/10 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-white uppercase text-[10px] tracking-wider">
                                      Shift: {editingShift.name}
                                    </span>
                                    <span className="font-mono text-emerald-300 font-bold">
                                      {calculateHoursBetween(editingShift.startTime, editingShift.endTime)} hrs/day
                                    </span>
                                  </div>
                                  <p className="text-slate-300 text-[11px] font-mono mt-1">
                                    Jadwalka: {editingShift.startTime} – {editingShift.endTime} (Weekly Cap: {(calculateHoursBetween(editingShift.startTime, editingShift.endTime) * 6).toFixed(1)}h)
                                  </p>
                                </div>
                              )}
                          </div>
                          
                          <div className="flex-1 overflow-y-auto p-8 space-y-6">
                              <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Xaaladda (Status)</label>
                                  <select 
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-slate-900 transition-all cursor-pointer text-sm"
                                    value={editForm.status}
                                    onChange={e => setEditForm({...editForm, status: e.target.value})}
                                  >
                                      <option value="PRESENT">✅ PRESENT (Jooga)</option>
                                      <option value="ABSENT">❌ ABSENT (Maqan)</option>
                                      <option value="LATE">⏰ LATE (Dahay)</option>
                                      <option value="LEAVE">🏖️ LEAVE (Fasax)</option>
                                      <option value="HOLIDAY">🌴 HOLIDAY (Ciid/Fasax Guud)</option>
                                  </select>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Soo Galay (Time In)</label>
                                      <input 
                                        type="time" 
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-slate-900 transition-all text-sm" 
                                        value={editForm.clockIn} 
                                        onChange={e => setEditForm({...editForm, clockIn: e.target.value})} 
                                      />
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Baxay (Time Out)</label>
                                      <input 
                                        type="time" 
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-slate-900 transition-all text-sm" 
                                        value={editForm.clockOut} 
                                        onChange={e => setEditForm({...editForm, clockOut: e.target.value})} 
                                      />
                                  </div>
                              </div>

                              {/* Live Calculation Preview */}
                              {editForm.clockIn && editForm.clockOut && (
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-medium">Saacadaha Maanta:</span>
                                    <span className="font-mono font-bold text-slate-900">
                                      {calculateHoursBetween(editForm.clockIn, editForm.clockOut).toFixed(2)} hrs
                                    </span>
                                  </div>
                                  {editingShift && (
                                    <div className="flex justify-between items-center text-xs mt-1.5 pt-1.5 border-t border-slate-200">
                                      <span className="text-slate-500 font-medium">Farqiga Shift-ka:</span>
                                      <span className="font-mono font-bold text-indigo-600">
                                        {(calculateHoursBetween(editForm.clockIn, editForm.clockOut) - calculateHoursBetween(editingShift.startTime, editingShift.endTime)).toFixed(2)} hrs
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Sababta / Notes & Audit</label>
                                  <textarea 
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:border-slate-900 transition-all resize-none h-28 text-sm"
                                    placeholder="Qor sababta wax looga bedelay ama ansixinta maamulka..."
                                    value={editForm.notes}
                                    onChange={e => setEditForm({...editForm, notes: e.target.value})}
                                  />
                              </div>
                          </div>

                          <div className="p-8 bg-slate-50 border-t border-slate-200 flex gap-3">
                              <button 
                                onClick={() => setEditingRecord(null)} 
                                className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl uppercase text-xs tracking-wider hover:bg-slate-100 transition-all"
                              >
                                Ka Noqo
                              </button>
                              <button 
                                onClick={handleSaveEdit} 
                                className="flex-[2] py-4 bg-slate-900 text-white font-bold rounded-xl shadow-md uppercase text-xs tracking-wider hover:bg-slate-800 active:scale-98 transition-all"
                              >
                                Kaydi Diiwaanka
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default HRMAttendanceTracker;
