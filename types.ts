
export enum TransactionType {
  IN = 'IN',
  OUT = 'OUT',
  TRANSFER = 'TRANSFER',
  MOVE = 'MOVE'
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
  VIEWER = 'VIEWER',
  AUDITOR = 'AUDITOR' 
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
  ORDERED = 'ORDERED',
  RECEIVED = 'RECEIVED',
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
  vendorId?: string;
  vendorName?: string;
  items: POItem[];
  status: POStatus;
  total?: number;
  date?: string;
  personnel?: string;
  xarunId?: string;
  branchId?: string;
  notes?: string;
  creatorId?: string;
  buyerId?: string;
  title?: string;
  createdAt?: string;
  totalFundsSent?: number;
  transfers?: POTransfer[];
  isReadByBuyer?: boolean;
  isReadByManager?: boolean;
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
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  taxId?: string;
  currency?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'EXPIRED';
  plan: 'BASIC' | 'PRO' | 'ENTERPRISE';
  maxUsers?: number;
  expiryDate?: string;
  createdAt?: string;
}

export interface InventoryAdjustment {
  id: string;
  itemId: string;
  itemName: string;
  type: 'ADD' | 'REMOVE' | 'SET';
  quantity: number;
  reason: string;
  timestamp: string;
  createdBy: string;
  xarunId: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  avatar?: string;
  xarunId?: string;
  permissions?: string[]; // List of feature IDs they can see
}

export interface Branch {
  id: string;
  name: string;
  type: 'BRANCH' | 'STORE';
  location: string;
  district?: string;
  totalShelves: number; 
  totalSections: number; 
  xarunId: string; 
  parentBranchId?: string;
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
  sellingPrice?: number; // Added for POS
  packType?: PackType;
  landedCost?: number;
  reservedQuantity?: number;
  supplier?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  xarunId: string;
  balance: number; // Current balance (positive means they owe us)
}

export interface Vendor {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address?: string;
  category: string;
  xarunId: string;
  balance: number; // Current balance (positive means we owe them)
}

export interface SaleItem {
  itemId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Sale {
  id: string;
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
  applyVat: boolean;
  paymentMethod: 'CASH' | 'BANK' | 'CREDIT';
  timestamp: string;
  branchId: string;
  xarunId: string;
  personnel: string;
  isVatSale: boolean; // For Audit Mode filtering
  type?: 'SALE' | 'CREDIT_MEMO' | 'QUOTATION' | 'SALES_ORDER'; // Added for returns and quotes
  originalSaleId?: string; // If it's a return
}

export enum AccountType {
  BANK = 'BANK',
  ACCOUNTS_RECEIVABLE = 'ACCOUNTS_RECEIVABLE',
  INVENTORY_ASSET = 'INVENTORY_ASSET',
  OTHER_CURRENT_ASSET = 'OTHER_CURRENT_ASSET',
  FIXED_ASSET = 'FIXED_ASSET',
  ACCOUNTS_PAYABLE = 'ACCOUNTS_PAYABLE',
  OTHER_CURRENT_LIABILITY = 'OTHER_CURRENT_LIABILITY',
  LONG_TERM_LIABILITY = 'LONG_TERM_LIABILITY',
  EQUITY = 'EQUITY',
  INCOME = 'INCOME',
  COST_OF_GOODS_SOLD = 'COST_OF_GOODS_SOLD',
  EXPENSE = 'EXPENSE',
  OTHER_INCOME = 'OTHER_INCOME',
  OTHER_EXPENSE = 'OTHER_EXPENSE'
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  description?: string;
  balance: number;
  xarunId: string;
  isSystem?: boolean; // System accounts can't be deleted
}

export interface JournalEntryLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  reference: string; // Sale #, PO #, etc.
  description: string;
  lines: JournalEntryLine[];
  xarunId: string;
  createdBy: string;
  status: 'DRAFT' | 'POSTED';
}

export interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  accountCode: string; // Using code for COA mapping
  accountName: string;
  amount: number;
  referenceId: string; // Sale ID, Purchase ID, etc.
  xarunId: string;
  category?: string; // For grouping in reports
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  method: 'CASH' | 'BANK';
  type: 'INCOME' | 'EXPENSE' | 'CUSTOMER_PAYMENT' | 'VENDOR_PAYMENT';
  referenceId?: string; // Sale ID, PO ID, etc.
  description: string;
  xarunId: string;
  personnel: string;
  accountCode: string; // The account being debited/credited (e.g. Expense account)
}

