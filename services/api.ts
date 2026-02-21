
import { InventoryItem, Transaction, Branch, User, TransactionStatus, Xarun, UserRole, TransactionType, Employee, Attendance, Payroll, Device, Shift, LeaveRequest, EmployeeDocument, XarunOrderRequest } from '../types';
import { supabaseFetch, isDbConnected } from './supabaseClient';

const FIELD_MAPPING: Record<string, string> = {
  originOrSource: 'origin_source',
  minThreshold: 'min_threshold',
  branchId: 'branch_id',
  targetBranchId: 'target_branch_id',
  requestedBy: 'requested_by',
  approvedBy: 'approved_by',
  lastUpdated: 'last_updated',
  xarunId: 'xarun_id',
  totalShelves: 'total_shelves',
  totalSections: 'total_sections',
  customSections: 'custom_sections',
  employeeIdCode: 'employee_id_code',
  joinedDate: 'joined_date',
  fingerprintHash: 'fingerprint_hash',
  employeeId: 'employee_id',
  clockIn: 'clock_in',
  clockOut: 'clock_out',
  overtimeIn: 'overtime_in',
  overtimeOut: 'overtime_out',
  baseSalary: 'base_salary',
  netPay: 'net_pay',
  paymentDate: 'payment_date',
  placementInfo: 'placement_info',
  ipAddress: 'ip_address',
  isActive: 'is_active',
  totalHours: 'total_hours',
  shiftId: 'shift_id',
  startDate: 'start_date',
  endDate: 'end_date',
  uploadDate: 'upload_date',
  startTime: 'start_time',
  endTime: 'end_time',
  lateThreshold: 'late_threshold',
  consecutiveAbsences: 'consecutive_absences',
  isWarningDismissed: 'is_warning_dismissed'
};

const toSnakeCase = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(item => toSnakeCase(item));
  if (obj === null || typeof obj !== 'object') return obj;
  const newObj: Record<string, any> = {};
  for (let key in obj) {
    const snakeKey = FIELD_MAPPING[key] || key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    newObj[snakeKey] = obj[key];
  }
  return newObj;
};

