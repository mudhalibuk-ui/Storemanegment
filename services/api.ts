
import { InventoryItem, Transaction, Branch, User, TransactionStatus, Xarun, UserRole, TransactionType, Employee, Attendance, Payroll } from '../types';
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
  baseSalary: 'base_salary',
  netPay: 'net_pay',
  paymentDate: 'payment_date',
  placementInfo: 'placement_info'
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

async function cloudSave(table: string, data: any, conflictColumn: string = 'id') {
  if (!isDbConnected()) return null;
  const payload = toSnakeCase(data);
  
  return await supabaseFetch(`${table}?on_conflict=${conflictColumn}`, {
    method: 'POST',
    headers: {
      'Prefer': 'return=representation,resolution=merge-duplicates'
    },
    body: JSON.stringify(payload)
  });
}

/**
 * fetchAllPages: Helper function si looga gudbo xadka 1000 rows.
 * Waxaa lagu daray 'orderBy' si looga fogaado khaladka 'created_at' ee tables-ka qaarkood.
 */
async function fetchAllPages(table: string, queryParams: string = '', orderBy: string = 'created_at'): Promise<any[]> {
  let allData: any[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const rangeHeader = { 'Range': `${from}-${from + pageSize - 1}` };
    const separator = queryParams ? '&' : '';
    const endpoint = `${table}?select=*${separator}${queryParams}&order=${orderBy}.desc`;
    
    const data = await supabaseFetch(endpoint, { headers: rangeHeader });
    
    if (Array.isArray(data) && data.length > 0) {
      allData = [...allData, ...data];
      from += pageSize;
      if (data.length < pageSize) hasMore = false;
    } else {
      hasMore = false;
    }
  }
  return allData;
}

