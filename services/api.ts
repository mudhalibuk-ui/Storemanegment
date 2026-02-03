
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

async function cloudSave(table: string, data: any) {
  if (!isDbConnected()) return null;
  const payload = toSnakeCase(data);
  const isArray = Array.isArray(data);
  
  if (isArray) {
    return await supabaseFetch(table, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  const method = data.id ? 'PATCH' : 'POST';
  const endpoint = data.id ? `${table}?id=eq.${data.id}` : table;
  
  return await supabaseFetch(endpoint, {
    method,
    body: JSON.stringify(payload)
  });
}

export const API = {
  xarumo: {
    async getAll(): Promise<Xarun[]> {
      const data = await supabaseFetch('xarumo?select=*');
      return Array.isArray(data) ? data : [];
    },
    async save(xarun: Partial<Xarun>): Promise<Xarun> {
      const saved = await cloudSave('xarumo', xarun);
      return (Array.isArray(saved) ? saved[0] : saved) || xarun;
    },
    async delete(id: string): Promise<void> {
      await supabaseFetch(`xarumo?id=eq.${id}`, { method: 'DELETE' });
    }
  },

  branches: {
    async getAll(xarunId?: string): Promise<Branch[]> {
      const query = xarunId ? `branches?xarun_id=eq.${xarunId}` : `branches?select=*`;
      const data = await supabaseFetch(query);
      if (Array.isArray(data)) {
        return data.map((b: any) => ({
          id: b.id, name: b.name, location: b.location, totalShelves: b.total_shelves, 
          totalSections: b.total_sections, customSections: b.custom_sections || {}, xarunId: b.xarun_id
        }));
      }
      return [];
    },
    async save(branch: Partial<Branch>): Promise<Branch> {
      const saved = await cloudSave('branches', branch);
      return (Array.isArray(saved) ? saved[0] : saved) || branch;
    },
    async delete(id: string): Promise<void> {
      await supabaseFetch(`branches?id=eq.${id}`, { method: 'DELETE' });
    }
  },

  items: {
    async getAll(xarunId?: string): Promise<InventoryItem[]> {
      const query = xarunId ? `inventory_items?xarun_id=eq.${xarunId}` : `inventory_items?select=*`;
      const data = await supabaseFetch(query);
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          id: item.id, name: item.name, category: item.category, sku: item.sku, 
          shelves: item.shelves, sections: item.sections, quantity: item.quantity, 
          minThreshold: item.min_threshold, branchId: item.branch_id, 
          lastUpdated: item.last_updated, xarunId: item.xarun_id
        }));
      }
      return [];
    },
    async save(item: Partial<InventoryItem>): Promise<InventoryItem> {
      const payload = { ...item, lastUpdated: new Date().toISOString() };
      const saved = await cloudSave('inventory_items', payload);
      return (Array.isArray(saved) ? saved[0] : saved) || payload;
    },
    async bulkSave(items: Partial<InventoryItem>[]): Promise<void> {
      const payload = toSnakeCase(items.map(i => ({ ...i, lastUpdated: new Date().toISOString() })));
      await supabaseFetch('inventory_items?on_conflict=sku', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates, return=representation' },
        body: JSON.stringify(payload)
      });
    }
  },

  transactions: {
    async getAll(xarunId?: string): Promise<Transaction[]> {
      const query = xarunId ? `transactions?xarun_id=eq.${xarunId}&order=timestamp.desc` : `transactions?select=*&order=timestamp.desc`;
      const data = await supabaseFetch(query);
      if (Array.isArray(data)) {
        return data.map((t: any) => ({
          id: t.id, itemId: t.item_id, itemName: t.item_name, type: t.type as TransactionType, 
          quantity: t.quantity, branchId: t.branch_id, targetBranchId: t.target_branch_id, 
          timestamp: t.timestamp, notes: t.notes, personnel: t.personnel, 
          originOrSource: t.origin_source, placementInfo: t.placement_info, 
          status: t.status as TransactionStatus, requestedBy: t.requested_by, 
          approvedBy: t.approved_by, xarunId: t.xarun_id
        }));
      }
      return [];
    },
    async create(transaction: Partial<Transaction>): Promise<Transaction> {
      const payload = { ...transaction, timestamp: new Date().toISOString(), id: transaction.id || `t${Date.now()}` };
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
      if (Array.isArray(data)) {
        return data.map(u => ({
          id: u.id, name: u.name, username: u.username, password: u.password, 
          role: u.role as UserRole, avatar: u.avatar, xarunId: u.xarun_id
        }));
      }
      return [];
    },
    async save(user: Partial<User>): Promise<User> {
      const saved = await cloudSave('users_registry', user);
      return (Array.isArray(saved) ? saved[0] : saved) || user;
    }
  },

  employees: {
    async getAll(xarunId?: string): Promise<Employee[]> {
      const query = xarunId ? `employees?xarun_id=eq.${xarunId}` : `employees?select=*`;
      const data = await supabaseFetch(query);
      return Array.isArray(data) ? data.map(e => ({
        ...e, 
        employeeIdCode: e.employee_id_code,
        joinedDate: e.joined_date,
        xarunId: e.xarun_id,
        branchId: e.branch_id,
        fingerprintHash: e.fingerprint_hash
      })) : [];
    },
    async save(employee: Partial<Employee>): Promise<Employee> {
      const saved = await cloudSave('employees', employee);
      return (Array.isArray(saved) ? saved[0] : saved) || employee;
    },
    async delete(id: string): Promise<void> {
      await supabaseFetch(`employees?id=eq.${id}`, { method: 'DELETE' });
    }
  },

  attendance: {
    async getByDate(date: string): Promise<Attendance[]> {
      const data = await supabaseFetch(`attendance?date=eq.${date}`);
      return Array.isArray(data) ? data.map(a => ({
        ...a,
        employeeId: a.employee_id,
        clockIn: a.clock_in
      })) : [];
    },
    async save(record: Partial<Attendance>): Promise<Attendance> {
      const saved = await cloudSave('attendance', record);
      return (Array.isArray(saved) ? saved[0] : saved) || record;
    }
  },

  payroll: {
    async getAll(): Promise<Payroll[]> {
      const data = await supabaseFetch('payroll?select=*');
      return Array.isArray(data) ? data.map(p => ({
        ...p,
        employeeId: p.employee_id,
        baseSalary: p.base_salary,
        netPay: p.net_pay,
        paymentDate: p.payment_date,
        xarunId: p.xarun_id
      })) : [];
    },
    async save(record: Partial<Payroll>): Promise<Payroll> {
      const saved = await cloudSave('payroll', record);
      return (Array.isArray(saved) ? saved[0] : saved) || record;
    }
  }
};