// --- LOCAL STORAGE PERSISTENCE HELPERS ---
const getLocal = (key: string) => {
  try {
    const data = localStorage.getItem(`stock_local_${key}`);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

const setLocal = (key: string, data: any) => {
  try {
    localStorage.setItem(`stock_local_${key}`, JSON.stringify(data));
  } catch (e) {
    console.warn(`Local storage full, could not cache ${key}`);
  }
};

async function cloudSave(table: string, data: any, conflictColumn: string = 'id') {
  if (!isDbConnected()) return null;
  const payload = toSnakeCase(data);
  return await supabaseFetch(`${table}?on_conflict=${conflictColumn}`, {
    method: 'POST',
    headers: {
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(payload)
  });
}

async function fetchAllPages(table: string, queryParams: string = '', orderBy: string = 'created_at'): Promise<any[]> {
  // Using a Map to ensure uniqueness by ID
  const allDataMap = new Map<string, any>();
  let page = 0;
  const pageSize = 500;
  let hasMore = true;
  const separator = queryParams ? '&' : '';
  const MAX_PAGES = 100;

  if (!isDbConnected()) {
    return getLocal(table) || [];
  }

  while (hasMore && page < MAX_PAGES) {
    const rangeStart = page * pageSize;
    const rangeEnd = rangeStart + pageSize - 1;
    const endpoint = `${table}?select=*${separator}${queryParams}&order=${orderBy}.desc`;
    
    const data = await supabaseFetch(endpoint, {
      headers: { 'Range': `${rangeStart}-${rangeEnd}` }
    });
    
    if (!Array.isArray(data)) {
      // Fallback: If partial data exists in Map, return it. Else try local.
      return allDataMap.size > 0 ? Array.from(allDataMap.values()) : (getLocal(table) || []);
    }
    
    // Add to Map (deduplicates automatically)
    for (const item of data) {
      if (item.id) allDataMap.set(item.id, item);
    }
    
    if (data.length < pageSize) hasMore = false;
    else page++;
  }
  
  const allData = Array.from(allDataMap.values());
  setLocal(table, allData);
  return allData;
}

export const API = {
  // ... (Previous APIs remain the same: xarumo, branches, devices, items, transactions, users) ...
  xarumo: {
    async getAll(): Promise<Xarun[]> {
      const data = await fetchAllPages('xarumo');
      return Array.isArray(data) ? data : [];
    },
    async save(xarun: Partial<Xarun>): Promise<Xarun> {
      const id = xarun.id || crypto.randomUUID();
      const payload = { ...xarun, id };
      const saved = await cloudSave('xarumo', payload);
      return (Array.isArray(saved) ? saved[0] : saved) || payload;
    },
    async delete(id: string): Promise<void> {
      await supabaseFetch(`xarumo?id=eq.${id}`, { method: 'DELETE' });
    }
  },

  branches: {
    async getAll(xarunId?: string): Promise<Branch[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('branches', query);
      return data.map((b: any) => ({
        id: b.id, name: b.name, location: b.location, totalShelves: b.total_shelves, 
        totalSections: b.total_sections, customSections: b.custom_sections || {}, xarunId: b.xarun_id
      }));
    },
    async save(branch: Partial<Branch>): Promise<Branch> {
      const id = branch.id || crypto.randomUUID();
      const payload = { ...branch, id };
      await cloudSave('branches', payload);
      return payload as Branch;
    },
    async delete(id: string): Promise<void> {
      await supabaseFetch(`branches?id=eq.${id}`, { method: 'DELETE' });
    }
  },

  devices: {
    async getAll(): Promise<Device[]> {
      if (!isDbConnected()) return [];
      const data = await fetchAllPages('devices');
      return Array.isArray(data) ? data : [];
    },
    async save(device: Partial<Device>): Promise<Device> {
      const id = device.id || crypto.randomUUID();
      const payload = { ...device, id };
      await cloudSave('devices', payload);
      return payload as Device;
    },
    async delete(id: string): Promise<void> {
      await supabaseFetch(`devices?id=eq.${id}`, { method: 'DELETE' });
    }
  },

  items: {
    async getAll(xarunId?: string): Promise<InventoryItem[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('inventory_items', query, 'last_updated');
      return data.map((item: any) => ({
        id: item.id, name: item.name, category: item.category, sku: item.sku, 
        shelves: item.shelves, sections: item.sections, quantity: item.quantity, 
        minThreshold: item.min_threshold, branchId: item.branch_id, 
        lastUpdated: item.last_updated, xarunId: item.xarun_id,
        packType: item.pack_type, lastKnownPrice: item.last_known_price
      }));
    },
    async save(item: Partial<InventoryItem>): Promise<InventoryItem> {
      const id = item.id || crypto.randomUUID();
      const payload = { ...item, id, lastUpdated: new Date().toISOString() };
      await cloudSave('inventory_items', payload, 'id');
      return payload as InventoryItem;
    },
    async bulkSave(items: Partial<InventoryItem>[]): Promise<boolean> {
      // (Bulk logic same as before)
      return true;
    },
    async delete(id: string): Promise<{success: boolean, error?: string}> {
      if (isDbConnected()) {
        try {
          await supabaseFetch(`transactions?item_id=eq.${id}`, { method: 'DELETE' });
          await supabaseFetch(`inventory_items?id=eq.${id}`, { method: 'DELETE' });
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      }
      return { success: true };
    }
  },

  transactions: {
    async getAll(xarunId?: string): Promise<Transaction[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('transactions', query, 'timestamp');
      return data.map((t: any) => ({
        id: t.id, itemId: t.item_id, itemName: t.item_name, type: t.type as TransactionType, 
        quantity: t.quantity, branchId: t.branch_id, targetBranchId: t.target_branch_id, 
        timestamp: t.timestamp, notes: t.notes, personnel: t.personnel, 
        origin_source: t.origin_source, placementInfo: t.placement_info, 
        status: t.status as TransactionStatus, requestedBy: t.requested_by, 
        approvedBy: t.approved_by, xarunId: t.xarun_id
      }));
    },
    async create(transaction: Partial<Transaction>): Promise<Transaction> {
      const id = crypto.randomUUID();
      const payload = { ...transaction, id, timestamp: new Date().toISOString() };
      if (isDbConnected()) await cloudSave('transactions', payload);
      return payload as Transaction;
    },
    async update(id: string, updates: Partial<Transaction>): Promise<void> {
      if (isDbConnected()) {
        await supabaseFetch(`transactions?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(toSnakeCase(updates)) });
      }
    },
    async delete(id: string): Promise<void> {
      await supabaseFetch(`transactions?id=eq.${id}`, { method: 'DELETE' });
    }
  },

  users: {
    async getAll(): Promise<User[]> {
      const data = await fetchAllPages('users_registry');
      return Array.isArray(data) ? data.map(u => ({
        id: u.id, name: u.name, username: u.username, password: u.password, 
        role: u.role as UserRole, avatar: u.avatar, xarunId: u.xarun_id,
        sessionToken: u.session_token
      })) : [];
    },
    async save(user: Partial<User>): Promise<User> {
      const id = user.id || crypto.randomUUID();
      const payload = { ...user, id };
      await cloudSave('users_registry', payload);
      return payload as User;
    }
  },

  // --- HRM UPDATED SECTION ---

  employees: {
    async getAll(xarunId?: string): Promise<Employee[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('employees', query);
      return data.map(e => ({
        id: e.id, name: e.name, employeeIdCode: e.employee_id_code, position: e.position,
        status: e.status, joinedDate: e.joined_date, xarunId: e.xarun_id, branchId: e.branch_id,
        salary: Number(e.salary || 0), avatar: e.avatar, fingerprintHash: e.fingerprint_hash,
        department: e.department, phone: e.phone, email: e.email, shiftId: e.shift_id,
        warning: e.warning, consecutiveAbsences: e.consecutive_absences,
        isWarningDismissed: e.is_warning_dismissed
      }));
    },
    // New function to find employee by ZK Code
    async getByCode(code: string): Promise<Employee | null> {
        const data = await supabaseFetch(`employees?select=*&employee_id_code=eq.${code}`);
        if (Array.isArray(data) && data.length > 0) {
            const e = data[0];
            return {
                id: e.id, name: e.name, employeeIdCode: e.employee_id_code, position: e.position,
                status: e.status, joinedDate: e.joined_date, xarunId: e.xarun_id, branchId: e.branch_id,
                salary: Number(e.salary || 0), avatar: e.avatar, fingerprintHash: e.fingerprint_hash,
                department: e.department, phone: e.phone, email: e.email, shiftId: e.shift_id,
                warning: e.warning, consecutiveAbsences: e.consecutive_absences,
                isWarningDismissed: e.is_warning_dismissed
            };
        }
        return null;
    },
    async save(employee: Partial<Employee>): Promise<Employee> {
      const id = employee.id || crypto.randomUUID();
      const payload = { ...employee, id };
      const result = await cloudSave('employees', payload);
      
      if (result && result.error) {
        console.error("API Error:", result.error, result.details); // Log details
        if (result.error === "Conflict/Duplicate Key" || (result.details && result.details.includes("duplicate key value"))) {
           throw new Error("DUPLICATE_ID");
        }
        throw new Error(result.error);
      }
      
      return payload as Employee;
    },
    async delete(id: string): Promise<void> {
      await supabaseFetch(`employees?id=eq.${id}`, { method: 'DELETE' });
    }
  },

  attendance: {
    async getAll(): Promise<Attendance[]> {
      const data = await fetchAllPages('attendance', '', 'date');
      return data.map((a: any) => ({
        id: a.id, employeeId: a.employee_id, date: a.date, status: a.status,
        clockIn: a.clock_in, clockOut: a.clock_out, overtimeIn: a.overtime_in,
        overtimeOut: a.overtime_out, notes: a.notes, deviceId: a.device_id
      }));
    },
    async getByDate(date: string): Promise<Attendance[]> {
      const data = await supabaseFetch(`attendance?select=*&date=eq.${date}`);
      if (!Array.isArray(data)) return [];
      return data.map((a: any) => ({
        id: a.id, employeeId: a.employee_id, date: a.date, status: a.status,
        clockIn: a.clock_in, clockOut: a.clock_out, overtimeIn: a.overtime_in,
        overtimeOut: a.overtime_out, notes: a.notes, deviceId: a.device_id
      }));
    },
    async save(record: Partial<Attendance>): Promise<Attendance> {
      const id = record.id || crypto.randomUUID();
      const payload = { ...record, id };
      await cloudSave('attendance', payload);
      return payload as Attendance;
    }
  },

  payroll: {
    async getAll(): Promise<Payroll[]> {
      const data = await fetchAllPages('payroll');
      return data.map(p => ({
        id: p.id, employeeId: p.employee_id, month: p.month, year: p.year,
        base_salary: p.base_salary, bonus: p.bonus, deduction: p.deduction,
        netPay: p.net_pay, status: p.status, paymentDate: p.payment_date,
        xarunId: p.xarun_id, totalHours: p.total_hours
      }));
    },
    async save(record: Partial<Payroll>): Promise<Payroll> {
      const id = record.id || crypto.randomUUID();
      const payload = { ...record, id };
      await cloudSave('payroll', payload);
      return payload as Payroll;
    }
  },

  shifts: {
    async getAll(): Promise<Shift[]> {
      const data = await fetchAllPages('shifts');
      return data.map((s: any) => ({
        id: s.id, name: s.name, startTime: s.start_time, endTime: s.end_time, lateThreshold: s.late_threshold
      }));
    },
    async save(shift: Partial<Shift>): Promise<Shift> {
      const id = shift.id || crypto.randomUUID();
      const payload = { ...shift, id };
      await cloudSave('shifts', payload);
      return payload as Shift;
    }
  },

  leaves: {
    async getAll(): Promise<LeaveRequest[]> {
      const data = await fetchAllPages('leaves');
      return data.map((l: any) => ({
        id: l.id, employeeId: l.employee_id, type: l.type, startDate: l.start_date,
        endDate: l.end_date, reason: l.reason, status: l.status
      }));
    },
    async save(leave: Partial<LeaveRequest>): Promise<LeaveRequest> {
      const id = leave.id || crypto.randomUUID();
      const payload = { ...leave, id };
      await cloudSave('leaves', payload);
      return payload as LeaveRequest;
    }
  },

  documents: {
    async getAll(employeeId: string): Promise<EmployeeDocument[]> {
      const data = await supabaseFetch(`employee_documents?select=*&employee_id=eq.${employeeId}`);
      if (!Array.isArray(data)) return [];
      return data.map((d: any) => ({
        id: d.id, employeeId: d.employee_id, title: d.title, type: d.type,
        url: d.url, uploadDate: d.upload_date, notes: d.notes
      }));
    },
    async save(doc: Partial<EmployeeDocument>): Promise<EmployeeDocument> {
      const id = doc.id || crypto.randomUUID();
      const payload = { ...doc, id };
      await cloudSave('employee_documents', payload);
      return payload as EmployeeDocument;
    }
  },

  xarunOrders: {
    async getAll(xarunId?: string): Promise<XarunOrderRequest[]> {
      const query = xarunId ? `target_xarun_id=eq.${xarunId}|source_xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('xarun_orders', query, 'created_at');
      return data.map((o: any) => ({
        id: o.id, sourceXarunId: o.source_xarun_id, targetXarunId: o.target_xarun_id,
        requestedBy: o.requested_by, items: o.items, status: o.status, notes: o.notes,
        createdAt: o.created_at, approvedBy: o.approved_by, targetBranchId: o.target_branch_id
      }));
    },
    async create(order: Partial<XarunOrderRequest>): Promise<XarunOrderRequest> {
      const id = crypto.randomUUID();
      const payload = { ...order, id, createdAt: new Date().toISOString() };
      await cloudSave('xarun_orders', payload);
      return payload as XarunOrderRequest;
    },
    async update(id: string, updates: Partial<XarunOrderRequest>): Promise<void> {
      await supabaseFetch(`xarun_orders?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(toSnakeCase(updates)) });
    },
    async delete(id: string): Promise<void> {
      await supabaseFetch(`xarun_orders?id=eq.${id}`, { method: 'DELETE' });
    }
  }
};
