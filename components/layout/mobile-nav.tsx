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
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const { user, logout, selectedBranchId } = useAuth()

  if (!user) return null

  const currentBranch = mockBranches.find(b => b.id === selectedBranchId)

  const getMenuItems = () => {
    const items = []

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
            { label: 'Gas Sales', href: '/gas/sales', icon: ShoppingCart },
            { label: 'Fuel Sales', href: '/fuel/sales', icon: ShoppingCart }
          )
        } else if (hasGas) {
          items.push(
            { label: 'Gas Branches', href: '/gas/branches', icon: Wind },
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
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-30"
          onClick={onClose}
        />
      )}

      {/* Mobile Nav */}
      <nav
        className={cn(
          'fixed left-0 top-0 h-screen w-64 bg-sidebar text-sidebar-foreground z-40 transform transition-transform duration-300 lg:hidden flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-bold">EnergyFlow</h1>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-sidebar-accent/10 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Branch Info */}
        {currentBranch && (
          <div className="px-6 py-3 bg-sidebar-primary/10 border-b border-sidebar-border">
            <p className="text-xs text-sidebar-foreground/60 uppercase">Current Branch</p>
            <p className="font-semibold text-sm mt-1">{currentBranch.name}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <ul className="space-y-2">
            {menuItems.map((item, idx) => {
              const Icon = item.icon

              return (
                <li key={idx}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <div className="px-4 py-2 rounded-lg bg-sidebar-accent/10">
            <p className="text-xs text-sidebar-foreground/60">Logged in as</p>
            <p className="font-semibold text-sm truncate">{user.name}</p>
          </div>
          <button
            onClick={() => {
              logout()
              onClose()
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </>
  )
}

