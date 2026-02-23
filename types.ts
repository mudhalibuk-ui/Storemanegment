
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
  BUYER = 'BUYER',
  VIEWER = 'VIEWER' 
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
  NEW = 'NEW', 
  PRICED = 'PRICED', 
  AWAITING_FUNDS = 'AWAITING_FUNDS', 
  PURCHASING = 'PURCHASING', 
  SHIPPED = 'SHIPPED', 
  ARRIVED = 'ARRIVED',
  COMPLETED = 'COMPLETED'
}

export enum XarunOrderStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED' // When items are fully transferred and stock updated
}

export interface XarunOrderItem {
  itemId: string;
  itemName: string;
  quantity: number;
}

export interface XarunOrderRequest {
  id: string;
  sourceXarunId: string; // The Xarun where the items are currently located
  targetXarunId: string; // The Xarun requesting the items
  requestedBy: string; // User ID who made the request
  items: XarunOrderItem[];
  status: XarunOrderStatus;
  notes?: string;
  createdAt: string;
  approvedBy?: string; // User ID who approved the request
  targetBranchId?: string; // Specific branch in target Xarun to receive items
}

export interface POTransfer {
  id: string;
  amount: number;
  date: string;
  reference: string;
  method: string;
  status: 'SENT' | 'RECEIVED';
  senderId?: string; // ID of the person sending the money (usually Manager)
  receiverId?: string; // ID of the person receiving (Buyer)
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
  isReadByManager: boolean;
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
  sessionToken?: string;
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
  reservedQuantity?: number;
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

// --- HRM ENHANCED TYPES ---

export interface Shift {
  id: string;
  name: string; // e.g. "Morning Shift", "Night Shift"
  startTime: string; // "07:00"
  endTime: string; // "17:00"
  lateThreshold: string; // "08:00"
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: 'SICK' | 'ANNUAL' | 'EMERGENCY' | 'UNPAID';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  title: string; // "Contract", "Passport"
  type: string;
  url?: string;
  uploadDate: string;
  notes?: string;
}

export interface Employee {
  id: string;
  name: string;
  employeeIdCode: string;
  position: string;
  department?: string; // New
  status: string;
  joinedDate: string;
  xarunId: string;
  branchId?: string;
  salary: number;
  avatar: string;
  fingerprintHash?: string;
  shiftId?: string; // New
  phone?: string; // New
  email?: string; // New
  warning?: string; // New
  consecutiveAbsences?: number; // New
  isWarningDismissed?: boolean; // New
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
  deviceId?: string; 
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
  totalHours?: number; 
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  contactName: string;
  phone: string;
  email: string;
}

export interface CreateInventoryItemArgs {
  name: string;
  category: string;
  sku: string;
  shelves: number;
  sections: number;
  quantity: number;
  branchId: string;
  minThreshold: number;
  xarunId: string;
  packType?: PackType;
}

export interface AdjustStockArgs {
  sku: string;
  quantity: number;
  personnel?: string;
  notes?: string;
}

export enum TransferStatus {
  REQUESTED = 'REQUESTED',
  PREPARING = 'PREPARING',
  ON_THE_WAY = 'ON_THE_WAY',
  ARRIVED = 'ARRIVED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED'
}

export interface TransferAuditEntry {
  status: TransferStatus;
  timestamp: string;
  userId: string;
  userName: string;
  leadTime?: number; // Time in minutes/hours/days from previous status
}

export interface InterBranchTransferRequest {
  id: string;
  sourceXarunId: string;
  sourceBranchId: string;
  targetXarunId: string;
  targetBranchId: string;
  requestedBy: string; // User ID who initiated the request
  items: XarunOrderItem[]; // Reusing XarunOrderItem for consistency
  status: TransferStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string; // To track last status change
  auditTrail: TransferAuditEntry[];
  approvedBy?: string; // User ID who approved the initial request
  preparedBy?: string; // User ID who marked as preparing
  shippedBy?: string; // User ID who marked as on-the-way
  receivedBy?: string; // User ID who marked as arrived/completed
  rackNumber?: string; // For storage designation on arrival
  binLocation?: string; // For storage designation on arrival
  expectedArrivalDate?: string; // Optional, for planning
}