export interface Transaction {
  id: string;
  itemId: string;
  itemName: string;
  type: TransactionType;
  quantity: number;
  unitCost?: number; // For accounting integration
  branchId: string;
  timestamp: string;
  status: TransactionStatus; 
  requestedBy: string;      
  xarunId: string;
  referenceId?: string; // Link to Sale, PO, etc.
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
  financialClosingDate?: string; // QuickBooks style: prevents posting before this date
  requireApprovalForJournal?: boolean;
  enabledFeatures?: string[]; // List of feature IDs that are enabled globally
  companyLogo?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyTaxId?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string; // e.g., 'CREATE', 'UPDATE', 'DELETE', 'LOGIN'
  entityType: string; // e.g., 'SALE', 'CUSTOMER', 'ITEM'
  entityId: string;
  details: string;
  xarunId: string;
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
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE' | 'HOLIDAY';
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
  supplier?: string;
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
  READY = 'READY',
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

// --- ODOO-LIKE ENHANCEMENTS ---

// CRM (Customer Relationship Management)
export enum LeadStatus {
  NEW = 'NEW',
  QUALIFIED = 'QUALIFIED',
  PROPOSAL = 'PROPOSAL',
  NEGOTIATION = 'NEGOTIATION',
  WON = 'WON',
  LOST = 'LOST'
}

export interface Lead {
  id: string;
  title: string;
  contactName: string;
  companyName?: string;
  email?: string;
  phone?: string;
  expectedRevenue: number;
  probability: number; // 0-100
  status: LeadStatus;
  priority: 1 | 2 | 3; // Low, Medium, High
  ownerId: string;
  xarunId: string;
  createdAt: string;
  notes?: string;
}

// Manufacturing (MRP)
export interface BoMComponent {
  itemId: string;
  itemName: string;
  quantity: number;
  unitCost: number;
}

export interface BillOfMaterials {
  id: string;
  productId: string; // The finished product
  productName: string;
  reference: string;
  components: BoMComponent[];
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  xarunId: string;
}

export enum WorkOrderStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  TO_CLOSE = 'TO_CLOSE',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED'
}

export interface WorkOrder {
  id: string;
  bomId: string;
  productId: string;
  productName: string;
  quantity: number;
  status: WorkOrderStatus;
  plannedDate: string;
  actualDate?: string;
  xarunId: string;
  personnel: string;
}

// Project Management
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  BLOCKED = 'BLOCKED'
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';
  xarunId: string;
  managerId: string;
  startDate: string;
  endDate?: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignedTo: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate?: string;
  createdAt: string;
}

// --- ADVANCED ERP ENHANCEMENTS ---

// Fleet Management
export enum VehicleStatus {
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE'
}

export interface VehicleTrip {
  id: string;
  startTime: string;
  endTime?: string;
  startLocation: string;
  endLocation?: string;
  purpose: string;
  status: 'ONGOING' | 'COMPLETED';
  distance?: number; // km
}

export interface Vehicle {
  id: string;
  model: string;
  licensePlate: string;
  driverId?: string;
  driverName?: string;
  status: VehicleStatus;
  fuelLevel: number; // 0-100
  lastServiceDate?: string;
  xarunId: string;
  currentLocation?: {
    lat: number;
    lng: number;
    address: string;
    lastUpdate: string;
  };
  todayTrips?: VehicleTrip[];
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  date: string;
  amount: number; // Liters
  cost: number;
  odometerReading: number;
  personnel: string;
}

// Quality Control
export enum QCStatus {
  PENDING = 'PENDING',
  PASSED = 'PASSED',
  FAILED = 'FAILED'
}

export interface QCInspection {
  id: string;
  entityType: 'ITEM' | 'PO' | 'WO';
  entityId: string;
  entityName: string;
  inspectorId: string;
  inspectorName: string;
  date: string;
  status: QCStatus;
  notes?: string;
  checklist: Record<string, boolean>;
}

// Document Management
export interface DMSDocument {
  id: string;
  title: string;
  type: 'INVOICE' | 'CONTRACT' | 'MANUAL' | 'OTHER';
  url: string;
  ownerId: string;
  entityType?: string;
  entityId?: string;
  createdAt: string;
  xarunId: string;
  fileSize?: string;
}

// Helpdesk
export enum TicketStatus {
  NEW = 'NEW',
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export interface Ticket {
  id: string;
  customerId: string;
  customerName: string;
  subject: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: TicketStatus;
  assignedTo?: string;
  assignedName?: string;
  createdAt: string;
  xarunId: string;
}

// Multi-Currency
export interface Currency {
  id: string;
  code: string; // USD, SOS, AED
  name: string;
  symbol: string;
  exchangeRate: number; // Relative to base
  isBase: boolean;
}

// --- STOCK TAKE / YEAR-END AUDIT ---
export enum StockTakeStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface StockTakeItem {
  itemId: string;
  sku: string;
  itemName: string;
  expectedQty: number;
  actualQty: number;
  difference: number;
}

export interface StockTakeSession {
  id: string;
  xarunId: string;
  status: StockTakeStatus;
  startTime: string;
  endTime?: string;
  createdBy: string;
  assignedUsers: string[]; 
  items: StockTakeItem[];
  progress: number; 
  notes?: string;
}
