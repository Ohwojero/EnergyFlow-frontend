'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/context/auth-context'
import { toast } from '@/hooks/use-toast'
import { Users, Trash2, Edit2 } from 'lucide-react'
import { apiService } from '@/lib/api'
import type { Branch, BranchType, User, UserRole } from '@/types'

export default function UsersPage() {
  const { user: currentUser, selectedBranchType, selectedBranchId } = useAuth()
  const isPersonalOwner =
    currentUser?.role === 'org_owner' && currentUser?.subscription_plan === 'personal'
  const isPersonalManager =
    currentUser?.subscription_plan === 'personal' &&
    (currentUser?.role === 'gas_manager' || currentUser?.role === 'fuel_manager')
  const isPersonalScoped = isPersonalOwner || isPersonalManager
  const isOrgOwnerOrganisation =
    currentUser?.role === 'org_owner' && currentUser?.subscription_plan === 'organisation'
  const getPersonalManagerRole = (): UserRole => {
    const businessType = (currentUser as any)?.business_type
    return businessType === 'fuel' ? 'fuel_manager' : 'gas_manager'
  }
  const getOrgOwnerDefaultRole = (): UserRole => {
    const hasFuelOnly =
      (currentUser?.tenant_branch_types?.includes('fuel') ?? false) &&
      !(currentUser?.tenant_branch_types?.includes('gas') ?? false)
    if (hasFuelOnly || selectedBranchType === 'fuel') return 'fuel_manager'
    return 'gas_manager'
  }
  const getDefaultRole = (): UserRole =>
    isPersonalOwner ? getPersonalManagerRole() : isOrgOwnerOrganisation ? getOrgOwnerDefaultRole() : 'sales_staff'

  const [allUsers, setAllUsers] = useState<User[]>([])
  const [tenantBranches, setTenantBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
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

  useEffect(() => {
    const normalizeUser = (raw: any): User => ({
      id: raw.id,
      email: raw.email,
      name: raw.name,
      role: raw.role,
      tenant_id: raw.tenant_id ?? raw.tenant?.id ?? '',
      assigned_branches: Array.isArray(raw.assigned_branches)
        ? raw.assigned_branches
            .map((branch: any) => (typeof branch === 'string' ? branch : branch?.id))
            .filter(Boolean)
        : [],
      assigned_branch_types: raw.assigned_branch_types ?? [],
      created_at: raw.created_at ?? new Date().toISOString(),
    })

    const loadData = async () => {
      setIsLoading(true)
      try {
        const [usersData, branchesData] = await Promise.all([
          apiService.getUsers(),
          apiService.getBranches(),
        ])
        setAllUsers((Array.isArray(usersData) ? usersData : []).map(normalizeUser))
        let branchList = Array.isArray(branchesData) ? branchesData : []
      if (isPersonalOwner && branchList.length === 0) {
        const businessType = (currentUser as any)?.business_type
        const fallback = businessType === 'fuel'
          ? await apiService.getFuelBranches().catch(() => [])
          : await apiService.getGasBranches().catch(() => [])
        branchList = Array.isArray(fallback) ? fallback : []
      }
        setTenantBranches(branchList)
      } catch {
        toast({
          title: 'Load failed',
          description: 'Unable to load users and branches.',
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const users = useMemo(() => {
    if (!currentUser) return []
    if (currentUser.role === 'super_admin') return allUsers
    if (currentUser.role === 'org_owner') return allUsers
    if (currentUser.role === 'gas_manager' || currentUser.role === 'fuel_manager') {
      // Backend already scopes manager-visible users to sales staff in manager branches.
      // Avoid double-filtering here to prevent hiding newly created users.
      return allUsers
    }
    return allUsers.filter((u) => u.tenant_id === currentUser.tenant_id)
  }, [allUsers, currentUser])

  const groupedUsers = useMemo(() => {
    const groups: Record<string, User[]> = {}
    users.forEach((user) => {
      const role = user.role
      if (!groups[role]) groups[role] = []
      groups[role].push(user)
    })
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))
  }, [users])

  const branchNameById = useMemo(() => {
    const map = new Map<string, string>()
    tenantBranches.forEach((branch) => {
      map.set(String(branch.id), branch.name)
    })
    return map
  }, [tenantBranches])

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

  const getRoleHeaderBg = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-50 dark:bg-purple-900/20'
      case 'org_owner':
        return 'bg-blue-50 dark:bg-blue-900/20'
      case 'gas_manager':
        return 'bg-green-50 dark:bg-green-900/20'
      case 'fuel_manager':
        return 'bg-orange-50 dark:bg-orange-900/20'
      case 'sales_staff':
        return 'bg-yellow-50 dark:bg-yellow-900/20'
      default:
        return 'bg-gray-50 dark:bg-gray-900/20'
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
    setFormData((prev) => ({ ...prev, role: getDefaultRole() }))
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

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Delete ${user.name}? This action cannot be undone.`)) {
      return
    }
    try {
      await apiService.deleteUser(user.id)
      setAllUsers((prev) => prev.filter((u) => u.id !== user.id))
      toast({
        title: 'User deleted',
        description: `${user.name} was removed successfully.`,
      })
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Could not delete user.',
      })
    }
  }

  const handleSaveUser = async (e: FormEvent) => {
    e.preventDefault()
    if (!currentUser) return

    const name = formData.name.trim()
    const email = formData.email.trim()
    const password = formData.password
    const normalizedRole = isPersonalOwner
      ? getPersonalManagerRole()
      : isPersonalManager
        ? 'sales_staff'
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
      const selectedBranch = isPersonalOwner || isPersonalManager
        ? tenantBranches.find((b) => b.id === selectedBranchId) ??
          tenantBranches.find((b) => currentUser.assigned_branches.includes(b.id)) ??
          tenantBranches[0]
        : tenantBranches.find((b) => b.id === formData.branchId)
      if (editingUserId) {
        const updatePayload = (isPersonalOwner || isPersonalManager)
          ? {
              name,
              email,
              ...(password ? { password } : {}),
              role: normalizedRole,
              branch_ids: selectedBranch ? [selectedBranch.id] : [],
              assigned_branch_types: selectedBranch ? [selectedBranch.type] : [],
            }
          : {
              name,
              email,
              ...(password ? { password } : {}),
              role: normalizedRole,
              branch_ids: selectedBranch ? [selectedBranch.id] : [],
            }
        const updated = await apiService.updateUser(editingUserId, updatePayload)
        const normalizedUpdated: User = {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          role: updated.role,
          tenant_id: updated.tenant_id ?? updated.tenant?.id ?? currentUser.tenant_id,
          assigned_branches: Array.isArray(updated.assigned_branches)
            ? updated.assigned_branches
                .map((branch: any) => (typeof branch === 'string' ? branch : branch?.id))
                .filter(Boolean)
            : [],
          assigned_branch_types: updated.assigned_branch_types ?? [],
          created_at: updated.created_at ?? new Date().toISOString(),
        }
        setAllUsers((prev) => prev.map((u) => (u.id === editingUserId ? normalizedUpdated : u)))
        toast({
          title: 'User updated',
          description: `${name} was updated successfully.`,
        })
      } else {
        const assignedBranchTypes: BranchType[] = selectedBranch
          ? [selectedBranch.type]
          : normalizedRole === 'gas_manager'
            ? ['gas']
            : normalizedRole === 'fuel_manager'
              ? ['fuel']
              : []
        const payload = (isPersonalOwner || isPersonalManager)
          ? {
              name,
              email,
              password,
              role: normalizedRole,
              branch_ids: selectedBranch ? [selectedBranch.id] : [],
              assigned_branch_types: assignedBranchTypes,
            }
          : {
              name,
              email,
              password,
              role: normalizedRole,
              branch_ids: selectedBranch ? [selectedBranch.id] : [],
              assigned_branch_types: assignedBranchTypes,
            }
        const created = await apiService.createUser(payload)

        const normalizedCreated: User = {
          id: created.id,
          email: created.email,
          name: created.name,
          role: created.role,
          tenant_id: created.tenant_id ?? created.tenant?.id ?? currentUser.tenant_id,
          assigned_branches: Array.isArray(created.assigned_branches)
            ? created.assigned_branches
                .map((branch: any) => (typeof branch === 'string' ? branch : branch?.id))
                .filter(Boolean)
            : [],
          assigned_branch_types: created.assigned_branch_types ?? [],
          created_at: created.created_at ?? new Date().toISOString(),
        }
        setAllUsers((prev) => [normalizedCreated, ...prev])
        toast({
          title: 'User added',
          description: `${name} was added successfully.`,
        })
      }
      setIsUserDialogOpen(false)
      setEditingUserId(null)
      resetForm()
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Could not create user.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
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
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
        >
          Add User
        </Button>
      </div>

      <Card className="shadow-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">All Users</h3>
        </div>

        {isLoading ? (
          <div className="px-6 py-8 text-center text-muted-foreground">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-muted-foreground">No users yet</p>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={groupedUsers.map(([role]) => role)} className="w-full">
            {groupedUsers.map(([role, roleUsers]) => (
              <AccordionItem key={role} value={role} className="border-b">
                <AccordionTrigger className={`px-6 py-4 hover:bg-muted/50 ${getRoleHeaderBg(role)}`}>
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <Badge className={getRoleBgColor(role)}>
                        {role.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">{roleUsers.length} users</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Name</th>
                          <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Email</th>
                          {!isPersonalOwner && (
                            <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Branches</th>
                          )}
                          <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Status</th>
                          <th className="px-6 py-3 text-right font-semibold text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roleUsers.map((user) => (
                          <tr key={user.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-medium text-foreground">{user.name}</p>
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                            {!isPersonalOwner && (
                              <td className="px-6 py-4 text-foreground">
                                {user.assigned_branches.length === 0
                                  ? 'No branch assigned'
                                  : user.assigned_branches
                                      .map((id) => branchNameById.get(String(id)) ?? 'Unknown Branch')
                                      .join(', ')}
                              </td>
                            )}
                            <td className="px-6 py-4">
                              <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                Active
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {(() => {
                                  const isOwnerAccount =
                                    currentUser?.role === 'org_owner' &&
                                    user.role === 'org_owner' &&
                                    currentUser.id === user.id
                                  const isActionDisabled = isOwnerAccount
                                  return (
                                    <>
                                      <button
                                        type="button"
                                        className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                                        onClick={() => handleEditUser(user)}
                                        disabled={isActionDisabled}
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                                        onClick={() => handleDeleteUser(user)}
                                        disabled={isActionDisabled}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )
                                })()}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
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
                ? 'Update user details.'
                : isPersonalOwner
                  ? 'Create a manager for your personal plan.'
                  : isPersonalManager
                    ? 'Create sales staff users.'
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
                disabled={isPersonalScoped}
              >
                {isPersonalOwner ? (
                  <option value={getPersonalManagerRole()}>
                    {getPersonalManagerRole() === 'fuel_manager' ? 'Fuel Manager' : 'Gas Manager'}
                  </option>
                ) : isPersonalManager ? (
                  <option value="sales_staff">Sales Staff</option>
                ) : isOrgOwnerOrganisation ? (
                  <>
                    <option value="gas_manager">Gas Manager</option>
                    <option value="fuel_manager">Fuel Manager</option>
                  </>
                ) : (
                  <>
                    <option value="sales_staff">Sales Staff</option>
                    <option value="gas_manager">Gas Manager</option>
                    <option value="fuel_manager">Fuel Manager</option>
                  </>
                )}
              </select>
            </div>

            {!isPersonalScoped && (
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
