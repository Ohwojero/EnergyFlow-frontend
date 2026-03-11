export const formatRoleName = (role: string): string => {
  const roleMap: Record<string, string> = {
    'sales_staff': 'Sales Staff',
    'gas_manager': 'Gas Manager', 
    'fuel_manager': 'Fuel Manager',
    'org_owner': 'Organization Owner',
    'super_admin': 'Super Admin'
  }
  
  return roleMap[role] || role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export const formatUserRole = (user: any): string => {
  if (!user?.role) return 'Unknown Role'
  return formatRoleName(user.role)
}