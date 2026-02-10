
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
  SUPER_ADMIN = 'SUPER_ADMIN',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  BUYER = 'BUYER' 
}

export enum PackType {
  BOX = 'BOX',
  PCS = 'PCS',
  KIISH = 'KIISH',
  DRAM = 'DRAM',
  FALAG = 'FALAG'
}

export enum POStatus {
  DRAFT = 'DRAFT',
  PENDING_PRICING = 'PENDING_PRICING',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
  PURCHASING = 'PURCHASING',
  SHIPPED = 'SHIPPED',
  ARRIVED = 'ARRIVED',
  COMPLETED = 'COMPLETED'
}

export interface POItem {
  id: string;
  name: string;
  packType: PackType;
  requestedQty: number;
  purchasedQty: number;
  lastPurchasePrice: number;
  actualPrice: number;
  isPurchased: boolean;
  taxPaid?: number;
  unitLandedCost?: number;
}

export interface PurchaseOrder {
  id: string;
  creatorId: string;
  buyerId: string;
  title: string;
  items: POItem[];
  status: POStatus;
  totalFundsSent: number;
  notes?: string;
  createdAt: string;
}

export interface Container {
  id: string;
  number: string;
  type: '20FT' | '40FT';
  poId: string;
  items: POItem[];
  trackingUrl?: string;
  status: 'LOADING' | 'ON_SEA' | 'ARRIVED' | 'CLEARED';
  freightCost: number;
  taxPaid: number;
}

export interface Xarun {
  id: string;
  name: string;
  location: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  avatar?: string;
  xarunId?: string; 
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  totalShelves: number; 
  totalSections: number; 
  xarunId: string; 
  customSections?: Record<number, number>;
  isMainStore?: boolean;
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
  xarunId: string; 
  lastKnownPrice?: number;
  packType?: PackType;
  landedCost?: number;
}

export interface StockRequest {
  id: string;
  branchId: string;
  requesterId: string;
  items: { itemId: string; name: string; qty: number }[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export interface Transaction {
  id: string;
  itemId: string;
  itemName: string;
  type: TransactionType;
  quantity: number;
  branchId: string;
  timestamp: string;
  status: TransactionStatus; 
  requestedBy: string;      
  xarunId: string;
  notes?: string;
  personnel?: string;
  originOrSource?: string;
  placementInfo?: string;
  targetBranchId?: string;
}

export interface SystemSettings {
  systemName: string;
  currency: string;
  language: 'EN' | 'SO';
  primaryColor: string;
  lowStockGlobalThreshold: number;
  taxPerBox: number;
  taxPerKiish: number;
  taxPerDram: number;
  taxPerFalag: number;
  mainStoreId: string;
}

export interface Employee {
  id: string;
  name: string;
  employeeIdCode: string;
  position: string;
  status: string;
  joinedDate: string;
  xarunId: string;
  salary: number;
  avatar: string;
  branchId?: string;
  fingerprintHash?: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE';
  clockIn?: string;
  notes?: string;
}

export interface Payroll {
  id: string;
  employeeId: string;
  month: string;
  year: number;
  netPay: number;
  status: 'PAID' | 'UNPAID';
  xarunId: string;
  baseSalary: number;
  bonus: number;
  deduction: number;
  paymentDate?: string;
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  contactName: string;
  phone: string;
  email: string;
}
