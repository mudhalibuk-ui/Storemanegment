
import { InventoryItem, Transaction, Branch, User, TransactionStatus, Xarun, UserRole, TransactionType, Employee, Attendance, Payroll, Device } from '../types';
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
  totalHours: 'total_hours'
};

const toSnakeCase = (obj: any) => {
  if (Array.isArray(obj)) return obj.map(item => toSnakeCase(item));
  if (obj === null || typeof obj !== 'object') return obj;
  const newObj: any = {};
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
  
  // UPSERT Logic: 'Prefer: resolution=merge-duplicates'
  return await supabaseFetch(`${table}?on_conflict=${conflictColumn}`, {
    method: 'POST',
    headers: {
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(payload)
  });
}

// Helper to fetch pages safely
async function fetchAllPages(table: string, queryParams: string = '', orderBy: string = 'created_at'): Promise<any[]> {
  let allData: any[] = [];
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
    
    // Check for error object returned by new supabaseFetch
    if (!Array.isArray(data)) {
      console.warn(`Cloud unreachable or error for ${table} (page ${page})`, data);
      return allData.length > 0 ? allData : (getLocal(table) || []);
    }
    
    allData = [...allData, ...data];
    if (data.length < pageSize) hasMore = false;
    else page++;
  }
  
  setLocal(table, allData);
  return allData;
}

