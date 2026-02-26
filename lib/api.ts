const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: this.getAuthHeaders(),
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
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

  // Tenant APIs
  async getTenants() {
    return this.request('/tenant');
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

  async createFuelExpense(data: any) {
    return this.request('/fuel/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getFuelExpenses(branchId: string) {
    return this.request(`/fuel/expenses/${branchId}`);
  }

  async getFuelAnalytics(branchId: string) {
    return this.request(`/fuel/analytics/${branchId}`);
  }

  // User APIs
  async getUsers() {
    return this.request('/user');
  }
}

export const apiService = new ApiService();