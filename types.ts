
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
  NEW = 'NEW', // Newly sent from Manager
  PRICED = 'PRICED', // Buyer added prices
  AWAITING_FUNDS = 'AWAITING_FUNDS', // Manager notified to send money
  PURCHASING = 'PURCHASING', // Money received, currently buying
  SHIPPED = 'SHIPPED',
  ARRIVED = 'ARRIVED',
  COMPLETED = 'COMPLETED'
}

export interface POTransfer {
  id: string;
  amount: number;
  date: string;
  reference: string;
  method: string;
  status: 'SENT' | 'RECEIVED';
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
  transfers: POTransfer[];
  isReadByBuyer: boolean;
  isReadByManager: boolean; // For when buyer updates prices
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
  containerStatus?: 'LOADING' | 'ON_SEA' | 'ARRIVED' | 'CLEARED';
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
  // Added approvedBy property to fix TypeScript error when updating transactions
  approvedBy?: string;
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
  // Removed old single ZK config in favor of DB table
  zkDeviceIp?: string;
  zkDevicePort?: number;
}

export interface Device {
  id: string;
  name: string;
  ip_address: string;
  port: number;
  xarun_id: string;
  is_active: boolean;
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
  clockOut?: string;
  overtimeIn?: string;
  overtimeOut?: string;
  notes?: string;
  deviceId?: string; // Track which device
}

export interface Payroll {
  id: string;
  employeeId: string;
  month: string;
  year: number;
  netPay: number;
  status: 'PAID' | 'UNPAID';
  xarunId: string;
  base_salary: number;
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
