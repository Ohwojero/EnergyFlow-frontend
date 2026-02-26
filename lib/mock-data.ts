import { User, Branch, GasCylinder, GasTransaction, FuelProduct, FuelPump, ShiftReconciliation, Tenant } from '@/types'

// Mock Users
export const mockUsers: Record<string, User> = {
  super_admin: {
    id: 'user-1',
    email: 'admin@energyflow.com',
    name: 'Admin User',
    role: 'super_admin',
    tenant_id: 'tenant-1',
    assigned_branches: [],
    assigned_branch_types: [],
    created_at: new Date().toISOString(),
  },
  org_owner: {
    id: 'user-2',
    email: 'owner@gasandfuel.com',
    name: 'Organization Owner',
    role: 'org_owner',
    tenant_id: 'tenant-2',
    assigned_branches: ['branch-1', 'branch-2', 'branch-3', 'branch-4'],
    assigned_branch_types: ['gas', 'fuel'],
    created_at: new Date().toISOString(),
  },
  gas_manager: {
    id: 'user-3',
    email: 'manager@gasplant.com',
    name: 'Gas Branch Manager',
    role: 'gas_manager',
    tenant_id: 'tenant-2',
    assigned_branches: ['branch-1', 'branch-2'],
    assigned_branch_types: ['gas'],
    created_at: new Date().toISOString(),
  },
  fuel_manager: {
    id: 'user-4',
    email: 'manager@fuelstation.com',
    name: 'Fuel Station Manager',
    role: 'fuel_manager',
    tenant_id: 'tenant-2',
    assigned_branches: ['branch-3'],
    assigned_branch_types: ['fuel'],
    created_at: new Date().toISOString(),
  },
  sales_staff: {
    id: 'user-5',
    email: 'staff@gasplant.com',
    name: 'Sales Staff',
    role: 'sales_staff',
    tenant_id: 'tenant-2',
    assigned_branches: ['branch-1'],
    assigned_branch_types: ['gas'],
    created_at: new Date().toISOString(),
  },
}

// Mock Tenants
export const mockTenants: Tenant[] = [
  {
    id: 'tenant-1',
    name: 'EnergyFlow Admin',
    subscription_plan: 'organisation',
    status: 'active',
    created_at: new Date().toISOString(),
    branch_types: [],
  },
  {
    id: 'tenant-2',
    name: 'Gas & Fuel Solutions Ltd',
    subscription_plan: 'organisation',
    status: 'active',
    created_at: new Date().toISOString(),
    branch_types: ['gas', 'fuel'],
  },
]

// Mock Branches
export const mockBranches: Branch[] = [
  {
    id: 'branch-1',
    tenant_id: 'tenant-2',
    name: 'Lagos Gas Plant',
    type: 'gas',
    location: 'Lagos, Nigeria',
    status: 'active',
    manager_id: 'user-3',
    created_at: new Date().toISOString(),
  },
  {
    id: 'branch-2',
    tenant_id: 'tenant-2',
    name: 'Ibadan Gas Plant',
    type: 'gas',
    location: 'Ibadan, Nigeria',
    status: 'active',
    manager_id: 'user-3',
    created_at: new Date().toISOString(),
  },
  {
    id: 'branch-3',
    tenant_id: 'tenant-2',
    name: 'Victoria Island Fuel Station',
    type: 'fuel',
    location: 'Lagos, Nigeria',
    status: 'active',
    manager_id: 'user-4',
    created_at: new Date().toISOString(),
  },
  {
    id: 'branch-4',
    tenant_id: 'tenant-2',
    name: 'Abuja Fuel Station',
    type: 'fuel',
    location: 'Abuja, Nigeria',
    status: 'active',
    manager_id: 'user-4',
    created_at: new Date().toISOString(),
  },
]

