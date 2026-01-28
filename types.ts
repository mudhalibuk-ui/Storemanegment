
export enum TransactionType {
  IN = 'IN',
  OUT = 'OUT',
  TRANSFER = 'TRANSFER'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF'
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  avatar?: string;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  totalShelves: number; 
  totalSections: number; // Tani waa default-ka haddii aan mid gaar ah loo qoondeyn
  customSections?: Record<number, number>; // { [shelfNumber]: sectionCount }
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  category: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  sku: string;
  shelves: number; 
  sections: number; 
  quantity: number;
  branchId: string;
  lastUpdated: string;
  minThreshold: number;
  supplierId?: string;
}

export interface Transaction {
  id: string;
  itemId: string;
  itemName: string;
  type: TransactionType;
  quantity: number;
  branchId: string;
  targetBranchId?: string;
  timestamp: string;
  notes?: string;
  personnel?: string;     
  originOrSource?: string; 
  placementInfo?: string;  
  status: TransactionStatus; 
  requestedBy: string;      
  approvedBy?: string;     
}

export interface SystemSettings {
  systemName: string;
  currency: string;
  language: 'EN' | 'SO';
  primaryColor: string;
  lowStockGlobalThreshold: number;
}
