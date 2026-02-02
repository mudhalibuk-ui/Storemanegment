
import { InventoryItem, Transaction, Branch, User, TransactionStatus, Xarun, UserRole, TransactionType } from '../types';
import { INITIAL_ITEMS, INITIAL_BRANCHES, INITIAL_TRANSACTIONS } from '../constants';
import { isDbConnected, supabaseFetch } from './supabaseClient';

const STORAGE_KEYS = {
  ITEMS: 'smartstock_items',
  BRANCHES: 'smartstock_branches',
  TRANSACTIONS: 'smartstock_transactions',
  USERS: 'smartstock_users',
  XARUMO: 'smartstock_xarumo',
};

const toSnakeCase = (obj: any) => {
  const newObj: any = {};
  for (let key in obj) {
    // Manual mapping for keys that don't follow standard camelCase to snake_case conversion rules
    if (['originOrSource', 'minThreshold', 'branchId', 'targetBranchId', 'requestedBy', 'approvedBy', 'lastUpdated', 'xarunId', 'totalShelves', 'totalSections', 'customSections'].includes(key)) continue;
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    newObj[snakeKey] = obj[key];
  }
  return newObj;
};

export const API = {
  xarumo: {
    async getAll(): Promise<Xarun[]> {
      if (isDbConnected()) {
        try {
          // Use plain table name to avoid any schema path confusion in URL
          const data = await supabaseFetch('xarumo?select=*');
          if (data && Array.isArray(data)) return data;
        } catch (e) {
          console.error("Failed to fetch xarumo from Cloud:", e);
        }
      }
      const local = localStorage.getItem(STORAGE_KEYS.XARUMO);
      const localData = local ? JSON.parse(local) : [];
      return localData.length > 0 ? localData : [{ id: 'x1', name: 'Xarunta Guud', location: 'Mogadishu' }];
    },
    async save(xarun: Partial<Xarun>): Promise<Xarun> {
      const all = await this.getAll();
      const newX = { ...xarun, id: xarun.id || `x${Date.now()}` } as Xarun;
      if (isDbConnected()) {
        await supabaseFetch('xarumo', { 
          method: 'POST', 
          body: JSON.stringify(newX), 
          headers: { 'Prefer': 'resolution=merge-duplicates' } 
        });
      }
      localStorage.setItem(STORAGE_KEYS.XARUMO, JSON.stringify([...all.filter(x => x.id !== newX.id), newX]));
      return newX;
    },
    async delete(id: string): Promise<void> {
      if (isDbConnected()) {
        await supabaseFetch(`xarumo?id=eq.${id}`, { method: 'DELETE' });
      }
      const local = localStorage.getItem(STORAGE_KEYS.XARUMO);
      if (local) {
        const xarumo = JSON.parse(local);
        localStorage.setItem(STORAGE_KEYS.XARUMO, JSON.stringify(xarumo.filter((x: any) => x.id !== id)));
      }
    }
  },

  users: {
    async getAll(): Promise<User[]> {
      let cloudUsers: User[] = [];
      if (isDbConnected()) {
        try {
          const data = await supabaseFetch('users_registry?select=*');
          if (data && Array.isArray(data)) {
            cloudUsers = data.map(u => ({
              id: u.id, name: u.name, username: u.username, password: u.password, role: u.role as UserRole, avatar: u.avatar, xarunId: u.xarun_id
            }));
          }
        } catch (e) {}
      }
      const local = localStorage.getItem(STORAGE_KEYS.USERS);
      const localUsers = local ? JSON.parse(local) : [];
      const merged = [...cloudUsers];
      localUsers.forEach((lu: any) => { if (!merged.find(cu => cu.username === lu.username)) merged.push(lu); });
      if (merged.length === 0) {
        merged.push({ id: 'u1', name: 'Super Admin', username: 'admin', password: 'password', role: UserRole.SUPER_ADMIN, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', xarunId: 'x1' });
      }
      return merged;
    },
    async save(user: Partial<User>): Promise<User> {
      const newUser = { ...user, id: user.id || `u${Date.now()}`, avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}` } as User;
      if (isDbConnected()) {
        const payload = { ...newUser, xarun_id: newUser.xarunId };
        delete (payload as any).xarunId;
        await supabaseFetch('users_registry', { method: 'POST', body: JSON.stringify(payload), headers: { 'Prefer': 'resolution=merge-duplicates' } });
      }
      const local = localStorage.getItem(STORAGE_KEYS.USERS);
      const localUsers = local ? JSON.parse(local) : [];
      const updated = [...localUsers.filter((u: any) => u.id !== newUser.id), newUser];
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
      return newUser;
    },
    async delete(id: string): Promise<void> {
      if (isDbConnected()) {
        await supabaseFetch(`users_registry?id=eq.${id}`, { method: 'DELETE' });
      }
      const local = localStorage.getItem(STORAGE_KEYS.USERS);
      if (local) {
        const users = JSON.parse(local);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users.filter((u: any) => u.id !== id)));
      }
    }
  },

  items: {
    async getAll(xarunId?: string): Promise<InventoryItem[]> {
      let items: InventoryItem[] = [];
      if (isDbConnected()) {
        try {
          const query = xarunId ? `inventory_items?xarun_id=eq.${xarunId}` : `inventory_items?select=*`;
          const cloudData = await supabaseFetch(query);
          if (cloudData && Array.isArray(cloudData)) {
            items = cloudData.map((item: any) => ({
              id: item.id, name: item.name, category: item.category, sku: item.sku, shelves: item.shelves, sections: item.sections, quantity: item.quantity, minThreshold: item.min_threshold, branchId: item.branch_id, lastUpdated: item.last_updated, xarunId: item.xarun_id
            }));
          }
        } catch (e) {
          console.error("Failed to fetch inventory_items:", e);
        }
      } else {
        const data = localStorage.getItem(STORAGE_KEYS.ITEMS);
        items = data ? JSON.parse(data) : INITIAL_ITEMS.map(i => ({ ...i, xarunId: 'x1' }));
      }
      return xarunId ? items.filter(i => i.xarunId === xarunId) : items;
    },
    async save(item: Partial<InventoryItem>): Promise<InventoryItem> {
      const items = await this.getAll();
      let updatedItem = { ...item, lastUpdated: new Date().toISOString() } as InventoryItem;
      if (isDbConnected()) {
        const payload = toSnakeCase(updatedItem);
        payload.min_threshold = updatedItem.minThreshold;
        payload.branch_id = updatedItem.branchId;
        payload.xarun_id = updatedItem.xarunId;
        await supabaseFetch('inventory_items', { method: 'POST', body: JSON.stringify(payload), headers: { 'Prefer': 'resolution=merge-duplicates' } });
      }
      const newItems = [...items.filter(i => i.id !== updatedItem.id), updatedItem];
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(newItems));
      return updatedItem;
    },
    async deleteAll(xarunId?: string): Promise<void> {
      if (isDbConnected()) {
        const filter = xarunId ? `?xarun_id=eq.${xarunId}` : `?id=neq.0`;
        await supabaseFetch(`inventory_items${filter}`, { method: 'DELETE' });
      }
      localStorage.removeItem(STORAGE_KEYS.ITEMS);
    }
  },

  branches: {
    async getAll(xarunId?: string): Promise<Branch[]> {
      let branches: Branch[] = [];
      if (isDbConnected()) {
        try {
          const query = xarunId ? `branches?xarun_id=eq.${xarunId}` : `branches?select=*`;
          const cloudData = await supabaseFetch(query);
          if (cloudData && Array.isArray(cloudData)) {
            branches = cloudData.map((b: any) => ({
              id: b.id, name: b.name, location: b.location, totalShelves: b.total_shelves || 1, totalSections: b.total_sections || 1, customSections: b.custom_sections || {}, xarunId: b.xarun_id
            }));
          }
        } catch (e) {
          console.error("Failed to fetch branches:", e);
        }
      } else {
        const data = localStorage.getItem(STORAGE_KEYS.BRANCHES);
        branches = data ? JSON.parse(data) : INITIAL_BRANCHES.map(b => ({ ...b, xarunId: 'x1' }));
      }
      return xarunId ? branches.filter(b => b.xarunId === xarunId) : branches;
    },
    async save(branch: Partial<Branch>): Promise<Branch> {
      const branches = await this.getAll();
      const newB = { ...branch, id: branch.id || `b${Date.now()}` } as Branch;
      if (isDbConnected()) {
        const payload = toSnakeCase(newB);
        payload.total_shelves = newB.totalShelves;
        payload.total_sections = newB.totalSections;
        payload.custom_sections = newB.customSections;
        payload.xarun_id = newB.xarunId;
        await supabaseFetch('branches', { method: 'POST', body: JSON.stringify(payload), headers: { 'Prefer': 'resolution=merge-duplicates' } });
      }
      localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify([...branches.filter(b => b.id !== newB.id), newB]));
      return newB;
    },
    async delete(id: string): Promise<void> {
      if (isDbConnected()) {
        await supabaseFetch(`branches?id=eq.${id}`, { method: 'DELETE' });
      }
      const local = localStorage.getItem(STORAGE_KEYS.BRANCHES);
      if (local) {
        const branches = JSON.parse(local);
        localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(branches.filter((b: any) => b.id !== id)));
      }
    }
  },

  transactions: {
    async getAll(xarunId?: string): Promise<Transaction[]> {
      if (isDbConnected()) {
        try {
          const query = xarunId ? `transactions?xarun_id=eq.${xarunId}&order=timestamp.desc` : `transactions?select=*&order=timestamp.desc`;
          const cloudData = await supabaseFetch(query);
          if (cloudData && Array.isArray(cloudData)) {
            return cloudData.map((t: any) => ({
              id: t.id, itemId: t.item_id, itemName: t.item_name, type: t.type as TransactionType, quantity: t.quantity, branchId: t.branch_id, targetBranchId: t.target_branch_id, timestamp: t.timestamp, notes: t.notes, personnel: t.personnel, originOrSource: t.origin_source, placement_info: t.placement_info, status: t.status as TransactionStatus, requestedBy: t.requested_by, approvedBy: t.approved_by, xarunId: t.xarun_id
            }));
          }
        } catch (e) {
          console.error("Failed to fetch transactions:", e);
        }
      }
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      const allT = data ? JSON.parse(data) : [];
      return xarunId ? allT.filter((t: any) => t.xarunId === xarunId) : allT;
    },
    async create(transaction: Partial<Transaction>): Promise<Transaction> {
      const now = new Date().toISOString();
      const newT = { 
        timestamp: transaction.timestamp || now, 
        ...transaction, 
        id: transaction.id || `t${Date.now()}` 
      } as Transaction;
      
      if (isDbConnected()) {
        const mapped = toSnakeCase(newT);
        mapped.origin_source = transaction.originOrSource;
        mapped.item_id = transaction.itemId;
        mapped.branch_id = transaction.branchId;
        mapped.xarun_id = transaction.xarunId;
        mapped.timestamp = newT.timestamp;
        await supabaseFetch('transactions', { method: 'POST', body: JSON.stringify(mapped) });
      }
      const all = await this.getAll();
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([newT, ...all]));
      return newT;
    }
  }
};
