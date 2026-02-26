'use client'

import Link from 'next/link'
import { useAuth } from '@/context/auth-context'
import { mockBranches } from '@/lib/mock-data'
import {
  LayoutDashboard,
  Fuel,
  Wind,
  Package,
  ShoppingCart,
  AlertCircle,
  FileText,
  Users,
  Building2,
  LogOut,
  DollarSign,
  Activity,
  BarChart3,
  TrendingUp,
} from 'lucide-react'

export function Sidebar() {
  const { user, logout, selectedBranchId } = useAuth()

  if (!user) return null

  const currentBranch = mockBranches.find(b => b.id === selectedBranchId)

  // Determine which menu items to show based on role and branch types
  const getMenuItems = () => {
    const items: Array<{ label: string; href: string; icon: any }> = []

    if (user.role !== 'sales_staff') {
      items.push({
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
      })
    }

    switch (user.role) {
      case 'super_admin':
        items.push(
          { label: 'Tenants', href: '/admin/tenants', icon: Building2 },
          { label: 'Billing', href: '/admin/billing', icon: DollarSign },
          { label: 'Activity Logs', href: '/admin/activity-logs', icon: FileText }
        )
        break

      case 'org_owner':
        const hasGas = user.assigned_branch_types.includes('gas')
        const hasFuel = user.assigned_branch_types.includes('fuel')

        if (hasGas && hasFuel) {
          items.push(
            { label: 'Gas Branches', href: '/gas/branches', icon: Wind },
            { label: 'Fuel Branches', href: '/fuel/branches', icon: Fuel },
            { label: 'Daily Activities', href: '/gas/daily-activities', icon: Activity },
            { label: 'Weekly Dashboard', href: '/gas/weekly-dashboard', icon: BarChart3 },
            { label: 'Yearly Dashboard', href: '/gas/yearly-dashboard', icon: TrendingUp },
            { label: 'Gas Sales', href: '/gas/sales', icon: ShoppingCart },
            { label: 'Fuel Sales', href: '/fuel/sales', icon: ShoppingCart }
          )
        } else if (hasGas) {
          items.push(
            { label: 'Gas Branches', href: '/gas/branches', icon: Wind },
            { label: 'Daily Activities', href: '/gas/daily-activities', icon: Activity },
            { label: 'Weekly Dashboard', href: '/gas/weekly-dashboard', icon: BarChart3 },
            { label: 'Yearly Dashboard', href: '/gas/yearly-dashboard', icon: TrendingUp },
            { label: 'Inventory', href: '/gas/inventory', icon: Package },
            { label: 'Gas Sales', href: '/gas/sales', icon: ShoppingCart },
            { label: 'Expenses', href: '/gas/expenses', icon: AlertCircle }
          )
        } else if (hasFuel) {
          items.push(
            { label: 'Fuel Branches', href: '/fuel/branches', icon: Fuel },
            { label: 'Inventory', href: '/fuel/inventory', icon: Package },
            { label: 'Fuel Sales', href: '/fuel/sales', icon: ShoppingCart },
            { label: 'Expenses', href: '/fuel/expenses', icon: AlertCircle }
          )
        }

        items.push(
          { label: 'Reports', href: '/reports', icon: FileText },
          { label: 'Users', href: '/users', icon: Users },
          { label: 'Expenses', href: '/expenses', icon: AlertCircle },
        )
        break

      case 'gas_manager':
        items.push(
          { label: 'Daily Activities', href: '/gas/daily-activities', icon: Activity },
          { label: 'Weekly Dashboard', href: '/gas/weekly-dashboard', icon: BarChart3 },
          { label: 'Yearly Dashboard', href: '/gas/yearly-dashboard', icon: TrendingUp },
          { label: 'Inventory', href: '/gas/inventory', icon: Package },
          { label: 'Sales', href: '/gas/sales', icon: ShoppingCart },
          { label: 'Expenses', href: '/gas/expenses', icon: AlertCircle },
          { label: 'Users', href: '/users', icon: Users },
          { label: 'Reports', href: '/reports', icon: FileText },
        )
        break

      case 'fuel_manager':
        items.push(
          { label: 'Inventory', href: '/fuel/inventory', icon: Package },
          { label: 'Sales', href: '/fuel/sales', icon: ShoppingCart },
          { label: 'Expenses', href: '/fuel/expenses', icon: AlertCircle },
          { label: 'Users', href: '/users', icon: Users },
          { label: 'Reports', href: '/reports', icon: FileText },
        )
        break

      case 'sales_staff':
        items.push(
          { label: 'Sales', href: '/sales', icon: ShoppingCart },
          { label: 'My Transactions', href: '/transactions', icon: FileText }
        )
        break
    }

    return items
  }

  const menuItems = getMenuItems()

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col h-screen fixed left-0 top-0">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Wind className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">EnergyFlow</h1>
            <p className="text-xs text-sidebar-foreground/60">Management System</p>
          </div>
        </div>
      </div>

      {/* Branch Info */}
      {currentBranch && (
        <div className="px-6 py-3 bg-sidebar-primary/10 border-b border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/60 uppercase tracking-wide">Current Branch</p>
          <p className="font-semibold text-sm mt-1">{currentBranch.name}</p>
          <p className="text-xs text-sidebar-foreground/50">{currentBranch.type.toUpperCase()}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6">
        <ul className="space-y-2">
          {menuItems.map((item, idx) => {
            const Icon = item.icon

            return (
              <li key={idx}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground transition-colors"
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <div className="px-4 py-2 rounded-lg bg-sidebar-accent/10">
          <p className="text-xs text-sidebar-foreground/60">Logged in as</p>
          <p className="font-semibold text-sm truncate">{user.name}</p>
          <p className="text-xs text-sidebar-foreground/50 capitalize">{user.role.replace(/_/g, ' ')}</p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  )
}