export const API = {
  xarumo: {
    async getAll(): Promise<Xarun[]> {
      const data = await supabaseFetch('xarumo?select=*&order=created_at.desc');
      return Array.isArray(data) ? data : [];
    },
    async save(xarun: Partial<Xarun>): Promise<Xarun> {
      const id = xarun.id || crypto.randomUUID();
      const saved = await cloudSave('xarumo', { ...xarun, id });
      const result = Array.isArray(saved) ? saved[0] : saved;
      return result || { ...xarun, id };
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
      const saved = await cloudSave('branches', { ...branch, id });
      const result = Array.isArray(saved) ? saved[0] : saved;
      return result || { ...branch, id };
    },
    async delete(id: string): Promise<void> {
      await supabaseFetch(`branches?id=eq.${id}`, { method: 'DELETE' });
    }
  },

  items: {
    async getAll(xarunId?: string): Promise<InventoryItem[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('inventory_items', query);
      return data.map((item: any) => ({
        id: item.id, name: item.name, category: item.category, sku: item.sku, 
        shelves: item.shelves, sections: item.sections, quantity: item.quantity, 
        minThreshold: item.min_threshold, branchId: item.branch_id, 
        lastUpdated: item.last_updated, xarunId: item.xarun_id
      }));
    },
    async save(item: Partial<InventoryItem>): Promise<InventoryItem> {
      const id = item.id || crypto.randomUUID();
      const payload = { ...item, id, lastUpdated: new Date().toISOString() };
      const saved = await cloudSave('inventory_items', payload, 'sku');
      const result = Array.isArray(saved) ? saved[0] : saved;
      return result || payload;
    },
    async bulkSave(items: Partial<InventoryItem>[]): Promise<boolean> {
      if (!isDbConnected() || items.length === 0) return false;

      const CHUNK_SIZE = 200;
      for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        const chunk = items.slice(i, i + CHUNK_SIZE);
        const cleanedChunk = chunk.map(item => ({
          ...item,
          id: (item.id && !item.id.startsWith('temp-')) ? item.id : crypto.randomUUID(),
          lastUpdated: new Date().toISOString()
        }));

        const payload = toSnakeCase(cleanedChunk);
        const response = await supabaseFetch('inventory_items?on_conflict=sku', {
          method: 'POST',
          headers: { 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify(payload)
        });

        if (response === null) return false;
      }
      return true;
    },
    async deleteAll(xarunId?: string): Promise<boolean> {
      if (!isDbConnected()) return false;
      const filter = xarunId ? `xarun_id=eq.${xarunId}` : `id=neq.deleted-placeholder-id`;
      const response = await supabaseFetch(`inventory_items?${filter}`, { method: 'DELETE' });
      return response !== null;
    }
  },

  transactions: {
    async getAll(xarunId?: string): Promise<Transaction[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      // FIX: Transactions table uses 'timestamp' instead of 'created_at' for ordering
      const data = await fetchAllPages('transactions', query, 'timestamp');
      return data.map((t: any) => ({
        id: t.id, itemId: t.item_id, itemName: t.item_name, type: t.type as TransactionType, 
        quantity: t.quantity, branchId: t.branch_id, targetBranchId: t.target_branch_id, 
        timestamp: t.timestamp, notes: t.notes, personnel: t.personnel, 
        originOrSource: t.origin_source, placementInfo: t.placement_info, 
        status: t.status as TransactionStatus, requestedBy: t.requested_by, 
        approvedBy: t.approved_by, xarunId: t.xarun_id
      }));
    },
    async create(transaction: Partial<Transaction>): Promise<Transaction> {
      const id = crypto.randomUUID();
      const payload = { ...transaction, id, timestamp: new Date().toISOString() };
      const saved = await supabaseFetch('transactions', {
        method: 'POST',
        body: JSON.stringify(toSnakeCase(payload))
      });
      return (Array.isArray(saved) ? saved[0] : saved) || payload;
    }
  },

  users: {
    async getAll(): Promise<User[]> {
      const data = await supabaseFetch('users_registry?select=*');
      return Array.isArray(data) ? data.map(u => ({
        id: u.id, name: u.name, username: u.username, password: u.password, 
        role: u.role as UserRole, avatar: u.avatar, xarunId: u.xarun_id
      })) : [];
    },
    async save(user: Partial<User>): Promise<User> {
      const id = user.id || crypto.randomUUID();
      const saved = await cloudSave('users_registry', { ...user, id });
      const result = Array.isArray(saved) ? saved[0] : saved;
      return result || { ...user, id };
    }
  },

  employees: {
    async getAll(xarunId?: string): Promise<Employee[]> {
      const query = xarunId ? `xarun_id=eq.${xarunId}` : '';
      const data = await fetchAllPages('employees', query);
      return data.map(e => ({
        ...e, employeeIdCode: e.employee_id_code, joined_date: e.joined_date,
        xarunId: e.xarun_id, branch_id: e.branch_id, salary: Number(e.salary || 0)
      }));
    },
    async save(employee: Partial<Employee>): Promise<Employee> {
      const id = employee.id || crypto.randomUUID();
      const saved = await cloudSave('employees', { ...employee, id });
      const result = Array.isArray(saved) ? saved[0] : saved;
      return result || { ...employee, id };
    },
    async delete(id: string): Promise<void> {
      await supabaseFetch(`employees?id=eq.${id}`, { method: 'DELETE' });
    }
  },

  attendance: {
    async getByDate(date: string): Promise<Attendance[]> {
      const data = await supabaseFetch(`attendance?select=*&date=eq.${date}`);
      return Array.isArray(data) ? data.map(a => ({
        ...a, employeeId: a.employee_id, clockIn: a.clock_in
      })) : [];
    },
    async save(record: Partial<Attendance>): Promise<Attendance> {
      const id = record.id || crypto.randomUUID();
      const saved = await cloudSave('attendance', { ...record, id });
      const result = Array.isArray(saved) ? saved[0] : saved;
      return result || { ...record, id };
    }
  },

  payroll: {
    async getAll(): Promise<Payroll[]> {
      const data = await fetchAllPages('payroll');
      return data.map(p => ({
        id: p.id, employeeId: p.employee_id, month: p.month, year: p.year,
        baseSalary: p.base_salary, bonus: p.bonus, deduction: p.deduction,
        netPay: p.net_pay, status: p.status, paymentDate: p.payment_date,
        xarunId: p.xarun_id
      }));
    },
    async save(record: Partial<Payroll>): Promise<Payroll> {
      const id = record.id || crypto.randomUUID();
      const saved = await cloudSave('payroll', { ...record, id });
      const result = Array.isArray(saved) ? saved[0] : saved;
      return result || { ...record, id };
    }
  }
};
