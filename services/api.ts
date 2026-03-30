
import { InventoryItem, Transaction, Branch, User, TransactionStatus, Xarun, UserRole, TransactionType, Employee, Attendance, Payroll, Device, Shift, LeaveRequest, EmployeeDocument, XarunOrderRequest, InterBranchTransferRequest, Customer, Vendor, Sale, LedgerEntry, Account, AccountType, Payment, PurchaseOrder, JournalEntry, JournalEntryLine, AuditLog } from '../types';
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
  isWarningDismissed: 'is_warning_dismissed',
  sourceBranchId: 'source_branch_id',
  auditTrail: 'audit_trail',
  updatedAt: 'updated_at',
  rackNumber: 'rack_number',
  binLocation: 'bin_location',
  expectedArrivalDate: 'expected_arrival_date'
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const toSnakeCase = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(item => toSnakeCase(item));
  if (obj === null || typeof obj !== 'object' || obj instanceof Date) return obj;
  const newObj: Record<string, any> = {};
  for (let key in obj) {
    const snakeKey = FIELD_MAPPING[key] || key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    newObj[snakeKey] = toSnakeCase(obj[key]);
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

async function cloudSave(table: string, data: any, conflictColumn: string = 'id', isRetry: boolean = false): Promise<any> {
  if (!isDbConnected()) return null;
  const payload = isRetry ? data : toSnakeCase(data);
  const result = await supabaseFetch(`${table}?on_conflict=${conflictColumn}`, {
    method: 'POST',
    headers: {
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(payload)
  });

  if (result && typeof result === 'object' && ('error' in result || 'message' in result)) {
    const errorMsg = String(result.error || '') + ' ' + String(result.details || '') + ' ' + String(result.message || '');
    
    // Auto-retry for missing columns
    if (errorMsg.includes("does not exist") && errorMsg.includes("column")) {
      // Match "column table.colname does not exist" OR "column colname of relation table does not exist" OR "column colname does not exist"
      const match1 = errorMsg.match(/column "?([^"]+)"? of relation/);
      const match2 = errorMsg.match(/column "?[a-zA-Z0-9_]+"?\."?([^"]+)"? does not exist/);
      const match3 = errorMsg.match(/column "?([^"]+)"? does not exist/);
      const missingCol = (match1 && match1[1]) || (match2 && match2[1]) || (match3 && match3[1]);
      
      if (missingCol) {
        console.warn(`Column ${missingCol} missing in ${table}, retrying without it...`);
        const newPayload = { ...payload };
        delete newPayload[missingCol];
        return await cloudSave(table, newPayload, conflictColumn, true);
      }
    }

    if (result.error === "Not Found" || result.status === 404) {
      console.warn(`Table ${table} not found in Supabase. Saving locally only.`);
      const localData = getLocal(table) || [];
      setLocal(table, [...localData, data]);
      return null;
    }
    console.error(`Supabase cloudSave error for table ${table}:`, result.error, result.message, result.details);
    throw new Error(`Database Error: ${result.message || result.error}`);
  }
  return result;
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
    let endpoint = `${table}?select=*${separator}${queryParams}`;
    if (orderBy) {
      endpoint += `&order=${orderBy}.desc`;
    }
    
    let data = await supabaseFetch(endpoint, {
      headers: { 'Range': `${rangeStart}-${rangeEnd}` }
    });
    
    if (data && typeof data === 'object' && ('error' in data || 'message' in data)) {
      const errorMsg = String(data.error || '') + ' ' + String(data.details || '') + ' ' + String(data.message || '');
      // Retry without order if it's a column missing error
      if (errorMsg.includes("does not exist") && errorMsg.includes("column")) {
        const match1 = errorMsg.match(/column "?([^"]+)"? of relation/);
        const match2 = errorMsg.match(/column "?[a-zA-Z0-9_]+"?\."?([^"]+)"? does not exist/);
        const match3 = errorMsg.match(/column "?([^"]+)"? does not exist/);
        const missingCol = (match1 && match1[1]) || (match2 && match2[1]) || (match3 && match3[1]);
        
        console.warn(`Column ${missingCol || 'unknown'} missing in ${table}, retrying without order...`);
        endpoint = `${table}?select=*${separator}${queryParams}`;
        data = await supabaseFetch(endpoint, {
          headers: { 'Range': `${rangeStart}-${rangeEnd}` }
        });
      }
      
      // If still error, retry without queryParams (e.g., missing xarun_id)
      if (data && typeof data === 'object' && 'error' in data) {
        const errorMsg2 = String(data.error || '') + ' ' + String(data.details || '') + ' ' + String(data.message || '');
        if (errorMsg2.includes("does not exist") && errorMsg2.includes("column")) {
          const match1 = errorMsg2.match(/column "?([^"]+)"? of relation/);
          const match2 = errorMsg2.match(/column "?[a-zA-Z0-9_]+"?\."?([^"]+)"? does not exist/);
          const match3 = errorMsg2.match(/column "?([^"]+)"? does not exist/);
          const missingCol = (match1 && match1[1]) || (match2 && match2[1]) || (match3 && match3[1]);
          
          console.warn(`Column ${missingCol || 'unknown'} missing in ${table}, retrying without queryParams...`);
          endpoint = `${table}?select=*`;
          data = await supabaseFetch(endpoint, {
            headers: { 'Range': `${rangeStart}-${rangeEnd}` }
          });
        }
      }
    }
    
    if (data && typeof data === 'object' && 'error' in data) {
      const erpTables = ['customers', 'vendors', 'sales', 'ledger', 'chart_of_accounts', 'xarun_orders', 'inter_branch_transfer_requests', 'journal_entries', 'payments', 'purchase_orders', 'inventory_items', 'inventory_adjustments', 'stock_take_sessions', 'xarumo', 'branches', 'devices', 'users_registry', 'employees', 'attendance', 'payroll', 'shifts', 'leaves', 'employee_documents', 'audit_logs', 'leads', 'bills_of_materials', 'work_orders', 'projects', 'project_tasks', 'vehicles', 'fuel_logs', 'qc_inspections', 'documents', 'tickets', 'currencies'];
      if ((data.error === "Not Found" || data.status === 404) && erpTables.includes(table)) {
        console.warn(`Table ${table} not found, returning local data.`);
        return getLocal(table) || [];
      }
      console.error(`Error fetching ${table}:`, data.error);
      throw new Error(data.error);
    }

    if (!Array.isArray(data)) {
      // Fallback: If partial data exists in Map, return it. Else try local.
      return allDataMap.size > 0 ? Array.from(allDataMap.values()) : (getLocal(table) || []);
    }
    
    // Add to Map (deduplicates automatically)
    for (const item of data) {
      const key = item.id || item.employee_id_code || item.code || generateId();
      allDataMap.set(key, item);
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
      const data = await fetchAllPages('xarumo', '', 'id');
      return Array.isArray(data) ? data.map(x => ({
        id: x.id,
        name: x.name,
        location: x.location,
        logo: x.logo,
        address: x.address,
        phone: x.phone,
        email: x.email,
        website: x.website,
        taxId: x.tax_id,
        currency: x.currency,
        status: x.status || 'ACTIVE',
        plan: x.plan || 'BASIC',
        maxUsers: x.max_users,
        expiryDate: x.expiry_date,
        createdAt: x.created_at
      })) : [];
    },
    async save(xarun: Partial<Xarun>): Promise<Xarun> {
      const id = xarun.id || generateId();
      const payload = { 
        id, 
        name: xarun.name, 
        location: xarun.location,
        createdAt: xarun.createdAt || new Date().toISOString()
      };
      const saved = await cloudSave('xarumo', payload);
      return (Array.isArray(saved) ? saved[0] : saved) || { ...xarun, id };
    },
    async delete(id: string): Promise<void> {
      await supabaseFetch(`xarumo?id=eq.${id}`, { method: 'DELETE' });
    }
  },

  branches: {
    async getAll(xarunId?: string): Promise<Branch[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('branches', query, 'id');
      return data.map((b: any) => ({
        id: b.id, name: b.name, location: b.location, totalShelves: b.total_shelves, 
        totalSections: b.total_sections, customSections: b.custom_sections || {}, xarunId: b.xarun_id
      }));
    },
    async save(branch: Partial<Branch>): Promise<Branch> {
      const id = branch.id || generateId();
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
      const data = await fetchAllPages('devices', '', 'id');
      return Array.isArray(data) ? data : [];
    },
    async save(device: Partial<Device>): Promise<Device> {
      const id = device.id || generateId();
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
        packType: item.pack_type, lastKnownPrice: item.last_known_price,
        sellingPrice: item.selling_price, landedCost: item.landed_cost,
        supplier: item.supplier
      }));
    },
    async getById(id: string): Promise<InventoryItem | null> {
      const data = await supabaseFetch(`inventory_items?id=eq.${id}`);
      return Array.isArray(data) && data.length > 0 ? {
        id: data[0].id, name: data[0].name, category: data[0].category, sku: data[0].sku, 
        shelves: data[0].shelves, sections: data[0].sections, quantity: data[0].quantity, 
        minThreshold: data[0].min_threshold, branchId: data[0].branch_id, 
        lastUpdated: data[0].last_updated, xarunId: data[0].xarun_id,
        packType: data[0].pack_type, lastKnownPrice: data[0].last_known_price,
        sellingPrice: data[0].selling_price, landedCost: data[0].landed_cost,
        supplier: data[0].supplier
      } : null;
    },
    async save(item: Partial<InventoryItem>): Promise<InventoryItem> {
      const id = item.id || generateId();
      const payload = { ...item, id, lastUpdated: new Date().toISOString() };
      
      // Strip missing columns to prevent Supabase errors
      const safePayload = { ...payload };
      delete safePayload.packType;
      delete safePayload.lastKnownPrice;
      delete safePayload.sellingPrice;
      delete safePayload.landedCost;
      delete safePayload.supplier;

      await cloudSave('inventory_items', safePayload, 'id');
      return payload as InventoryItem;
    },
    async bulkSave(items: Partial<InventoryItem>[]): Promise<boolean> {
      if (!isDbConnected()) return false;
      try {
        const payload = items.map(item => {
          const safeItem = { ...item };
          delete safeItem.packType;
          delete safeItem.lastKnownPrice;
          delete safeItem.sellingPrice;
          delete safeItem.landedCost;
          delete safeItem.supplier;
          return toSnakeCase({
            ...safeItem,
            lastUpdated: new Date().toISOString()
          });
        });
        
        const result = await supabaseFetch(`inventory_items?on_conflict=sku,branch_id`, {
          method: 'POST',
          headers: {
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(payload)
        });

        if (result && result.error) {
          console.error("Bulk Save Error:", result.error);
          return false;
        }
        return true;
      } catch (e) {
        console.error("Bulk Save Exception:", e);
        return false;
      }
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
      const id = generateId();
      const payload = { ...transaction, id, timestamp: new Date().toISOString() };
      
      if (isDbConnected()) {
        const safePayload = { ...payload } as any;
        delete safePayload.unitCost;
        if (safePayload.originOrSource) {
          safePayload.origin_source = safePayload.originOrSource;
          delete safePayload.originOrSource;
        }
        if (safePayload.type === 'MOVE' || safePayload.type === 'ADJUSTMENT') {
          safePayload.type = 'TRANSFER';
        }
        await cloudSave('transactions', safePayload);
      }

      // Inventory Accounting integration
      if (payload.status === 'APPROVED' && payload.unitCost) {
        const ledgerEntries: Partial<LedgerEntry>[] = [];
        const totalCost = (payload.quantity || 0) * (payload.unitCost || 0);
        
        if (payload.type === 'IN') {
          ledgerEntries.push({
            date: payload.timestamp,
            description: `Inventory IN: ${payload.itemName}`,
            type: 'DEBIT',
            accountCode: '1300', // Inventory
            accountName: 'Inventory',
            amount: totalCost,
            referenceId: id,
            xarunId: payload.xarunId,
            category: 'Asset'
          });
          ledgerEntries.push({
            date: payload.timestamp,
            description: `Equity/Cash for IN: ${payload.itemName}`,
            type: 'CREDIT',
            accountCode: '3000', // Owner Equity (or 1000 if cash)
            accountName: 'Owner Equity',
            amount: totalCost,
            referenceId: id,
            xarunId: payload.xarunId,
            category: 'Equity'
          });
        } else if (payload.type === 'OUT') {
          ledgerEntries.push({
            date: payload.timestamp,
            description: `Inventory OUT: ${payload.itemName}`,
            type: 'CREDIT',
            accountCode: '1300', // Inventory
            accountName: 'Inventory',
            amount: totalCost,
            referenceId: id,
            xarunId: payload.xarunId,
            category: 'Asset'
          });
          ledgerEntries.push({
            date: payload.timestamp,
            description: `COGS: ${payload.itemName}`,
            type: 'DEBIT',
            accountCode: '5000', // COGS
            accountName: 'Cost of Goods Sold',
            amount: totalCost,
            referenceId: id,
            xarunId: payload.xarunId,
            category: 'Expense'
          });
        }
        
        for (const entry of ledgerEntries) {
          await API.ledger.create(entry);
        }
      }

      return payload as Transaction;
    },
    async update(id: string, updates: Partial<Transaction>): Promise<void> {
      if (isDbConnected()) {
        const safeUpdates = { ...updates } as any;
        delete safeUpdates.unitCost;
        if (safeUpdates.originOrSource) {
          safeUpdates.origin_source = safeUpdates.originOrSource;
          delete safeUpdates.originOrSource;
        }
        if (safeUpdates.type === 'MOVE' || safeUpdates.type === 'ADJUSTMENT') {
          safeUpdates.type = 'TRANSFER';
        }
        await supabaseFetch(`transactions?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(toSnakeCase(safeUpdates)) });
      }
    },
    async delete(id: string): Promise<void> {
      await supabaseFetch(`transactions?id=eq.${id}`, { method: 'DELETE' });
    }
  },

  users: {
    async getAll(): Promise<User[]> {
      const data = await fetchAllPages('users_registry', '', 'id');
      return Array.isArray(data) ? data.map(u => ({
        id: u.id, name: u.name, username: u.username, password: u.password, 
        role: u.role as UserRole, avatar: u.avatar, xarunId: u.xarun_id,
        permissions: u.permissions || []
      })) : [];
    },
    async save(user: Partial<User>): Promise<User> {
      const id = user.id || generateId();
      const payload = { 
        id, 
        name: user.name, 
        username: user.username, 
        password: user.password, 
        role: user.role, 
        avatar: user.avatar, 
        xarun_id: user.xarunId,
        // permissions: user.permissions // Omitted to fix PGRST204 error
      };
      await cloudSave('users_registry', payload);
      return { ...user, id } as User;
    }
  },

  // --- HRM UPDATED SECTION ---

  employees: {
    async getAll(xarunId?: string): Promise<Employee[]> {
      const query = xarunId ? `or=(xarun_id.eq.${xarunId},xarun_id.is.null)` : '';
      const data = await fetchAllPages('employees', query, 'id');
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
      const id = employee.id || generateId();
      // Clean up empty strings for optional fields that might have foreign key constraints
      const cleanEmployee = { ...employee };
      if (cleanEmployee.branchId === '') delete cleanEmployee.branchId;
      if (cleanEmployee.shiftId === '') delete cleanEmployee.shiftId;
      
      const payload = { ...cleanEmployee, id };
      const result = await cloudSave('employees', payload);
      
      if (result && result.error) {
        console.error("API Error:", result.error, result.details);
        // Only throw DUPLICATE_ID if it's actually a unique constraint violation on employee_id_code or id
        const isDuplicate = result.error === "Conflict/Duplicate Key" && 
                          (result.details?.includes("employee_id_code") || result.details?.includes("employees_pkey"));
        
        if (isDuplicate) {
           throw new Error("DUPLICATE_ID");
        }
        throw new Error(result.error + (result.details ? ": " + result.details : ""));
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
      return data.map((a: any) => {
        let status = a.status;
        if (status === 'LEAVE' && a.notes?.includes('HOLIDAY')) {
          status = 'HOLIDAY';
        }
        
        // Auto-checkout logic for missing clockOuts past 17:00
        let clockOut = a.clock_out;
        if (a.clock_in && !a.clock_out && status !== 'ABSENT' && status !== 'LEAVE' && status !== 'HOLIDAY') {
          const now = new Date();
          const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
          const currentHour = now.getHours();
          
          const isPastDate = a.date < todayStr;
          const isTodayPast17 = a.date === todayStr && currentHour >= 17;
          
          if (isPastDate || isTodayPast17) {
            const clockInTime = new Date(a.clock_in);
            if (clockInTime.getUTCHours() < 17) {
              clockOut = `${a.date}T17:00:00+00:00`;
            }
          }
        }

        return {
          id: a.id, employeeId: a.employee_id, date: a.date, status: status,
          clockIn: a.clock_in, clockOut: clockOut, overtimeIn: a.overtime_in,
          overtimeOut: a.overtime_out, notes: a.notes, deviceId: a.device_id
        };
      });
    },
    async getByDate(date: string): Promise<Attendance[]> {
      const data = await supabaseFetch(`attendance?select=*&date=eq.${date}`);
      if (!Array.isArray(data)) return [];
      return data.map((a: any) => {
        let status = a.status;
        if (status === 'LEAVE' && a.notes?.includes('HOLIDAY')) {
          status = 'HOLIDAY';
        }
        
        // Auto-checkout logic for missing clockOuts past 17:00
        let clockOut = a.clock_out;
        if (a.clock_in && !a.clock_out && status !== 'ABSENT' && status !== 'LEAVE' && status !== 'HOLIDAY') {
          const now = new Date();
          const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
          const currentHour = now.getHours();
          
          const isPastDate = a.date < todayStr;
          const isTodayPast17 = a.date === todayStr && currentHour >= 17;
          
          if (isPastDate || isTodayPast17) {
            const clockInTime = new Date(a.clock_in);
            if (clockInTime.getUTCHours() < 17) {
              clockOut = `${a.date}T17:00:00+00:00`;
            }
          }
        }

        return {
          id: a.id, employeeId: a.employee_id, date: a.date, status: status,
          clockIn: a.clock_in, clockOut: clockOut, overtimeIn: a.overtime_in,
          overtimeOut: a.overtime_out, notes: a.notes, deviceId: a.device_id
        };
      });
    },
    async save(record: Partial<Attendance>): Promise<Attendance> {
      const id = record.id || generateId();
      let statusToSave = record.status;
      let notesToSave = record.notes;
      
      if (statusToSave === 'HOLIDAY') {
        statusToSave = 'LEAVE';
        notesToSave = notesToSave ? (notesToSave.includes('HOLIDAY') ? notesToSave : `HOLIDAY - ${notesToSave}`) : 'HOLIDAY';
      } else if (statusToSave === 'LEAVE' && notesToSave?.includes('HOLIDAY')) {
        notesToSave = notesToSave.replace('HOLIDAY - ', '').replace('HOLIDAY', '').trim();
      }
      
      const payload = { ...record, id, status: statusToSave, notes: notesToSave };
      await cloudSave('attendance', payload);
      
      return { ...payload, status: record.status } as Attendance;
    },
    async delete(id: string): Promise<void> {
      await supabaseFetch(`attendance?id=eq.${id}`, { method: 'DELETE' });
    }
  },

  payroll: {
    async getAll(): Promise<Payroll[]> {
      const data = await fetchAllPages('payroll', '', 'id');
      return data.map(p => ({
        id: p.id, employeeId: p.employee_id, month: p.month, year: p.year,
        base_salary: p.base_salary, bonus: p.bonus, deduction: p.deduction,
        netPay: p.net_pay, status: p.status, paymentDate: p.payment_date,
        xarunId: p.xarun_id, totalHours: p.total_hours
      }));
    },
    async save(record: Partial<Payroll>): Promise<Payroll> {
      const id = record.id || generateId();
      const payload = { ...record, id };
      await cloudSave('payroll', payload);
      return payload as Payroll;
    }
  },

  shifts: {
    async getAll(): Promise<Shift[]> {
      const data = await fetchAllPages('shifts', '', 'id');
      return data.map((s: any) => ({
        id: s.id, name: s.name, startTime: s.start_time, endTime: s.end_time, lateThreshold: s.late_threshold
      }));
    },
    async save(shift: Partial<Shift>): Promise<Shift> {
      const id = shift.id || generateId();
      const payload = { ...shift, id };
      await cloudSave('shifts', payload);
      return payload as Shift;
    }
  },

  leaves: {
    async getAll(): Promise<LeaveRequest[]> {
      const data = await fetchAllPages('leaves', '', 'id');
      return data.map((l: any) => ({
        id: l.id, employeeId: l.employee_id, type: l.type, startDate: l.start_date,
        endDate: l.end_date, reason: l.reason, status: l.status
      }));
    },
    async save(leave: Partial<LeaveRequest>): Promise<LeaveRequest> {
      const id = leave.id || generateId();
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
      const id = doc.id || generateId();
      const payload = { ...doc, id };
      await cloudSave('employee_documents', payload);
      return payload as EmployeeDocument;
    }
  },

  xarunOrders: {
    async getAll(xarunId?: string): Promise<XarunOrderRequest[]> {
      const query = xarunId ? `or=(target_xarun_id.eq.${encodeURIComponent(xarunId)},source_xarun_id.eq.${encodeURIComponent(xarunId)})` : '';
      const data = await fetchAllPages('xarun_orders', query, 'created_at');
      return data.map((o: any) => ({
        id: o.id, sourceXarunId: o.source_xarun_id, targetXarunId: o.target_xarun_id,
        requestedBy: o.requested_by, items: o.items, status: o.status, notes: o.notes,
        createdAt: o.created_at, approvedBy: o.approved_by, targetBranchId: o.target_branch_id
      }));
    },
    async create(order: Partial<XarunOrderRequest>): Promise<XarunOrderRequest> {
      const id = generateId();
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
  },

  interBranchTransferRequests: {
    async getAll(xarunId?: string): Promise<InterBranchTransferRequest[]> {
      const query = xarunId ? `or=(target_xarun_id.eq.${encodeURIComponent(xarunId)},source_xarun_id.eq.${encodeURIComponent(xarunId)})` : '';
      const data = await fetchAllPages('inter_branch_transfer_requests', query, 'created_at');
      return data.map((t: any) => ({
        id: t.id,
        sourceXarunId: t.source_xarun_id,
        sourceBranchId: t.source_branch_id,
        targetXarunId: t.target_xarun_id,
        targetBranchId: t.target_branch_id,
        requestedBy: t.requested_by,
        items: t.items,
        status: t.status,
        notes: t.notes,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        auditTrail: t.audit_trail || [],
        approvedBy: t.approved_by,
        preparedBy: t.prepared_by,
        shippedBy: t.shipped_by,
        receivedBy: t.received_by,
        rackNumber: t.rack_number,
        binLocation: t.bin_location,
        expectedArrivalDate: t.expected_arrival_date,
      }));
    },
    async create(request: Partial<InterBranchTransferRequest>): Promise<InterBranchTransferRequest> {
      const id = generateId();
      const payload = { ...request, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), auditTrail: request.auditTrail || [] };
      await cloudSave('inter_branch_transfer_requests', payload);
      return payload as InterBranchTransferRequest;
    },
    async update(id: string, updates: Partial<InterBranchTransferRequest>): Promise<void> {
      const payload = { ...updates, updatedAt: new Date().toISOString() };
      await supabaseFetch(`inter_branch_transfer_requests?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(toSnakeCase(payload)) });
    },
    async delete(id: string): Promise<void> {
      await supabaseFetch(`inter_branch_transfer_requests?id=eq.${id}`, { method: 'DELETE' });
    }
  },

  customers: {
    async getById(id: string): Promise<Customer | null> {
      const data = await supabaseFetch(`customers?id=eq.${id}`);
      return Array.isArray(data) && data.length > 0 ? {
        id: data[0].id, name: data[0].name, phone: data[0].phone, email: data[0].email, address: data[0].address, xarunId: data[0].xarun_id, balance: data[0].balance || 0
      } : null;
    },
    async getAll(xarunId?: string): Promise<Customer[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('customers', query, 'id');
      return data.map(c => ({
        id: c.id, name: c.name, phone: c.phone, email: c.email, address: c.address, xarunId: c.xarun_id, balance: c.balance || 0
      }));
    },
    async save(customer: Partial<Customer>): Promise<Customer> {
      const id = customer.id || generateId();
      const payload = { ...customer, id };
      await cloudSave('customers', payload);
      return payload as Customer;
    },
    async bulkSave(customers: Partial<Customer>[]): Promise<boolean> {
      try {
        for (const customer of customers) {
          await this.save(customer);
        }
        return true;
      } catch (error) {
        console.error("Bulk customer save error:", error);
        return false;
      }
    }
  },

  vendors: {
    async getById(id: string): Promise<Vendor | null> {
      const data = await supabaseFetch(`vendors?id=eq.${id}`);
      return Array.isArray(data) && data.length > 0 ? {
        id: data[0].id, name: data[0].name, contactName: data[0].contact_name, phone: data[0].phone, email: data[0].email, address: data[0].address, category: data[0].category, xarunId: data[0].xarun_id, balance: data[0].balance || 0
      } : null;
    },
    async getAll(xarunId?: string): Promise<Vendor[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('vendors', query, 'id');
      return data.map(v => ({
        id: v.id, name: v.name, contactName: v.contact_name, phone: v.phone, email: v.email, address: v.address, category: v.category, xarunId: v.xarun_id, balance: v.balance || 0
      }));
    },
    async save(vendor: Partial<Vendor>): Promise<Vendor> {
      const id = vendor.id || generateId();
      const payload = { ...vendor, id };
      await cloudSave('vendors', payload);
      return payload as Vendor;
    },
    async bulkSave(vendors: Partial<Vendor>[]): Promise<boolean> {
      try {
        for (const vendor of vendors) {
          await this.save(vendor);
        }
        return true;
      } catch (error) {
        console.error("Bulk vendor save error:", error);
        return false;
      }
    }
  },

  sales: {
    async getAll(xarunId?: string): Promise<Sale[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('sales', query, 'timestamp');
      return data.map(s => ({
        id: s.id, customerId: s.customer_id, customerName: s.customer_name, items: s.items, subtotal: s.subtotal, vatAmount: s.vat_amount, total: s.total, applyVat: s.apply_vat, paymentMethod: s.payment_method, timestamp: s.timestamp, branchId: s.branch_id, xarunId: s.xarun_id, personnel: s.personnel, isVatSale: s.is_vat_sale
      }));
    },
    async create(sale: Partial<Sale>): Promise<Sale> {
      const id = generateId();
      const payload = { ...sale, id, timestamp: new Date().toISOString(), type: sale.type || 'SALE' };
      await cloudSave('sales', payload);
      
      const isReturn = payload.type === 'CREDIT_MEMO';
      const isFinancial = payload.type === 'SALE' || payload.type === 'CREDIT_MEMO';

      if (!isFinancial) {
        return payload as Sale;
      }

      // QuickBooks Logic: Balanced Journal Entry
      const lines: JournalEntryLine[] = [
        {
          accountId: '', 
          accountCode: isReturn ? '4100' : '4000', // 4100 for Returns, 4000 for Sales
          accountName: isReturn ? 'Sales Returns' : 'Sales Income',
          debit: isReturn ? (payload.subtotal || 0) : 0,
          credit: isReturn ? 0 : (payload.subtotal || 0),
          memo: `${payload.type} ${id}`
        },
        {
          accountId: '',
          accountCode: payload.paymentMethod === 'CASH' ? '1000' : (payload.paymentMethod === 'BANK' ? '1100' : '1200'),
          accountName: payload.paymentMethod === 'CASH' ? 'Cash on Hand' : (payload.paymentMethod === 'BANK' ? 'Bank Account' : 'Accounts Receivable'),
          debit: isReturn ? 0 : (payload.total || 0),
          credit: isReturn ? (payload.total || 0) : 0,
          memo: `Payment for ${payload.type} ${id}`
        }
      ];

      if (payload.applyVat && payload.vatAmount) {
        lines.push({
          accountId: '',
          accountCode: '2200',
          accountName: 'VAT Payable',
          debit: isReturn ? payload.vatAmount : 0,
          credit: isReturn ? 0 : payload.vatAmount,
          memo: `VAT for ${payload.type} ${id}`
        });
      }

      await API.journalEntries.create({
        date: payload.timestamp,
        reference: `${payload.type}-${id.slice(0,8)}`,
        description: `${payload.type} to ${payload.customerName || 'Walk-in Customer'}`,
        lines,
        xarunId: payload.xarunId,
        createdBy: payload.personnel || 'System',
        status: 'POSTED'
      });

      // Update Customer Balance if it's a credit sale/return
      if (payload.customerId && payload.paymentMethod === 'CREDIT') {
        const customer = await API.customers.getById(payload.customerId);
        if (customer) {
          const multiplier = isReturn ? -1 : 1;
          const newBalance = (customer.balance || 0) + (multiplier * (payload.total || 0));
          await API.customers.save({ ...customer, balance: newBalance });
        }
      }

      // Update Inventory if items are returned/sold
      if (payload.items) {
        for (const item of payload.items) {
          const invItem = await API.items.getById(item.itemId);
          if (invItem) {
            // If it's a sale, quantity decreases. If return, quantity increases.
            const qtyChange = isReturn ? item.quantity : -item.quantity;
            await API.items.save({ ...invItem, quantity: invItem.quantity + qtyChange });
          }
        }
      }

      return payload as Sale;
    }
  },

  accounts: {
    async getAll(xarunId?: string): Promise<Account[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('chart_of_accounts', query, 'code');
      return data.map(a => ({
        id: a.id, code: a.code, name: a.name, type: a.type as AccountType, balance: a.balance, xarunId: a.xarun_id, description: a.description, isSystem: a.is_system
      }));
    },
    async save(account: Partial<Account>): Promise<Account> {
      const id = account.id || generateId();
      const payload = { ...account, id };
      await cloudSave('chart_of_accounts', payload);
      return payload as Account;
    },
    async setupDefaultAccounts(xarunId: string): Promise<void> {
      const defaults: Partial<Account>[] = [
        { code: '1000', name: 'Cash on Hand', type: AccountType.BANK, isSystem: true },
        { code: '1100', name: 'Bank Account', type: AccountType.BANK, isSystem: true },
        { code: '1200', name: 'Accounts Receivable', type: AccountType.ACCOUNTS_RECEIVABLE, isSystem: true },
        { code: '1300', name: 'Inventory Asset', type: AccountType.INVENTORY_ASSET, isSystem: true },
        { code: '2100', name: 'Accounts Payable', type: AccountType.ACCOUNTS_PAYABLE, isSystem: true },
        { code: '2200', name: 'VAT Payable', type: AccountType.OTHER_CURRENT_LIABILITY, isSystem: true },
        { code: '3000', name: 'Owner Equity', type: AccountType.EQUITY, isSystem: true },
        { code: '3100', name: 'Retained Earnings', type: AccountType.EQUITY, isSystem: true },
        { code: '4000', name: 'Sales Income', type: AccountType.INCOME, isSystem: true },
        { code: '5000', name: 'Cost of Goods Sold', type: AccountType.COST_OF_GOODS_SOLD, isSystem: true },
        { code: '6000', name: 'General Expenses', type: AccountType.EXPENSE, isSystem: true },
        { code: '6100', name: 'Rent Expense', type: AccountType.EXPENSE, isSystem: true },
        { code: '6200', name: 'Utilities Expense', type: AccountType.EXPENSE, isSystem: true },
      ];
      
      for (const acc of defaults) {
        await this.save({ ...acc, xarunId, balance: 0 });
      }
    }
  },

  journalEntries: {
    async getAll(xarunId?: string): Promise<JournalEntry[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('journal_entries', query, 'date');
      return data.map(j => ({
        id: j.id, date: j.date, reference: j.reference, description: j.description, lines: j.lines, xarunId: j.xarun_id, createdBy: j.created_by, status: j.status
      }));
    },
    async create(entry: Partial<JournalEntry>): Promise<JournalEntry> {
      const id = generateId();
      const payload = { ...entry, id, date: entry.date || new Date().toISOString(), status: entry.status || 'POSTED' };
      await cloudSave('journal_entries', payload);
      
      // When a journal entry is created, it also populates the ledger for reporting
      if (payload.status === 'POSTED' && payload.lines) {
        for (const line of payload.lines) {
          await API.ledger.create({
            date: payload.date,
            description: payload.description,
            type: line.debit > 0 ? 'DEBIT' : 'CREDIT',
            accountCode: line.accountCode,
            accountName: line.accountName,
            amount: line.debit > 0 ? line.debit : line.credit,
            referenceId: id,
            xarunId: payload.xarunId,
            category: 'Journal'
          });
        }
      }
      
      return payload as JournalEntry;
    }
  },

  ledger: {
    async getAll(xarunId?: string): Promise<LedgerEntry[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('ledger', query, 'date');
      return data.map(l => ({
        id: l.id, date: l.date, description: l.description, type: l.type, accountCode: l.account_code, accountName: l.account_name, amount: l.amount, referenceId: l.reference_id, xarunId: l.xarun_id, category: l.category
      }));
    },
    async create(entry: Partial<LedgerEntry>): Promise<LedgerEntry> {
      const id = generateId();
      const payload = { ...entry, id };
      await cloudSave('ledger', payload);
      return payload as LedgerEntry;
    }
  },

  payments: {
    async getAll(xarunId?: string): Promise<Payment[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('payments', query, 'date');
      return data.map(p => ({
        id: p.id, date: p.date, amount: p.amount, method: p.method, type: p.type, referenceId: p.reference_id, description: p.description, xarunId: p.xarun_id, personnel: p.personnel, accountCode: p.account_code
      }));
    },
    async create(payment: Partial<Payment>): Promise<Payment> {
      const id = generateId();
      const payload = { ...payment, id, date: payment.date || new Date().toISOString() };
      await cloudSave('payments', payload);

      // QuickBooks Logic: Balanced Journal Entry
      const isIncome = payload.type === 'INCOME' || payload.type === 'CUSTOMER_PAYMENT';
      const lines: JournalEntryLine[] = [
        {
          accountId: '',
          accountCode: payload.method === 'CASH' ? '1000' : '1100',
          accountName: payload.method === 'CASH' ? 'Cash on Hand' : 'Bank Account',
          debit: isIncome ? (payload.amount || 0) : 0,
          credit: isIncome ? 0 : (payload.amount || 0),
          memo: payload.description
        },
        {
          accountId: '',
          accountCode: payload.accountCode || (isIncome ? '4000' : '6000'),
          accountName: 'Offset Account',
          debit: isIncome ? 0 : (payload.amount || 0),
          credit: isIncome ? (payload.amount || 0) : 0,
          memo: payload.description
        }
      ];

      await API.journalEntries.create({
        date: payload.date,
        reference: `PAY-${id.slice(0,8)}`,
        description: payload.description || 'Business Payment',
        lines,
        xarunId: payload.xarunId,
        createdBy: payload.personnel || 'System',
        status: 'POSTED'
      });

      return payload as Payment;
    }
  },

  purchaseOrders: {
    async getAll(xarunId?: string): Promise<PurchaseOrder[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('purchase_orders', query, 'date');
      return data.map(p => ({
        id: p.id, vendorId: p.vendor_id, vendorName: p.vendor_name, items: p.items, total: p.total, status: p.status, date: p.date, expectedDate: p.expected_date, branchId: p.branch_id, xarunId: p.xarun_id, personnel: p.personnel
      }));
    },
    async save(po: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
      const id = po.id || generateId();
      const payload = { ...po, id, date: po.date || new Date().toISOString() };
      await cloudSave('purchase_orders', payload);

      // QuickBooks Logic: Balanced Journal Entry for Received PO
      if (payload.status === 'RECEIVED') {
        const lines: JournalEntryLine[] = [
          {
            accountId: '',
            accountCode: '1300', // Inventory Asset
            accountName: 'Inventory Asset',
            debit: payload.total || 0,
            credit: 0,
            memo: `Purchase from ${payload.vendorName}`
          },
          {
            accountId: '',
            accountCode: '2100', // Accounts Payable
            accountName: 'Accounts Payable',
            debit: 0,
            credit: payload.total || 0,
            memo: `Liability to ${payload.vendorName}`
          }
        ];

        await API.journalEntries.create({
          date: payload.date,
          reference: `PO-${id.slice(0,8)}`,
          description: `Purchase Order Received: ${payload.vendorName}`,
          lines,
          xarunId: payload.xarunId,
          createdBy: payload.personnel || 'System',
          status: 'POSTED'
        });

        // Update Inventory
        if (payload.items && Array.isArray(payload.items)) {
          for (const item of payload.items) {
            const currentItem = await API.items.getById(item.id);
            if (currentItem) {
              await API.items.save({
                ...currentItem,
                quantity: (currentItem.quantity || 0) + (item.purchasedQty || 0),
                lastKnownPrice: item.actualPrice || currentItem.lastKnownPrice
              });

              // Log transaction
              await API.transactions.create({
                itemId: item.id,
                type: TransactionType.IN,
                quantity: item.purchasedQty || 0,
                unitCost: item.actualPrice || 0,
                originOrSource: `PO-${id.slice(0,8)}`,
                xarunId: payload.xarunId || '',
                personnel: payload.personnel || 'System',
                status: TransactionStatus.APPROVED
              });
            }
          }
        }
      }

      return payload as PurchaseOrder;
    }
  },

  auditLogs: {
    async getAll(xarunId?: string): Promise<AuditLog[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('audit_logs', query, 'timestamp');
      return data.map(l => ({
        id: l.id, timestamp: l.timestamp, userId: l.user_id, userName: l.user_name, action: l.action, entityType: l.entity_type, entityId: l.entity_id, details: l.details, xarunId: l.xarun_id
      }));
    },
    async log(log: Partial<AuditLog>): Promise<void> {
      const id = generateId();
      const payload = { 
        id, 
        timestamp: new Date().toISOString(),
        user_id: log.userId,
        user_name: log.userName,
        action: log.action,
        entity_type: log.entityType,
        entity_id: log.entityId,
        details: log.details,
        xarun_id: log.xarunId
      };
      await cloudSave('audit_logs', payload);
    }
  },

  // --- ODOO-LIKE ENHANCEMENTS API ---

  crm: {
    async getAllLeads(xarunId?: string): Promise<any[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('leads', query, 'created_at');
      return data.map(l => ({
        id: l.id, title: l.title, contactName: l.contact_name, companyName: l.company_name,
        email: l.email, phone: l.phone, expectedRevenue: l.expected_revenue,
        probability: l.probability, status: l.status, priority: l.priority,
        ownerId: l.owner_id, xarunId: l.xarun_id, createdAt: l.created_at, notes: l.notes
      }));
    },
    async saveLead(lead: any): Promise<any> {
      const id = lead.id || generateId();
      const payload = { ...lead, id, createdAt: lead.createdAt || new Date().toISOString() };
      await cloudSave('leads', payload);
      return payload;
    },
    async deleteLead(id: string): Promise<void> {
      await supabaseFetch(`leads?id=eq.${id}`, { method: 'DELETE' });
    }
  },

  mrp: {
    async getAllBoMs(xarunId?: string): Promise<any[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('bills_of_materials', query, 'id');
      return data.map(b => ({
        id: b.id, productId: b.product_id, productName: b.product_name, reference: b.reference,
        components: b.components, laborCost: b.labor_cost, overheadCost: b.overhead_cost,
        totalCost: b.total_cost, xarunId: b.xarun_id
      }));
    },
    async saveBoM(bom: any): Promise<any> {
      const id = bom.id || generateId();
      const payload = { ...bom, id };
      await cloudSave('bills_of_materials', payload);
      return payload;
    },
    async getAllWorkOrders(xarunId?: string): Promise<any[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('work_orders', query, 'planned_date');
      return data.map(w => ({
        id: w.id, bomId: w.bom_id, productId: w.product_id, productName: w.product_name,
        quantity: w.quantity, status: w.status, plannedDate: w.planned_date,
        actualDate: w.actual_date, xarunId: w.xarun_id, personnel: w.personnel
      }));
    },
    async saveWorkOrder(wo: any): Promise<any> {
      const id = wo.id || generateId();
      const payload = { ...wo, id };
      await cloudSave('work_orders', payload);
      return payload;
    }
  },

  projects: {
    async getAllProjects(xarunId?: string): Promise<any[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('projects', query);
      return data.map(p => ({
        id: p.id, name: p.name, description: p.description, status: p.status,
        xarunId: p.xarun_id, managerId: p.manager_id, startDate: p.start_date, endDate: p.end_date
      }));
    },
    async saveProject(project: any): Promise<any> {
      const id = project.id || generateId();
      const payload = { ...project, id };
      await cloudSave('projects', payload);
      return payload;
    },
    async getAllTasks(projectId?: string): Promise<any[]> {
      const query = projectId ? `project_id=eq.${projectId}` : '';
      const data = await fetchAllPages('project_tasks', query, 'created_at');
      return data.map(t => ({
        id: t.id, projectId: t.project_id, projectName: t.project_name, title: t.title,
        description: t.description, status: t.status, assignedTo: t.assigned_to,
        priority: t.priority, dueDate: t.due_date, createdAt: t.created_at
      }));
    },
    async saveTask(task: any): Promise<any> {
      const id = task.id || generateId();
      const payload = { ...task, id, createdAt: task.createdAt || new Date().toISOString() };
      await cloudSave('project_tasks', payload);
      return payload;
    }
  },

  fleet: {
    async getAllVehicles(xarunId?: string): Promise<any[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('vehicles', query, 'id');
      return data.map(v => ({
        id: v.id, model: v.model, licensePlate: v.license_plate, driverId: v.driver_id,
        driverName: v.driver_name, status: v.status, fuelLevel: v.fuel_level,
        lastServiceDate: v.last_service_date, xarunId: v.xarun_id
      }));
    },
    async saveVehicle(vehicle: any): Promise<any> {
      const id = vehicle.id || generateId();
      const payload = { ...vehicle, id };
      await cloudSave('vehicles', payload);
      return payload;
    },
    async getFuelLogs(vehicleId?: string): Promise<any[]> {
      const query = vehicleId ? `vehicle_id=eq.${vehicleId}` : '';
      const data = await fetchAllPages('fuel_logs', query, 'date');
      return data.map(l => ({
        id: l.id, vehicleId: l.vehicle_id, date: l.date, amount: l.amount,
        cost: l.cost, odometerReading: l.odometer_reading, personnel: l.personnel
      }));
    },
    async saveFuelLog(log: any): Promise<any> {
      const id = log.id || generateId();
      const payload = { ...log, id };
      await cloudSave('fuel_logs', payload);
      return payload;
    }
  },

  qc: {
    async getAllInspections(): Promise<any[]> {
      const data = await fetchAllPages('qc_inspections', '', 'date');
      return data.map(i => ({
        id: i.id, entityType: i.entity_type, entityId: i.entity_id, entityName: i.entity_name,
        inspectorId: i.inspector_id, inspectorName: i.inspector_name, date: i.date,
        status: i.status, notes: i.notes, checklist: i.checklist
      }));
    },
    async saveInspection(inspection: any): Promise<any> {
      const id = inspection.id || generateId();
      const payload = { ...inspection, id };
      await cloudSave('qc_inspections', payload);
      return payload;
    }
  },

  dms: {
    async getAllDocuments(xarunId?: string): Promise<any[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('documents', query, 'created_at');
      return data.map(d => ({
        id: d.id, title: d.title, type: d.type, url: d.url, ownerId: d.owner_id,
        entityType: d.entity_type, entityId: d.entity_id, createdAt: d.created_at,
        xarunId: d.xarun_id, fileSize: d.file_size
      }));
    },
    async saveDocument(doc: any): Promise<any> {
      const id = doc.id || generateId();
      const payload = { ...doc, id, createdAt: doc.createdAt || new Date().toISOString() };
      await cloudSave('documents', payload);
      return payload;
    }
  },

  helpdesk: {
    async getAllTickets(xarunId?: string): Promise<any[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('tickets', query, 'created_at');
      return data.map(t => ({
        id: t.id, customerId: t.customer_id, customerName: t.customer_name,
        subject: t.subject, description: t.description, priority: t.priority,
        status: t.status, assignedTo: t.assigned_to, assignedName: t.assigned_name,
        createdAt: t.created_at, xarunId: t.xarun_id
      }));
    },
    async saveTicket(ticket: any): Promise<any> {
      const id = ticket.id || generateId();
      const payload = { ...ticket, id, createdAt: ticket.createdAt || new Date().toISOString() };
      await cloudSave('tickets', payload);
      return payload;
    }
  },

  currencies: {
    async getAll(): Promise<any[]> {
      const data = await fetchAllPages('currencies', '', 'id');
      return data.map(c => ({
        id: c.id, code: c.code, name: c.name, symbol: c.symbol,
        exchangeRate: c.exchange_rate, isBase: c.is_base
      }));
    },
    async save(currency: any): Promise<any> {
      const id = currency.id || generateId();
      const payload = { ...currency, id };
      await cloudSave('currencies', payload);
      return payload;
    }
  },

  inventoryAdjustments: {
    async getAll(xarunId?: string): Promise<any[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('inventory_adjustments', query, 'timestamp');
      return data.map(a => ({
        id: a.id, itemId: a.item_id, itemName: a.item_name, type: a.type,
        quantity: a.quantity, reason: a.reason, timestamp: a.timestamp,
        createdBy: a.created_by, xarunId: a.xarun_id
      }));
    },
    async save(adjustment: any): Promise<any> {
      const id = adjustment.id || generateId();
      const payload = {
        id,
        item_id: adjustment.itemId,
        item_name: adjustment.itemName,
        type: adjustment.type,
        quantity: adjustment.quantity,
        reason: adjustment.reason,
        timestamp: adjustment.timestamp || new Date().toISOString(),
        created_by: adjustment.createdBy,
        xarun_id: adjustment.xarunId
      };
      await cloudSave('inventory_adjustments', payload);
      
      // Also update inventory item quantity
      const items = await API.items.getAll();
      const item = items.find((i: any) => i.id === adjustment.itemId);
      if (item) {
        let newQty = item.quantity;
        if (adjustment.type === 'ADD') newQty += adjustment.quantity;
        else if (adjustment.type === 'REMOVE') newQty -= adjustment.quantity;
        else if (adjustment.type === 'SET') newQty = adjustment.quantity;
        
        await API.items.save({ ...item, quantity: newQty });
      }
      
      return payload;
    },
    async bulkSave(adjustments: any[]): Promise<boolean> {
      try {
        for (const adj of adjustments) {
          await this.save(adj);
        }
        return true;
      } catch (error) {
        console.error("Bulk adjustment error:", error);
        return false;
      }
    }
  },

  customerPayments: {
    async receive(payment: any): Promise<any> {
      const id = payment.id || generateId();
      const payload = {
        id,
        customer_id: payment.customerId,
        amount: payment.amount,
        method: payment.method,
        reference: payment.reference,
        date: payment.date || new Date().toISOString(),
        description: payment.description,
        xarun_id: payment.xarunId
      };
      
      // Save payment
      await cloudSave('payments', {
        ...payload,
        type: 'CUSTOMER_PAYMENT',
        referenceId: payment.customerId
      });
      
      // Update customer balance
      const customers = await API.customers.getAll(payment.xarunId);
      const customer = customers.find(c => c.id === payment.customerId);
      if (customer) {
        await API.customers.save({
          ...customer,
          balance: customer.balance - payment.amount
        });
      }
      
      return payload;
    }
  },

  stockTakeSessions: {
    async getAll(xarunId?: string): Promise<any[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('stock_take_sessions', query, 'start_time');
      return data.map(s => ({
        id: s.id,
        xarunId: s.xarun_id,
        status: s.status,
        startTime: s.start_time,
        endTime: s.end_time,
        createdBy: s.created_by,
        assignedUsers: s.assigned_users || [],
        items: s.items || [],
        progress: s.progress || 0,
        notes: s.notes
      }));
    },
    async save(session: any): Promise<any> {
      const id = session.id || generateId();
      const payload = {
        id,
        xarun_id: session.xarunId,
        status: session.status,
        start_time: session.startTime,
        end_time: session.endTime,
        created_by: session.createdBy,
        assigned_users: session.assignedUsers,
        items: session.items,
        progress: session.progress,
        notes: session.notes
      };
      await cloudSave('stock_take_sessions', payload);
      return { ...session, id };
    }
  }
};
