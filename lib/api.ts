const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiService {
  private refreshPromise: Promise<any> | null = null;

  private getAuthHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async refreshAccessToken() {
    if (!this.refreshPromise) {
      this.refreshPromise = this.request('/auth/refresh', { method: 'POST' }, false)
        .finally(() => {
          this.refreshPromise = null;
        });
    }
    return this.refreshPromise;
  }

  private async request(endpoint: string, options: RequestInit = {}, retryOnUnauthorized = true) {
    const url = `${API_BASE_URL}${endpoint}`;
    const mergedHeaders = {
      ...this.getAuthHeaders(),
      ...(options.headers ?? {}),
    };
    const config = {
      headers: mergedHeaders,
      credentials: 'include',
      ...options,
    };

    let response: Response;
    try {
      response = await fetch(url, config);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network request failed';
      throw new Error(`Unable to connect to API at ${API_BASE_URL}. ${message}`);
    }

    let payload: any = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const isAuthEndpoint = endpoint.startsWith('/auth/login') || endpoint.startsWith('/auth/register') || endpoint.startsWith('/auth/refresh');
    if (response.status === 401 && retryOnUnauthorized && !isAuthEndpoint) {
      try {
        const refreshResult = await this.refreshAccessToken();
        const newToken = refreshResult?.access_token;
        if (newToken && typeof window !== 'undefined') {
          localStorage.setItem('token', newToken);
        }
        return this.request(endpoint, options, false);
      } catch {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
      }
    }

    if (!response.ok) {
      const message = payload?.message || payload?.error || `API Error: ${response.status}`;
      throw new Error(message);
    }

    return payload;
  }

  // Auth APIs
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: any) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  async refresh() {
    const result = await this.request('/auth/refresh', { method: 'POST' }, false)
    const token = result?.access_token
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('token', token)
    }
    return result
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' })
  }

  // Tenant APIs
  async getTenants() {
    return this.request('/tenant');
  }

  async getTenantById(id: string) {
    return this.request(`/tenant/${id}`)
  }

  async updateTenant(id: string, data: any) {
    return this.request(`/tenant/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async changeTenantPlan(id: string, plan: 'personal' | 'organisation') {
    return this.request(`/tenant/${id}/plan`, {
      method: 'PUT',
      body: JSON.stringify({ plan }),
    })
  }

  async suspendTenant(id: string) {
    return this.request(`/tenant/${id}/suspend`, { method: 'PUT' });
  }

  async activateTenant(id: string) {
    return this.request(`/tenant/${id}/activate`, { method: 'PUT' });
  }

  async deleteTenant(id: string) {
    return this.request(`/tenant/${id}`, { method: 'DELETE' });
  }

  // Branch APIs
  async getBranches() {
    return this.request('/branch');
  }

  async getBranchesByType(type: string) {
    return this.request(`/branch/by-type?type=${type}`);
  }

  async createBranch(data: any) {
    return this.request('/branch', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBranch(id: string, data: any) {
    return this.request(`/branch/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async archiveBranch(id: string) {
    return this.request(`/branch/${id}/archive`, {
      method: 'PATCH',
    });
  }

  async deleteBranch(id: string) {
    return this.request(`/branch/${id}`, {
      method: 'DELETE',
    });
  }

  // Gas APIs
  async getGasBranches() {
    return this.request('/gas/branches');
  }

  async createGasDailyActivity(data: any) {
    return this.request('/gas/daily-activities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getGasDailyActivities(branchId: string) {
    return this.request(`/gas/daily-activities/${branchId}`);
  }

  async createGasSale(data: any) {
    return this.request('/gas/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getGasSales(branchId: string) {
    return this.request(`/gas/sales/${branchId}`);
  }

  async updateGasSale(id: string, data: any) {
    return this.request(`/gas/sales/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteGasSale(id: string) {
    return this.request(`/gas/sales/${id}`, {
      method: 'DELETE',
    });
  }

  async createGasExpense(data: any) {
    return this.request('/gas/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getGasExpenses(branchId: string) {
    return this.request(`/gas/expenses/${branchId}`)
  }

  async getAllGasExpenses() {
    return this.request('/gas/expenses')
  }

  async createGasCylinder(data: any) {
    return this.request('/gas/cylinders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getGasCylinders(branchId: string) {
    return this.request(`/gas/cylinders/${branchId}`);
  }

  async getGasAnalytics(branchId: string) {
    return this.request(`/gas/analytics/${branchId}`);
  }

  // Fuel APIs
  async getFuelBranches() {
    return this.request('/fuel/branches');
  }

  async createFuelProduct(data: any) {
    return this.request('/fuel/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getFuelProducts(branchId: string) {
    return this.request(`/fuel/products/${branchId}`);
  }

  async createFuelPump(data: any) {
    return this.request('/fuel/pumps', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getFuelPumps(branchId: string) {
    return this.request(`/fuel/pumps/${branchId}`);
  }

  async createShiftReconciliation(data: any) {
    return this.request('/fuel/reconciliations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getShiftReconciliations(branchId: string) {
    return this.request(`/fuel/reconciliations/${branchId}`);
  }

  async getMyShiftReconciliations(branchId: string) {
    return this.request(`/fuel/reconciliations/my/${branchId}`);
  }

  async updateShiftReconciliation(id: string, data: any) {
    return this.request(`/fuel/reconciliations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteShiftReconciliation(id: string) {
    return this.request(`/fuel/reconciliations/${id}`, {
      method: 'DELETE',
    });
  }

  async createFuelExpense(data: any) {
    return this.request('/fuel/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getFuelExpenses(branchId: string) {
    return this.request(`/fuel/expenses/${branchId}`);
  }

  async getAllFuelExpenses() {
    return this.request('/fuel/expenses');
  }

  async updateFuelExpense(id: string, data: any) {
    return this.request(`/fuel/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFuelExpense(id: string) {
    return this.request(`/fuel/expenses/${id}`, {
      method: 'DELETE',
    });
  }

  async getFuelAnalytics(branchId: string) {
    return this.request(`/fuel/analytics/${branchId}`);
  }

  // Fuel Transfer APIs
  async createFuelTransfer(data: any) {
    return this.request('/fuel-transfer', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getFuelTransfers(branchId: string) {
    return this.request(`/fuel-transfer/branch/${branchId}`);
  }

  async getAllFuelTransfers() {
    return this.request('/fuel-transfer');
  }

  async updateFuelTransfer(id: string, data: any) {
    return this.request(`/fuel-transfer/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFuelTransfer(id: string) {
    return this.request(`/fuel-transfer/${id}`, {
      method: 'DELETE',
    });
  }

  // User APIs
  async getUsers() {
    return this.request('/user');
  }

  async createUser(data: any) {
    return this.request('/user', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateUser(id: string, data: any) {
    return this.request(`/user/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteUser(id: string) {
    return this.request(`/user/${id}`, {
      method: 'DELETE',
    })
  }

  async getAdminDashboard() {
    return this.request('/admin/dashboard')
  }

  async getAdminActivityLogs(tenantId?: string) {
    const query = tenantId ? `?tenant=${tenantId}` : ''
    return this.request(`/admin/activity-logs${query}`)
  }

  async getAdminBilling(tenantId?: string) {
    const query = tenantId ? `?tenant=${tenantId}` : ''
    return this.request(`/admin/billing${query}`)
  }

  async getTenantsNeedingAttention() {
    return this.request('/billing/tenants-needing-attention')
  }

  async recordPayment(tenantId: string) {
    return this.request(`/billing/record-payment/${tenantId}`, {
      method: 'POST',
    })
  }
}

export const apiService = new ApiService();
