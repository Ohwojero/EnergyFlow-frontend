'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { mockBranches, mockUsers } from '@/lib/mock-data'
import { useAuth } from '@/context/auth-context'
import { toast } from '@/hooks/use-toast'
import { Users, Trash2, Edit2 } from 'lucide-react'
import type { BranchType, User, UserRole } from '@/types'

export default function UsersPage() {
  const { user: currentUser, selectedBranchType, selectedBranchId } = useAuth()
  const isPersonalContext =
    currentUser?.role === 'gas_manager' || currentUser?.role === 'fuel_manager'
  const personalManagerRole: UserRole =
    selectedBranchType === 'fuel' ? 'fuel_manager' : 'gas_manager'
  const getDefaultRole = (): UserRole => (isPersonalContext ? 'sales_staff' : 'sales_staff')
  const [allUsers, setAllUsers] = useState<User[]>(Object.values(mockUsers))
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: getDefaultRole(),
    branchId: '',
  })

  const users = useMemo(() => {
    if (!currentUser) return []
    if (currentUser.role === 'super_admin') return allUsers
    return allUsers.filter((u) => u.tenant_id === currentUser.tenant_id)
  }, [allUsers, currentUser])

  const tenantBranches = useMemo(() => {
    if (!currentUser) return []
    return mockBranches.filter((b) => b.tenant_id === currentUser.tenant_id)
  }, [currentUser])

  const getRoleBgColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
      case 'org_owner':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
      case 'gas_manager':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      case 'fuel_manager':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
      case 'sales_staff':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400'
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: getDefaultRole(),
      branchId: '',
    })
  }

  const handleOpenAddUser = () => {
    setEditingUserId(null)
    resetForm()
    setIsUserDialogOpen(true)
  }

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id)
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      branchId: user.assigned_branches[0] ?? '',
    })
    setIsUserDialogOpen(true)
  }

  const handleDeleteUser = (user: User) => {
    const confirmed = window.confirm(`Delete ${user.name}? This action cannot be undone.`)
    if (!confirmed) return

    setAllUsers((prev) => prev.filter((u) => u.id !== user.id))
    toast({
      title: 'User deleted',
      description: `${user.name} was removed successfully.`,
    })
  }

  const handleSaveUser = async (e: FormEvent) => {
    e.preventDefault()
    if (!currentUser) return

    const name = formData.name.trim()
    const email = formData.email.trim()
    const password = formData.password
    const normalizedRole = isPersonalContext
      ? (formData.role === 'sales_staff' ? 'sales_staff' : personalManagerRole)
      : formData.role
    if (!name || !email || (!editingUserId && !password)) {
      toast({
        title: 'Missing details',
        description: editingUserId
          ? 'Name and email are required.'
          : 'Name, email, and password are required.',
      })
      return
    }

    if (password && password.length < 6) {
      toast({
        title: 'Invalid password',
        description: 'Password must be at least 6 characters.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const selectedBranch = isPersonalContext
        ? tenantBranches.find((b) => b.id === selectedBranchId) ?? tenantBranches[0]
        : tenantBranches.find((b) => b.id === formData.branchId)
      const assignedBranchTypes: BranchType[] = selectedBranch
        ? [selectedBranch.type]
        : normalizedRole === 'gas_manager'
          ? ['gas']
          : normalizedRole === 'fuel_manager'
            ? ['fuel']
            : []

      const newUser = {
        id: editingUserId ?? `user-${Date.now()}`,
        name,
        email,
        role: normalizedRole,
        tenant_id: currentUser.tenant_id,
        assigned_branches: selectedBranch ? [selectedBranch.id] : [],
        assigned_branch_types: assignedBranchTypes,
        created_at:
          allUsers.find((u) => u.id === editingUserId)?.created_at ?? new Date().toISOString(),
      }

      if (editingUserId) {
        setAllUsers((prev) => prev.map((u) => (u.id === editingUserId ? newUser : u)))
      } else {
        setAllUsers((prev) => [newUser, ...prev])
      }
      toast({
        title: editingUserId ? 'User updated' : 'User added',
        description: editingUserId
          ? `${name} was updated successfully.`
          : `${name} was added successfully.`,
      })
      setIsUserDialogOpen(false)
      setEditingUserId(null)
      resetForm()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            User Management
          </h1>
          <p className="text-muted-foreground">
            Manage staff members and their access permissions
          </p>
        </div>
        <Button
          onClick={handleOpenAddUser}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Add User
        </Button>
      </div>

      {/* Users Table */}
      <Card className="shadow-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">All Users</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Name</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Email</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Role</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Branches</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-right font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-foreground">{user.name}</p>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                  <td className="px-6 py-4">
                    <Badge className={getRoleBgColor(user.role)}>
                      {user.role.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-foreground">
                    {user.assigned_branches.length} branch{user.assigned_branches.length !== 1 ? 'es' : ''}
                  </td>
                  <td className="px-6 py-4">
                    <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                      Active
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                        onClick={() => handleDeleteUser(user)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog
        open={isUserDialogOpen}
        onOpenChange={(open) => {
          setIsUserDialogOpen(open)
          if (!open) {
            setEditingUserId(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingUserId ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogDescription>
              {editingUserId
                ? 'Update user details and branch assignment.'
                : isPersonalContext
                  ? 'Create personal users with manager or sales staff role.'
                  : 'Create a user for your organisation and assign an optional branch.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Jane Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="jane@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Minimum 6 characters"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value as UserRole }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="gas_manager">Gas Manager</option>
                <option value="fuel_manager">Fuel Manager</option>
                <option value="sales_staff">Sales Staff</option>
              </select>
            </div>

            {!isPersonalContext && (
              <div className="space-y-2">
                <Label htmlFor="branch">Assign Branch (Optional)</Label>
                <select
                  id="branch"
                  value={formData.branchId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, branchId: e.target.value }))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">No branch assigned</option>
                  {tenantBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} ({branch.type.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUserDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {isSubmitting ? 'Saving...' : editingUserId ? 'Save Changes' : 'Add User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