// Mock Gas Cylinders
export const mockGasCylinders: GasCylinder[] = [
  {
    id: 'cyl-1',
    branch_id: 'branch-1',
    size: '12.5kg',
    status: 'in_stock',
    quantity: 150,
    purchase_price: 3500,
    selling_price: 5500,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'cyl-2',
    branch_id: 'branch-1',
    size: '25kg',
    status: 'in_stock',
    quantity: 85,
    purchase_price: 6500,
    selling_price: 9500,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'cyl-3',
    branch_id: 'branch-1',
    size: '50kg',
    status: 'in_stock',
    quantity: 45,
    purchase_price: 12000,
    selling_price: 17500,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'cyl-4',
    branch_id: 'branch-2',
    size: '12.5kg',
    status: 'in_stock',
    quantity: 120,
    purchase_price: 3500,
    selling_price: 5500,
    last_updated: new Date().toISOString(),
  },
]

// Mock Gas Transactions
export const mockGasTransactions: GasTransaction[] = [
  {
    id: 'trans-1',
    branch_id: 'branch-1',
    type: 'sale',
    cylinder_size: '12.5kg',
    quantity: 20,
    amount: 110000,
    notes: 'Regular customer sales',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'trans-2',
    branch_id: 'branch-1',
    type: 'purchase',
    cylinder_size: '25kg',
    quantity: 30,
    amount: 195000,
    notes: 'Refill from main supplier',
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
]

// Mock Fuel Products
export const mockFuelProducts: FuelProduct[] = [
  {
    id: 'fuel-1',
    branch_id: 'branch-3',
    type: 'PMS',
    quantity: 5000,
    unit_price: 650,
    total_value: 3250000,
  },
  {
    id: 'fuel-2',
    branch_id: 'branch-3',
    type: 'AGO',
    quantity: 3000,
    unit_price: 850,
    total_value: 2550000,
  },
  {
    id: 'fuel-3',
    branch_id: 'branch-3',
    type: 'DPK',
    quantity: 1500,
    unit_price: 750,
    total_value: 1125000,
  },
]

// Mock Fuel Pumps
export const mockFuelPumps: FuelPump[] = [
  {
    id: 'pump-1',
    branch_id: 'branch-3',
    pump_number: 'PUMP-01',
    product_type: 'PMS',
    current_reading: 12500,
    status: 'active',
  },
  {
    id: 'pump-2',
    branch_id: 'branch-3',
    pump_number: 'PUMP-02',
    product_type: 'PMS',
    current_reading: 11850,
    status: 'active',
  },
  {
    id: 'pump-3',
    branch_id: 'branch-3',
    pump_number: 'PUMP-03',
    product_type: 'AGO',
    current_reading: 8200,
    status: 'active',
  },
]

// Mock Shift Reconciliation
export const mockShiftReconciliation: ShiftReconciliation[] = [
  {
    id: 'shift-1',
    branch_id: 'branch-3',
    shift_number: 1,
    pump_id: 'pump-1',
    start_reading: 12000,
    end_reading: 12500,
    sales_amount: 325000,
    variance: 0,
    created_at: new Date().toISOString(),
  },
]

// Extended Mock Tenants for Super Admin
export const mockTenantsExtended = [
  {
    id: 'tenant-1',
    name: 'EnergyFlow Admin',
    owner_name: 'System Admin',
    owner_email: 'admin@energyflow.com',
    subscription_plan: 'organisation' as const,
    status: 'active' as const,
    created_at: new Date('2024-01-01').toISOString(),
    last_active: new Date().toISOString(),
    branch_types: [] as const,
    total_branches: 0,
    total_users: 1,
    monthly_revenue: 0,
  },
  {
    id: 'tenant-2',
    name: 'Gas & Fuel Solutions Ltd',
    owner_name: 'Organization Owner',
    owner_email: 'owner@gasandfuel.com',
    subscription_plan: 'organisation' as const,
    status: 'active' as const,
    created_at: new Date('2024-01-15').toISOString(),
    last_active: new Date().toISOString(),
    branch_types: ['gas', 'fuel'] as const,
    total_branches: 4,
    total_users: 5,
    monthly_revenue: 49999,
  },
  {
    id: 'tenant-3',
    name: 'Metro Gas Distribution',
    owner_name: 'John Adebayo',
    owner_email: 'john@metrogas.com',
    subscription_plan: 'organisation' as const,
    status: 'active' as const,
    created_at: new Date('2024-02-01').toISOString(),
    last_active: new Date(Date.now() - 86400000).toISOString(),
    branch_types: ['gas'] as const,
    total_branches: 2,
    total_users: 8,
    monthly_revenue: 29999,
  },
  {
    id: 'tenant-4',
    name: 'QuickFuel Stations',
    owner_name: 'Sarah Mohammed',
    owner_email: 'sarah@quickfuel.com',
    subscription_plan: 'personal' as const,
    status: 'active' as const,
    created_at: new Date('2024-02-10').toISOString(),
    last_active: new Date(Date.now() - 172800000).toISOString(),
    branch_types: ['fuel'] as const,
    total_branches: 1,
    total_users: 3,
    monthly_revenue: 9999,
  },
  {
    id: 'tenant-5',
    name: 'Energy Hub Nigeria',
    owner_name: 'David Okonkwo',
    owner_email: 'david@energyhub.ng',
    subscription_plan: 'organisation' as const,
    status: 'suspended' as const,
    created_at: new Date('2024-01-20').toISOString(),
    last_active: new Date(Date.now() - 604800000).toISOString(),
    branch_types: ['gas', 'fuel'] as const,
    total_branches: 3,
    total_users: 6,
    monthly_revenue: 0,
  },
  {
    id: 'tenant-6',
    name: 'Prime Gas & Oil',
    owner_name: 'Amina Bello',
    owner_email: 'amina@primegas.com',
    subscription_plan: 'personal' as const,
    status: 'active' as const,
    created_at: new Date('2024-02-20').toISOString(),
    last_active: new Date().toISOString(),
    branch_types: ['gas'] as const,
    total_branches: 1,
    total_users: 2,
    monthly_revenue: 9999,
  },
]

// Activity Logs
export const mockActivityLogs = [
  {
    id: 'log-1',
    tenant_id: 'tenant-2',
    tenant_name: 'Gas & Fuel Solutions Ltd',
    user_name: 'Organization Owner',
    action: 'login',
    description: 'User logged in successfully',
    ip_address: '192.168.1.1',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'log-2',
    tenant_id: 'tenant-3',
    tenant_name: 'Metro Gas Distribution',
    user_name: 'John Adebayo',
    action: 'create_branch',
    description: 'Created new gas branch: Ikeja Plant',
    ip_address: '192.168.1.5',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'log-3',
    tenant_id: 'tenant-4',
    tenant_name: 'QuickFuel Stations',
    user_name: 'Sarah Mohammed',
    action: 'sale_transaction',
    description: 'Recorded fuel sale: ₦125,000',
    ip_address: '192.168.1.10',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'log-4',
    tenant_id: 'tenant-5',
    tenant_name: 'Energy Hub Nigeria',
    action: 'account_suspended',
    description: 'Account suspended due to payment failure',
    ip_address: 'system',
    timestamp: new Date(Date.now() - 604800000).toISOString(),
  },
  {
    id: 'log-5',
    tenant_id: 'tenant-2',
    tenant_name: 'Gas & Fuel Solutions Ltd',
    user_name: 'Sales Staff',
    action: 'inventory_update',
    description: 'Updated inventory: 12.5kg cylinders +50 units',
    ip_address: '192.168.1.2',
    timestamp: new Date(Date.now() - 10800000).toISOString(),
  },
]

// Gas Daily Activities Storage
export let mockGasDailyActivities: any[] = []

export const saveGasDailyActivity = (activity: any) => {
  mockGasDailyActivities.push(activity)
  return activity
}

export const getGasDailyActivities = (branchId?: string, startDate?: string, endDate?: string) => {
  let filtered = mockGasDailyActivities
  
  if (branchId) {
    filtered = filtered.filter(a => a.branch_id === branchId)
  }
  
  if (startDate && endDate) {
    filtered = filtered.filter(a => a.date >= startDate && a.date <= endDate)
  }
  
  return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}