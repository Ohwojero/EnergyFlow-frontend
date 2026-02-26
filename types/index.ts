// User & Auth Types
export type UserRole = 'super_admin' | 'org_owner' | 'gas_manager' | 'fuel_manager' | 'sales_staff'
export type BranchType = 'gas' | 'fuel'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  tenant_id: string
  assigned_branches: string[]
  assigned_branch_types: BranchType[]
  created_at: string
}

export interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  selectedBranchId: string | null
  selectedBranchType: BranchType | null
  login: (email: string, password: string, role: UserRole, branchId?: string, branchType?: BranchType) => void
  logout: () => void
  selectBranch: (branchId: string, branchType: BranchType) => void
}

// Tenant Types
export interface Tenant {
  id: string
  name: string
  subscription_plan: 'personal' | 'organisation'
  status: 'active' | 'suspended'
  created_at: string
  branch_types: BranchType[]
}

// Branch Types
export interface Branch {
  id: string
  tenant_id: string
  name: string
  type: BranchType
  location: string
  status: 'active' | 'inactive'
  manager_id: string
  created_at: string
}

// Gas Types
export interface GasCylinder {
  id: string
  branch_id: string
  size: '12.5kg' | '25kg' | '50kg'
  status: 'in_stock' | 'refilling' | 'damaged'
  quantity: number
  purchase_price: number
  selling_price: number
  last_updated: string
}

export interface GasTransaction {
  id: string
  branch_id: string
  type: 'sale' | 'purchase' | 'refill'
  cylinder_size: string
  quantity: number
  amount: number
  notes: string
  created_at: string
}

export interface GasExpense {
  id: string
  branch_id: string
  category: 'cylinder_repair' | 'safety_inspection' | 'maintenance' | 'other'
  amount: number
  description: string
  created_at: string
}

// Fuel Types
export interface FuelProduct {
  id: string
  branch_id: string
  type: 'PMS' | 'AGO' | 'DPK'
  quantity: number
  unit_price: number
  total_value: number
}

export interface FuelPump {
  id: string
  branch_id: string
  pump_number: string
  product_type: 'PMS' | 'AGO' | 'DPK'
  current_reading: number
  status: 'active' | 'inactive'
}

export interface ShiftReconciliation {
  id: string
  branch_id: string
  shift_number: number
  pump_id: string
  start_reading: number
  end_reading: number
  sales_amount: number
  variance: number
  created_at: string
}

export interface FuelExpense {
  id: string
  branch_id: string
  category: 'pump_maintenance' | 'tank_cleaning' | 'filter_replacement' | 'other'
  amount: number
  description: string
  created_at: string
}

// Dashboard Types
export interface DashboardMetric {
  label: string
  value: string | number
  change?: number
  icon?: string
  trend?: 'up' | 'down'
}

export interface ReportData {
  period: string
  total_sales: number
  total_purchases: number
  total_expenses: number
  profit: number
  inventory_value: number
}

// Gas Daily Activities Types
export interface GasPumpReading {
  id: string
  pump_number: string
  start_reading: number
  end_reading: number
  kg_dispensed: number
}

export interface GasDailyActivity {
  id: string
  branch_id: string
  date: string
  pump_readings: GasPumpReading[]
  system_record_kg: number
  sun_adjustment_kg: number
  total_kg: number
  payment_breakdown: GasPaymentBreakdown
  created_at: string
}

export interface GasPaymentBreakdown {
  transfer: number
  cash: number
  pos: number
  total: number
}
