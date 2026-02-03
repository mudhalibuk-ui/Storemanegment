
import { InventoryItem, Transaction, Branch, User, TransactionStatus, Xarun, UserRole, TransactionType, Employee, Attendance, Payroll } from '../types';
import { supabaseFetch, isDbConnected } from './supabaseClient';

const STORAGE_KEYS = {
  ITEMS: 'smartstock_items',
  BRANCHES: 'smartstock_branches',
  TRANSACTIONS: 'smartstock_transactions',
  USERS: 'smartstock_users',
  XARUMO: 'smartstock_xarumo',
  EMPLOYEES: 'smartstock_employees'
};

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
  paymentDate: 'payment_date'
};

const toSnakeCase = (obj: any) => {
  const newObj: any = {};
  for (let key in obj) {
    const snakeKey = FIELD_MAPPING[key] || key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    newObj[snakeKey] = obj[key];
  }
  return newObj;
};

// Generic Save Helper (PATCH if ID exists, else POST)
async function cloudSave(table: string, data: any) {
  if (!isDbConnected()) return null;
  const payload = toSnakeCase(data);
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
      if (data && Array.isArray(data)) {
        localStorage.setItem(STORAGE_KEYS.XARUMO, JSON.stringify(data));
        return data;
      }
      const local = localStorage.getItem(STORAGE_KEYS.XARUMO);
      return local ? JSON.parse(local) : [];
    },
    async save(xarun: Partial<Xarun>): Promise<Xarun> {
      const saved = await cloudSave('xarumo', xarun);
      const result = (Array.isArray(saved) ? saved[0] : saved) || { ...xarun, id: xarun.id || `x${Date.now()}` };
      return result;
    },
    async delete(id: string): Promise<void> {
      await supabaseFetch(`xarumo?id=eq.${id}`, { method: 'DELETE' });
    }
  },

  branches: {
    async getAll(xarunId?: string): Promise<Branch[]> {
      const query = xarunId ? `branches?xarun_id=eq.${xarunId}` : `branches?select=*`;
      const data = await supabaseFetch(query);
      if (data && Array.isArray(data)) {
        const mapped = data.map((b: any) => ({
          id: b.id, name: b.name, location: b.location, totalShelves: b.total_shelves, totalSections: b.total_sections, customSections: b.custom_sections || {}, xarunId: b.xarun_id
        }));
        if (!xarunId) localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(mapped));
        return mapped;
      }
      const local = localStorage.getItem(STORAGE_KEYS.BRANCHES);
      const all = local ? JSON.parse(local) : [];
      return xarunId ? all.filter((b: any) => b.xarunId === xarunId) : all;
    },
    async save(branch: Partial<Branch>): Promise<Branch> {
      const saved = await cloudSave('branches', branch);
      return (Array.isArray(saved) ? saved[0] : saved) || (branch as Branch);
    },
    async delete(id: string): Promise<void> {
      await supabaseFetch(`branches?id=eq.${id}`, { method: 'DELETE' });
    }
  },

  items: {
    async getAll(xarunId?: string): Promise<InventoryItem[]> {
      const query = xarunId ? `inventory_items?xarun_id=eq.${xarunId}` : `inventory_items?select=*`;
      const data = await supabaseFetch(query);
      if (data && Array.isArray(data)) {
        const mapped = data.map((item: any) => ({
          id: item.id, name: item.name, category: item.category, sku: item.sku, shelves: item.shelves, sections: item.sections, quantity: item.quantity, minThreshold: item.min_threshold, branchId: item.branch_id, lastUpdated: item.last_updated, xarunId: item.xarun_id
        }));
        if (!xarunId) localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(mapped));
        return mapped;
      }
      const local = localStorage.getItem(STORAGE_KEYS.ITEMS);
      const all = local ? JSON.parse(local) : [];
      return xarunId ? all.filter((i: any) => i.xarunId === xarunId) : all;
    },
    async save(item: Partial<InventoryItem>): Promise<InventoryItem> {
      const payload = { ...item, lastUpdated: new Date().toISOString() };
      const saved = await cloudSave('inventory_items', payload);
      return (Array.isArray(saved) ? saved[0] : saved) || (payload as InventoryItem);
    }
  },

  transactions: {
    async getAll(xarunId?: string): Promise<Transaction[]> {
      const query = xarunId ? `transactions?xarun_id=eq.${xarunId}&order=timestamp.desc` : `transactions?select=*&order=timestamp.desc`;
      const data = await supabaseFetch(query);
      if (data && Array.isArray(data)) {
        return data.map((t: any) => ({
          id: t.id, itemId: t.item_id, itemName: t.item_name, type: t.type as TransactionType, quantity: t.quantity, branchId: t.branch_id, targetBranchId: t.target_branch_id, timestamp: t.timestamp, notes: t.notes, personnel: t.personnel, originOrSource: t.origin_source, placementInfo: t.placement_info, status: t.status as TransactionStatus, requestedBy: t.requested_by, approvedBy: t.approved_by, xarunId: t.xarun_id
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
      return (Array.isArray(saved) ? saved[0] : saved) || (payload as Transaction);
    }
  },

  users: {
    async getAll(): Promise<User[]> {
      const data = await supabaseFetch('users_registry?select=*');
      if (data && Array.isArray(data)) {
        return data.map(u => ({
          id: u.id, name: u.name, username: u.username, password: u.password, role: u.role as UserRole, avatar: u.avatar, xarunId: u.xarun_id
        }));
      }
      return [];
    },
    async save(user: Partial<User>): Promise<User> {
      const saved = await cloudSave('users_registry', user);
      return (Array.isArray(saved) ? saved[0] : saved) || (user as User);
    }
  },

  employees: {
    async getAll(xarunId?: string): Promise<Employee[]> {
      const query = xarunId ? `employees?xarun_id=eq.${xarunId}` : `employees?select=*`;
      const data = await supabaseFetch(query);
      if (data && Array.isArray(data)) {
        return data.map((e: any) => ({
          id: e.id,
          name: e.name,
          employeeIdCode: e.employee_id_code,
          position: e.position,
          status: e.status,
          joinedDate: e.joined_date,
          xarunId: e.xarun_id,
          branchId: e.branch_id,
          salary: e.salary,
          avatar: e.avatar,
          fingerprintHash: e.fingerprint_hash
        }));
      }
      return [];
    },
    async save(employee: Partial<Employee>): Promise<Employee> {
      const saved = await cloudSave('employees', employee);
      return (Array.isArray(saved) ? saved[0] : saved) || (employee as Employee);
    },
    async delete(id: string): Promise<void> {
      await supabaseFetch(`employees?id=eq.${id}`, { method: 'DELETE' });
    }
  },

  attendance: {
    async getByDate(date: string): Promise<Attendance[]> {
      const data = await supabaseFetch(`attendance?date=eq.${date}`);
      if (data && Array.isArray(data)) {
        return data.map((a: any) => ({
          id: a.id,
          employeeId: a.employee_id,
          date: a.date,
          status: a.status,
          clockIn: a.clock_in,
          notes: a.notes
        }));
      }
      return [];
    },
    async save(attendance: Partial<Attendance>): Promise<Attendance> {
      const saved = await cloudSave('attendance', attendance);
      return (Array.isArray(saved) ? saved[0] : saved) || (attendance as Attendance);
    }
  },

  payroll: {
    async getAll(): Promise<Payroll[]> {
      const data = await supabaseFetch('payroll?select=*');
      if (data && Array.isArray(data)) {
        return data.map((p: any) => ({
          id: p.id,
          employeeId: p.employee_id,
          month: p.month,
          year: p.year,
          baseSalary: p.base_salary,
          bonus: p.bonus,
          deduction: p.deduction,
          netPay: p.net_pay,
          status: p.status,
          paymentDate: p.payment_date,
          xarunId: p.xarun_id
        }));
      }
      return [];
    },
    async save(payroll: Partial<Payroll>): Promise<Payroll> {
      const saved = await cloudSave('payroll', payroll);
      return (Array.isArray(saved) ? saved[0] : saved) || (payroll as Payroll);
    }
  }
};
