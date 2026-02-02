
import { InventoryItem, Branch, TransactionType, Transaction, TransactionStatus } from './types';

// Initial branches with required xarunId
export const INITIAL_BRANCHES: Branch[] = [
  { id: 'b1', name: 'Main Warehouse', location: 'Mogadishu', totalShelves: 50, totalSections: 20, xarunId: 'x1' },
  { id: 'b2', name: 'North Branch', location: 'Hargeisa', totalShelves: 30, totalSections: 15, xarunId: 'x1' },
  { id: 'b3', name: 'South Hub', location: 'Kismayo', totalShelves: 20, totalSections: 10, xarunId: 'x1' },
];

// Initial items with required xarunId
export const INITIAL_ITEMS: InventoryItem[] = [
  {
    id: 'i1',
    name: 'Industrial Generator X5',
    category: 'Hardware',
    sku: 'GEN-001',
    shelves: 4,
    sections: 2,
    quantity: 12,
    branchId: 'b1',
    lastUpdated: new Date().toISOString(),
    minThreshold: 5,
    xarunId: 'x1'
  },
  {
    id: 'i2',
    name: 'Solar Panel 400W',
    category: 'Energy',
    sku: 'SOL-400',
    shelves: 10,
    sections: 5,
    quantity: 45,
    branchId: 'b1',
    lastUpdated: new Date().toISOString(),
    minThreshold: 20,
    xarunId: 'x1'
  },
  {
    id: 'i3',
    name: 'Water Pump Heavy Duty',
    category: 'Machinery',
    sku: 'PMP-88',
    shelves: 3,
    sections: 3,
    quantity: 4,
    branchId: 'b2',
    lastUpdated: new Date().toISOString(),
    minThreshold: 10,
    xarunId: 'x1'
  }
];

// Initial transactions with required xarunId
export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    itemId: 'i1',
    itemName: 'Industrial Generator X5',
    type: TransactionType.IN,
    quantity: 5,
    branchId: 'b1',
    timestamp: new Date().toISOString(),
    notes: 'Restock from supplier',
    status: TransactionStatus.APPROVED,
    requestedBy: 'u1',
    xarunId: 'x1'
  }
];