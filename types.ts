
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
  STAFF = 'STAFF'
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
  customSections?: Record<number, number>;
  xarunId: string; 
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
  xarunId: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  category: string;
}

export interface SystemSettings {
  systemName: string;
  currency: string;
  language: 'EN' | 'SO';
  primaryColor: string;
  lowStockGlobalThreshold: number;
  hardwareAgentUrl?: string; 
  zkDeviceIp?: string;    
  zkDevicePort?: number;  
}

// Added missing HRM interfaces
export interface Employee {
  id: string;
  name: string;
  employeeIdCode: string;
  position: string;
  status: 'ACTIVE' | 'INACTIVE';
  joinedDate: string;
  xarunId: string;
  branchId?: string;
  salary: number;
  avatar: string;
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
  baseSalary: number;
  bonus: number;
  deduction: number;
  netPay: number;
  status: 'PAID' | 'UNPAID';
  paymentDate?: string;
  xarunId: string;
}
