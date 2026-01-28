
import { InventoryItem, Transaction, Branch, User, TransactionStatus } from '../types';
import { INITIAL_ITEMS, INITIAL_BRANCHES, INITIAL_TRANSACTIONS } from '../constants';
import { isDbConnected, supabaseFetch } from './supabaseClient';

const delay = (ms: number = 400) => new Promise(resolve => setTimeout(resolve, ms));

const STORAGE_KEYS = {
  ITEMS: 'smartstock_items',
  BRANCHES: 'smartstock_branches',
  TRANSACTIONS: 'smartstock_transactions',
  USERS: 'smartstock_users',
};

const toSnakeCase = (obj: any) => {
  const newObj: any = {};
  for (let key in obj) {
    // Avoid mapping properties that are already handled manually
    if (key === 'originOrSource') continue;
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    newObj[snakeKey] = obj[key];
  }
  return newObj;
};

export const API = {
  items: {
    async getAll(): Promise<InventoryItem[]> {
      if (isDbConnected()) {
        const cloudData = await supabaseFetch('inventory_items?select=*');
        if (cloudData) {
          return cloudData.map((item: any) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            sku: item.sku,
            shelves: item.shelves,
            sections: item.sections,
            quantity: item.quantity,
            minThreshold: item.min_threshold,
            branchId: item.branch_id,
            lastUpdated: item.last_updated
          }));
        }
      }

      await delay(200);
      const data = localStorage.getItem(STORAGE_KEYS.ITEMS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(INITIAL_ITEMS));
        return INITIAL_ITEMS;
      }
      return JSON.parse(data);
    },
    async save(item: Partial<InventoryItem>): Promise<InventoryItem> {
      await delay();
      const items = await this.getAll();
      let updatedItem: InventoryItem;

      if (item.id && items.find(i => i.id === item.id)) {
        const existing = items.find(i => i.id === item.id)!;
        updatedItem = { ...existing, ...item, lastUpdated: new Date().toISOString() } as InventoryItem;
        
        if (isDbConnected()) {
          await supabaseFetch(`inventory_items?id=eq.${item.id}`, {
            method: 'PATCH',
            body: JSON.stringify(toSnakeCase(updatedItem))
          });
        }
        
        const newItems = items.map(i => i.id === item.id ? updatedItem : i);
        localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(newItems));
      } else {
        updatedItem = {
          ...item,
          id: item.id || `i${Date.now()}`,
          lastUpdated: new Date().toISOString()
        } as InventoryItem;

        if (isDbConnected()) {
          await supabaseFetch('inventory_items', {
            method: 'POST',
            body: JSON.stringify(toSnakeCase(updatedItem))
          });
        }

        localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify([...items, updatedItem]));
      }
      return updatedItem;
    },
    async updateBulk(newItems: InventoryItem[]): Promise<void> {
      await delay(100);
      const currentItems = await this.getAll();
      
      const mergedItems = [...currentItems];
      newItems.forEach(newItem => {
        const index = mergedItems.findIndex(i => i.sku === newItem.sku && i.branchId === newItem.branchId);
        if (index > -1) {
          mergedItems[index] = { ...mergedItems[index], ...newItem, quantity: mergedItems[index].quantity + newItem.quantity };
        } else {
          mergedItems.push(newItem);
        }
      });

      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(mergedItems));
      
      if (isDbConnected()) {
        const mapped = newItems.map(item => {
          const snaked = toSnakeCase(item);
          snaked.min_threshold = item.minThreshold;
          snaked.branch_id = item.branchId;
          return snaked;
        });
        await supabaseFetch('inventory_items', {
          method: 'POST',
          headers: { 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify(mapped)
        });
      }
    }
  },

  branches: {
    async getAll(): Promise<Branch[]> {
      if (isDbConnected()) {
        const cloudData = await supabaseFetch('branches?select=id,name,location,total_shelves,total_sections,custom_sections');
        if (cloudData) {
          return cloudData.map((b: any) => ({
            id: b.id,
            name: b.name,
            location: b.location,
            totalShelves: b.total_shelves || 1,
            totalSections: b.total_sections || 1,
            customSections: b.custom_sections || {}
          }));
        }
      }

      await delay(200);
      const data = localStorage.getItem(STORAGE_KEYS.BRANCHES);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(INITIAL_BRANCHES));
        return INITIAL_BRANCHES;
      }
      return JSON.parse(data);
    },
    async save(branch: Partial<Branch>): Promise<Branch> {
      const branches = await this.getAll();
      let newBranch: Branch;
      
      if (branch.id && branches.find(b => b.id === branch.id)) {
        newBranch = { ...branches.find(b => b.id === branch.id), ...branch } as Branch;
        
        if (isDbConnected()) {
          const payload = toSnakeCase(newBranch);
          await supabaseFetch(`branches?id=eq.${branch.id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
          });
        }

        const updated = branches.map(b => b.id === branch.id ? newBranch : b);
        localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(updated));
      } else {
        newBranch = { ...branch, id: `b${Date.now()}` } as Branch;

        if (isDbConnected()) {
          const payload = toSnakeCase(newBranch);
          await supabaseFetch('branches', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
        }

        localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify([...branches, newBranch]));
      }
      return newBranch;
    }
  },

  transactions: {
    async getAll(): Promise<Transaction[]> {
      if (isDbConnected()) {
        const cloudData = await supabaseFetch('transactions?select=*&order=timestamp.desc');
        if (cloudData) {
          return cloudData.map((t: any) => ({
            id: t.id,
            itemId: t.item_id,
            itemName: t.item_name,
            type: t.type,
            quantity: t.quantity,
            branchId: t.branch_id,
            targetBranchId: t.target_branch_id,
            timestamp: t.timestamp,
            notes: t.notes,
            personnel: t.personnel,
            originOrSource: t.origin_source,
            placementInfo: t.placement_info,
            status: t.status,
            requestedBy: t.requested_by,
            approvedBy: t.approved_by
          }));
        }
      }

      await delay(200);
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
        return INITIAL_TRANSACTIONS;
      }
      return JSON.parse(data);
    },
    async create(transaction: Partial<Transaction>): Promise<Transaction> {
      await delay();
      const transactions = await this.getAll();
      const newTransaction = {
        ...transaction,
        id: transaction.id || `t${Date.now()}`,
        timestamp: new Date().toISOString(),
      } as Transaction;

      if (isDbConnected()) {
        const mapped = toSnakeCase(newTransaction);
        mapped.origin_source = transaction.originOrSource;
        mapped.item_id = transaction.itemId;
        mapped.branch_id = transaction.branchId;
        mapped.target_branch_id = transaction.targetBranchId;
        mapped.requested_by = transaction.requestedBy;
        
        await supabaseFetch('transactions', {
          method: 'POST',
          body: JSON.stringify(mapped)
        });
      }

      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([newTransaction, ...transactions]));
      return newTransaction;
    },
    async updateStatus(id: string, status: TransactionStatus, adminId: string): Promise<void> {
      const transactions = await this.getAll();
      const updated = transactions.map(t => t.id === id ? { ...t, status, approvedBy: adminId } : t);
      
      if (isDbConnected()) {
        await supabaseFetch(`transactions?id=eq.${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status, approved_by: adminId })
        });
      }

      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));
    }
  }
};
