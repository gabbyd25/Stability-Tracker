const API_BASE_URL = 'http://localhost:8000/api';

// API client for Django backend
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Users
  async getCurrentUser() {
    return this.request('/users/current/');
  }

  // Schedule Templates
  async getScheduleTemplates() {
    return this.request('/schedule-templates/');
  }

  async getPresetScheduleTemplates() {
    return this.request('/schedule-templates/presets/');
  }

  async createScheduleTemplate(data: any) {
    return this.request('/schedule-templates/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateScheduleTemplate(id: string, data: any) {
    return this.request(`/schedule-templates/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteScheduleTemplate(id: string) {
    return this.request(`/schedule-templates/${id}/`, {
      method: 'DELETE',
    });
  }

  // FT Cycle Templates
  async getFTCycleTemplates() {
    return this.request('/ft-cycle-templates/');
  }

  async createFTCycleTemplate(data: any) {
    return this.request('/ft-cycle-templates/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFTCycleTemplate(id: string, data: any) {
    return this.request(`/ft-cycle-templates/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteFTCycleTemplate(id: string) {
    return this.request(`/ft-cycle-templates/${id}/`, {
      method: 'DELETE',
    });
  }

  // Products
  async getProducts() {
    return this.request('/products/');
  }

  async createProduct(data: any) {
    return this.request('/products/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: any) {
    return this.request(`/products/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string) {
    return this.request(`/products/${id}/`, {
      method: 'DELETE',
    });
  }

  // Tasks
  async getTasks() {
    return this.request('/tasks/');
  }

  async createTask(data: any) {
    return this.request('/tasks/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createTasksBatch(tasks: any[]) {
    return this.request('/tasks/batch/', {
      method: 'POST',
      body: JSON.stringify({ tasks }),
    });
  }

  async updateTask(id: string, data: any) {
    return this.request(`/tasks/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: string) {
    return this.request(`/tasks/${id}/`, {
      method: 'DELETE',
    });
  }

  async getDeletedTasks() {
    return this.request('/tasks/deleted/');
  }

  async restoreTask(id: string) {
    return this.request(`/tasks/${id}/restore/`, {
      method: 'POST',
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;