export const API = {
  xarumo: {
    async getAll(): Promise<Xarun[]> {
      const data = await fetchAllPages('xarumo');
      return Array.isArray(data) ? data : [];
    },
    async save(xarun: Partial<Xarun>): Promise<Xarun> {
      const id = xarun.id || crypto.randomUUID();
      const payload = { ...xarun, id };
      const saved = await cloudSave('xarumo', payload);
      
      const current = getLocal('xarumo') || [];
      const updated = [...current.filter((x: any) => x.id !== id), payload];
      setLocal('xarumo', updated);
      
      return (Array.isArray(saved) ? saved[0] : saved) || payload;
    },
    async delete(id: string): Promise<void> {
      await supabaseFetch(`xarumo?id=eq.${id}`, { method: 'DELETE' });
      const current = getLocal('xarumo') || [];
      setLocal('xarumo', current.filter((x: any) => x.id !== id));
    }
  },

  branches: {
    async getAll(xarunId?: string): Promise<Branch[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('branches', query);
      return data.map((b: any) => ({
        id: b.id, 
        name: b.name, 
        location: b.location, 
        totalShelves: b.total_shelves, 
        totalSections: b.total_sections, 
        customSections: b.custom_sections || {}, 
        xarunId: b.xarun_id
      }));
    },
    async save(branch: Partial<Branch>): Promise<Branch> {
      const id = branch.id || crypto.randomUUID();
      const payload = { ...branch, id };
      const saved = await cloudSave('branches', payload);
      
      const current = getLocal('branches') || [];
      setLocal('branches', [...current.filter((b: any) => b.id !== id), payload]);
      
      return (Array.isArray(saved) ? saved[0] : saved) || payload;
    },
    async delete(id: string): Promise<void> {
      await supabaseFetch(`branches?id=eq.${id}`, { method: 'DELETE' });
      const current = getLocal('branches') || [];
      setLocal('branches', current.filter((b: any) => b.id !== id));
    }
  },

  devices: {
    async getAll(): Promise<Device[]> {
      if (!isDbConnected()) return [];
      const data = await fetchAllPages('devices');
      return Array.isArray(data) ? data : [];
    },
    async save(device: Partial<Device>): Promise<Device> {
      if (!isDbConnected()) throw new Error("Cloud connection required for devices");
      const id = device.id || crypto.randomUUID();
      const payload = { ...device, id };
      const saved = await cloudSave('devices', payload);
      return (Array.isArray(saved) ? saved[0] : saved) || payload;
    },
    async delete(id: string): Promise<void> {
      if (!isDbConnected()) throw new Error("Cloud connection required for devices");
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
      // Use 'id' for conflict resolution to allow SKU updates without PK violation
      const saved = await cloudSave('inventory_items', payload, 'id');
      
      const current = getLocal('inventory_items') || [];
      setLocal('inventory_items', [...current.filter((i: any) => i.id !== id), payload]);
      
      return (Array.isArray(saved) ? saved[0] : saved) || payload;
    },
    async bulkSave(items: Partial<InventoryItem>[]): Promise<boolean> {
      if (items.length === 0) return true;

      const cleanedItems = items.map(item => ({
        ...item,
        id: (item.id && !item.id.startsWith('temp-')) ? item.id : crypto.randomUUID(),
        lastUpdated: new Date().toISOString()
      }));

      const current = getLocal('inventory_items') || [];
      const updated = [...current];
      cleanedItems.forEach(newItem => {
        const idx = updated.findIndex(i => i.sku === newItem.sku);
        if (idx > -1) updated[idx] = { ...updated[idx], ...newItem };
        else updated.push(newItem);
      });
      setLocal('inventory_items', updated);

      if (!isDbConnected()) return true;

      const CHUNK_SIZE = 50; 
      for (let i = 0; i < cleanedItems.length; i += CHUNK_SIZE) {
        const chunk = cleanedItems.slice(i, i + CHUNK_SIZE);
        const payload = toSnakeCase(chunk);
        await supabaseFetch('inventory_items?on_conflict=sku', {
          method: 'POST',
          headers: { 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify(payload)
        });
      }
      return true;
    },
    async delete(id: string): Promise<{success: boolean, error?: string}> {
      // 1. Delete locally first (Optimistic)
      const currentTrans = getLocal('transactions') || [];
      setLocal('transactions', currentTrans.filter((t: any) => t.item_id !== id && t.itemId !== id));

      const currentItems = getLocal('inventory_items') || [];
      setLocal('inventory_items', currentItems.filter((i: any) => i.id !== id));

      // 2. Delete from Cloud (MANUAL CASCADE)
      if (isDbConnected()) {
        try {
          // A. Force Delete related Transactions first (using multiple potential column names to be safe)
          await Promise.allSettled([
            supabaseFetch(`transactions?item_id=eq.${id}`, { method: 'DELETE' }),
            supabaseFetch(`transactions?itemId=eq.${id}`, { method: 'DELETE' })
          ]);
          
          // B. Delete the Item
          const res = await supabaseFetch(`inventory_items?id=eq.${id}`, { method: 'DELETE' });
          
          if (res && res.error) {
             console.error("Cloud Delete Error:", res);
             return { success: false, error: res.details || res.error };
          }
          
          return { success: true };
        } catch (e: any) {
          console.error("Delete Exception:", e);
          return { success: false, error: e.message };
        }
      }
      return { success: true };
    },
    async deleteAll(xarunId?: string): Promise<boolean> {
      const filter = xarunId ? `xarun_id=eq.${xarunId}` : `id=neq.deleted-placeholder-id`;
      await supabaseFetch(`inventory_items?${filter}`, { method: 'DELETE' });
      
      const current = getLocal('inventory_items') || [];
      if (xarunId) setLocal('inventory_items', current.filter((i: any) => i.xarun_id !== xarunId));
      else setLocal('inventory_items', []);
      
      return true;
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
      
      const current = getLocal('transactions') || [];
      setLocal('transactions', [payload, ...current]);
      
      if (isDbConnected()) {
        await cloudSave('transactions', payload);
      }
      return payload as Transaction;
    },
    async update(id: string, updates: Partial<Transaction>): Promise<void> {
      const current = getLocal('transactions') || [];
      const updated = current.map((t: any) => t.id === id ? { ...t, ...updates } : t);
      setLocal('transactions', updated);

      if (isDbConnected()) {
        await supabaseFetch(`transactions?id=eq.${id}`, {
          method: 'PATCH',
          body: JSON.stringify(toSnakeCase(updates))
        });
      }
    },
    async delete(id: string): Promise<void> {
      const current = getLocal('transactions') || [];
      setLocal('transactions', current.filter((t: any) => t.id !== id));
      await supabaseFetch(`transactions?id=eq.${id}`, { method: 'DELETE' });
    }
  },

  users: {
    async getAll(): Promise<User[]> {
      const data = await fetchAllPages('users_registry');
      return Array.isArray(data) ? data.map(u => ({
        id: u.id, name: u.name, username: u.username, password: u.password, 
        role: u.role as UserRole, avatar: u.avatar, xarunId: u.xarun_id
      })) : [];
    },
    async save(user: Partial<User>): Promise<User> {
      const id = user.id || crypto.randomUUID();
      const payload = { ...user, id };
      const saved = await cloudSave('users_registry', payload);
      
      const current = getLocal('users_registry') || [];
      setLocal('users_registry', [...current.filter((u: any) => u.id !== id), payload]);
      
      return (Array.isArray(saved) ? saved[0] : saved) || payload;
    }
  },

  employees: {
    async getAll(xarunId?: string): Promise<Employee[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('employees', query);
      return data.map(e => ({
        id: e.id,
        name: e.name,
        employeeIdCode: e.employee_id_code,
        position: e.position,
        status: e.status,
        joinedDate: e.joined_date,
        xarunId: e.xarun_id,
        branchId: e.branch_id,
        salary: Number(e.salary || 0),
        avatar: e.avatar,
        fingerprintHash: e.fingerprint_hash
      }));
    },
    async save(employee: Partial<Employee>): Promise<Employee> {
      const id = employee.id || crypto.randomUUID();
      const payload = { ...employee, id };
      await cloudSave('employees', payload);
      
      const current = getLocal('employees') || [];
      setLocal('employees', [...current.filter((e: any) => e.id !== id), payload]);
      
      return payload as Employee;
    },
    async delete(id: string): Promise<void> {
      await supabaseFetch(`employees?id=eq.${id}`, { method: 'DELETE' });
      const current = getLocal('employees') || [];
      setLocal('employees', current.filter((e: any) => e.id !== id));
    }
  },

  attendance: {
    async getAll(): Promise<Attendance[]> {
      const data = await fetchAllPages('attendance', '', 'date');
      return data.map((a: any) => ({
        id: a.id,
        employeeId: a.employee_id,
        date: a.date,
        status: a.status,
        clockIn: a.clock_in,
        clockOut: a.clock_out,
        overtimeIn: a.overtime_in,
        overtimeOut: a.overtime_out,
        notes: a.notes,
        deviceId: a.device_id
      }));
    },
    async getByDate(date: string): Promise<Attendance[]> {
      const data = await supabaseFetch(`attendance?select=*&date=eq.${date}`);
      
      if (!Array.isArray(data)) {
        const local = getLocal('attendance') || [];
        return local.filter((a: any) => a.date === date);
      }
      
      const current = getLocal('attendance') || [];
      const others = current.filter((a: any) => a.date !== date);
      setLocal('attendance', [...others, ...data]);
      
      return data.map((a: any) => ({
        id: a.id,
        employeeId: a.employee_id,
        date: a.date,
        status: a.status,
        clockIn: a.clock_in,
        clockOut: a.clock_out,
        overtimeIn: a.overtime_in,
        overtimeOut: a.overtime_out,
        notes: a.notes,
        deviceId: a.device_id
      }));
    },
    async save(record: Partial<Attendance>): Promise<Attendance> {
      const id = record.id || crypto.randomUUID();
      const payload = { ...record, id };
      await cloudSave('attendance', payload);
      
      const current = getLocal('attendance') || [];
      setLocal('attendance', [...current.filter((a: any) => a.id !== id), payload]);
      
      return payload as Attendance;
    }
  },

  payroll: {
    async getAll(): Promise<Payroll[]> {
      const data = await fetchAllPages('payroll');
      return data.map(p => ({
        id: p.id, employeeId: p.employee_id, month: p.month, year: p.year,
        // Using base_salary instead of baseSalary to match Payroll interface
        base_salary: p.base_salary, bonus: p.bonus, deduction: p.deduction,
        netPay: p.net_pay, status: p.status, paymentDate: p.payment_date,
        xarunId: p.xarun_id, totalHours: p.total_hours
      }));
    },
    async save(record: Partial<Payroll>): Promise<Payroll> {
      const id = record.id || crypto.randomUUID();
      const payload = { ...record, id };
      await cloudSave('payroll', payload);
      
      const current = getLocal('payroll') || [];
      setLocal('payroll', [...current.filter((p: any) => p.id !== id), payload]);
      
      return payload as Payroll;
    }
  }
};
