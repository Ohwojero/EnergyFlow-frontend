'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/auth-context'
import { apiService } from '@/lib/api'
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
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

export function Sidebar() {
  const { user, logout, selectedBranchId } = useAuth()
  const [branches, setBranches] = useState<any[]>([])
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({})
  const sidebarTitle = user?.tenant_name || user?.name || 'EnergyFlow'
  const sidebarSubtitle = user?.tenant_name ? 'Business Account' : 'Management System'

  useEffect(() => {
    apiService.getBranches().then((data) => {
      setBranches(Array.isArray(data) ? data : [])
    }).catch(() => {
      setBranches([])
    })
  }, [])

  const currentBranch = useMemo(
    () => branches.find((b) => b.id === selectedBranchId),
    [branches, selectedBranchId]
  )

  if (!user) return null

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }))
  }

  // Determine which menu items to show based on role and branch types
  const getMenuItems = () => {
    const items: Array<{ label: string; href?: string; icon: any; children?: Array<{ label: string; href: string; icon: any }> }> = []
    const isPersonalOwner = user.role === 'org_owner' && user.subscription_plan === 'personal'

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
        if (isPersonalOwner) {
          items.push(
            { label: 'Daily Activities', href: '/gas/daily-activities', icon: Activity },
            { label: 'Weekly Dashboard', href: '/gas/weekly-dashboard', icon: BarChart3 },
            { label: 'Yearly Dashboard', href: '/gas/yearly-dashboard', icon: TrendingUp },
            { label: 'Inventory', href: '/gas/inventory', icon: Package },
            { label: 'Sales', href: '/gas/sales', icon: ShoppingCart },
            { label: 'Expense', href: '/gas/expenses', icon: AlertCircle },
            { label: 'User', href: '/users', icon: Users },
            { label: 'Reports', href: '/reports', icon: FileText },
          )
          break
        }

        const hasAssignedTypes = user.assigned_branch_types.length > 0
        const inferredType = currentBranch?.type
        const hasGas =
          user.assigned_branch_types.includes('gas') ||
          user.tenant_branch_types?.includes('gas') ||
          inferredType === 'gas' ||
          !hasAssignedTypes
        const hasFuel =
          user.assigned_branch_types.includes('fuel') ||
          user.tenant_branch_types?.includes('fuel') ||
          inferredType === 'fuel' ||
          !hasAssignedTypes

        if (hasGas && hasFuel) {
          items.push(
            { label: 'Gas Branches', href: '/gas/branches', icon: Wind },
            { label: 'Fuel Branches', href: '/fuel/branches', icon: Fuel },
            { label: 'Daily Activities', href: '/gas/daily-activities', icon: Activity },
            { label: 'Weekly Dashboard', href: '/gas/weekly-dashboard', icon: BarChart3 },
            { label: 'Yearly Dashboard', href: '/gas/yearly-dashboard', icon: TrendingUp },
            {
              label: 'Gas Sales',
              icon: Wind,
              children: [
                { label: 'Sales', href: '/gas/sales', icon: ShoppingCart },
                { label: 'Expenses', href: '/gas/expenses', icon: AlertCircle },
                { label: 'Inventory', href: '/gas/inventory', icon: Package },
              ]
            },
            {
              label: 'Fuel Sales',
              icon: Fuel,
              children: [
                { label: 'Sales', href: '/fuel/sales', icon: ShoppingCart },
                { label: 'Expenses', href: '/fuel/expenses', icon: AlertCircle },
                { label: 'Inventory', href: '/fuel/inventory', icon: Package },
              ]
            }
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
          { label: 'Expenses', href: '/expenses', icon: AlertCircle },
        )
        if (!isPersonalOwner) {
          items.push({ label: 'Users', href: '/users', icon: Users })
        }
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
          { label: 'Fuel Transfer', href: '/fuel/transfer', icon: DollarSign },
          { label: 'Expenses', href: '/fuel/expenses', icon: AlertCircle },
          { label: 'Users', href: '/users', icon: Users },
          { label: 'Reports', href: '/reports', icon: FileText },
        )
        break

      case 'sales_staff':
        items.push(
          { label: 'Sales', href: '/sales', icon: ShoppingCart },
          { label: 'Fuel Transfer', href: '/fuel/transfer', icon: DollarSign },
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
            <h1 className="text-lg font-bold truncate">{sidebarTitle}</h1>
            <p className="text-xs text-sidebar-foreground/60">{sidebarSubtitle}</p>
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
            const isExpanded = expandedMenus[item.label]

            if (item.children) {
              return (
                <li key={idx}>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {isExpanded && (
                    <ul className="ml-8 mt-2 space-y-1">
                      {item.children.map((child, childIdx) => {
                        const ChildIcon = child.icon
                        return (
                          <li key={childIdx}>
                            <Link
                              href={child.href}
                              className="flex items-center gap-3 px-4 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground transition-colors text-sm"
                            >
                              <ChildIcon className="w-4 h-4" />
                              <span>{child.label}</span>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            }

            return (
              <li key={idx}>
                <Link
                  href={item.href!}
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

